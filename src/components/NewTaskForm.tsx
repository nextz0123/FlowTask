import { useState } from 'react'
import type { Session } from '../types'
import { store } from '../lib/store'

interface Props {
  session: Session
  onCreated: () => void
}

export function NewTaskForm({ session, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(Number.parseFloat(price.replace(',', '.')) * 100)
    if (!title.trim()) return setError('Dá um nome à tarefa.')
    if (!Number.isFinite(cents) || cents <= 0) return setError('Indica um preço maior que 0 €.')

    setBusy(true)
    setError(null)
    try {
      await store.createTask(session, {
        title: title.trim(),
        description: description.trim() || null,
        priceCents: cents,
      })
      setTitle('')
      setDescription('')
      setPrice('')
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a tarefa.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Nova tarefa</h2>
      <div className="field">
        <label htmlFor="title">O que há para fazer?</label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Lavar a louça"
        />
      </div>
      <div className="field">
        <label htmlFor="desc">Detalhes (opcional)</label>
        <textarea
          id="desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex.: inclui secar e arrumar os armários"
          rows={2}
        />
      </div>
      <div className="field">
        <label htmlFor="price">Quanto vale? (€)</label>
        <input
          id="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="5,00"
          inputMode="decimal"
        />
      </div>
      <button className="btn block" type="submit" disabled={busy}>
        {busy ? 'A criar…' : 'Criar tarefa'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}
