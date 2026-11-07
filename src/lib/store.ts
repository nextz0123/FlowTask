import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Household, Member, Payment, PaymentMethod, Reminder, Role, Session, Task } from '../types'

/**
 * Normaliza o URL da Supabase.
 * Se colares "https://xxx.supabase.co/rest/v1/" (erro comum), fica só "https://xxx.supabase.co".
 * A biblioteca acrescenta /rest/v1 sozinha — duplicar o caminho dá "Invalid path specified".
 */
function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  let url = raw.trim().replace(/\/+$/, '')
  url = url.replace(/\/(rest|auth|storage)\/v1$/i, '')
  return url
}

const SUPABASE_URL = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined)
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || undefined

export const isCloudMode = Boolean(SUPABASE_URL && SUPABASE_KEY)

export const supabase: SupabaseClient | null = isCloudMode
  ? createClient(SUPABASE_URL!, SUPABASE_KEY!)
  : null

export interface Snapshot {
  household: Household
  members: Member[]
  tasks: Task[]
  payments: Payment[]
  reminders: Reminder[]
}

export interface DataStore {
  /** Entra numa casa com o código de família. */
  join(code: string, role: Role, name: string): Promise<Session>
  /** Lê todos os dados da casa. */
  load(session: Session): Promise<Snapshot>
  createTask(
    session: Session,
    input: { title: string; description: string | null; priceCents: number; dueDate: string | null },
  ): Promise<void>
  completeTask(session: Session, taskId: string): Promise<void>
  undoTask(session: Session, taskId: string): Promise<void>
  /** Trabalhador recusa a tarefa, indicando o motivo. */
  declineTask(session: Session, taskId: string, reason: string): Promise<void>
  deleteTask(session: Session, taskId: string): Promise<void>
  /** Regista o pagamento de todas as tarefas "feitas" de uma semana. */
  payWeek(
    session: Session,
    input: { weekStart: string; taskIds: string[]; amountCents: number; method: PaymentMethod; note: string | null },
  ): Promise<void>
  /** Trabalhador avisa o chefe para pagar a semana. */
  sendReminder(
    session: Session,
    input: { weekStart: string; amountCents: number; message: string | null },
  ): Promise<void>
  /** Chefe marca o aviso como visto. */
  markReminderSeen(session: Session, reminderId: string): Promise<void>
  /** Guarda a subscrição de push deste aparelho. */
  savePushSubscription(
    session: Session,
    input: { endpoint: string; p256dh: string; auth: string },
  ): Promise<void>
  /** Remove a subscrição de push deste aparelho. */
  removePushSubscription(session: Session, endpoint: string): Promise<void>
  /** Diz se este aparelho tem notificações ativas. */
  pushStatus(session: Session, endpoint: string): Promise<boolean>
  /** Guarda o token FCM do APK Android (guardado no campo "endpoint"). */
  saveNativePushToken(session: Session, token: string): Promise<void>
  /** Remove o token FCM deste aparelho. */
  removeNativePushToken(session: Session): Promise<void>
  /** Muda o nome do próprio membro. */
  renameMember(session: Session, name: string): Promise<void>
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

/* ------------------------------------------------------------------ */
/*                        MODO DEMO (local)                            */
/* ------------------------------------------------------------------ */

const DEMO_KEY = 'tarefas-demo-v1'
const DEMO_CODE = 'FAMILIA'

interface DemoDb {
  households: Household[]
  members: Member[]
  tasks: Task[]
  payments: Payment[]
  reminders: Reminder[]
}

function readDemo(): DemoDb {
  const raw = localStorage.getItem(DEMO_KEY)
  if (raw) {
    const db = JSON.parse(raw) as DemoDb
    // Compatibilidade com dados guardados antes dos avisos existirem
    if (!db.reminders) db.reminders = []
    return db
  }
  const now = new Date().toISOString()
  const household: Household = {
    id: 'demo-house',
    name: 'Casa (demonstração)',
    invite_code: DEMO_CODE,
    created_at: now,
  }
  const chefe: Member = { id: 'demo-chefe', household_id: household.id, name: 'Chefe', role: 'chefe', created_at: now }
  const trabalhador: Member = { id: 'demo-trabalhador', household_id: household.id, name: 'Trabalhador', role: 'trabalhador', created_at: now }
  const db: DemoDb = { households: [household], members: [chefe, trabalhador], tasks: [], payments: [], reminders: [] }
  writeDemo(db)
  return db
}

function writeDemo(db: DemoDb) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(db))
}

const demoStore: DataStore = {
  async join(code, role, name) {
    const db = readDemo()
    const household = db.households.find(
      (h) => h.invite_code.toLowerCase() === code.trim().toLowerCase(),
    )
    if (!household) throw new Error(`Código de família inválido. No modo demo usa: ${DEMO_CODE}`)
    const existing = db.members.find(
      (m) => m.household_id === household.id && m.role === role && m.name.toLowerCase() === name.trim().toLowerCase(),
    )
    const member: Member =
      existing ??
      ({
        id: uid(),
        household_id: household.id,
        name: name.trim(),
        role,
        created_at: new Date().toISOString(),
      } as Member)
    if (!existing) {
      db.members.push(member)
      writeDemo(db)
    }
    return {
      householdId: household.id,
      memberId: member.id,
      role,
      name: member.name,
      code: household.invite_code,
    }
  },

  async load(session) {
    const db = readDemo()
    return {
      household: db.households.find((h) => h.id === session.householdId)!,
      members: db.members.filter((m) => m.household_id === session.householdId),
      tasks: db.tasks
        .filter((t) => t.household_id === session.householdId)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
      payments: db.payments.filter((p) => p.household_id === session.householdId),
      reminders: db.reminders
        .filter((r) => r.household_id === session.householdId)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    }
  },

  async createTask(session, input) {
    const db = readDemo()
    db.tasks.push({
      id: uid(),
      household_id: session.householdId,
      title: input.title,
      description: input.description,
      price_cents: input.priceCents,
      status: 'pendente',
      created_by: session.memberId,
      completed_by: null,
      completed_at: null,
      declined_reason: null,
      declined_at: null,
      due_date: input.dueDate,
      payment_id: null,
      created_at: new Date().toISOString(),
    })
    writeDemo(db)
  },

  async completeTask(session, taskId) {
    const db = readDemo()
    const task = db.tasks.find((t) => t.id === taskId)
    if (!task || (task.status !== 'pendente' && task.status !== 'recusada')) return
    task.status = 'feita'
    task.completed_by = session.memberId
    task.completed_at = new Date().toISOString()
    task.declined_reason = null
    task.declined_at = null
    writeDemo(db)
  },

  async undoTask(_session, taskId) {
    const db = readDemo()
    const task = db.tasks.find((t) => t.id === taskId)
    if (!task || (task.status !== 'feita' && task.status !== 'recusada')) return
    task.status = 'pendente'
    task.completed_by = null
    task.completed_at = null
    task.declined_reason = null
    task.declined_at = null
    writeDemo(db)
  },

  async declineTask(_session, taskId, reason) {
    const db = readDemo()
    const task = db.tasks.find((t) => t.id === taskId)
    if (!task || task.status !== 'pendente') return
    task.status = 'recusada'
    task.declined_reason = reason
    task.declined_at = new Date().toISOString()
    writeDemo(db)
  },

  async deleteTask(_session, taskId) {
    const db = readDemo()
    db.tasks = db.tasks.filter((t) => t.id !== taskId || t.status === 'paga')
    writeDemo(db)
  },

  async payWeek(session, input) {
    const db = readDemo()
    const payment: Payment = {
      id: uid(),
      household_id: session.householdId,
      amount_cents: input.amountCents,
      method: input.method,
      note: input.note,
      week_start: input.weekStart,
      paid_at: new Date().toISOString(),
    }
    db.payments.push(payment)
    for (const task of db.tasks) {
      if (input.taskIds.includes(task.id) && task.status === 'feita') {
        task.status = 'paga'
        task.payment_id = payment.id
      }
    }
    writeDemo(db)
  },

  async sendReminder(session, input) {
    const db = readDemo()
    db.reminders.push({
      id: uid(),
      household_id: session.householdId,
      week_start: input.weekStart,
      amount_cents: input.amountCents,
      message: input.message,
      created_by: session.memberId,
      created_at: new Date().toISOString(),
      seen_at: null,
    })
    writeDemo(db)
  },

  async markReminderSeen(_session, reminderId) {
    const db = readDemo()
    const r = db.reminders.find((x) => x.id === reminderId)
    if (r && !r.seen_at) {
      r.seen_at = new Date().toISOString()
      writeDemo(db)
    }
  },

  async renameMember(session, name) {
    const db = readDemo()
    const m = db.members.find((x) => x.id === session.memberId)
    if (m) {
      m.name = name
      writeDemo(db)
    }
  },

  // No modo demo não há servidor de push: guardamos localmente para a UI funcionar.
  async savePushSubscription(_session, input) {
    localStorage.setItem('flowtask-push-demo', input.endpoint)
  },

  async removePushSubscription() {
    localStorage.removeItem('flowtask-push-demo')
  },

  async pushStatus(_session, endpoint) {
    return localStorage.getItem('flowtask-push-demo') === endpoint
  },

  async saveNativePushToken(_session, token) {
    localStorage.setItem('flowtask-fcm-demo', token)
  },

  async removeNativePushToken() {
    localStorage.removeItem('flowtask-fcm-demo')
  },
}

/* ------------------------------------------------------------------ */
/*                        MODO NUVEM (Supabase)                        */
/* ------------------------------------------------------------------ */

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

const cloudStore: DataStore = {
  async join(code, role, name) {
    const { data, error } = await supabase!.rpc('join_household', {
      p_code: code.trim(),
      p_role: role,
      p_name: name.trim(),
    })
    check(error)
    const row = Array.isArray(data) ? data[0] : data
    if (!row) throw new Error('Não foi possível entrar na família.')
    return {
      householdId: row.household_id as string,
      memberId: row.member_id as string,
      role,
      name: name.trim(),
      code: code.trim().toUpperCase(),
    }
  },

  async load(session) {
    const { data, error } = await supabase!.rpc('app_load', {
      p_code: session.code,
    })
    check(error)
    if (!data) throw new Error('Sem dados.')
    const snap = data as Snapshot
    // Compatibilidade: versões antigas do app_load não traziam avisos
    if (!snap.reminders) snap.reminders = []
    return snap
  },

  async createTask(session, input) {
    const { error } = await supabase!.rpc('app_create_task', {
      p_code: session.code,
      p_member_id: session.memberId,
      p_title: input.title,
      p_description: input.description,
      p_price_cents: input.priceCents,
      p_due_date: input.dueDate,
    })
    check(error)
  },

  async completeTask(session, taskId) {
    const { error } = await supabase!.rpc('app_set_task_status', {
      p_code: session.code,
      p_member_id: session.memberId,
      p_task_id: taskId,
      p_status: 'feita',
    })
    check(error)
  },

  async undoTask(session, taskId) {
    const { error } = await supabase!.rpc('app_set_task_status', {
      p_code: session.code,
      p_member_id: session.memberId,
      p_task_id: taskId,
      p_status: 'pendente',
    })
    check(error)
  },

  async declineTask(session, taskId, reason) {
    const { error } = await supabase!.rpc('app_decline_task', {
      p_code: session.code,
      p_task_id: taskId,
      p_reason: reason,
    })
    check(error)
  },

  async deleteTask(session, taskId) {
    const { error } = await supabase!.rpc('app_delete_task', {
      p_code: session.code,
      p_task_id: taskId,
    })
    check(error)
  },

  async payWeek(session, input) {
    const { error } = await supabase!.rpc('app_pay_week', {
      p_code: session.code,
      p_week_start: input.weekStart,
      p_task_ids: input.taskIds,
      p_amount_cents: input.amountCents,
      p_method: input.method,
      p_note: input.note,
    })
    check(error)
  },

  async sendReminder(session, input) {
    const { error } = await supabase!.rpc('app_send_reminder', {
      p_code: session.code,
      p_member_id: session.memberId,
      p_week_start: input.weekStart,
      p_amount_cents: input.amountCents,
      p_message: input.message,
    })
    check(error)
  },

  async markReminderSeen(session, reminderId) {
    const { error } = await supabase!.rpc('app_mark_reminder_seen', {
      p_code: session.code,
      p_reminder_id: reminderId,
    })
    check(error)
  },

  async renameMember(session, name) {
    const { error } = await supabase!.rpc('app_rename_member', {
      p_code: session.code,
      p_member_id: session.memberId,
      p_name: name,
    })
    check(error)
  },

  async savePushSubscription(session, input) {
    const { error } = await supabase!.rpc('app_save_push_subscription', {
      p_code: session.code,
      p_member_id: session.memberId,
      p_role: session.role,
      p_endpoint: input.endpoint,
      p_p256dh: input.p256dh,
      p_auth: input.auth,
    })
    check(error)
  },

  async removePushSubscription(session, endpoint) {
    const { error } = await supabase!.rpc('app_remove_push_subscription', {
      p_code: session.code,
      p_endpoint: endpoint,
    })
    check(error)
  },

  async pushStatus(session, endpoint) {
    const { data, error } = await supabase!.rpc('app_push_status', {
      p_code: session.code,
      p_endpoint: endpoint,
    })
    check(error)
    return Boolean(data)
  },

  async saveNativePushToken(session, token) {
    const { error } = await supabase!.rpc('app_save_push_subscription', {
      p_code: session.code,
      p_member_id: session.memberId,
      p_role: session.role,
      p_endpoint: token,
      p_p256dh: '',
      p_auth: '',
      p_kind: 'fcm',
    })
    check(error)
    localStorage.setItem('flowtask-fcm-token', token)
  },

  async removeNativePushToken(session) {
    const token = localStorage.getItem('flowtask-fcm-token')
    if (!token) return
    const { error } = await supabase!.rpc('app_remove_push_subscription', {
      p_code: session.code,
      p_endpoint: token,
    })
    check(error)
    localStorage.removeItem('flowtask-fcm-token')
  },
}

export const store: DataStore = isCloudMode ? cloudStore : demoStore

/* ------------------------------------------------------------------ */
/*                       Sessão guardada no aparelho                    */
/* ------------------------------------------------------------------ */

const SESSION_KEY = 'tarefas-session-v1'

export function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function saveSession(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}
