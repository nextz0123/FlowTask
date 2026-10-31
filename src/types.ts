/** chefe = cria tarefas e paga; trabalhador = faz as tarefas e recebe. */
export type Role = 'chefe' | 'trabalhador'

export type TaskStatus = 'pendente' | 'feita' | 'recusada' | 'paga'

export type PaymentMethod = 'mbway' | 'dinheiro' | 'outro'

export interface Household {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export interface Member {
  id: string
  household_id: string
  name: string
  role: Role
  created_at: string
}

export interface Task {
  id: string
  household_id: string
  title: string
  description: string | null
  price_cents: number
  status: TaskStatus
  created_by: string | null
  completed_by: string | null
  completed_at: string | null
  /** Motivo da recusa (só quando status = 'recusada'). */
  declined_reason: string | null
  declined_at: string | null
  payment_id: string | null
  created_at: string
}

export interface Payment {
  id: string
  household_id: string
  amount_cents: number
  method: PaymentMethod
  note: string | null
  week_start: string
  paid_at: string
}

/** Sessão local: quem está a usar este dispositivo. */
export interface Session {
  householdId: string
  memberId: string
  role: Role
  name: string
  /** Código da família — usado para validar o acesso às funções da nuvem. */
  code: string
}
