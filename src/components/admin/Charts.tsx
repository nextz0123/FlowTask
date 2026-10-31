import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatEuro } from '../../lib/week'

interface SeriesPoint {
  label: string
  earned: number
  paid: number
}

/** Gráfico simples: valor ganho por semana (últimas 8 semanas). */
export function EarningsChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gEarned" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}€`}
          width={54}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const earned = Number(payload[0]?.value ?? 0)
            return (
              <div className="chart-tip">
                <b>Semana de {label}</b>
                <div className="row">
                  <span style={{ background: 'var(--chart-1)' }} />
                  <span>Ganho: </span>
                  <b>{formatEuro(Math.round(earned * 100))}</b>
                </div>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="earned"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#gEarned)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
