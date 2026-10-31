/**
 * Testa a ligação à Supabase com as chaves do .env.local
 * Uso: pnpm check:supabase
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const envPath = resolve(root, '.env.local')

function fail(msg) {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

function ok(msg) {
  console.log(`✅ ${msg}`)
}

console.log('\n🔍 FlowTask — verificação da Supabase\n')

if (!existsSync(envPath)) {
  fail(`Não encontrei o ficheiro .env.local em:\n   ${envPath}\n   Cria-o a partir de .env.example (ver SUPABASE-PASSO-A-PASSO.md, Passo 5).`)
}

const env = {}
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

if (!url) fail('VITE_SUPABASE_URL está vazio no .env.local (Passo 4/5).')
if (!key) fail('VITE_SUPABASE_ANON_KEY está vazio no .env.local (Passo 4/5).')

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
  fail(`O URL parece inválido:\n   ${url}\n   Deve ser algo como https://abcdefgh.supabase.co (sem barra no fim, sem /rest/v1).`)
}
ok(`URL válida: ${url}`)

// A Supabase tem dois formatos de chave pública:
//  - novo:    sb_publishable_...
//  - antigo:  eyJ... (JWT "anon public")
const isPublishable = key.startsWith('sb_publishable_')
const isLegacyAnon = key.startsWith('eyJ')

if (key.startsWith('sb_secret_')) {
  fail(
    'Estás a usar a chave SECRETA (sb_secret_...).\n   → Nunca ponhas essa chave na app: dá acesso total à base de dados.\n   → Usa a "Publishable key" (sb_publishable_...).',
  )
}
if (!isPublishable && !isLegacyAnon) {
  fail(
    'A chave não parece válida.\n   → Deve começar por "sb_publishable_" (nova) ou "eyJ" (anon antiga).\n   → Onde encontrar: Project Settings → API Keys → Publishable key.',
  )
}
if (key.length < 40) {
  fail('A chave parece demasiado curta. Copia-a completa.')
}
ok(
  isPublishable
    ? 'Chave publishable (formato novo) presente'
    : 'Chave anon (formato antigo) presente',
)

// Descobre o código da família a testar (argumento ou FAMILIA)
const code = (process.argv[2] ?? 'FAMILIA').toUpperCase()
const base = url.replace(/\/$/, '')

async function rpc(fn, body) {
  let res
  try {
    res = await fetch(`${base}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
  } catch (err) {
    const reason = err?.cause?.code ?? err?.name ?? 'erro desconhecido'
    fail(
      `Não consegui contactar a Supabase (${reason}).\n   → Verifica se tens internet.\n   → Confirma que o projeto existe e o URL está certo (Passo 4).\n   → Se o projeto foi criado agora, espera 1–2 minutos e tenta outra vez.`,
    )
  }
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    json = text
  }
  return { status: res.status, ok: res.ok, json }
}

console.log(`\n📡 A testar a ligação com o código de família "${code}"...\n`)

const load = await rpc('app_load', { p_code: code })

if (load.status === 404) {
  fail(
    'A função "app_load" não existe.\n   → Corre o ficheiro supabase/schema.sql no SQL Editor da Supabase (Passo 2).',
  )
}

if (!load.ok) {
  const msg = typeof load.json === 'object' ? (load.json.message ?? JSON.stringify(load.json)) : load.json
  if (/Código de família inválido/i.test(msg)) {
    fail(
      `O código "${code}" não existe na base de dados.\n   → Vai a Table Editor → households e confirma o invite_code (Passo 3).`,
    )
  }
  if (/Invalid API key|JWT/i.test(msg)) {
    fail('Chave inválida. Copia outra vez a "anon public" (Passo 4) — sem espaços nem aspas.')
  }
  fail(`A Supabase devolveu um erro:\n   ${msg}`)
}

ok('Ligação à Supabase funciona')

const data = load.json
const household = data?.household
const tasks = data?.tasks ?? []
const payments = data?.payments ?? []
const members = data?.members ?? []

if (!household) fail('A resposta não trouxe dados da família. Confirma o schema.sql.')

ok(`Família encontrada: "${household.name}" (código ${household.invite_code})`)
ok(`Tarefas: ${tasks.length} · Pagamentos: ${payments.length} · Membros: ${members.length}`)

if (members.length > 0) {
  console.log('\n👥 Membros registados:')
  for (const m of members) {
    console.log(`   • ${m.name} (${m.role})`)
  }
}

console.log('\n🎉 Tudo pronto! A app já pode usar a nuvem.')
console.log('   Reinicia o "pnpm dev" se ainda não o fizeste (Passo 6).\n')
