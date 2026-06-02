/**
 * StateTaxTrendChart.jsx
 * ----------------------
 * Feature 3: Historical NC state income tax trend (2020–2026).
 * Shown inline when user clicks "See trend" on the state income tax row.
 *
 * Shows how the tax rate phasedown has affected the selected income bracket.
 * Declarative title computed dynamically from data.
 * Required caveat: "All other factors held constant at current values."
 */

import { getStateTaxTrend } from '../lib/rateHistory'
import { formatCurrency } from '../lib/taxUtils'

// Simple SVG line chart — no external dependencies
function TrendSVG({ data }) {
  const W = 480
  const H = 140
  const PAD = { top: 20, right: 20, bottom: 40, left: 60 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const amounts = data.map(d => d.amount)
  const minY = Math.min(...amounts) * 0.9
  const maxY = Math.max(...amounts) * 1.05

  const xScale = i => PAD.left + (i / (data.length - 1)) * chartW
  const yScale = v => PAD.top + chartH - ((v - minY) / (maxY - minY)) * chartH

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.amount)}`).join(' ')
  const currentYear = data[data.length - 1]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="trend-svg"
      role="img"
      aria-label={`NC state income tax trend 2020–2026`}
    >
      {/* Gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const y = PAD.top + chartH * frac
        const val = Math.round(maxY - (maxY - minY) * frac)
        return (
          <g key={frac}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
              stroke="var(--border)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end"
              className="trend-axis-label">
              ${val.toLocaleString()}
            </text>
          </g>
        )
      })}

      {/* X axis labels */}
      {data.map((d, i) => (
        <text
          key={d.year}
          x={xScale(i)}
          y={H - PAD.bottom + 18}
          textAnchor="middle"
          className="trend-axis-label"
        >
          {d.year}
        </text>
      ))}

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="var(--chart-state)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {data.map((d, i) => {
        const isCurrent = d.year === 2026
        return (
          <circle
            key={d.year}
            cx={xScale(i)}
            cy={yScale(d.amount)}
            r={isCurrent ? 5 : 3.5}
            fill={isCurrent ? 'var(--chart-state)' : 'var(--surface)'}
            stroke="var(--chart-state)"
            strokeWidth="2"
          />
        )
      })}

      {/* Current year annotation */}
      <text
        x={xScale(data.length - 1)}
        y={yScale(currentYear.amount) - 10}
        textAnchor="middle"
        className="trend-current-label"
      >
        {formatCurrency(currentYear.amount)}
      </text>
    </svg>
  )
}

export default function StateTaxTrendChart({ bracket }) {
  const trend = getStateTaxTrend(bracket)
  if (!trend || trend.length === 0) return null

  const earliest = trend[0]
  const latest   = trend[trend.length - 1]
  const delta    = latest.amount - earliest.amount
  const absDelta = Math.abs(delta)
  const bracketLabel = bracket

  // Declarative title: "NC income tax on a $50K household has fallen by $X since 2020"
  const title = delta < 0
    ? `NC income tax on a ${bracketLabel} household has fallen by ${formatCurrency(absDelta)} since 2020`
    : delta > 0
      ? `NC income tax on a ${bracketLabel} household has risen by ${formatCurrency(absDelta)} since 2020`
      : `NC income tax on a ${bracketLabel} household is unchanged since 2020`

  return (
    <div className="trend-panel">
      <p className="trend-title">{title}</p>
      <TrendSVG data={trend} />
      <p className="trend-caveat">
        All other factors held constant at current values — only the tax rate and standard
        deduction change year over year. Property tax rates, home values, and spending
        patterns are not varied historically.
      </p>
      <table className="trend-table sr-only" aria-label="State income tax by year">
        <thead><tr><th>Year</th><th>Rate</th><th>Est. Annual Tax</th></tr></thead>
        <tbody>
          {trend.map(row => (
            <tr key={row.year}>
              <td>{row.year}</td>
              <td>{(row.rate * 100).toFixed(2)}%</td>
              <td>{formatCurrency(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
