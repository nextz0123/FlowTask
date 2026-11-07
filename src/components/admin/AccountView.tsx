import { useState } from 'react'
import type { Member, Payment, Session } from '../../types'
import type { Snapshot } from '../../lib/store'
import { formatEuro, formatWeekLabel, totalUnpaid, totalReceived } from '../../lib/week'
import { buildAdminStats } from '../../lib/stats'
import { store } from '../../lib/store'
import { applyTheme, type Theme } from '../../lib/theme'
import { isNativeApp } from '../../lib/native-push'
import { tapLight, tapSuccess } from '../../lib/native-ui'
import { Panel } from './ui'
import { PushSettings } from '../PushSettings'
import { AppSettings } from '../AppSettings'
import { VersionTag } from '../VersionTag'

interface Props {
  session: Session
  snapshot: Snapshot
  theme: Theme
  onTheme: (t: Theme) => void
  onLogout: () => void
  onRefresh: () => Promise<void>
}

function memberRoleLabel(role: Member['role']): string {
  return role === 'chefe' ? 'Chefe' : 'Trabalhador'
}

/** Tudo o que é "sobre a app e a conta", num só sítio. */
export function AccountView({ session, snapshot, theme, onTheme, onLogout, onRefresh }: Props) {
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(session.name)
  const [busy, setBusy] = useState(false)

  const tasks = snapshot.tasks
  const payments: Payment[] = snapshot.payments
  const stats = buildAdminStats(tasks, payments)
  const code = snapshot.household.invite_code
  const worker = snapshot.members.find((m) => m.role === 'trabalhador')

  // Dinheiro realmente entregue — soma dos pagamentos registados.
  // (Não usar a soma das tarefas "pagas": se uma tarefa for apagada depois
  // de paga, os dois valores deixariam de bater certo.)
  const paidTotal = payments.reduce((sum, p) => sum + p.amount_cents, 0)
  const lastPayment = [...payments].sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1))[0]

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      void tapSuccess()
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      // sem permissão de área de transferência — o código está visível de qualquer forma
    }
  }

  async function shareCode() {
    const text = `Entra no FlowTask com o código da família: ${code}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'FlowTask', text })
        return
      } catch {
        // o utilizador cancelou — tentamos copiar
      }
    }
    void copyCode()
  }

  async function saveName() {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === session.name) {
      setEditingName(false)
      return
    }
    setBusy(true)
    try {
      await store.renameMember(session, trimmed)
      void tapSuccess()
      setEditingName(false)
      await onRefresh()
    } finally {
      setBusy(false)
    }
  }

  const themeOptions: { key: Theme; label: string; icon: string }[] = [
    { key: 'light', label: 'Claro', icon: '☀' },
    { key: 'dark', label: 'Escuro', icon: '☾' },
    { key: 'system', label: 'Sistema', icon: '⚙' },
  ]

  return (
    <>
      {/* ---------- Identidade ---------- */}
      <Panel title="A minha conta" subtitle="Quem está a usar este aparelho">
        <div className="account-id">
          <div className="account-avatar">{session.name.trim().charAt(0).toUpperCase() || '?'}</div>
          <div className="account-id-body">
            {editingName ? (
              <div className="account-rename">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={40}
                  aria-label="O teu nome"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void saveName()
                    if (e.key === 'Escape') {
                      setNewName(session.name)
                      setEditingName(false)
                    }
                  }}
                />
                <button className="abtn primary" onClick={() => void saveName()} disabled={busy}>
                  {busy ? '…' : 'Guardar'}
                </button>
                <button
                  className="abtn"
                  onClick={() => {
                    setNewName(session.name)
                    setEditingName(false)
                  }}
                  disabled={busy}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <b>{session.name}</b>
                <span className="account-role">Chefe · crias as tarefas e pagas</span>
                <button className="link-btn" onClick={() => setEditingName(true)}>
                  ✎ Mudar o meu nome
                </button>
              </>
            )}
          </div>
        </div>
      </Panel>

      {/* ---------- Código da família ---------- */}
      <Panel title="Código da família" subtitle="Com este código é que alguém entra na tua casa">
        <div className="invite-box">
          <div className="invite-code">{code}</div>
          <div className="invite-actions">
            <button className="abtn primary" onClick={() => void copyCode()}>
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
            <button className="abtn" onClick={() => void shareCode()}>
              Partilhar
            </button>
          </div>
        </div>
        <p className="account-hint">
          Dá este código a quem vai fazer as tarefas. Essa pessoa abre a app, escolhe{' '}
          <b>Trabalhador</b> e escreve <b>{code}</b>.
        </p>
      </Panel>

      {/* ---------- Quem está na família ---------- */}
      <Panel title="Na família" subtitle={`${snapshot.members.length} pessoa${snapshot.members.length === 1 ? '' : 's'}`}>
        <ul className="member-list">
          {snapshot.members.map((m) => (
            <li key={m.id} className="member-item">
              <span className="member-dot" data-role={m.role} />
              <div>
                <b>
                  {m.name}
                  {m.id === session.memberId && <span className="you-tag">tu</span>}
                </b>
                <span>{memberRoleLabel(m.role)}</span>
              </div>
            </li>
          ))}
        </ul>
        {snapshot.members.length < 2 && (
          <p className="account-hint">Ainda só estás tu. Partilha o código para entrarem mais pessoas.</p>
        )}
      </Panel>

      {/* ---------- Aparência ---------- */}
      <Panel title="Aparência" subtitle="Como a app se apresenta">
        <p className="account-label">Tema</p>
        <div className="segmented">
          {themeOptions.map((t) => (
            <button
              key={t.key}
              className={`segmented-item ${theme === t.key ? 'on' : ''}`}
              onClick={() => {
                applyTheme(t.key)
                onTheme(t.key)
                void tapLight()
              }}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </Panel>

      {/* ---------- Notificações ---------- */}
      <Panel title="Notificações" subtitle="Avisos no telemóvel e no computador">
        <PushSettings session={session} />
        <AppSettings pendingCount={tasks.filter((t) => t.status === 'pendente').length} />
      </Panel>

      {/* ---------- Resumo ---------- */}
      <Panel title="Resumo" subtitle="Desde o início">
        <div className="sum-grid">
          <div className="sum-item">
            <span>Já paguei</span>
            <b>{formatEuro(paidTotal)}</b>
          </div>
          <div className="sum-item">
            <span>Por pagar</span>
            <b>{formatEuro(totalUnpaid(tasks))}</b>
          </div>
          <div className="sum-item">
            <span>Tarefas feitas</span>
            <b>{tasks.filter((t) => t.status === 'feita' || t.status === 'paga').length}</b>
          </div>
          <div className="sum-item">
            <span>Recusadas</span>
            <b>{stats.declinedCount}</b>
          </div>
          <div className="sum-item">
            <span>Pagamentos</span>
            <b>{payments.length}</b>
          </div>
          <div className="sum-item">
            <span>Último pagamento</span>
            <b>{lastPayment ? formatWeekLabel(lastPayment.week_start) : '—'}</b>
          </div>
        </div>
        <p className="account-hint">
          Valor já recebido pelo trabalhador: <b>{formatEuro(totalReceived(tasks))}</b>.
          {worker ? ` ${worker.name} é quem faz as tarefas.` : ''}
        </p>
      </Panel>

      {/* ---------- Sair ---------- */}
      <Panel title="Sessão" subtitle="Terminar a sessão neste aparelho">
        {confirmLogout ? (
          <div className="logout-confirm">
            <p>
              <b>Tens a certeza?</b> Vais precisar do código <b>{code}</b> para voltar a entrar.
            </p>
            <div className="logout-actions">
              <button className="abtn danger" onClick={onLogout}>
                Sim, sair
              </button>
              <button className="abtn" onClick={() => setConfirmLogout(false)}>
                Ficar
              </button>
            </div>
          </div>
        ) : (
          <>
            <button className="abtn danger block-btn" onClick={() => setConfirmLogout(true)}>
              ⏻ Sair da conta
            </button>
            <p className="account-hint">
              As tuas tarefas e pagamentos <b>ficam guardados</b>. Saem apenas deste aparelho
              {isNativeApp() ? ' (o aviso diário é cancelado)' : ''}.
            </p>
          </>
        )}
      </Panel>

      <VersionTag />
    </>
  )
}
