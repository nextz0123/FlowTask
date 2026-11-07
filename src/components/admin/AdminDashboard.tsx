import { useMemo, useState } from 'react'
import type { Session, Task } from '../../types'
import type { Snapshot } from '../../lib/store'
import { store } from '../../lib/store'
import {
  currentWeekStart,
  formatEuro,
  formatWeekLabel,
  isWeekend,
  tasksInWeek,
  totalUnpaid,
} from '../../lib/week'
import { buildAdminStats } from '../../lib/stats'
import { Avatar, EmptyState, Panel } from './ui'
import { EarningsChart } from './Charts'
import { AdminTabBar, Sidebar, type AdminView } from './Sidebar'
import { AccountView } from './AccountView'
import { TasksTable } from './TasksTable'
import { History } from '../History'
import { NewTaskForm } from '../NewTaskForm'
import { PaymentModal } from '../PaymentModal'
import { TaskRow } from '../TaskRow'
import { PushSettings } from '../PushSettings'
import { VersionTag } from '../VersionTag'
import { WeekProgress } from '../WeekProgress'
import { notifyNewTask } from '../../lib/notify'
import { tapSuccess } from '../../lib/native-ui'
import { useTheme } from '../../lib/theme'

const VIEW_TITLES: Record<AdminView, { title: string; subtitle: string }> = {
  inicio: { title: 'Início', subtitle: 'Resumo da semana e o que falta pagar.' },
  tarefas: { title: 'Tarefas', subtitle: 'Cria, acompanha e apaga tarefas.' },
  historico: { title: 'Histórico', subtitle: 'Todas as semanas, já fechadas.' },
  conta: { title: 'Conta', subtitle: 'A tua conta, a família e as definições da app.' },
}

interface Props {
  session: Session
  snapshot: Snapshot
  onRefresh: () => Promise<void>
  onLogout: () => void
  error: string | null
}

/** Número grande e legível — o coração do painel. */
function BigStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone?: 'green' | 'gold' | 'red'
}) {
  return (
    <div className={`bigstat ${tone ?? ''}`}>
      <span className="bigstat-label">{label}</span>
      <span className="bigstat-value">{value}</span>
      <span className="bigstat-hint">{hint}</span>
    </div>
  )
}

export function AdminDashboard({ session, snapshot, onRefresh, onLogout, error }: Props) {
  const [theme, setTheme] = useTheme()
  const [view, setView] = useState<AdminView>('inicio')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [payingWeek, setPayingWeek] = useState<string | null>(null)

  const tasks = snapshot.tasks
  const payments = snapshot.payments
  const stats = useMemo(() => buildAdminStats(tasks, payments), [tasks, payments])

  const weekStart = currentWeekStart()
  const unpaid = totalUnpaid(tasks)
  const weekend = isWeekend()

  const toDo = tasks.filter((t) => t.status === 'pendente')
  const done = tasks.filter((t) => t.status === 'feita')
  const declined = stats.declined

  // Progresso da semana em curso.
  const weekTasks = useMemo(() => tasksInWeek(tasks, weekStart), [tasks, weekStart])
  const weekDoneTasks = weekTasks.filter((t) => t.status === 'feita' || t.status === 'paga')
  const weekDoneCents = weekDoneTasks.reduce((sum, t) => sum + t.price_cents, 0)
  const weekTotalCents = weekTasks
    .filter((t) => t.status !== 'recusada')
    .reduce((sum, t) => sum + t.price_cents, 0)

  // Avisos do trabalhador ainda não vistos
  const unseenReminders = (snapshot.reminders ?? []).filter((r) => !r.seen_at)

  async function markSeen(id: string) {
    await action(() => store.markReminderSeen(session, id))
  }

  async function action(fn: () => Promise<void>) {
    await fn()
    await onRefresh()
  }

  function openNewTask() {
    setView('tarefas')
    setShowForm(true)
    setSidebarOpen(false)
  }

  const meta = VIEW_TITLES[view]

  return (
    <div className="admin">
      <Sidebar
        view={view}
        onView={setView}
        pendingCount={toDo.length}
        unpaidCents={formatEuro(unpaid)}
        name={session.name}
        code={snapshot.household.invite_code}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
        onNewTask={openNewTask}
      />

      <div className="main">
        <header className="topnav">
          <button className="icon-btn hide-mobile" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            ☰
          </button>
          <div className="crumb">
            <b>{meta.title}</b>
          </div>
          <div className="spacer" />
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Mudar tema"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button
            className="user-chip"
            onClick={() => setView('conta')}
            aria-label="A minha conta"
            title="A minha conta"
          >
            <Avatar name={session.name} />
            <div className="who">
              <b>{session.name}</b>
              <span>Chefe</span>
            </div>
          </button>
        </header>

        <div className="page">
          <div className="page-head">
            <div>
              <h1>{meta.title}</h1>
              <p>{meta.subtitle}</p>
            </div>
            <button className="abtn primary" onClick={openNewTask}>
              + Nova tarefa
            </button>
          </div>

          {error && (
            <div className="panel error-panel">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Avisos do trabalhador: "hora de receber" */}
          {unseenReminders.map((r) => (
            <div className="callout gold" key={r.id}>
              <span className="callout-icon">📣</span>
              <div className="callout-body">
                <b>O trabalhador pediu para receber!</b>
                <p>
                  {formatEuro(r.amount_cents || unpaid)} por pagar · semana de{' '}
                  {formatWeekLabel(r.week_start)}
                  {r.message ? ` · “${r.message}”` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="abtn primary"
                  onClick={() => {
                    setPayingWeek(r.week_start)
                    void markSeen(r.id)
                  }}
                >
                  Pagar
                </button>
                <button className="abtn" onClick={() => void markSeen(r.id)}>
                  Já vi
                </button>
              </div>
            </div>
          ))}

          {/* ---------- INÍCIO ---------- */}
          {view === 'inicio' && (
            <>
              <div className="grid bigstats">
                <BigStat
                  label="Por pagar"
                  value={formatEuro(unpaid)}
                  hint={unpaid > 0 ? 'Tarefas já feitas' : 'Tudo pago 🎉'}
                  tone="gold"
                />
                <BigStat
                  label="Esta semana"
                  value={formatEuro(stats.earned.value)}
                  hint={`${stats.completed.value} tarefa${stats.completed.value === 1 ? '' : 's'} feita${
                    stats.completed.value === 1 ? '' : 's'
                  }`}
                  tone="green"
                />
                <BigStat
                  label="Por fazer"
                  value={String(toDo.length)}
                  hint={toDo.length > 0 ? 'Tarefas pendentes' : 'Nada pendente'}
                />
              </div>

              {weekend && unpaid > 0 && (
                <div className="callout gold">
                  <span className="callout-icon">🔔</span>
                  <div className="callout-body">
                    <b>É fim de semana — hora de pagar!</b>
                    <p>Tens {formatEuro(unpaid)} para pagar.</p>
                  </div>
                  <button className="abtn primary" onClick={() => setPayingWeek(weekStart)}>
                    Pagar
                  </button>
                </div>
              )}

              {unpaid > 0 && !(weekend && unpaid > 0) && (
                <div className="callout">
                  <span className="callout-icon">💶</span>
                  <div className="callout-body">
                    <b>{formatEuro(unpaid)} por pagar</b>
                    <p>Podes pagar quando quiseres.</p>
                  </div>
                  <button className="abtn" onClick={() => setPayingWeek(weekStart)}>
                    Pagar
                  </button>
                </div>
              )}

              {declined.length > 0 && (
                <div className="callout red">
                  <span className="callout-icon">✕</span>
                  <div className="callout-body">
                    <b>
                      {declined.length} tarefa{declined.length === 1 ? '' : 's'} não feita
                      {declined.length === 1 ? '' : 's'}
                    </b>
                    <p>
                      {declined
                        .slice(0, 2)
                        .map((t) => `${t.title}: ${t.declined_reason}`)
                        .join(' · ')}
                    </p>
                  </div>
                  <button className="abtn" onClick={() => setView('tarefas')}>
                    Ver
                  </button>
                </div>
              )}

              <Panel title="Tarefas por fazer" subtitle={toDo.length === 0 ? undefined : 'Aguardam o trabalhador'}>
                {toDo.length === 0 ? (
                  <EmptyState icon="🌿">Não há tarefas por fazer.</EmptyState>
                ) : (
                  <div className="tasks">
                    {toDo.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        session={session}
                        onComplete={() => {}}
                        onUndo={() => {}}
                        onDelete={(t) => void action(() => store.deleteTask(session, t.id))}
                      />
                    ))}
                  </div>
                )}
              </Panel>

              {done.length > 0 && (
                <Panel title="Feitas, por pagar" subtitle="Marcadas pelo trabalhador">
                  <div className="tasks">
                    {done.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        session={session}
                        onComplete={() => {}}
                        onUndo={(t) => void action(() => store.undoTask(session, t.id))}
                        onDelete={(t) => void action(() => store.deleteTask(session, t.id))}
                      />
                    ))}
                  </div>
                  <button
                    className="abtn primary block-btn"
                    onClick={() => setPayingWeek(weekStart)}
                  >
                    Pagar {formatEuro(unpaid)}
                  </button>
                </Panel>
              )}

              <Panel title="Progresso da semana" subtitle="Quanto já está feito do combinado">
                {weekTasks.length === 0 ? (
                  <EmptyState icon="📋">
                    Ainda não criaste tarefas esta semana.
                  </EmptyState>
                ) : (
                  <WeekProgress
                    doneCents={weekDoneCents}
                    totalCents={weekTotalCents}
                    doneCount={weekDoneTasks.length}
                    totalCount={weekTasks.filter((t) => t.status !== 'recusada').length}
                    onLight
                  />
                )}
              </Panel>

              <Panel title="Ganhos por semana" subtitle="Últimas 8 semanas">
                <EarningsChart data={stats.series} />
              </Panel>

              <PushSettings session={session} />
              <VersionTag />
            </>
          )}

          {/* ---------- TAREFAS ---------- */}
          {view === 'tarefas' && (
            <>
              {showForm && (
                <div style={{ marginBottom: 16 }}>
                  <Panel title="Nova tarefa" subtitle="O que há para fazer e quanto vale">
                    <NewTaskForm
                      session={session}
                      onCreated={(task) => {
                        setShowForm(false)
                        void tapSuccess()
                        void onRefresh()
                        void notifyNewTask(session.code, task.title, task.priceCents)
                      }}
                    />
                  </Panel>
                </div>
              )}
              {!showForm && (
                <button className="abtn primary block-btn" style={{ marginBottom: 16 }} onClick={() => setShowForm(true)}>
                  + Nova tarefa
                </button>
              )}

              <div className="panel">
                <TasksTable
                  tasks={tasks}
                  onDelete={(t: Task) => void action(() => store.deleteTask(session, t.id))}
                />
              </div>
            </>
          )}

          {/* ---------- HISTÓRICO ---------- */}
          {view === 'historico' && <History tasks={tasks} payments={payments} />}

          {/* ---------- CONTA ---------- */}
          {view === 'conta' && (
            <AccountView
              session={session}
              snapshot={snapshot}
              theme={theme}
              onTheme={setTheme}
              onLogout={onLogout}
              onRefresh={onRefresh}
            />
          )}
        </div>
      </div>

      {/* Navegação no telemóvel — inclui sempre a opção de sair */}
      <AdminTabBar view={view} onView={setView} pendingCount={toDo.length} />

      {payingWeek && (
        <PaymentModal
          session={session}
          weekStart={payingWeek}
          taskIds={done.map((t) => t.id)}
          amountCents={unpaid}
          onClose={() => setPayingWeek(null)}
          onDone={() => {
            setPayingWeek(null)
            void tapSuccess()
            void onRefresh()
          }}
        />
      )}
    </div>
  )
}
