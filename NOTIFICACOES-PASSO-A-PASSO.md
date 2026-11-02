# Notificações push — guia de configuração

A app já está preparada. Faltam **3 passos** do teu lado (uns 15 minutos, uma vez só).

---

## O que já está feito no código

- ✅ Botão **"🔔 Ativar notificações"** na app (trabalhador e chefe)
- ✅ Service worker que recebe os pushes e mostra a notificação
- ✅ Tabela `push_subscriptions` no `schema.sql`
- ✅ Edge Function `send-push` em `supabase/functions/send-push/index.ts`
- ✅ Avisos automáticos:
  - **Nova tarefa** → trabalhador
  - **Tarefa feita** → chefe
  - **Tarefa recusada** (com motivo) → chefe
  - **Pedido de pagamento** → chefe

---

## Passo 1 — Correr o SQL atualizado

No **Supabase → SQL Editor**, cola o [schema.sql](schema.sql) completo e clica **Run**.

Isto cria a tabela `push_subscriptions` e as funções de subscrição.

> É seguro correr outra vez — usa `if not exists` e `create or replace`.

---

## Passo 2 — Publicar a Edge Function

### Opção A — Pelo painel da Supabase (sem instalar nada)

1. **Supabase → Edge Functions → Deploy a new function**
2. Nome: **`send-push`**
3. Cola o conteúdo de [`supabase/functions/send-push/index.ts`](functions/send-push/index.ts)
4. **Desliga** "Verify JWT" (a app usa a chave publishable)
5. **Deploy**

### Opção B — Com a CLI

```bash
npm install -g supabase
supabase login
supabase link --project-ref qocwfxvbenarabrumovc
supabase functions deploy send-push --no-verify-jwt
```

---

## Passo 3 — Adicionar os secrets

Em **Supabase → Edge Functions → Secrets** (ou `supabase secrets set ...`):

| Nome | Valor |
| --- | --- |
| `VAPID_PUBLIC_KEY` | `BNQThhvufnSV8cZHzUBtdPo03ETBYoFQeTmCrgBa5J0r8aWTRp9cUBAN3IrlHdwdnIJK1-ESUR2-0_owhs7yOJk` |
| `VAPID_PRIVATE_KEY` | `avLGsSeFYWkQXLYE3BdxID0MTX3DouBOCc-VGQlp5iI` |
| `VAPID_SUBJECT` | `mailto:joaquimalbuquerque05@gmail.com` |

> ⚠️ A **privada** só vai para a Supabase. Nunca para a app nem para o GitHub.

---

## Passo 4 — Testar

1. Abre a app no telemóvel ou PC
2. Faz scroll até ao fim → **"🔔 Ativar notificações"**
3. Aceita a permissão
4. Clica em **"Testar"** → deve aparecer uma notificação

Depois testa o fluxo real:
- No **chefe**, cria uma tarefa → o **trabalhador** recebe notificação
- No **trabalhador**, marca como feita → o **chefe** recebe

---

## Limitações por aparelho

| Aparelho | Push com app fechada |
| --- | --- |
| **Android + Chrome** | ✅ Funciona |
| **PC + Chrome/Edge** | ✅ Funciona |
| **iPhone + Safari** | ⚠️ Só se a app estiver **instalada no ecrã inicial** (iOS 16.4+) |
| **iPhone sem instalar** | ❌ A Apple não permite |

### Como instalar no iPhone
Abrir o link no **Safari** → **Partilhar** → **Adicionar ao Ecrã Principal** → abrir pelo ícone → ativar notificações.

---

## Problemas comuns

| Problema | Solução |
| --- | --- |
| Botão diz "indisponíveis" | No iPhone, instala a app. No PC, usa Chrome/Edge |
| Botão diz "só com a app ligada à nuvem" | Falta o `.env.local` ou o deploy na Vercel |
| Não recebo nada | Confirma os 3 secrets e que a função está **deployed** |
| "Bloqueaste as notificações" | Cadeado ao lado do link → Notificações → Permitir |
| Funciona no PC mas não no telemóvel | Verifica a tabela de limitações acima |

---

## Ainda não implementado (podes pedir)

- **Lembrete automático de fim de semana** — precisa de um cron job na Supabase (Edge Function agendada, sábado às 10h)
- **Aviso de prazo a chegar** — idem, cron diário
- **Notificação de pagamento feito** → trabalhador

Estes precisam de *pg_cron* ou de um agendador externo, porque têm de correr sem ninguém abrir a app.
