import { Avatar } from './ui'

export type AdminView = 'inicio' | 'tarefas' | 'historico' | 'conta'

interface Props {
  view: AdminView
  onView: (v: AdminView) => void
  pendingCount: number
  unpaidCents: string
  name: string
  code: string
  open: boolean
  onClose: () => void
  onLogout: () => void
  onNewTask: () => void
}

const NAV: { key: AdminView; label: string; icon: string }[] = [
  { key: 'inicio', label: 'Início', icon: '🏠' },
  { key: 'tarefas', label: 'Tarefas', icon: '☑' },
  { key: 'historico', label: 'Histórico', icon: '🗓' },
  { key: 'conta', label: 'Conta', icon: '👤' },
]

export function Sidebar({
  view,
  onView,
  pendingCount,
  unpaidCents,
  name,
  code,
  open,
  onClose,
  onLogout,
  onNewTask,
}: Props) {
  return (
    <>
      {open && <div className="scrim" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="side-brand">
          <img src="/favicon.svg" alt="" />
          <div>
            FlowTask
            <small>Painel do chefe</small>
          </div>
        </div>

        <button className="abtn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onNewTask}>
          + Nova tarefa
        </button>

        <div className="side-group">Menu</div>
        {NAV.map((item) => (
          <button
            key={item.key}
            className={`side-item ${view === item.key ? 'on' : ''}`}
            onClick={() => {
              onView(item.key)
              onClose()
            }}
          >
            <span className="ico">{item.icon}</span>
            {item.label}
            {item.key === 'tarefas' && pendingCount > 0 && <span className="count">{pendingCount}</span>}
          </button>
        ))}

        <div className="side-foot">
          <div className="side-unpaid">
            <span>Por pagar</span>
            <b>{unpaidCents}</b>
          </div>
          <button className="side-user" onClick={() => { onView('conta'); onClose() }}>
            <Avatar name={name} />
            <div style={{ lineHeight: 1.2, minWidth: 0, textAlign: 'left' }}>
              <b style={{ display: 'block', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</b>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Chefe · {code}</span>
            </div>
          </button>
          <button className="side-item" onClick={onLogout}>
            <span className="ico">⏻</span> Sair da conta
          </button>
        </div>
      </aside>
    </>
  )
}

/** Barra de navegação inferior — só aparece no telemóvel. */
export function AdminTabBar({
  view,
  onView,
  pendingCount,
}: {
  view: AdminView
  onView: (v: AdminView) => void
  pendingCount: number
}) {
  return (
    <nav className="admin-tabbar">
      {NAV.map((item) => (
        <button
          key={item.key}
          className={view === item.key ? 'on' : ''}
          onClick={() => onView(item.key)}
          aria-current={view === item.key ? 'page' : undefined}
        >
          <span className="ico">
            {item.icon}
            {item.key === 'tarefas' && pendingCount > 0 && (
              <span className="tab-badge">{pendingCount > 9 ? '9+' : pendingCount}</span>
            )}
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}
