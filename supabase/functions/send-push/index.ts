// ============================================================
//  Supabase Edge Function: send-push
//  Envia notificações push para os aparelhos da família.
//
//  Deploy:
//    supabase functions deploy send-push --no-verify-jwt
//
//  Secrets necessários:
//    supabase secrets set VAPID_PUBLIC_KEY=...
//    supabase secrets set VAPID_PRIVATE_KEY=...
//    supabase secrets set VAPID_SUBJECT=mailto:o-teu-email@exemplo.com
//    (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem por omissão)
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

type Target = 'chefe' | 'trabalhador' | 'ambos'

interface Body {
  code: string
  title: string
  body: string
  target?: Target
  tag?: string
  url?: string
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { code, title, body, target = 'ambos', tag, url }: Body = await req.json()

    if (!code || !title) {
      return json({ error: 'Faltam "code" e "title".' }, 400)
    }

    // Descobre a família pelo código
    const { data: household, error: hErr } = await supabase
      .from('households')
      .select('id')
      .ilike('invite_code', code.trim())
      .maybeSingle()

    if (hErr) throw hErr
    if (!household) return json({ error: 'Código de família inválido.' }, 404)

    // Vai buscar as subscrições dos destinatários
    let query = supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth, role')
      .eq('household_id', household.id)

    if (target !== 'ambos') query = query.eq('role', target)

    const { data: subs, error: sErr } = await query
    if (sErr) throw sErr

    if (!subs || subs.length === 0) {
      return json({ sent: 0, message: 'Nenhum aparelho subscrito.' })
    }

    const payload = JSON.stringify({ title, body, tag, url })
    const expired: string[] = []
    let sent = 0

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: s.endpoint,
              keys: { p256dh: s.p256dh, auth: s.auth },
            },
            payload,
          )
          sent++
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode
          // 404/410 = subscrição já não existe → limpar
          if (status === 404 || status === 410) expired.push(s.id)
        }
      }),
    )

    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expired)
    }

    return json({ sent, removed: expired.length, total: subs.length })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
