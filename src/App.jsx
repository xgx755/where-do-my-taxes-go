import { useState } from 'react'
import { useTaxData } from './hooks/useTaxData'
import { getTaxRecord, BRACKET_INCOMES } from './lib/taxUtils'
import Disclaimer from './components/Disclaimer'
import CountyDropdown from './components/CountyDropdown'
import BracketButtons from './components/BracketButtons'
import HousingToggle from './components/HousingToggle'
import MunicipalityDropdown, { UNINCORPORATED } from './components/MunicipalityDropdown'
import TaxBreakdownTable from './components/TaxBreakdownTable'
import TaxStackedBar from './components/TaxStackedBar'
import TaxToServices from './components/TaxToServices'
import BracketComparePicker from './components/BracketComparePicker'
import BracketCompareTable from './components/BracketCompareTable'
import WhoFundsWhat from './components/WhoFundsWhat'
import MethodologySection from './components/MethodologySection'
import './App.css'

const BRACKET_RANGES = {
  '$25K':   'under $25,000',
  '$50K':   '$25,000–$75,000',
  '$100K':  '$75,000–$150,000',
  '$200K+': 'over $150,000',
}

function getTaxSummaryHeading(record) {
  if (!record) return null
  const { taxes } = record
  const federal = (taxes.federal_income_tax?.annual_burden ?? 0) +
                  (taxes.payroll_tax?.annual_burden ?? 0)
  const stateTotal = (taxes.state_income_tax?.annual_burden ?? 0) +
                     (taxes.sales_tax_state?.annual_burden ?? 0)
  const localTotal = (taxes.property_tax?.annual_burden ?? 0) +
                     (taxes.sales_tax_local?.annual_burden ?? 0)
  const max = Math.max(federal, stateTotal, localTotal)
  if (max === federal) return 'Federal taxes account for the largest share of your burden.'
  if (max === stateTotal) return 'State taxes account for the largest share of your burden.'
  return 'Local taxes account for the largest share of your burden.'
}

function computeMunicipalAddition(record, muniRate) {
  if (!record || !muniRate || muniRate === 0) return 0
  const countyBurden = record.taxes.property_tax?.annual_burden ?? 0
  const countyRate   = record.taxes.property_tax?.county_rate_per_100 ?? 0
  if (countyBurden === 0 || countyRate === 0) return 0
  const homeValue = (countyBurden * 100) / countyRate
  return Math.round((muniRate / 100) * homeValue)
}

export default function App() {
  const { data, municipalRates, localAllocs, loading, error } = useTaxData()

  const counties = data ? Object.keys(data).sort() : []
  const [county,         setCounty]         = useState('Mecklenburg')
  const [bracket,        setBracket]        = useState('$50K')
  const [housing,        setHousing]        = useState('owner')
  const [municipality,   setMunicipality]   = useState(UNINCORPORATED)
  const [compareBracket, setCompareBracket] = useState(null)

  const effectiveCounty = counties.includes(county) ? county : (counties[0] ?? 'Mecklenburg')

  const handleCountyChange = nextCounty => {
    setCounty(nextCounty)
    setMunicipality(UNINCORPORATED)
  }

  const record = data ? getTaxRecord(data, effectiveCounty, bracket, housing) : null
  const compareRecord = compareBracket && data
    ? getTaxRecord(data, effectiveCounty, compareBracket, housing)
    : null

  const selectedMuni = municipality !== UNINCORPORATED ? municipality : null
  const muniRate = selectedMuni && municipalRates?.[effectiveCounty]
    ? (municipalRates[effectiveCounty].find(m => m.name === selectedMuni)?.rate ?? 0)
    : 0
  const muniAddition = computeMunicipalAddition(record, muniRate)

  const countyAlloc   = localAllocs?.[effectiveCounty] ?? null
  const bracketIncome = BRACKET_INCOMES[bracket] ?? 50_000
  const housingLabel  = housing === 'owner' ? 'a homeowner' : 'a renter'
  const rangeLabel    = BRACKET_RANGES[bracket] ?? bracket

  const resultKey = `${effectiveCounty}-${bracket}-${housing}-${selectedMuni ?? ''}`

  if (error) {
    return (
      <div className="app-error" role="alert">
        <p>
          Could not load tax data. Please try refreshing the page. If this problem persists,{' '}
          <a href="https://github.com/zanedavis/nc-fiscal-explorer/issues">open an issue on GitHub</a>.
        </p>
      </div>
    )
  }

  const summaryHeading = getTaxSummaryHeading(record)
  const totalBurden    = (record?.total?.annual_burden ?? 0) + muniAddition

  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <span className="site-brand">NC Fiscal Federalism Explorer</span>
          <nav className="site-nav" aria-label="Site navigation">
            <a href="#methodology" className="nav-link">Methodology</a>
            <a href="#about" className="nav-link">About</a>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <h1 className="hero-headline">Where do your taxes go?</h1>
          <p className="hero-body">
            Calculate your estimated total tax burden across all levels of government and see which services are funded at which level.
          </p>
          <p className="hero-disclaimer">
            Estimates based on 2022–2026 tax data · Not affiliated with any government
          </p>
        </section>

        <div className="controls-bar" role="search" aria-label="Household profile">
          <div className="controls-bar__inner">
            <div className="controls-row">
              {loading ? (
                <div className="skeleton-select" aria-busy="true" aria-label="Loading counties" />
              ) : (
                <CountyDropdown counties={counties} value={effectiveCounty} onChange={handleCountyChange} />
              )}
              <HousingToggle value={housing} onChange={setHousing} />
              <BracketButtons
                value={bracket}
                onChange={v => { setBracket(v); if (v === compareBracket) setCompareBracket(null) }}
              />
              {!loading && municipalRates && (
                <MunicipalityDropdown
                  county={effectiveCounty}
                  municipalRates={municipalRates}
                  value={municipality}
                  onChange={setMunicipality}
                />
              )}
            </div>
            <p className="controls-summary">
              Showing estimates for {housingLabel} in {effectiveCounty} County
              {selectedMuni ? ` (${selectedMuni})` : ''}
              {' '}earning {rangeLabel}.
            </p>
          </div>
        </div>

        <div className="results-area">
          <Disclaimer />

          {loading && (
            <TaxBreakdownTable record={null} housing={housing} bracket={bracket} loading={true} />
          )}

          {!loading && record && (
            <div key={resultKey} className="results-animate">
              <section className="metric-section" aria-label="Total tax burden">
                <div
                  className="metric-callout"
                  aria-label={`Approximately ${Math.round(totalBurden / bracketIncome * 100)} percent of income`}
                >
                  ~{Math.round(totalBurden / bracketIncome * 100)}% of income
                </div>
                <div className="metric-label">Total Estimated Tax Burden</div>
              </section>

              <section className="chart-section" aria-label="Tax burden breakdown chart">
                <h2 className="section-heading">{summaryHeading}</h2>
                <TaxStackedBar record={record} municipalAddition={muniAddition} />
              </section>

              <section className="table-section" aria-label="Tax burden table">
                <TaxBreakdownTable
                  record={record}
                  housing={housing}
                  bracket={bracket}
                  loading={false}
                  municipalAddition={muniAddition}
                  municipalLabel={selectedMuni}
                />
              </section>

              <TaxToServices
                record={record}
                county={effectiveCounty}
                localAllocations={countyAlloc}
                municipalAddition={muniAddition}
              />

              <div className="compare-section">
                <BracketComparePicker
                  value={compareBracket}
                  primary={bracket}
                  onChange={setCompareBracket}
                />
                {compareBracket && (
                  <BracketCompareTable
                    record1={record}
                    record2={compareRecord}
                    bracket1={bracket}
                    bracket2={compareBracket}
                    housing={housing}
                  />
                )}
              </div>
            </div>
          )}

          {!loading && !record && data && (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '2rem 0' }}>
              No data available for this selection.
            </p>
          )}
        </div>
      </main>

      <WhoFundsWhat />
      <MethodologySection />

      <footer className="site-footer" id="about">
        <div className="footer-inner">
          <div className="footer-brand">NC Fiscal Federalism Explorer</div>
          <p className="footer-body">
            An open-source civic tool. Data sourced from official state reporting.
          </p>
          <nav className="footer-nav" aria-label="Footer navigation">
            <a href="./pipeline_audit.csv" download>Data Sources</a>
            <a href="https://github.com/zanedavis/nc-fiscal-explorer" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="#methodology">Methodology</a>
            <a href="#about">Disclaimer</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
