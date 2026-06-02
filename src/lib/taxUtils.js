/**
 * taxUtils.js
 * -----------
 * Core utility constants and functions for the NC Fiscal Federalism Explorer.
 * V2 additions: payroll tax, service allocations, policy simulation, local Other drill-down.
 */

import {
  BUDGET_ALLOCATIONS_STATE,
  BUDGET_ALLOCATIONS_FEDERAL,
  BUDGET_ALLOCATIONS_LOCAL_FALLBACK,
  STATE_OTHER_BREAKDOWN,
  FEDERAL_OTHER_BREAKDOWN,
  PURPOSE_BUCKETS,
  SERVICES,
} from './budgetAllocations'

// ── Income brackets ─────────────────────────────────────────────────────────

export const BRACKETS = [
  { key: '$25K',   label: '$25K',   sublabel: 'Lower-income' },
  { key: '$50K',   label: '$50K',   sublabel: 'Moderate-income' },
  { key: '$100K',  label: '$100K',  sublabel: 'Middle/upper-middle' },
  { key: '$200K+', label: '$200K+', sublabel: 'Higher-income' },
]

export const BRACKET_INCOMES = {
  '$25K':   25_000,
  '$50K':   50_000,
  '$100K': 100_000,
  '$200K+': 200_000,
}

// ── Tax row definitions ──────────────────────────────────────────────────────

// V1 rows (without payroll — payroll is handled separately with expand/collapse)
export const TAX_ROWS = [
  { key: 'property_tax',       label: 'Property tax',              level: 'Local',   note: 'Based on county rate' },
  { key: 'sales_tax_local',    label: 'Sales tax (local portion)', level: 'Local',   note: 'Consumption based' },
  { key: 'sales_tax_state',    label: 'Sales tax (state portion)', level: 'State',   note: 'Consumption based' },
  { key: 'state_income_tax',   label: 'NC State income tax',       level: 'State',   note: 'Flat rate applied' },
  { key: 'federal_income_tax', label: 'Federal income tax',        level: 'Federal', note: null },
  // payroll_tax is a V2 row — rendered separately with collapse/expand behavior
  { key: 'payroll_tax',        label: 'Payroll taxes (employee share)', level: 'Federal', note: null, v2: true },
]

// ── Colors ───────────────────────────────────────────────────────────────────

export const LEVEL_COLORS = {
  Local:   '#2d6a30',
  State:   '#c05600',
  Federal: '#1a4480',
}

export const LEVEL_LABELS = ['Local', 'State', 'Federal']

// ── Data quality ─────────────────────────────────────────────────────────────

export function getTaxQualityFlag(taxKey, flags = []) {
  if (taxKey === 'sales_tax_local' || taxKey === 'sales_tax_state') {
    if (flags.includes('cex_tail_reliability_lower')) return 'ESTIMATED'
  }
  return 'RELIABLE'
}

// ── Lookup ───────────────────────────────────────────────────────────────────

export function getTaxRecord(data, county, bracket, housing) {
  return data?.[county]?.[bracket]?.[housing] ?? null
}

// ── Formatting ───────────────────────────────────────────────────────────────

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function allocateBreakdown(amount, items) {
  if (!amount || amount <= 0 || !items || items.length === 0) return null

  const totalShare = items.reduce((sum, item) => sum + (item.share ?? 0), 0)
  if (totalShare <= 0) return null

  const roundedTotal = Math.round(amount)
  const provisional = items.map(item => {
    const raw = (roundedTotal * (item.share ?? 0)) / totalShare
    return {
      ...item,
      amount: Math.floor(raw),
      remainder: raw - Math.floor(raw),
    }
  })

  let shortfall = roundedTotal - provisional.reduce((sum, item) => sum + item.amount, 0)
  if (shortfall > 0) {
    const byRemainder = [...provisional].sort((a, b) => b.remainder - a.remainder)
    for (let i = 0; i < shortfall; i += 1) {
      byRemainder[i % byRemainder.length].amount += 1
    }
    return provisional.map(item => {
      const adjusted = byRemainder.find(x => x.key === item.key)
      const result = { ...item, amount: adjusted.amount }
      delete result.remainder
      return result
    })
  }

  return provisional.map(item => {
    const result = { ...item }
    delete result.remainder
    return result
  })
}

function getBurdenTotals(record, localAllocations, municipalAddition = 0) {
  if (!record) return null

  const { taxes } = record
  const localAlloc = localAllocations ?? BUDGET_ALLOCATIONS_LOCAL_FALLBACK

  const localTotal =
    (taxes.property_tax?.annual_burden ?? 0) +
    (taxes.sales_tax_local?.annual_burden ?? 0) +
    municipalAddition

  const stateTotal =
    (taxes.sales_tax_state?.annual_burden ?? 0) +
    (taxes.state_income_tax?.annual_burden ?? 0)

  // Federal total includes payroll tax (V2)
  const federalTotal =
    (taxes.federal_income_tax?.annual_burden ?? 0) +
    (taxes.payroll_tax?.annual_burden ?? 0)

  const grandTotal = localTotal + stateTotal + federalTotal

  return { localAlloc, localTotal, stateTotal, federalTotal, grandTotal }
}

function getStateBreakdownShare(key) {
  return STATE_OTHER_BREAKDOWN.find(item => item.key === key)?.share ?? 0
}

function getFederalBreakdownShare(key) {
  return FEDERAL_OTHER_BREAKDOWN.find(item => item.key === key)?.share ?? 0
}

function buildTaxonomySourceRows({ localAlloc, localTotal, stateTotal, federalTotal }) {
  const localSources = allocateBreakdown(localTotal, [
    { key: 'local_k12', label: 'K–12 Education', purposeKey: 'education', level: 'local', share: localAlloc.k12 ?? 0 },
    { key: 'local_community_college', label: 'Community Colleges', purposeKey: 'education', level: 'local', share: localAlloc.community_college ?? 0 },
    { key: 'local_human_services', label: 'Human Services (incl. Medicaid)', purposeKey: 'health_human_services', level: 'local', share: localAlloc.human_services ?? 0 },
    { key: 'local_roads', label: 'Roads & Transportation', purposeKey: 'transportation_infrastructure', level: 'local', share: localAlloc.roads ?? 0 },
    { key: 'local_public_safety', label: 'Public Safety', purposeKey: 'public_safety_justice', level: 'local', share: localAlloc.other_public_safety ?? 0 },
    { key: 'local_debt_service', label: 'Debt Service', purposeKey: 'government_operations_debt', level: 'local', share: localAlloc.other_debt_service ?? 0 },
    { key: 'local_general_govt', label: 'General Government', purposeKey: 'government_operations_debt', level: 'local', share: localAlloc.other_general_govt ?? 0 },
    { key: 'local_residual', label: 'Other / Residual', purposeKey: 'other_residual', level: 'local', share: localAlloc.other_afir_remainder ?? 0 },
  ])

  const stateOtherShare = BUDGET_ALLOCATIONS_STATE.other ?? 0
  const stateSources = allocateBreakdown(stateTotal, [
    { key: 'state_k12', label: 'K–12 Education', purposeKey: 'education', level: 'state', share: BUDGET_ALLOCATIONS_STATE.k12 ?? 0 },
    { key: 'state_community_college', label: 'Community Colleges', purposeKey: 'education', level: 'state', share: BUDGET_ALLOCATIONS_STATE.community_college ?? 0 },
    { key: 'state_human_services', label: 'Human Services (incl. Medicaid)', purposeKey: 'health_human_services', level: 'state', share: BUDGET_ALLOCATIONS_STATE.human_services ?? 0 },
    { key: 'state_roads', label: 'Roads & Transportation', purposeKey: 'transportation_infrastructure', level: 'state', share: BUDGET_ALLOCATIONS_STATE.roads ?? 0 },
    { key: 'state_other_health_hhs', label: 'Health and Human Services', purposeKey: 'health_human_services', level: 'state', share: stateOtherShare * getStateBreakdownShare('health_human_services') },
    { key: 'state_other_education', label: 'Education', purposeKey: 'education', level: 'state', share: stateOtherShare * getStateBreakdownShare('education') },
    { key: 'state_other_transportation', label: 'Transportation', purposeKey: 'transportation_infrastructure', level: 'state', share: stateOtherShare * getStateBreakdownShare('transportation') },
    { key: 'state_other_justice', label: 'Justice and Public Safety', purposeKey: 'public_safety_justice', level: 'state', share: stateOtherShare * getStateBreakdownShare('justice_public_safety') },
    { key: 'state_other_natural', label: 'Natural and Economic Resources', purposeKey: 'environment_natural_resources', level: 'state', share: stateOtherShare * getStateBreakdownShare('natural_economic_resources') },
    { key: 'state_other_general', label: 'General Government', purposeKey: 'government_operations_debt', level: 'state', share: stateOtherShare * getStateBreakdownShare('general_government') },
  ])

  const federalOtherShare = BUDGET_ALLOCATIONS_FEDERAL.other ?? 0
  const federalSources = allocateBreakdown(federalTotal, [
    { key: 'federal_k12', label: 'K–12 Education', purposeKey: 'education', level: 'federal', share: BUDGET_ALLOCATIONS_FEDERAL.k12 ?? 0 },
    { key: 'federal_community_college', label: 'Community Colleges', purposeKey: 'education', level: 'federal', share: BUDGET_ALLOCATIONS_FEDERAL.community_college ?? 0 },
    { key: 'federal_human_services', label: 'Human Services / Medicaid', purposeKey: 'health_human_services', level: 'federal', share: BUDGET_ALLOCATIONS_FEDERAL.human_services ?? 0 },
    { key: 'federal_roads', label: 'Roads & Transportation', purposeKey: 'transportation_infrastructure', level: 'federal', share: BUDGET_ALLOCATIONS_FEDERAL.roads ?? 0 },
    { key: 'federal_other_medicare', label: 'Medicare', purposeKey: 'retirement_insurance_transfers', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('medicare') },
    { key: 'federal_other_social_security', label: 'Social Security', purposeKey: 'retirement_insurance_transfers', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('social_security') },
    { key: 'federal_other_income_security', label: 'Income Security', purposeKey: 'retirement_insurance_transfers', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('income_security') },
    { key: 'federal_other_health', label: 'Health', purposeKey: 'health_human_services', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('health') },
    { key: 'federal_other_national_defense', label: 'National Defense', purposeKey: 'defense_veterans', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('national_defense') },
    { key: 'federal_other_veterans', label: 'Veterans Benefits and Services', purposeKey: 'defense_veterans', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('veterans_benefits') },
    { key: 'federal_other_education_workforce', label: 'Education, Training, Employment, and Social Services', purposeKey: 'education', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('education_workforce') },
    { key: 'federal_other_transportation', label: 'Transportation', purposeKey: 'transportation_infrastructure', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('transportation') },
    { key: 'federal_other_general_government', label: 'General Government', purposeKey: 'government_operations_debt', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('general_government') },
    { key: 'federal_other_net_interest', label: 'Net Interest', purposeKey: 'government_operations_debt', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('net_interest') },
    { key: 'federal_other_natural', label: 'Natural Resources and Environment', purposeKey: 'environment_natural_resources', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('natural_resources') },
    { key: 'federal_other_international', label: 'International Affairs', purposeKey: 'other_residual', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('international_affairs') },
    { key: 'federal_other_other', label: 'Other Federal Programs', purposeKey: 'other_residual', level: 'federal', share: federalOtherShare * getFederalBreakdownShare('other_federal_programs') },
  ])

  return [...localSources, ...stateSources, ...federalSources]
}

function buildTaxonomyRows(sourceRows) {
  const rowsByKey = new Map(PURPOSE_BUCKETS.map(bucket => [bucket.key, {
    key: bucket.key,
    label: bucket.label,
    total: 0,
    localAmount: 0,
    stateAmount: 0,
    federalAmount: 0,
    sources: [],
    localSources: [],
    stateSources: [],
    federalSources: [],
  }]))

  for (const source of sourceRows) {
    const row = rowsByKey.get(source.purposeKey) ?? rowsByKey.get('other_residual')
    if (!row) continue
    row.total += source.amount
    row[`${source.level}Amount`] += source.amount
    row.sources.push(source)
    row[`${source.level}Sources`].push(source)
  }

  return [...rowsByKey.values()]
    .filter(row => row.total > 0)
    .sort((a, b) => {
      if (a.key === 'other_residual') return 1
      if (b.key === 'other_residual') return -1
      return b.total - a.total
    })
}

// ── Stacked bar ──────────────────────────────────────────────────────────────

/**
 * Returns data for the stacked bar chart.
 * V2: federal segment includes payroll_tax.
 * municipalRate: per-$100 AV extra rate (optional, for F5)
 * homeValue: estimated home value for the selected record (for F5 municipal calc)
 */
export function getStackedBarData(record, municipalRate = 0, homeValue = 0) {
  if (!record) return []
  const { taxes } = record
  const local =
    (taxes.property_tax?.annual_burden ?? 0) +
    (taxes.sales_tax_local?.annual_burden ?? 0) +
    (municipalRate > 0 ? (municipalRate / 100) * homeValue : 0)
  const state =
    (taxes.sales_tax_state?.annual_burden ?? 0) +
    (taxes.state_income_tax?.annual_burden ?? 0)
  const federal =
    (taxes.federal_income_tax?.annual_burden ?? 0) +
    (taxes.payroll_tax?.annual_burden ?? 0)
  return [{ name: 'Burden', Local: local, State: state, Federal: federal }]
}

// ── Property tax with municipal overlay (F5) ─────────────────────────────────

/**
 * Computes additional municipal property tax burden at runtime.
 * No pipeline change — rate applied to the same estimated home value used in the record.
 * homeValue must be derived from the property_tax burden and the county rate.
 */
export function getMunicipalPropertyTaxAddition(record, county, countyRate, municipalRate) {
  if (!record || !municipalRate || municipalRate === 0) return 0
  // Back-calculate home value from the property_tax burden and county rate
  const countyBurden = record.taxes.property_tax?.annual_burden ?? 0
  if (!countyRate || countyRate === 0) return 0
  const estimatedHomeValue = (countyBurden / countyRate) * 100
  return Math.round((municipalRate / 100) * estimatedHomeValue)
}

// ── Payroll tax (F2) ─────────────────────────────────────────────────────────

// 2026 parameters — update annually
const SS_RATE        = 0.062
const SS_WAGE_BASE   = 176_100
const MEDICARE_RATE  = 0.0145
const ADD_MEDICARE_RATE      = 0.009
const ADD_MEDICARE_THRESHOLD = 200_000

/**
 * Returns employee-side payroll tax breakdown for a gross income amount.
 * County-invariant (federal tax, same for all NC counties).
 */
export function getPayrollTax(grossIncome) {
  const ssTax       = Math.min(grossIncome, SS_WAGE_BASE) * SS_RATE
  const medicareTax = grossIncome * MEDICARE_RATE
  const addMedicare = Math.max(0, grossIncome - ADD_MEDICARE_THRESHOLD) * ADD_MEDICARE_RATE
  return {
    social_security: Math.round(ssTax),
    medicare:        Math.round(medicareTax + addMedicare),
    annual_burden:   Math.round(ssTax + medicareTax + addMedicare),
    level:           'federal',
  }
}

// ── Service allocations (F1 + F6) ────────────────────────────────────────────

/**
 * Computes estimated dollars from this household going to each public service.
 * localAllocations: the county's allocation object from county_local_allocations.json,
 *   or null to use the statewide fallback.
 *
 * Also accepts optional municipalAddition (dollars) to add to local total (F5).
 */
export function getServiceAllocations(record, localAllocations, municipalAddition = 0) {
  const totals = getBurdenTotals(record, localAllocations, municipalAddition)
  if (!totals) return null
  const { localAlloc, localTotal, stateTotal, federalTotal, grandTotal } = totals

  return SERVICES.map(service => {
    const amount =
      (localTotal   * (localAlloc[service.key]                   ?? 0)) +
      (stateTotal   * (BUDGET_ALLOCATIONS_STATE[service.key]     ?? 0)) +
      (federalTotal * (BUDGET_ALLOCATIONS_FEDERAL[service.key]   ?? 0))
    return {
      key:             service.key,
      label:           service.label,
      amount:          Math.round(amount),
      pct:             grandTotal > 0 ? amount / grandTotal : 0,
      localDataFlag:   localAlloc._data_quality_flag ?? 'ok',
    }
  })
}

/**
 * Computes a public-purpose taxonomy breakdown for the "Where your taxes go"
 * section. Rows are organized by human-readable purpose, with local/state/
 * federal contributions preserved inside each bucket.
 */
export function getTaxonomyAllocations(record, localAllocations, municipalAddition = 0) {
  const totals = getBurdenTotals(record, localAllocations, municipalAddition)
  if (!totals) return null

  const { localAlloc, localTotal, stateTotal, federalTotal, grandTotal } = totals
  const sourceRows = buildTaxonomySourceRows({ localAlloc, localTotal, stateTotal, federalTotal })
  const rows = buildTaxonomyRows(sourceRows)

  return {
    grandTotal,
    localDataFlag: localAlloc._data_quality_flag ?? 'ok',
    localSource: localAlloc._source ?? 'unknown',
    rows,
  }
}

function shapeExpandedRows(items, grandTotal, groupTotal, sourceKey, sourceLabel) {
  return (items ?? [])
    .filter(item => item && (item.amount ?? 0) > 0)
    .map(item => ({
      key: `${sourceKey}-${item.key}`,
      label: item.label,
      amount: item.amount,
      pct: grandTotal > 0 ? item.amount / grandTotal : 0,
      groupPct: groupTotal > 0 ? item.amount / groupTotal : 0,
      sourceKey,
      sourceLabel,
    }))
}

/**
 * Returns grouped, expanded rows that split the broad "Other" buckets into
 * named local, state, and federal destinations.
 */
export function getExpandedServiceAllocationGroups(record, localAllocations, municipalAddition = 0) {
  const totals = getBurdenTotals(record, localAllocations, municipalAddition)
  if (!totals) return null

  const { localAlloc, localTotal, stateTotal, federalTotal, grandTotal } = totals
  const serviceAllocations = getServiceAllocations(record, localAllocations, municipalAddition)
  if (!serviceAllocations) return null

  const coreRowsRaw = serviceAllocations.filter(item => item.key !== 'other')
  const coreTotal = coreRowsRaw.reduce((sum, item) => sum + (item.amount ?? 0), 0)
  const coreRows = shapeExpandedRows(coreRowsRaw, grandTotal, coreTotal, 'core', 'Core service')

  const localOtherAmount = Math.round(localTotal * (localAlloc.other ?? 0))
  const stateOtherAmount = Math.round(stateTotal * (BUDGET_ALLOCATIONS_STATE.other ?? 0))
  const federalOtherAmount = Math.round(federalTotal * (BUDGET_ALLOCATIONS_FEDERAL.other ?? 0))

  const localRowsRaw = getLocalOtherBreakdown(localOtherAmount, localAlloc) ?? []
  const stateRowsRaw = getStateOtherBreakdown(stateOtherAmount) ?? []
  const federalRowsRaw = getFederalOtherBreakdown(federalOtherAmount) ?? []

  const groups = [
    {
      key: 'core',
      label: 'Core service destinations',
      subtitle: 'K–12, human services, roads, and community colleges',
      note: 'These are the directly named service buckets in the model.',
      total: coreTotal,
      share: grandTotal > 0 ? coreTotal / grandTotal : 0,
      rows: coreRows,
      tone: 'core',
    },
    {
      key: 'local',
      label: 'Local remainder',
      subtitle: 'County AFIR categories inside the local “Other” bucket',
      note: 'Public safety, debt service, general government, and the AFIR remainder.',
      total: localOtherAmount,
      share: grandTotal > 0 ? localOtherAmount / grandTotal : 0,
      rows: shapeExpandedRows(localRowsRaw, grandTotal, localOtherAmount, 'local', 'Local'),
      tone: 'local',
    },
    {
      key: 'state',
      label: 'State remainder',
      subtitle: 'OSBM committee categories inside the state “Other” bucket',
      note: 'Health and human services, education, transportation, public safety, and other state functions.',
      total: stateOtherAmount,
      share: grandTotal > 0 ? stateOtherAmount / grandTotal : 0,
      rows: shapeExpandedRows(stateRowsRaw, grandTotal, stateOtherAmount, 'state', 'State'),
      tone: 'state',
    },
    {
      key: 'federal',
      label: 'Federal remainder',
      subtitle: 'Budget functions inside the federal “Other” bucket',
      note: 'Medicare, Social Security, defense, interest, health, income security, and other federal programs.',
      total: federalOtherAmount,
      share: grandTotal > 0 ? federalOtherAmount / grandTotal : 0,
      rows: shapeExpandedRows(federalRowsRaw, grandTotal, federalOtherAmount, 'federal', 'Federal'),
      tone: 'federal',
    },
  ].filter(group => group.total > 0 || group.rows.length > 0)

  return {
    grandTotal,
    localDataFlag: localAlloc._data_quality_flag ?? 'ok',
    localSource: localAlloc._source ?? 'unknown',
    groups,
  }
}

// ── Local Other drill-down (F7) ───────────────────────────────────────────────

/**
 * Splits the local Other dollar amount into AFIR sub-categories.
 * localOtherAmount: the local portion of "All Other Government Functions"
 * localAlloc: county allocation object (must have other_* sub-fields)
 */
export function getLocalOtherBreakdown(localOtherAmount, localAlloc) {
  if (!localAlloc || !localOtherAmount) return null

  const totalOtherShare = localAlloc.other
  if (!totalOtherShare || totalOtherShare === 0) return null

  // Sum the four AFIR sub-categories as a share of total budget
  const pubSafety  = localAlloc.other_public_safety  ?? 0
  const debtSvc    = localAlloc.other_debt_service   ?? 0
  const genGovt    = localAlloc.other_general_govt   ?? 0
  const afirOther  = localAlloc.other_afir_remainder ?? 0
  return allocateBreakdown(localOtherAmount, [
    { key: 'public_safety', label: 'Public Safety', share: pubSafety },
    { key: 'debt_service', label: 'Debt Service', share: debtSvc },
    { key: 'general_govt', label: 'General Government', share: genGovt },
    { key: 'other_other', label: 'All Other Programs', share: afirOther },
  ])
}

// ── State / federal Other drill-downs (V3) ──────────────────────────────────

export function getStateOtherBreakdown(stateOtherAmount) {
  return allocateBreakdown(stateOtherAmount, STATE_OTHER_BREAKDOWN)
}

export function getFederalOtherBreakdown(federalOtherAmount) {
  return allocateBreakdown(federalOtherAmount, FEDERAL_OTHER_BREAKDOWN)
}
