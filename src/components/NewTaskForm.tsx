import { useMemo, useState } from 'react'
import type { Session } from '../types'
import { store } from '../lib/store'
import { formatEuro, toISODate } from '../lib/week'

interface Props {
  session: Session
  onCreated: () => void
}

/** Valores rápidos (em cêntimos). */
const PRICE_PRESETS = [100, 250, 500, 750, 1000, 1500, 2000, 2500]

/** Sugestões de tarefas comuns. */
const TITLE_SUGGESTIONS = [
  'Lavar a louça',
  'Lavar a roupa',
  'Estender a roupa',
  'Aspirar a casa',
  'Limpar o pó',
  'Arrumar o quarto',
  'Fazer a cama',
  'Limpar a casa de banho',
  'Pôr a mesa',
  'Levar o lixo',
  'Passear o cão',
  'Regar as plantas',
  'Ir às compras',
  'Cozinhar o jantar',
]

function addDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** "Hoje", "Amanhã" ou a data por extenso. */
function describeDue(iso: string): string {
  const today = toISODate(new Date())
  if (iso === today) return 'hoje'
  if (iso === addDaysISO(1)) return 'amanhã'
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long' }).format(new Date(y, m - 1, d))
}

export function NewTaskForm({ session, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cents = useMemo(() => {
    const n = Number.parseFloat(price.replace(',', '.'))
    return Number.isFinite(n) ? Math.round(n * 100) : 0
  }, [price])

  // Datas calculadas uma única vez (não a cada render)
  const [{ today, duePresets }] = useState(() => {
    const day = new Date().getDay() // 0 = domingo
    const daysToSaturday = (6 - day + 7) % 7 || 7
    return {
      today: toISODate(new Date()),
      duePresets: [
        { label: 'Hoje', value: addDaysISO(0) },
        { label: 'Amanhã', value: addDaysISO(1) },
        { label: 'Fim de semana', value: addDaysISO(daysToSaturday) },
        { label: 'Sem prazo', value: '' },
      ],
    }
  })

  function pickPreset(value: number) {
    setPrice((value / 100).toFixed(2).replace('.', ','))
    setError(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return setError('Dá um nome à tarefa.')
    if (cents <= 0) return setError('Indica um preço maior que 0 €.')

    setBusy(true)
    setError(null)
    try {
      await store.createTask(session, {
        title: title.trim(),
        description: description.trim() || null,
        priceCents: cents,
        dueDate: dueDate || null,
      })
      setTitle('')
      setDescription('')
      setPrice('')
      setDueDate('')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a tarefa.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="task-form" onSubmit={submit}>
      {/* ---------- 1. Nome ---------- */}
      <div className="field">
        <label htmlFor="title" className="field-label">
          O que há para fazer?
        </label>
        <input
          id="title"
          className="input-lg"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setError(null)
          }}
          placeholder="Ex.: Lavar a louça"
          autoComplete="off"
          autoFocus
        />
        <div className="suggestions">
          {TITLE_SUGGESTIONS.filter(
            (s) => !title || (s.toLowerCase().includes(title.toLowerCase()) && s !== title),
          )
            .slice(0, 6)
            .map((s) => (
              <button key={s} type="button" className="suggestion" onClick={() => setTitle(s)}>
                {s}
              </button>
            ))}
        </div>
      </div>

      {/* ---------- 2. Detalhes ---------- */}
      <div className="field">
        <label htmlFor="desc" className="field-label">
          Detalhes <span className="optional">(opcional)</span>
        </label>
        <textarea
          id="desc"
          className="input-lg"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex.: inclui secar e arrumar os armários"
          rows={3}
        />
      </div>

      {/* ---------- 3. Valor ---------- */}
      <div className="field">
        <label htmlFor="price" className="field-label">
          Quanto vale?
        </label>
        <div className="price-input">
          <input
            id="price"
            className="input-lg"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value)
              setError(null)
            }}
            placeholder="0,00"
            inputMode="decimal"
          />
          <span className="price-suffix">€</span>
        </div>
        <div className="presets">
          {PRICE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={`preset ${cents === p ? 'on' : ''}`}
              onClick={() => pickPreset(p)}
            >
              {formatEuro(p)}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- 4. Prazo ---------- */}
      <div className="field">
        <label htmlFor="due" className="field-label">
          Prazo <span className="optional">(opcional)</span>
        </label>
        <div className="presets">
          {duePresets.map((opt) => (
            <button
              key={opt.label}
              type="button"
              className={`preset ${dueDate === opt.value ? 'on' : ''}`}
              onClick={() => setDueDate(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          id="due"
          className="input-lg"
          type="date"
          value={dueDate}
          min={today}
          onChange={(e) => setDueDate(e.target.value)}
        />
        {dueDate && (
          <span className="field-hint">
            Tem de estar feita até <b>{describeDue(dueDate)}</b>.
          </span>
        )}
      </div>

      {/* ---------- Resumo ---------- */}
      <div className="task-summary">
        <div>
          <span className="summary-label">Tarefa</span>
          <b>{title.trim() || '—'}</b>
        </div>
        <div>
          <span className="summary-label">Valor</span>
          <b>{cents > 0 ? formatEuro(cents) : '—'}</b>
        </div>
        <div>
          <span className="summary-label">Prazo</span>
          <b>{dueDate ? describeDue(dueDate) : 'Sem prazo'}</b>
        </div>
      </div>

      <button className="btn block btn-lg" type="submit" disabled={busy}>
        {busy ? 'A criar…' : 'Criar tarefa'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
