import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { Session, Task } from '../types'
import { isCloudMode, store, type Snapshot } from '../lib/store'
import {
  currentWeekStart,
  formatEuro,
  formatWeekLabel,
  isWeekend,
  summarizeWeeks,
  totalReceived,
  totalUnpaid,
} from '../lib/week'
import { TaskRow } from './TaskRow'
import { NewTaskForm } from './NewTaskForm'
import { PaymentModal } from './PaymentModal'
import { History } from './History'
import { DeclineModal } from './DeclineModal'
import { ConfirmDoneModal } from './ConfirmDoneModal'
import { PushSettings } from './PushSettings'
import { notifyPaymentRequest, notifyTaskDeclined, notifyTaskDone } from '../lib/notify'

// O painel do chefe (com gráficos) só é descarregado quando é preciso.
const AdminDashboard = lazy(() =>
  import('./admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
)

interface Props {
  session: Session
  onLogout: () => void
}

type Tab = 'inicio' | 'historico'

export function Dashboard({ session, onLogout }: Props) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('inicio')
  const [showForm, setShowForm] = useState(false)
  const [payingWeek, setPayingWeek] = useState<string | null>(null)
  const [decliningTask, setDecliningTask] = useState<Task | null>(null)
  const [confirmingTask, setConfirmingTask] = useState<Task | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await store.load(session)
      setSnapshot(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar os dados.')
    }
  }, [session])

  useEffect(() => {
    // Carregamento inicial e atualização periódica (sincronização entre aparelhos)
    const timer = window.setTimeout(() => void refresh(), 0)
    // Atualiza quando a app volta ao primeiro plano (ex.: trocar entre aparelhos)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    const interval = window.setInterval(() => void refresh(), 30_000)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(interval)
    }
  }, [refresh])

  const tasks = useMemo(() => snapshot?.tasks ?? [], [snapshot])
  const weekStart = currentWeekStart()
  const weeks = useMemo(() => summarizeWeeks(tasks), [tasks])
  const currentWeek = weeks.find((w) => w.weekStart === weekStart)

  const pendingTasks = tasks.filter((t) => t.status === 'pendente')
  const declinedTasks = tasks.filter((t) => t.status === 'recusada')
  const unpaid = totalUnpaid(tasks)
  const received = totalReceived(tasks)
  const weekend = isWeekend()
  const toPayThisWeek = currentWeek?.pendingCents ?? 0
  const showReminder = weekend && toPayThisWeek > 0

  // Aviso ao chefe: já foi enviado para esta semana?
  const reminders = snapshot?.reminders ?? []
  const sentThisWeek = reminders.find((r) => r.week_start === weekStart)
  const [reminderBusy, setReminderBusy] = useState(false)
  const [reminderSent, setReminderSent] = useState(false)

  async function sendReminderToChefe() {
    setReminderBusy(true)
    try {
      await store.sendReminder(session, {
        weekStart,
        amountCents: unpaid,
        message: null,
      })
      setReminderSent(true)
      await refresh()
      // Avisa o chefe por notificação (não bloqueia se falhar)
      void notifyPaymentRequest(session.code, unpaid)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível avisar o chefe.')
    } finally {
      setReminderBusy(false)
    }
  }

  async function action(fn: () => Promise<void>) {
    try {
      await fn()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ação falhou.')
    }
  }

  const isChefe = session.role === 'chefe'

  // O chefe tem o painel completo (estilo admin dashboard)
  if (isChefe && snapshot) {
    return (
      <Suspense
        fallback={
          <div className="app">
            <div className="empty">
              <span className="big">⏳</span>
              A carregar o painel…
            </div>
          </div>
        }
      >
        <AdminDashboard
          session={session}
          snapshot={snapshot}
          onRefresh={refresh}
          onLogout={onLogout}
          error={error}
        />
      </Suspense>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" />
          <div className="who">
            <strong>Olá, {session.name}</strong>
            <span>
              {isChefe ? 'Chefe' : 'Trabalhador/a'} · código {snapshot?.household.invite_code ?? '…'}
            </span>
          </div>
        </div>
        <button className="link-btn" onClick={onLogout}>
          Sair
        </button>
      </header>

      <h1 className="ios-page-title">{tab === 'inicio' ? 'As minhas tarefas' : 'Histórico'}</h1>

      {error && (
        <div className="reminder" style={{ background: 'var(--danger-soft)', borderColor: '#f3b7b0' }}>
          <span className="icon">⚠️</span>
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      )}

      <section className="hero">
        <div className="label">{isChefe ? 'Falta pagar' : 'Ainda vais receber'}</div>
        <div className="amount">{formatEuro(unpaid)}</div>
        <div className="sub">
          {currentWeek
            ? `Esta semana: ${formatEuro(currentWeek.totalCents)} (${currentWeek.tasks.length} tarefa${
                currentWeek.tasks.length === 1 ? '' : 's'
              })`
            : 'Ainda não há tarefas concluídas esta semana'}
        </div>
        <div className="split">
          <div>
            <span>Já recebido</span>
            <b>{formatEuro(received)}</b>
          </div>
          <div>
            <span>Por fazer</span>
            <b>{pendingTasks.length}</b>
          </div>
        </div>
      </section>

      {showReminder && (
        <div className="reminder">
          <span className="icon">🔔</span>
          <div style={{ flex: 1 }}>
            <strong>{isChefe ? 'É fim de semana — hora de pagar!' : 'É fim de semana — hora de receber!'}</strong>
            <p>
              {isChefe
                ? `Há ${formatEuro(toPayThisWeek)} por pagar das tarefas desta semana.`
                : `Já fizeste ${formatEuro(toPayThisWeek)} em tarefas esta semana.`}
            </p>

            {/* Chefe: botão de pagar */}
            {isChefe && (
              <button
                className="btn gold small"
                style={{ marginTop: 10 }}
                onClick={() => setPayingWeek(weekStart)}
              >
                💸 Pagar agora
              </button>
            )}

            {/* Trabalhador: avisar o chefe */}
            {!isChefe && (
              <>
                {sentThisWeek || reminderSent ? (
                  <p className="reminder-sent">✅ Chefe avisado — vais receber {formatEuro(unpaid)}.</p>
                ) : (
                  <button
                    className="btn gold small"
                    style={{ marginTop: 10 }}
                    onClick={() => void sendReminderToChefe()}
                    disabled={reminderBusy}
                  >
                    {reminderBusy ? 'A avisar…' : '📣 Avisar o chefe para pagar'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <nav className="tabs">
        <button className={tab === 'inicio' ? 'on' : ''} onClick={() => setTab('inicio')}>
          Início
        </button>
        <button className={tab === 'historico' ? 'on' : ''} onClick={() => setTab('historico')}>
          Histórico
        </button>
      </nav>

      {/* Barra inferior (só no telemóvel) */}
      <nav className="ios-tabbar-app">
        <button className={tab === 'inicio' ? 'on' : ''} onClick={() => setTab('inicio')}>
          <span className="ico">🏠</span>
          Início
        </button>
        <button className={tab === 'historico' ? 'on' : ''} onClick={() => setTab('historico')}>
          <span className="ico">🗓</span>
          Histórico
        </button>
        <button onClick={onLogout}>
          <span className="ico">👤</span>
          Sair
        </button>
      </nav>

      {tab === 'inicio' ? (
        <>
          {isChefe ? (
            showForm ? (
              <NewTaskForm session={session} onCreated={() => void refresh()} />
            ) : (
              <button
                className="btn block"
                style={{ marginBottom: 14 }}
                onClick={() => setShowForm(true)}
              >
                + Adicionar tarefa
              </button>
            )
          ) : null}

          <div className="card">
            <h2>Por fazer ({pendingTasks.length})</h2>
            {pendingTasks.length === 0 ? (
              <div className="empty">
                <span className="big">🌿</span>
                {isChefe ? 'Sem tarefas por fazer. Adiciona uma nova!' : 'Não há tarefas pendentes.'}
              </div>
            ) : (
              <div className="tasks">
                {pendingTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    session={session}
                    onComplete={setConfirmingTask}
                    onUndo={(t: Task) => void action(() => store.undoTask(session, t.id))}
                    onDelete={(t: Task) => void action(() => store.deleteTask(session, t.id))}
                    onDecline={setDecliningTask}
                  />
                ))}
              </div>
            )}
          </div>

          {!isChefe && declinedTasks.length > 0 && (
            <div className="card">
              <h2>Não feitas ({declinedTasks.length})</h2>
              <p className="small muted" style={{ marginTop: -6, marginBottom: 12 }}>
                Se mudares de ideias, podes ainda marcar como feita.
              </p>
              <div className="tasks">
                {declinedTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    session={session}
                    onComplete={setConfirmingTask}
                    onUndo={(t: Task) => void action(() => store.undoTask(session, t.id))}
                    onDelete={(t: Task) => void action(() => store.deleteTask(session, t.id))}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="week-head">
              <div>
                <h2 style={{ marginBottom: 2 }}>Esta semana</h2>
                <div className="small muted">{formatWeekLabel(weekStart)}</div>
              </div>
              <div className="total">{formatEuro(currentWeek?.totalCents ?? 0)}</div>
            </div>

            {!currentWeek || currentWeek.tasks.length === 0 ? (
              <div className="empty">
                {isChefe
                  ? 'As tarefas que o trabalhador marcar como feitas aparecem aqui.'
                  : 'Marca uma tarefa como feita para começar a acumular.'}
              </div>
            ) : (
              <>
                <div className="tasks">
                  {currentWeek.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      session={session}
                      onComplete={setConfirmingTask}
                      onUndo={(t: Task) => void action(() => store.undoTask(session, t.id))}
                      onDelete={(t: Task) => void action(() => store.deleteTask(session, t.id))}
                    />
                  ))}
                </div>
                {isChefe && toPayThisWeek > 0 && (
                  <button
                    className="btn gold block"
                    style={{ marginTop: 12 }}
                    onClick={() => setPayingWeek(weekStart)}
                  >
                    Pagar {formatEuro(toPayThisWeek)}
                  </button>
                )}
              </>
            )}
          </div>

          {!weekend && toPayThisWeek > 0 && (
            <p className="footer-note">
              💡 O lembrete para pagar aparece ao fim de semana. Podes pagar a qualquer momento.
            </p>
          )}

          <PushSettings session={session} />
        </>
      ) : (
        <History tasks={tasks} payments={snapshot?.payments ?? []} />
      )}

      <p className="footer-note">
        {isCloudMode
          ? 'Sincronizado na nuvem entre todos os aparelhos da família.'
          : 'Modo demonstração — dados apenas neste aparelho.'}
      </p>

      {decliningTask && (
        <DeclineModal
          session={session}
          task={decliningTask}
          onClose={() => setDecliningTask(null)}
          onDone={() => {
            const title = decliningTask.title
            setDecliningTask(null)
            void (async () => {
              await refresh()
              void notifyTaskDeclined(session.code, title, 'ver na app')
            })()
          }}
        />
      )}

      {confirmingTask && (
        <ConfirmDoneModal
          task={confirmingTask}
          busy={confirmBusy}
          onCancel={() => setConfirmingTask(null)}
          onConfirm={() => {
            const task = confirmingTask
            setConfirmBusy(true)
            void (async () => {
              try {
                await store.completeTask(session, task.id)
                await refresh()
                setConfirmingTask(null)
                void notifyTaskDone(session.code, task.title)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Não foi possível marcar a tarefa.')
              } finally {
                setConfirmBusy(false)
              }
            })()
          }}
        />
      )}

      {payingWeek && (
        <PaymentModal
          session={session}
          weekStart={payingWeek}
          taskIds={(weeks.find((w) => w.weekStart === payingWeek)?.tasks ?? [])
            .filter((t) => t.status === 'feita')
            .map((t) => t.id)}
          amountCents={weeks.find((w) => w.weekStart === payingWeek)?.pendingCents ?? 0}
          onClose={() => setPayingWeek(null)}
          onDone={() => {
            setPayingWeek(null)
            void refresh()
          }}
        />
      )}
    </div>
  )
}
