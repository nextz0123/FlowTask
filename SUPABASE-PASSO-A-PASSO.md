# Passo a passo: ligar o FlowTask à Supabase

Tempo: **~10 minutos**. Custo: **0 €** (plano gratuito).

No fim, a tua mãe (chefe) e tu (trabalhador) vão ver **as mesmas tarefas**, cada um no seu telemóvel ou PC.

---

## Passo 1 — Criar conta e projeto na Supabase

1. Vai a **https://supabase.com** e clica em **Start your project**.
2. Entra com **GitHub** ou **email**.
3. Clica em **New project**.
4. Preenche:
   - **Organization**: deixa o que está (ou cria "Família")
   - **Project name**: `flowtask`
   - **Database Password**: clica em **Generate a password** e **guarda-a** (não precisas dela para a app, mas guarda)
   - **Region**: escolhe **Europe (Frankfurt)** ou **West EU (Ireland)** — mais perto de Portugal
5. Clica em **Create new project** e espera **1–2 minutos** até aparecer "Project is ready".

---

## Passo 2 — Criar as tabelas (copiar e colar)

1. No menu da esquerda, clica em **SQL Editor** (ícone `>_`).
2. Clica em **+ New query**.
3. Abre o ficheiro **`supabase/schema.sql`** desta pasta, **seleciona tudo** (Ctrl+A) e **copia** (Ctrl+C).
4. Cola no editor da Supabase.
5. Clica em **Run** (ou Ctrl+Enter).

Deves ver no fundo: **"Success. No rows returned"**.

> ⚠️ **Se já tentaste correr o script antes e deu erro**, pode ter ficado uma tabela `tasks` incompleta.
> Limpa primeiro com este bloco (também no SQL Editor) e depois repete o Passo 2:
>
> ```sql
> drop table if exists public.tasks cascade;
> drop table if exists public.payments cascade;
> drop table if exists public.members cascade;
> drop table if exists public.households cascade;
> ```
>
> Isto **apaga os dados** — só faz sentido enquanto ainda não há nada a guardar.

> ✅ Podes confirmar que o ficheiro está correto antes de o colar, correndo `pnpm check:schema` no terminal.

---

## Passo 3 — Confirmar que a família foi criada

1. No menu da esquerda, clica em **Table Editor**.
2. Abre a tabela **`households`**.

Deves ver uma linha com `invite_code` = **`FAMILIA`**.

> Este é o **código da família**. Podes mudar para algo mais difícil de adivinhar (ex.: `CASA-7K2P`) clicando no valor e editando. **Usa o mesmo código nos dois telemóveis.**

---

## Passo 4 — Copiar as duas chaves

1. No menu da esquerda, em baixo, clica em **Project Settings** (ícone de engrenagem).
2. Abre o separador **API Keys**.
3. Copia dois valores:
   - **Project URL** — algo como `https://abcdefghijklm.supabase.co`
     (está em **Project Settings → Data API**, campo *Project URL*)
   - **Publishable key** — começa por `sb_publishable_...`

> ⚠️ **Usa a *Publishable key*.** NUNCA uses a **Secret key** (`sb_secret_...`): essa dá acesso total à base de dados e não pode estar na app.
>
> Se o teu projeto ainda mostrar as chaves antigas (*Legacy anon, service_role API keys*), podes usar a **anon public** (começa por `eyJ...`) — a app aceita os dois formatos.

---

## Passo 5 — Colar as chaves na app

1. Abre o ficheiro **`.env.local`** na pasta `tarefas-app` (já existe, está vazio).
2. Preenche assim (sem aspas, sem espaços):

```env
VITE_SUPABASE_URL=https://abcdefghijklm.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_GeAwDmVN3VhWFXxq391z-Q_SUQZ5q1w
```

3. **Guarda** o ficheiro.

---

## Passo 6 — Reiniciar a app

**Importante:** as variáveis só são lidas ao arrancar.

1. Se o servidor estiver a correr, para-o (**Ctrl+C** no terminal).
2. Arranca outra vez:

```bash
cd tarefas-app
pnpm dev
```

3. Abre **http://localhost:5173**.

---

## Passo 7 — Confirmar que está ligado à nuvem

Na página de entrada:

- ✅ **Já não aparece** o aviso amarelo *"Modo demonstração"* → está ligado à Supabase.
- ❌ Se ainda aparecer, volta ao Passo 5 (verifica se guardaste o ficheiro) e ao Passo 6 (reinicia).

**Teste rápido:**
1. Entra com o código `FAMILIA`, papel **Chefe**, nome `Mãe`.
2. Cria uma tarefa.
3. Abre uma **janela anónima** (Ctrl+Shift+N), vai ao mesmo link, entra como **Trabalhador**.
4. A tarefa deve aparecer lá. 🎉

> Em modo demonstração isto **não** funciona (cada janela tem os seus dados). Se aparecer, é sinal de que a nuvem está ligada.

---

## Passo 8 — Publicar na Vercel

Há dois métodos. O **A** é o mais rápido; o **B** evita trabalho repetido.

### Método A — Arrastar a pasta `dist` (rápido)

1. No terminal, dentro de `tarefas-app`:

```bash
pnpm build
```

2. Vai a **https://vercel.com** → **Add New → Project**.
3. Escolhe **Deploy** e **arrasta a pasta `dist`**:

```
C:\Users\Kanjispc\Documents\aplicativos\tarefas-app\dist
```

4. Espera ~30 segundos. Recebes um link tipo `https://flowtask-xxxx.vercel.app`.

> As chaves da Supabase já vão **dentro** do `dist` (o `.env.local` é lido no `pnpm build`).
> Por isso **não precisas de variáveis** na Vercel com este método.

### Método B — Ligar ao GitHub (automático, recomendado)

Depois de configurado, cada `git push` publica sozinho.

1. Cria um repositório no **GitHub**.
2. No terminal, dentro de `tarefas-app`:

```bash
git init
git add .
git commit -m "FlowTask"
git remote add origin https://github.com/O-TEU-UTILIZADOR/flowtask.git
git push -u origin main
```

3. Na Vercel: **Add New → Project → Import** o repositório.
4. Em **Environment Variables**, adiciona (tipo **Config**):

| Key | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://o-teu-projeto.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` |

5. **Deploy**.

---

## Como atualizar o site depois de mudar o código

### Se usaste o Método A (arrastar)

Não existe "atualizar" no mesmo deploy — tens de **criar um deploy novo**:

1. `pnpm build` (no terminal, dentro de `tarefas-app`)
2. Vercel → **Add New → Project** → **Deploy** → arrasta outra vez a pasta `dist`
3. Abres o link novo

> ⚠️ O botão **Redeploy** no projeto antigo **não funciona** para deploys por arrastar —
> aparece o aviso *"Prebuilt deployments cannot be redeployed…"*. É normal.

### Se usaste o Método B (GitHub)

1. Faz as alterações
2. No terminal:

```bash
git add .
git commit -m "Descrição da alteração"
git push
```

3. A Vercel publica sozinha em ~1 minuto. Não precisas de fazer mais nada.

### Depois de publicar (nos dois métodos)

- **No telemóvel**, fecha e abre a app. Se continuar igual, puxa para atualizar.
- A app avisa sozinha quando há versão nova e atualiza ao reabrir.
- O link muda no Método A; no Método B o link é sempre o mesmo.

---

### Instalar no telemóvel

- **Android (Chrome)**: abre o link → menu ⋮ → **Instalar aplicação**
- **iPhone (Safari)**: abre o link → Partilhar → **Adicionar ao Ecrã Principal**
- **PC (Chrome/Edge)**: ícone de instalar na barra de endereço

Depois entra em cada telemóvel com o **mesmo código de família**.
---

## Problemas comuns

| Problema | Causa | Solução |
| --- | --- | --- |
| Ainda aparece "Modo demonstração" | `.env.local` vazio ou servidor não reiniciado | Preenche o ficheiro e reinicia `pnpm dev` |
| `Código de família inválido` | O código não existe na tabela `households` | Vê o Passo 3; o código é `FAMILIA` por omissão |
| `Invalid API key` | Colaste a chave errada ou com espaços | Usa a **Publishable key** (`sb_publishable_...`), sem aspas nem espaços |
| `Estás a usar a chave SECRETA` | Colaste a `sb_secret_...` | Troca pela **Publishable key** — a secret nunca vai na app |
| `function ... does not exist` | O `schema.sql` não foi corrido | Repete o Passo 2 |
| `relation "public.payments" does not exist` | Versão antiga do `schema.sql` (bug corrigido) | Usa o `schema.sql` atual e limpa as tabelas (ver aviso no Passo 2) |
| `É obrigatório indicar o motivo` | Comportamento normal | A recusa exige sempre um motivo |
| Os dados não aparecem no outro telemóvel | Cada um está em modo demo | Confirma o Passo 7 nos dois aparelhos |
| Tarefas duplicadas | Duas pessoas criaram a mesma | Apaga na secção **Tarefas** |

---

## Segurança (leitura rápida)

- As tabelas estão **fechadas ao público** (RLS ligado, sem políticas).
- A app só acede através de funções SQL que **validam o código da família**.
- Quem souber o código entra na família → **escolhe um código difícil** (ex.: `CASA-7K2P`).
- A chave `anon` é pública por desenho; **nunca** ponhas a `service_role` na app.
