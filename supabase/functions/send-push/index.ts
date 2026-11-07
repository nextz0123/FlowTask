// ============================================================
//  Supabase Edge Function: send-push
//  Envia notificações para os aparelhos da família.
//
//  Suporta dois tipos de aparelho (coluna "kind" na tabela):
//    web -> Web Push (browser / PWA instalada)  [VAPID]
//    fcm -> APK Android                          [Firebase]
//
//  Deploy:
//    supabase functions deploy send-push --no-verify-jwt
//
//  Secrets necessários:
//    VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT   (Web Push)
//    FCM_SERVICE_ACCOUNT                                  (APK — JSON da conta de serviço)
//    (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem por omissão)
// ============================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'
const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT')

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

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

interface Sub {
  id: string
  kind: string
  endpoint: string
  p256dh: string
  auth: string
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return json({ ok: true })

  try {
    const { code, title, body, target = 'ambos', tag, url }: Body = await req.json()

    if (!code || !title) return json({ error: 'Faltam "code" e "title".' }, 400)

    // Descobre a família pelo código
    const { data: household, error: hErr } = await supabase
      .from('households')
      .select('id')
      .ilike('invite_code', code.trim())
      .maybeSingle()

    if (hErr) throw hErr
    if (!household) return json({ error: 'Código de família inválido.' }, 404)

    // Subscrições dos destinatários.
    // A coluna "kind" distingue browser (web) de APK (fcm). Se ainda não existir
    // na base de dados, assumimos que são todas Web Push — assim a função
    // continua a funcionar antes de correr o SQL atualizado.
    let hasKind = true
    let subs: Sub[] | null = null

    const buildQuery = (withKind: boolean) => {
      let q = supabase
        .from('push_subscriptions')
        .select(withKind ? 'id, kind, endpoint, p256dh, auth' : 'id, endpoint, p256dh, auth')
        .eq('household_id', household.id)
      if (target !== 'ambos') q = q.eq('role', target)
      return q
    }

    const first = await buildQuery(true)
    if (first.error) {
      hasKind = false
      const second = await buildQuery(false)
      if (second.error) throw second.error
      subs = (second.data ?? []).map((s) => ({ ...s, kind: 'web' })) as Sub[]
    } else {
      subs = first.data as Sub[]
    }
    void hasKind

    if (!subs || subs.length === 0) {
      return json({ sent: 0, message: 'Nenhum aparelho subscrito.' })
    }

    const expired: string[] = []
    let sentWeb = 0
    let sentFcm = 0
    // Motivos de falha, para se perceber o que corre mal num teste.
    const problems: string[] = []

    // ---------- Web Push (browser / PWA) ----------
    const webSubs = subs.filter((s) => s.kind !== 'fcm')

    if (webSubs.length > 0) {
      if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
        problems.push('Web Push sem chaves VAPID configuradas.')
      } else {
        const payload = JSON.stringify({ title, body, tag, url })
        await Promise.all(
          webSubs.map(async (s) => {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
              )
              sentWeb++
            } catch (err) {
              const status = (err as { statusCode?: number }).statusCode
              const detail = (err as { body?: string }).body ?? (err as Error).message
              // 404/410 = o browser já cancelou a subscrição.
              // Chaves inválidas = registo corrompido (não vai funcionar nunca).
              const isDead =
                status === 404 ||
                status === 410 ||
                /p256dh value should be 65 bytes|auth value/i.test(String(detail))

              if (isDead) {
                expired.push(s.id)
                problems.push(`Subscrição web inválida removida (${status ?? 'chaves más'}).`)
              } else {
                problems.push(`Web Push falhou (${status ?? 'sem código'}): ${detail}`)
              }
            }
          }),
        )
      }
    }

    // ---------- APK Android (Firebase) ----------
    const fcmSubs = subs.filter((s) => s.kind === 'fcm')

    if (fcmSubs.length > 0 && !FCM_SERVICE_ACCOUNT) {
      problems.push('APK/FCM sem o secret FCM_SERVICE_ACCOUNT configurado.')
    }

    if (fcmSubs.length > 0 && FCM_SERVICE_ACCOUNT) {
      try {
        const token = await getFcmAccessToken(FCM_SERVICE_ACCOUNT)
        const projectId = JSON.parse(FCM_SERVICE_ACCOUNT).project_id as string

        await Promise.all(
          fcmSubs.map(async (s) => {
            try {
              const res = await fetch(
                `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    message: {
                      token: s.endpoint,
                      notification: { title, body },
                      android: {
                        priority: 'high',
                        notification: { sound: 'default', channel_id: 'flowtask' },
                      },
                      data: { tag: tag ?? '', url: url ?? '/' },
                    },
                  }),
                },
              )
              if (res.ok) {
                sentFcm++
              } else {
                const errText = await res.text()
                // Token inválido/desregistado -> limpar
                if (res.status === 404 || errText.includes('UNREGISTERED')) {
                  expired.push(s.id)
                  problems.push('Token do APK já não é válido (removido).')
                } else {
                  problems.push(`FCM falhou (${res.status}): ${errText.slice(0, 300)}`)
                }
              }
            } catch (err) {
              problems.push(`FCM erro de rede: ${(err as Error).message}`)
            }
          }),
        )
      } catch (err) {
        // Conta de serviço inválida — não bloqueia os Web Push
        problems.push(`Conta de serviço do Firebase inválida: ${(err as Error).message}`)
      }
    }

    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expired)
    }

    return json({
      sent: sentWeb + sentFcm,
      web: sentWeb,
      fcm: sentFcm,
      removed: expired.length,
      total: subs.length,
      // Só aparece quando algo corre mal — ajuda a diagnosticar.
      problems: problems.length > 0 ? problems : undefined,
    })
  } catch (err) {
    // Mensagem legível: o Supabase às vezes devolve objetos em vez de texto.
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : JSON.stringify(err)
    return json({ error: msg }, 500)
  }
})

/* ------------------------------------------------------------------ */
/*                    Token de acesso do Firebase                      */
/* ------------------------------------------------------------------ */

let cachedToken: { value: string; expiresAt: number } | null = null

/**
 * Gera (e guarda em cache) um token OAuth2 para a API do Firebase.
 * Usa a conta de serviço guardada no secret FCM_SERVICE_ACCOUNT.
 */
async function getFcmAccessToken(serviceAccountJson: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value

  const sa = JSON.parse(serviceAccountJson) as {
    client_email: string
    private_key: string
    token_uri?: string
  }

  // A chave vem com "\n" literais no JSON — é preciso converter em quebras reais.
  const key = await importPKCS8(sa.private_key.replace(/\\n/g, '\n'), 'RS256')

  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience(sa.token_uri ?? 'https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const res = await fetch(sa.token_uri ?? 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) throw new Error('Não foi possível obter o token do Firebase.')

  cachedToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600),
  }
  return cachedToken.value
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
