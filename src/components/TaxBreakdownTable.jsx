/**
 * TaxBreakdownTable.jsx
 * ---------------------
 * V3 updates:
 *  - Inline receipt expansion on every row (Plan A — "How?" toggle)
 *  - Trend chart moved into the state income tax receipt panel
 *  - PolicySimulation removed
 */

import { createPortal } from 'react-dom'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { TAX_ROWS, getTaxQualityFlag, formatCurrency } from '../lib/taxUtils'
import StateTaxTrendChart from './StateTaxTrendChart'

const PAYROLL_CAVEAT =
  "Employee share only. The employer's matching contribution (6.2% SS + 1.45% Medicare) is not shown — economists believe some portion falls on workers as lower wages, but this is contested and not modeled."

const RENTER_TOOLTIP =
  "Economists generally assume landlords pass property tax costs on to renters through higher rents. In weaker rental markets, landlords may absorb some of this cost, so this estimate may be slightly high."

// ── Source links ──────────────────────────────────────────────────────────────

const SOURCES = {
  property_tax: [
    { label: 'NCDOR County Tax Rates', url: 'https://www.ncdor.gov/taxes-forms/property-tax/county-and-municipal-property-tax-rates-and-latest-news' },
  ],
  state_income_tax: [
    { label: 'NCDOR Individual Income Tax', url: 'https://www.ncdor.gov/taxes-forms/individual-income-tax' },
    { label: 'NCGS § 105-153.5', url: 'https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_105/GS_105-153.5.html' },
  ],
  sales_tax_state: [
    { label: 'NCDOR Sales & Use Tax Rates', url: 'https://www.ncdor.gov/taxes-forms/sales-and-use-tax/sales-and-use-tax-rates-other-information' },
  ],
  sales_tax_local: [
    { label: 'NCDOR Sales & Use Tax Rates', url: 'https://www.ncdor.gov/taxes-forms/sales-and-use-tax/sales-and-use-tax-rates-other-information' },
  ],
  federal_income_tax: [
    { label: 'ITEP Who Pays Taxes in America', url: 'https://itep.org/whopays/' },
    { label: 'IRS SOI Tax Stats', url: 'https://www.irs.gov/statistics/soi-tax-stats-individual-statistical-tables-by-size-of-adjusted-gross-income' },
  ],
  payroll_tax: [
    { label: 'SSA Wage Base (2026)', url: 'https://www.ssa.gov/oact/cola/cbb.html' },
    { label: 'IRS Topic 751', url: 'https://www.irs.gov/taxtopics/tc751' },
  ],
}

function SourceLinks({ taxKey }) {
  const links = SOURCES[taxKey]
  if (!links || links.length === 0) return null
  return (
    <span className="receipt-sources">
      {links.map((s, i) => (
        <span key={s.url}>
          {i > 0 && ' · '}
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="receipt-source-link">
            {s.label} ↗
          </a>
        </span>
      ))}
    </span>
  )
}

// ── InlineReceipt ─────────────────────────────────────────────────────────────

function InlineReceipt({ taxKey, cell, income, housing, bracket, showTrend, onToggleTrend }) {
  if (!cell) return null

  let rows = []

  if (taxKey === 'property_tax') {
    const rate = cell.county_rate_per_100
    const homeValue = rate > 0 ? Math.round((cell.annual_burden * 100) / rate) : null
    if (housing === 'owner') {
      rows = [
        { label: 'County tax rate', value: `$${rate.toFixed(4)} per $100 assessed value` },
        { label: 'Estimated home value', value: homeValue ? formatCurrency(homeValue) : '—', note: 'ACS county median × bracket multiplier (ACS B25121)' },
        { label: 'Formula', value: homeValue ? `(${formatCurrency(homeValue)} ÷ 100) × $${rate.toFixed(4)} = ${formatCurrency(Math.round(cell.annual_burden))}/yr` : '—', mono: true },
      ]
    } else {
      const rentalUnitValue = rate > 0 ? Math.round((cell.annual_burden * 100) / rate) : null
      rows = [
        { label: 'County tax rate', value: `$${rate.toFixed(4)} per $100 assessed value` },
        { label: 'Est. rental unit value', value: rentalUnitValue ? formatCurrency(rentalUnitValue) : '—', note: 'Annual gross rent ÷ 6% cap rate' },
        { label: 'Incidence assumption', value: 'Property tax assumed fully passed through in rent (standard public finance assumption)' },
        { label: 'Annual burden', value: formatCurrency(Math.round(cell.annual_burden)), mono: true },
      ]
    }
  }

  if (taxKey === 'state_income_tax') {
    const RATE = 3.99
    const STD_DED = 13000
    const taxable = Math.max(0, income - STD_DED)
    rows = [
      { label: 'NC flat rate (2026)', value: `${RATE}%` },
      { label: 'Standard deduction (single filer)', value: formatCurrency(STD_DED), note: 'NCGS § 105-153.5' },
      { label: 'Taxable income', value: `${formatCurrency(income)} − ${formatCurrency(STD_DED)} = ${formatCurrency(taxable)}` },
      { label: 'Formula', value: `${RATE}% × ${formatCurrency(taxable)} = ${formatCurrency(Math.round(cell.annual_burden))}/yr`, mono: true },
      { label: 'Note', value: 'Uses single-filer standard deduction. Married filers receive a $26,000 deduction. No credits or itemized deductions modeled.' },
    ]
  }

  if (taxKey === 'sales_tax_state') {
    const STATE_RATE = 4.75
    const consumption = Math.round(cell.annual_burden / (STATE_RATE / 100))
    rows = [
      { label: 'NC state sales tax rate', value: `${STATE_RATE}%` },
      { label: 'Est. taxable consumption', value: formatCurrency(consumption), note: 'BLS Consumer Expenditure Survey 2024' },
      { label: 'Formula', value: `${STATE_RATE}% × ${formatCurrency(consumption)} = ${formatCurrency(Math.round(cell.annual_burden))}/yr`, mono: true },
      { label: 'Note', value: 'Groceries taxed at 2.0% NC state rate only; general merchandise at 4.75%' },
    ]
  }

  if (taxKey === 'sales_tax_local') {
    // Simpler: back-calculate rate from annual_burden and consumption
    // We know state consumption = state_burden / 0.0475
    // local_burden = consumption * local_rate
    // So local_rate = local_burden / consumption
    // But we don't have consumption directly. Use effective_rate from JSON.
    const localRatePct = cell.effective_rate > 0 ? (cell.effective_rate * 100).toFixed(2) : null
    const consumption = localRatePct ? Math.round(cell.annual_burden / (parseFloat(localRatePct) / 100)) : null
    rows = [
      { label: 'County local add-on rate', value: localRatePct ? `${localRatePct}%` : '2.00% or 2.25%', note: 'NCDOR effective 7/1/2024 — either 2.00% or 2.25% depending on county' },
      { label: 'Est. taxable consumption', value: consumption ? formatCurrency(consumption) : '—', note: 'BLS Consumer Expenditure Survey 2024' },
      { label: 'Formula', value: consumption && localRatePct ? `${localRatePct}% × ${formatCurrency(consumption)} = ${formatCurrency(Math.round(cell.annual_burden))}/yr` : '—', mono: true },
    ]
  }

  if (taxKey === 'federal_income_tax') {
    const effPct = (cell.effective_rate * 100).toFixed(1)
    rows = [
      { label: 'Effective rate (this bracket)', value: `${effPct}%`, note: 'National distributional average — identical for all NC counties' },
      { label: 'Source', value: 'ITEP Who Pays Taxes in America 2024; IRS SOI 2022 Table 1.4' },
      { label: 'Formula', value: `${effPct}% × ${formatCurrency(income)} = ${formatCurrency(Math.round(cell.annual_burden))}/yr`, mono: true },
      { label: 'Note', value: 'Does not model itemized deductions, credits, capital gains, EITC, or AMT. Individual liability will differ.' },
    ]
  }

  if (taxKey === 'payroll_tax') {
    const SS_RATE = 6.2
    const SS_WAGE_BASE = 176100
    const MEDICARE_RATE = 1.45
    const ssTaxable = Math.min(income, SS_WAGE_BASE)
    const ss = cell.social_security ?? Math.round(ssTaxable * SS_RATE / 100)
    const med = cell.medicare ?? Math.round(income * MEDICARE_RATE / 100)
    rows = [
      { label: 'Social Security rate', value: `${SS_RATE}% on first ${formatCurrency(SS_WAGE_BASE)} of wages`, note: '2026 SS wage base (SSA COLA announcement Oct 2025)' },
      { label: 'Medicare rate', value: `${MEDICARE_RATE}%` },
      { label: 'SS formula', value: `${SS_RATE}% × ${formatCurrency(ssTaxable)} = ${formatCurrency(ss)}/yr`, mono: true },
      { label: 'Medicare formula', value: `${MEDICARE_RATE}% × ${formatCurrency(income)} = ${formatCurrency(med)}/yr`, mono: true },
      { label: 'Total', value: `${formatCurrency(ss)} + ${formatCurrency(med)} = ${formatCurrency(Math.round(cell.annual_burden))}/yr`, mono: true },
    ]
  }

  if (rows.length === 0) return null

  return (
    <tr className="receipt-row">
      <td colSpan={4} className="receipt-cell">
        <div className="receipt-panel">
          <div className="receipt-grid">
            {rows.map((row, i) => (
              <div key={i} className="receipt-item">
                <span className="receipt-label">{row.label}</span>
                <span className={`receipt-value${row.mono ? ' receipt-value--mono' : ''}`}>
                  {row.value}
                  {row.note && <span className="receipt-note"> · {row.note}</span>}
                </span>
              </div>
            ))}
          </div>

          {taxKey === 'state_income_tax' && (
            <div className="receipt-trend">
              <button
                type="button"
                className="trend-link"
                onClick={onToggleTrend}
                aria-expanded={showTrend}
              >
                {showTrend ? 'Hide rate history' : 'See NC rate history (2020–2026) ↗'}
              </button>
              {showTrend && (
                <div className="receipt-trend-chart">
                  <StateTaxTrendChart bracket={bracket} />
                </div>
              )}
            </div>
          )}

          <div className="receipt-footer">
            <SourceLinks taxKey={taxKey} />
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── Renter tooltip ────────────────────────────────────────────────────────────

function RenterTooltip() {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()
  const triggerRef = useRef(null)
  const [position, setPosition] = useState(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    const updatePosition = () => {
      const rect = triggerRef.current.getBoundingClientRect()
      const viewportPadding = 12
      const preferredWidth = 320
      const preferredGap = 12
      const estimatedHeight = 152

      let left = rect.right + preferredGap
      let top = rect.top + rect.height / 2 - estimatedHeight / 2
      let placement = 'right'

      if (left + preferredWidth > window.innerWidth - viewportPadding) {
        left = Math.max(viewportPadding, rect.left - preferredWidth - preferredGap)
        placement = 'left'
      }

      top = Math.max(viewportPadding, Math.min(top, window.innerHeight - estimatedHeight - viewportPadding))

      setPosition({
        left,
        top,
        placement,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key === 'Escape') setOpen(false)
    }

    if (open) {
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <span className="renter-tooltip">
      <button
        type="button"
        className="renter-tooltip__trigger"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls={tooltipId}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen(o => !o)}
        aria-label="Why renters bear this cost"
      >
        Why?
      </button>
      {open && position && createPortal(
        <span
          id={tooltipId}
          className={`renter-tooltip__body renter-tooltip__body--${position.placement}`}
          style={{ left: `${position.left}px`, top: `${position.top}px` }}
          role="tooltip"
        >
          {RENTER_TOOLTIP}
        </span>,
        document.body,
      )}
    </span>
  )
}

// ── Payroll rows ──────────────────────────────────────────────────────────────

function PayrollRows({ payrollCell, income, expanded, onToggle, receiptOpen, onReceiptToggle, bracket }) {
  if (!payrollCell) return null
  const ss  = payrollCell.social_security ?? 0
  const med = payrollCell.medicare ?? 0
  return (
    <>
      <tr className={`payroll-row${receiptOpen ? ' tax-row--open' : ''}`}>
        <td>
          <button type="button" className="expand-toggle" aria-expanded={expanded} onClick={onToggle}>
            {expanded ? '▾' : '▸'}
          </button>
          {' '}Payroll taxes (employee share)
        </td>
        <td className="num-col">{formatCurrency(payrollCell.annual_burden)}</td>
        <td className="num-col">{((payrollCell.annual_burden / income) * 100).toFixed(1)}%</td>
        <td className="note-col">
          <span className="federal-notice">Employee share only · Federal · County-invariant</span>
          <button
            type="button"
            className="receipt-toggle"
            aria-expanded={receiptOpen}
            onClick={onReceiptToggle}
            aria-label={`${receiptOpen ? 'Hide' : 'Show'} payroll tax calculation`}
          >
            {receiptOpen ? '▲ Hide' : '▼ How?'}
          </button>
        </td>
      </tr>
      {expanded && (
        <>
          <tr className="payroll-subrow">
            <td className="subrow-label">└ Social Security (6.2%)</td>
            <td className="num-col">{formatCurrency(ss)}</td>
            <td className="num-col">{((ss / income) * 100).toFixed(1)}%</td>
            <td className="note-col"></td>
          </tr>
          <tr className="payroll-subrow">
            <td className="subrow-label">└ Medicare (1.45%)</td>
            <td className="num-col">{formatCurrency(med)}</td>
            <td className="num-col">{((med / income) * 100).toFixed(1)}%</td>
            <td className="note-col"></td>
          </tr>
          <tr className="payroll-caveat-row">
            <td colSpan={4} className="payroll-caveat">{PAYROLL_CAVEAT}</td>
          </tr>
        </>
      )}
      {receiptOpen && (
        <InlineReceipt
          taxKey="payroll_tax"
          cell={payrollCell}
          income={income}
          bracket={bracket}
        />
      )}
    </>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div className="skeleton-table" aria-busy="true" aria-label="Loading tax data">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton-row" />
      ))}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TaxBreakdownTable({
  record,
  housing,
  bracket,
  loading,
  municipalAddition = 0,
  municipalLabel = null,
}) {
  const [expandedReceipt, setExpandedReceipt] = useState(null)
  const [payrollExpanded, setPayrollExpanded] = useState(false)
  const [showTrend, setShowTrend] = useState(false)

  function toggleReceipt(key) {
    setExpandedReceipt(prev => {
      if (prev === key) return null
      if (prev === 'state_income_tax') setShowTrend(false)
      return key
    })
  }

  if (loading) return <SkeletonTable />
  if (!record) return null

  const { taxes, total, data_quality_flags: flags } = record
  const income = total.annual_burden / (total.pct_income / 100)
  const bracketIncome = Math.round(income)

  const v1Rows = TAX_ROWS.filter(r => !r.v2)
  const hasEstimated = v1Rows.some(row => getTaxQualityFlag(row.key, flags) === 'ESTIMATED')
  const grandTotal = total.annual_burden + municipalAddition

  return (
    <div className="breakdown-wrap">
      <table className="breakdown-table">
        <caption className="sr-only">Tax burden breakdown by type</caption>
        <thead>
          <tr>
            <th scope="col">Tax type</th>
            <th scope="col" className="num-col">Amount</th>
            <th scope="col" className="num-col">% of income</th>
            <th scope="col" className="note-col">Note</th>
          </tr>
        </thead>
        <tbody>
          {v1Rows.map(row => {
            const cell = taxes[row.key]
            if (!cell) return null
            const flag = getTaxQualityFlag(row.key, flags)
            const suppressed = flag === 'SUPPRESSED'
            const estimated  = flag === 'ESTIMATED'
            const isRenterProp  = housing === 'renter' && row.key === 'property_tax'
            const isFederal     = row.key === 'federal_income_tax'
            const isPropertyTax = row.key === 'property_tax'
            const isStateTax    = row.key === 'state_income_tax'
            const showMunicipalLine = isPropertyTax && municipalAddition > 0 && municipalLabel
            const isOpen = expandedReceipt === row.key

            return (
              <>
                <tr key={row.key} className={`tax-row${isOpen ? ' tax-row--open' : ''}`}>
                  <td>
                    {isRenterProp ? 'Property tax (passed through in rent)' : row.label}
                    {isRenterProp && <RenterTooltip />}
                  </td>
                  <td className="num-col">
                    {suppressed ? (
                      <span className="suppressed" tabIndex={0} title="Data quality insufficient" aria-label="Data suppressed">—</span>
                    ) : (
                      <>
                        {formatCurrency(cell.annual_burden + (showMunicipalLine ? municipalAddition : 0))}
                        {estimated && <sup className="flag-asterisk" aria-label="estimate less reliable">*</sup>}
                      </>
                    )}
                  </td>
                  <td className="num-col">
                    {suppressed ? (
                      <span className="suppressed" aria-hidden="true">—</span>
                    ) : (
                      <>
                        {(((cell.annual_burden + (showMunicipalLine ? municipalAddition : 0)) / bracketIncome) * 100).toFixed(1)}%
                        {estimated && <sup className="flag-asterisk" aria-hidden="true">*</sup>}
                      </>
                    )}
                  </td>
                  <td className="note-col">
                    {isFederal && (
                      <span className="federal-notice">Effective rate · national average</span>
                    )}
                    {showMunicipalLine && (
                      <span className="muni-notice">
                        County + {municipalLabel} city rate. Source: NC DST AFIR FY2025.
                      </span>
                    )}
                    {!suppressed && (
                      <button
                        type="button"
                        className="receipt-toggle"
                        aria-expanded={isOpen}
                        onClick={() => toggleReceipt(row.key)}
                        aria-label={`${isOpen ? 'Hide' : 'Show'} ${row.label} calculation`}
                      >
                        {isOpen ? '▲ Hide' : '▼ How?'}
                      </button>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <InlineReceipt
                    key={`receipt-${row.key}`}
                    taxKey={row.key}
                    cell={cell}
                    income={bracketIncome}
                    housing={housing}
                    bracket={bracket}
                    showTrend={isStateTax && showTrend}
                    onToggleTrend={() => setShowTrend(s => !s)}
                  />
                )}
              </>
            )
          })}

          <PayrollRows
            payrollCell={taxes.payroll_tax}
            income={bracketIncome}
            expanded={payrollExpanded}
            onToggle={() => setPayrollExpanded(e => !e)}
            receiptOpen={expandedReceipt === 'payroll_tax'}
            onReceiptToggle={() => toggleReceipt('payroll_tax')}
            bracket={bracket}
          />
        </tbody>
        <tfoot>
          <tr className="total-row">
            <td><strong>Total estimated burden</strong></td>
            <td className="num-col"><strong>{formatCurrency(grandTotal)}</strong></td>
            <td className="num-col"><strong>{((grandTotal / bracketIncome) * 100).toFixed(1)}%</strong></td>
            <td className="note-col"></td>
          </tr>
        </tfoot>
      </table>

      {hasEstimated && (
        <p className="flag-footnote">
          * Estimate less reliable for this income bracket — see{' '}
          <a href="#methodology">methodology</a> for details.
        </p>
      )}
    </div>
  )
}
