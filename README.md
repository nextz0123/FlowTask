# FlowTask 💶

App web (funciona no **telemóvel** e no **PC**) para a tua mãe criar tarefas com um preço,
tu marcares como feitas, o valor **acumular durante a semana** e no **fim de semana** aparecer
o lembrete para ela pagar — com **MB Way**, **Dinheiro** ou **Outro**.

Pode ser instalada como app (PWA) no telemóvel e no PC, com ícone próprio.

---

## Como funciona

| Quem | O que vê / faz |
| --- | --- |
| **Chefe** | Painel simples: 3 números grandes (por pagar, esta semana, por fazer), lista de tarefas e um gráfico. **Só o chefe paga.** |
| **Trabalhador/a** | Vê as tarefas, marca as que fez (✓), **recusa tarefas indicando o motivo**, e vê o saldo que vai acumulando. |

### Recusar uma tarefa (trabalhador)

Em cada tarefa pendente há o botão **"Não fazer"**. É obrigatório indicar o motivo, escolhendo um dos predefinidos:

- ⏰ Não tenho tempo hoje
- 🤒 Não me sinto bem
- 🎒 Tenho compromissos (escola/trabalho)
- 🧰 Falta-me material/ferramenta
- 💪 É demasiado pesado para mim
- 🙅 Não sei fazer esta tarefa
- ✍️ **Outro motivo…** — escreve o motivo (até 280 caracteres)

A tarefa fica com o estado **"Não feita"** e o motivo visível. O trabalhador pode ainda mudar de ideias e marcar como feita. O chefe vê as recusas no painel, com o motivo e o valor que deixou de pagar.

### Painel do chefe

Ao entrar como **chefe**, abre um painel **simples**, pensado para se perceber num segundo:

- **3 números grandes**: **Por pagar** (€), **Esta semana** (€ ganho) e **Por fazer** (nº de tarefas).
- **Avisos claros**: lembrete de fim de semana para pagar, e tarefas que o trabalhador recusou (com o motivo).
- **Lista de tarefas por fazer** e **lista das feitas por pagar** — com o botão de pagar em baixo.
- **Um só gráfico**: ganhos das últimas 8 semanas.
- **Barra lateral** com apenas 3 secções: Início, Tarefas e Histórico.
- **Tarefas**: criar, pesquisar e filtrar (Todas / Por fazer / Feitas / Recusadas / Pagas).
- **Tema claro/escuro** (botão ☾/☀ no topo), lembrado no aparelho.

- O valor **acumula por semana** (segunda a domingo).
- **Sábado e domingo** aparece um **lembrete** no topo com o botão de pagamento.
- O pagamento regista o método escolhido e fecha as tarefas dessa semana.
- O **Histórico** mostra todas as semanas, quanto foi pago e como.
- O chefe pode pagar a qualquer momento (não precisa de esperar pelo fim de semana).

---

## 1. Experimentar já (modo demonstração)

Sem configurar nada, a app corre **só neste aparelho**:

```bash
cd tarefas-app
pnpm install
pnpm dev
```

Abre o link que aparecer (ex.: `http://localhost:5173`) e entra com o código **`FAMILIA`**.

> No modo demo não há sincronização entre o telemóvel da tua mãe e o teu. Para isso, faz o passo 2.

---

## 2. Ligar a nuvem (Supabase) — para os dois verem as mesmas tarefas

> 📖 **Guia completo, passo a passo (com capturas dos menus e resolução de problemas):**
> **[SUPABASE-PASSO-A-PASSO.md](SUPABASE-PASSO-A-PASSO.md)**

Resumo rápido:

1. Cria conta em <https://supabase.com> e um **New project** (região Europa).
2. **SQL Editor → New query** → cola todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. **Table Editor → households** → confirma o `invite_code` (**`FAMILIA`** por omissão; podes mudar).
4. **Project Settings → API Keys** → copia o **Project URL** e a **Publishable key** (`sb_publishable_...`).
   - ⚠️ Nunca uses a **Secret key** (`sb_secret_...`) na app.
5. Cola as duas no ficheiro **`.env.local`**:

```env
VITE_SUPABASE_URL=https://o-teu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

6. **Para e reinicia** o `pnpm dev`. O aviso de "modo demonstração" desaparece.
7. Verifica a ligação:

```bash
pnpm check:supabase
```

Este comando diz-te exatamente o que está mal (chave em falta, função não criada, código errado, sem internet).

### Segurança

- As tabelas estão **fechadas ao público** (Row Level Security ligado, sem políticas).
- Todo o acesso passa por funções SQL `security definer` que **validam o código da família**.
- Escolhe um código difícil de adivinhar (ex.: `CASA-7K2P`) e não o partilhes fora da família.

---

## 3. Publicar na internet (para usar no telemóvel)

O mais simples é a **Vercel** (gratuita):

1. Cria conta em <https://vercel.com> e importa esta pasta (ou faz push para o GitHub e importa o repositório).
2. Em **Environment Variables** adiciona `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Deploy. Ficas com um link tipo `https://flowtask.vercel.app`.

Também funciona em **Netlify** ou **Cloudflare Pages** (build: `pnpm build`, pasta de saída: `dist`).

### Instalar como app

- **Android / Chrome**: abrir o link → menu ⋮ → **Instalar app**.
- **iPhone / Safari**: abrir o link → Partilhar → **Adicionar ao Ecrã Principal**.
- **PC / Chrome ou Edge**: ícone de instalar na barra de endereço.

---

## Comandos

```bash
pnpm dev              # servidor de desenvolvimento
pnpm build            # build de produção (pasta dist/)
pnpm preview          # pré-visualizar o build
pnpm test             # testes da lógica semanal e das estatísticas
pnpm lint             # verificação de código
pnpm check:supabase   # testa a ligação à Supabase (.env.local)
pnpm check:schema     # valida o supabase/schema.sql antes de o colar
```

---

## Estrutura

```
src/
  types.ts                 tipos de dados
  index.css                estilos base (trabalhador)
  admin.css                estilos do painel do chefe (tema claro/escuro)
  lib/week.ts              lógica semanal (semanas, totais, fim de semana, euros)
  lib/stats.ts             estatísticas do painel (KPIs, série de 8 semanas, top tarefas)
  lib/store.ts             acesso a dados: Supabase (nuvem) ou demo (local)
  components/
    Login.tsx              entrar com código de família
    Dashboard.tsx          escolhe o painel conforme o papel
    TaskRow.tsx            linha de tarefa (marcar como feita)
    NewTaskForm.tsx        criar tarefa com preço (chefe)
    PaymentModal.tsx       pagar: MB Way / Dinheiro / Outro (só chefe)
    DeclineModal.tsx       recusar tarefa com motivo (trabalhador)
    History.tsx            histórico por semana
    admin/
      AdminDashboard.tsx   painel do chefe (KPIs, gráficos, tabelas)
      Sidebar.tsx          barra lateral de navegação
      Charts.tsx           gráficos (recharts)
      TasksTable.tsx       tabela com pesquisa e filtros
      ui.tsx               cartões KPI, painéis, avatar, badges
supabase/schema.sql        tabelas + funções seguras
tests/                     testes da lógica semanal e das estatísticas
```

---

## Notas

- A app **não move dinheiro real** — apenas regista o que foi pago e como. O MB Way é o método
  escolhido no registo; a transferência faz-se na app do banco.
- Os valores são guardados em **cêntimos** (inteiros), sem erros de arredondamento.
- Se quiseres, dá para acrescentar mais tarde: notificações push reais, fotos das tarefas,
  várias famílias, ou pagamento automático.
