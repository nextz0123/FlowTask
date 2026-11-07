/**
 * Valida a parte estrutural do schema.sql:
 *  1. Sintaxe dos CREATE TABLE
 *  2. Ordem de criação vs. chaves estrangeiras (o bug que apanhámos)
 *  3. Funções e estados esperados pela app
 *
 * Nota: o parser (pgsql-ast-parser) não suporta PL/pgSQL, RLS nem GRANT/REVOKE,
 * por isso essas partes são verificadas por expressão regular.
 *
 * Uso: node scripts/validate-schema.mjs
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'pgsql-ast-parser'

const path = resolve(import.meta.dirname, '..', 'supabase', 'schema.sql')
const sql = readFileSync(path, 'utf8')

let errors = 0
const err = (m) => {
  console.error(`❌ ${m}`)
  errors++
}
const ok = (m) => console.log(`✅ ${m}`)

// ---------- 1 + 2. Tabelas e chaves estrangeiras ----------
const tableBlocks = [...sql.matchAll(/create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/gi)]

if (tableBlocks.length === 0) {
  err('Não encontrei nenhuma tabela no schema.')
} else {
  ok(`Sintaxe: ${tableBlocks.length} tabelas encontradas`)
}

const created = new Map()
tableBlocks.forEach(([, name], i) => created.set(name.toLowerCase(), i))

console.log(`   Ordem: ${[...created.keys()].join(' → ')}`)

let fkCount = 0
for (const [full, name, body] of tableBlocks) {
  const table = name.toLowerCase()
  const order = created.get(table)

  // Cada "references public.X" tem de apontar para uma tabela criada antes
  for (const m of body.matchAll(/references\s+public\.(\w+)/gi)) {
    fkCount++
    const target = m[1].toLowerCase()
    const targetOrder = created.get(target)
    if (targetOrder === undefined) {
      err(`${table}: referencia "${target}", que nunca é criada`)
    } else if (targetOrder > order) {
      err(
        `${table}: referencia "${target}", que só é criada DEPOIS.\n   → Move o CREATE TABLE de "${target}" para cima.`,
      )
    }
  }

  // Valida a sintaxe do bloco individualmente
  try {
    parse(`create table ${table} (${body})`)
  } catch (e) {
    err(`${table}: sintaxe inválida — ${e.message.split('\n')[0]}`)
  }
  void full
}

if (fkCount === 0) err('Nenhuma chave estrangeira encontrada — verifica o schema.')
else ok(`${fkCount} chaves estrangeiras, todas a apontar para tabelas já criadas`)

// ---------- 3. Funções usadas pela app ----------
const required = [
  'join_household',
  'app_load',
  'app_create_task',
  'app_set_task_status',
  'app_decline_task',
  'app_delete_task',
  'app_pay_week',
  'app_send_reminder',
  'app_mark_reminder_seen',
  'app_rename_member',
  'app_save_push_subscription',
  'app_remove_push_subscription',
  'app_push_status',
]
const defined = new Set(
  [...sql.matchAll(/create or replace function public\.(\w+)/gi)].map((m) => m[1].toLowerCase()),
)
const missing = required.filter((f) => !defined.has(f))
if (missing.length) err(`Funções em falta: ${missing.join(', ')}`)
else ok(`As ${required.length} funções usadas pela app estão definidas`)

// Cada função tem de ter GRANT EXECUTE
for (const fn of required) {
  if (!new RegExp(`grant execute on function public\\.${fn}\\s*\\(`, 'i').test(sql)) {
    err(`Falta "grant execute" para ${fn}`)
  }
}

// ---------- 4. Estados e colunas da recusa ----------
if (!/status in \('pendente', 'feita', 'recusada', 'paga'\)/.test(sql)) {
  err("O estado 'recusada' não está no check de tasks.status")
} else {
  ok("Estado 'recusada' presente")
}
for (const col of ['declined_reason', 'declined_at']) {
  if (!sql.includes(col)) err(`Coluna em falta: ${col}`)
}

// ---------- 5. RLS ligado em todas as tabelas ----------
for (const table of created.keys()) {
  if (!new RegExp(`alter table public\\.${table} enable row level security`, 'i').test(sql)) {
    err(`RLS não está ligado em ${table}`)
  }
}
ok('RLS ligado em todas as tabelas')

console.log()
if (errors > 0) {
  console.error(`💥 ${errors} problema(s) encontrado(s).\n`)
  process.exit(1)
}
console.log('🎉 Schema válido — pode ser colado no SQL Editor da Supabase.\n')
