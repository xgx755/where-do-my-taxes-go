/**
 * TaxToServices.jsx
 * -----------------
 * Purpose-based "Where your taxes go" section.
 *
 * Buckets spending by public purpose rather than a coarse four-bucket model.
 * Each row preserves local, state, and federal contributions so the user can
 * see both what the money funds and which level is doing the funding.
 */

import { useState } from 'react'
import { getTaxonomyAllocations, formatCurrency } from '../lib/taxUtils'

const LEVEL_LABELS = {
  local: 'Local',
  state: 'State',
  federal: 'Federal',
}

const LEVEL_COLORS = {
  local: 'var(--chart-property)',
  state: 'var(--chart-state)',
  federal: 'var(--chart-federal)',
}

const LEVEL_ORDER = ['local', 'state', 'federal']

function DataQualityFlag({ flag, county }) {
  const [open, setOpen] = useState(false)
  if (!flag || flag === 'ok') return null

  return (
    <span className="dq-flag">
      <button
        type="button"
        className="dq-flag__trigger"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        aria-label="Data quality note"
      >
        *
      </button>
      {open && (
        <span className="dq-flag__body" role="tooltip">
          {county} is not included in the NC DST AFIR FY2025 dataset. Local allocation uses statewide average.
        </span>
      )}
    </span>
  )
}

function levelShare(amount, total) {
  return total > 0 ? (amount / total) * 100 : 0
}

function getLevelSummaryRows(rows, grandTotal) {
  return LEVEL_ORDER.map(level => {
    const total = rows.reduce((sum, row) => sum + (row[`${level}Amount`] ?? 0), 0)
    const topRow = rows.reduce((best, row) => {
      const candidate = row[`${level}Amount`] ?? 0
      if (!best || candidate > (best[`${level}Amount`] ?? 0)) return row
      return best
    }, null)

    return {
      level,
      label: LEVEL_LABELS[level],
      total,
      pct: levelShare(total, grandTotal),
      topPurpose: topRow?.label ?? 'No allocation',
      topPurposeAmount: topRow?.[`${level}Amount`] ?? 0,
    }
  })
}

function SourceList({ sources }) {
  const grouped = {
    local: sources.filter(s => s.level === 'local'),
    state: sources.filter(s => s.level === 'state'),
    federal: sources.filter(s => s.level === 'federal'),
  }

  return (
    <div className="tts-source-list">
      {(['local', 'state', 'federal']).map(level => {
        const levelSources = grouped[level]
        if (levelSources.length === 0) return null
        return (
          <div key={level} className="tts-source-group">
            <div className="tts-source-group__title">{LEVEL_LABELS[level]}</div>
            <div className="tts-source-group__items">
              {levelSources.map(source => (
                <div key={source.key} className="tts-source-row">
                  <span className="tts-source-row__label">{source.label}</span>
                  <span className="tts-source-row__amount">{formatCurrency(source.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function TaxToServices({ record, county, localAllocations, municipalAddition = 0 }) {
  const [openRow, setOpenRow] = useState(null)
  if (!record) return null

  const taxonomy = getTaxonomyAllocations(record, localAllocations, municipalAddition)
  if (!taxonomy) return null

  const { rows, localDataFlag } = taxonomy
  const levelSummaries = getLevelSummaryRows(rows, taxonomy.grandTotal)

  return (
    <section className="tts-section" aria-labelledby="tts-heading">
      <div className="tts-header">
        <div>
          <h2 className="section-heading" id="tts-heading">
            Where your taxes go
          </h2>
          <p className="tts-subtitle">
            A compact summary shows the level split at a glance. Open the details to see how each level is
            distributed across public purposes.
            <DataQualityFlag flag={localDataFlag} county={county} />
          </p>
        </div>

        <div className="tts-legend" aria-hidden="true">
          <span className="tts-legend__item">
            <span className="tts-legend__swatch" style={{ background: LEVEL_COLORS.local }} />
            Local
          </span>
          <span className="tts-legend__item">
            <span className="tts-legend__swatch" style={{ background: LEVEL_COLORS.state }} />
            State
          </span>
          <span className="tts-legend__item">
            <span className="tts-legend__swatch" style={{ background: LEVEL_COLORS.federal }} />
            Federal
          </span>
        </div>
      </div>

      <div className="tts-summary" aria-label="Tax to services summary">
        <div className="tts-summary__bar" aria-hidden="true">
          {levelSummaries.map(level => (
            <span
              key={level.level}
              className="tts-summary__segment"
              style={{
                width: `${Math.max(level.pct, level.total > 0 ? 2 : 0)}%`,
                background: LEVEL_COLORS[level.level],
              }}
            />
          ))}
        </div>

        <div className="tts-summary__tiles">
          {levelSummaries.map(level => (
            <article key={level.level} className="tts-summary__tile">
              <div className="tts-summary__tile-head">
                <span className="tts-summary__tile-label">{level.label}</span>
                <span className="tts-summary__tile-pct">{level.pct.toFixed(0)}%</span>
              </div>
              <div className="tts-summary__tile-amount">{formatCurrency(level.total)}</div>
              <div className="tts-summary__tile-purpose">
                Top purpose: {level.topPurpose}
              </div>
              <div className="tts-summary__tile-purpose-amount">
                {formatCurrency(level.topPurposeAmount)}
              </div>
            </article>
          ))}
        </div>
      </div>

      <details className="tts-details">
        <summary className="tts-details__summary">See detailed purpose breakdown</summary>

        <div className="tts-purpose-list" role="list" aria-label="Tax to services by purpose">
          {rows.map(row => {
            const isOpen = openRow === row.key
            const localPct = levelShare(row.localAmount, row.total)
            const statePct = levelShare(row.stateAmount, row.total)
            const federalPct = levelShare(row.federalAmount, row.total)

            return (
              <article key={row.key} className="tts-purpose-card" role="listitem">
                <div className="tts-purpose-card__head">
                  <div>
                    <h3 className="tts-purpose-card__title">{row.label}</h3>
                    <p className="tts-purpose-card__meta">
                      {formatCurrency(row.total)} · {levelShare(row.total, taxonomy.grandTotal).toFixed(0)}% of total burden
                    </p>
                  </div>
                  <div className="tts-purpose-card__totals">
                    <span>Local {formatCurrency(row.localAmount)}</span>
                    <span>State {formatCurrency(row.stateAmount)}</span>
                    <span>Federal {formatCurrency(row.federalAmount)}</span>
                  </div>
                </div>

                <div className="tts-purpose-card__bar" aria-hidden="true">
                  {row.localAmount > 0 && (
                    <span
                      className="tts-purpose-card__segment"
                      style={{ width: `${localPct}%`, background: LEVEL_COLORS.local }}
                    />
                  )}
                  {row.stateAmount > 0 && (
                    <span
                      className="tts-purpose-card__segment"
                      style={{ width: `${statePct}%`, background: LEVEL_COLORS.state }}
                    />
                  )}
                  {row.federalAmount > 0 && (
                    <span
                      className="tts-purpose-card__segment"
                      style={{ width: `${federalPct}%`, background: LEVEL_COLORS.federal }}
                    />
                  )}
                </div>

                <div className="tts-purpose-card__chips" aria-hidden="true">
                  {row.localAmount > 0 && <span className="tts-purpose-chip">Local</span>}
                  {row.stateAmount > 0 && <span className="tts-purpose-chip">State</span>}
                  {row.federalAmount > 0 && <span className="tts-purpose-chip">Federal</span>}
                </div>

                <button
                  type="button"
                  className="tts-purpose-card__toggle"
                  onClick={() => setOpenRow(isOpen ? null : row.key)}
                  aria-expanded={isOpen}
                >
                  {isOpen ? 'Hide source detail' : 'See source detail'}
                </button>

                {isOpen && <SourceList sources={row.sources} />}
              </article>
            )
          })}
        </div>
      </details>

      <table className="sr-only" aria-label="Tax to services by purpose table">
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Local</th>
            <th>State</th>
            <th>Federal</th>
            <th>Total</th>
            <th>% of total burden</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key}>
              <td>{row.label}</td>
              <td>{formatCurrency(row.localAmount)}</td>
              <td>{formatCurrency(row.stateAmount)}</td>
              <td>{formatCurrency(row.federalAmount)}</td>
              <td>{formatCurrency(row.total)}</td>
              <td>{levelShare(row.total, taxonomy.grandTotal).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="tts-note">
        The chart groups spending by public purpose rather than by a generic catch-all list.
        Where a source does not fit cleanly, it remains visible in the explicit residual bucket.
        Sources: OSBM FY2024 (state), NC DST County AFIR FY2025 (local), OMB Table 3.2 FY2023 (federal).
      </p>
    </section>
  )
}
