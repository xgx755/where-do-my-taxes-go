import { useState } from 'react'

function Section({ title, children }) {
  return (
    <div className="meth-block">
      <h3 className="meth-h3">{title}</h3>
      {children}
    </div>
  )
}

function LimitationList({ items }) {
  return (
    <ul className="meth-list">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

export default function MethodologySection() {
  const [open, setOpen] = useState(false)

  return (
    <section className="meth-section" id="methodology" aria-labelledby="meth-heading">
      <button
        className="meth-toggle"
        aria-expanded={open}
        aria-controls="meth-body"
        onClick={() => setOpen(v => !v)}
      >
        <span className="meth-toggle__label" id="meth-heading">Methodology</span>
        <span className="meth-toggle__icon" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div id="meth-body" className="meth-body">

          <Section title="What This Tool Models">
            <p>
              This tool estimates the <strong>tax incidence</strong> of key taxes on representative households,
              not individual tax liability. Estimates are pre-computed for four income brackets × two
              housing statuses × 100 NC counties. All calculations happen at pipeline time; the browser
              loads a static lookup table.
            </p>
            <p>
              <strong>Tax liability</strong> is the legal obligation to pay: the amount you owe on your return.
              <br />
              <strong>Tax incidence</strong> is the economic burden: who ultimately bears the cost of a tax,
              regardless of who writes the check.
            </p>
            <p>
              This distinction matters in two places: property tax for renters (passed through in rent) and
              federal income tax (modeled from national distributional averages, not individual returns).
            </p>
          </Section>

          <Section title="Property Tax">
            <p>
              <strong>Homeowners:</strong> County property tax rate (NCDOR 2024–2025 County Tax Rates, downloaded
              May 2026) × estimated home value. Home values are county median (ACS 5-year 2023, Table B25077)
              scaled by income-bracket multipliers derived from NC ACS Table B25121: $25K = 0.72×, $50K = 0.85×,
              $100K = 0.99×, $200K+ = 1.95× county median.
            </p>
            <p>
              <strong>Renters:</strong> Property taxes are assumed fully passed through in rent (standard public
              finance incidence assumption). Rental unit value estimated as annual gross rent ÷ 6% cap rate.
            </p>
            <p>
              <strong>Municipal overlay (V2):</strong> If a municipality is selected, the city property tax rate
              (NC DST AFIR FY2025, Row 100) is applied to the same estimated home value used for the county rate.
              The home value is back-calculated from the county burden and the stored county rate.
              Source: NC DST Annual Financial Information Reports FY2025.
            </p>
            <LimitationList items={[
              'County-only rate by default; municipal overlay added in V2 for 535 of 549 NC municipalities.',
              'Assessed values may differ from market values depending on county revaluation cycle.',
              'The $25K bracket multiplier (0.72×) uses a statewide average — in high-cost counties, low-income long-time homeowners may own higher-value property.',
              'The $200K+ multiplier (1.95×) is estimated from PUMS research.',
              'The 6% cap rate for renters is a national average; county cap rates vary.',
              'Municipal "dominant county" assignment follows NC DST AFIR; a handful of municipalities straddling county lines are assigned to their dominant county.',
            ]} />
          </Section>

          <Section title="NC State Income Tax">
            <p>
              Models tax <em>liability</em>. Formula: <code>max(0, gross_income − $13,000) × 3.99%</code>.
              Rate is the 2026 NC flat rate. Standard deduction of $13,000 is the single-filer baseline per NCGS § 105-153.7.
            </p>
            <LimitationList items={[
              'Uses single-filer standard deduction. Married filers receive a $26,000 deduction.',
              'Does not model itemized deductions, credits, or non-wage income.',
              'NC has no state Earned Income Tax Credit.',
              'Does not vary by county — correct, NC income tax is statewide.',
            ]} />
          </Section>

          <Section title="Historical NC Income Tax Rates (V2)">
            <p>
              The trend chart on the state income tax row shows estimated annual burden for the selected bracket
              across tax years 2020–2026, reflecting the legislated phasedown of NC's flat rate:
            </p>
            <table className="meth-table">
              <thead><tr><th>Tax Year</th><th>Rate</th><th>Std. Deduction (single)</th></tr></thead>
              <tbody>
                <tr><td>2020–2021</td><td>5.25%</td><td>$10,750</td></tr>
                <tr><td>2022</td><td>4.99%</td><td>$12,750</td></tr>
                <tr><td>2023</td><td>4.75%</td><td>$12,750</td></tr>
                <tr><td>2024</td><td>4.50%</td><td>$13,000</td></tr>
                <tr><td>2025</td><td>4.25%</td><td>$13,000</td></tr>
                <tr><td>2026</td><td>3.99%</td><td>$13,000</td></tr>
              </tbody>
            </table>
            <p>
              Sources: NCDOR rate schedules; NCGS § 105-153.7. V2 shows confirmed historical years (2020–2026) only.
              Projected future reductions (2027–2028) require annual legislative confirmation and are not shown.
            </p>
            <LimitationList items={[
              'The trend isolates rate and standard deduction changes. All other factors (property values, spending patterns, county rates) are held constant at current values.',
              'This is not a year-over-year tax return comparison — it shows what a household at the current bracket would have paid under each year\'s parameters.',
            ]} />
          </Section>

          <Section title="Sales Tax">
            <p>
              Models tax <em>incidence</em> via estimated consumption. Taxable consumption by income bracket
              from BLS Consumer Expenditure Survey 2024. Combined rate = NC state (4.75%) + county local add-on
              (2.00% or 2.25%; NCDOR effective 7/1/2024). Groceries taxed at 2.0% (NC state rate only).
            </p>
            <LimitationList items={[
              'CEX estimates at the $25K and $200K+ tails are less reliable due to undersampling.',
              'CEX data is national. County variation in burden comes from rate differences, not spending patterns.',
              'Does not model gas tax, vehicle purchases, or professional services.',
            ]} />
          </Section>

          <Section title="Federal Income Tax">
            <p>
              Models tax <em>incidence</em> using national distributional averages.{' '}
              <strong>This estimate is identical for all 100 NC counties.</strong>{' '}
              Effective rates: $25K → 1.5%; $50K → 6.5%; $100K → 11.5%; $200K+ → 18.5%.
              Sources: ITEP <em>Who Pays Taxes in America in 2024</em>; IRS SOI 2022 Table 1.4.
            </p>
            <LimitationList items={[
              'National averages only.',
              'Does not model itemized deductions, investment income, capital gains, EITC, Child Tax Credit, or AMT.',
              'Payroll taxes (employee share) are modeled separately — see below.',
            ]} />
          </Section>

          <Section title="Payroll Taxes — Employee Share (V2)">
            <p>
              Models employee-side Social Security and Medicare taxes for 2026.
              Formula: SS = <code>min(income, $176,100) × 6.2%</code>; Medicare = <code>income × 1.45%</code>.
              Additional 0.9% Medicare surtax applies above $200,000 (single filer), which does not trigger
              at the $200K+ bracket boundary exactly.
            </p>
            <p>
              <strong>Employee share only.</strong> The employer's matching contribution (6.2% SS + 1.45% Medicare)
              is not modeled. Economists believe some portion of the employer share falls on workers via lower wages,
              but this is contested and the methodology is non-trivial. Employer-side incidence is deferred to V3.
            </p>
            <LimitationList items={[
              'Models wage income only. Self-employment tax (15.3%, combining both sides) is higher in structure and not modeled.',
              'County-invariant: payroll taxes are federal and do not vary by location.',
              'SS wage base: $176,100 for 2026 (SSA COLA announcement, Oct 2025). Updated annually.',
              'At the $25K bracket, employee payroll taxes (~$1,912) exceed federal income tax (~$375) — this is the primary V1 omission this feature corrects.',
            ]} />
          </Section>

          <Section title="Your Taxes → Services (V2 — F1 + F6)">
            <p>
              Crosses user tax burden by level × budget allocation shares to estimate dollars flowing
              to each public service. Formula: <code>(local_taxes × local_pct) + (state_taxes × state_pct) + (federal_taxes × federal_pct)</code>.
            </p>
            <p>
              <strong>Local allocations (F6):</strong> County-specific values from NC DST County AFIR FY2025.
              78 of 100 NC counties have direct data; 22 missing counties use a statewide weighted-average fallback.
              Missing counties are flagged with an asterisk.
            </p>
            <p>
              <strong>State allocations:</strong> NC OSBM FY2024 Budget Summary (K–12 38%, Human Services 20%,
              Roads 9%, Community Colleges 7%, Other 26%).
            </p>
            <p>
              <strong>State and federal Other drill-down (V3):</strong> state detail uses NC OSBM committee
              expenditures; federal detail uses USAspending budget-function obligations. The drill-down now
              itemizes the major state and federal components instead of showing a single combined line.
            </p>
            <LimitationList items={[
              '"Human Services (incl. Medicaid)" at the local level reflects county DSS, Medicaid contributions, mental health, and all related programs — not Medicaid alone.',
              'Local road spending is embedded in "All Other" in the AFIR; roads allocation is 0 at the local level.',
              'All percentages are approximate. The tool is a guide, not a line-item budget reconciliation.',
              'V2 corrects a structural error in the original spec\'s local allocation estimates (K–12 was overstated at 52%; AFIR-derived actual is 28.2% statewide average).',
            ]} />
          </Section>

          <Section title="Policy Simulation (V2 — F4)">
            <p>
              The "What if?" panel adjusts NC state income tax parameters to show the dollar impact on a
              representative household. Two inputs: NC flat rate (0–8%) and standard deduction ($0–$30,000).
            </p>
            <p>
              <strong>This is a simulation, not a projection or forecast.</strong> It shows how a representative
              household at the selected bracket would be affected by the chosen parameters — not any specific
              individual's tax liability. The simulation does not model itemized deductions, credits, or
              income types beyond the bracket income.
            </p>
            <LimitationList items={[
              'Only NC state income tax parameters are adjusted. All other taxes (property, sales, federal, payroll) reflect current estimates.',
              'No revenue scoring: the tool does not estimate what the state would collect or lose.',
              'Not a substitute for NCDOR guidance or a tax professional.',
            ]} />
          </Section>

          <Section title="Municipal Tax Rates (V2 — F5)">
            <p>
              Municipal property tax rates from NC DST Annual Financial Information Reports (AFIR) FY2025.
              Source files cover 549 NC municipalities. Rate is per $100 assessed value (Row 100).
              Each municipality is assigned to its dominant county (Row 121).
            </p>
            <LimitationList items={[
              '535 of 549 municipalities have a positive tax rate; 14 have a zero rate (no property tax levy).',
              '"Dominant county" assignment: municipalities straddling county lines are assigned to one county. Residents in the non-dominant portion may see a slightly wrong county rate.',
              'Municipal rates are updated annually by NC DST. The pipeline data refresh cadence should include updating municipal_rates.py each fall when new AFIRs are released.',
              'Assessed values used for the municipal overlay are the same estimates used for the county rate — both are applied to the same home value, so the ratio is exact.',
            ]} />
          </Section>

          <Section title="What This Tool Does Not Model">
            <table className="meth-table">
              <thead>
                <tr>
                  <th scope="col">Omission</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Payroll taxes (SS + Medicare) — employee share</td><td>Added in V2</td></tr>
                <tr><td>Municipal overlay property tax rates</td><td>Added in V2</td></tr>
                <tr><td>Historical NC income tax rate trend</td><td>Added in V2</td></tr>
                <tr><td>Policy simulation (NC rate + deduction)</td><td>Added in V2</td></tr>
                <tr><td>Your taxes → services breakdown</td><td>Added in V2</td></tr>
                <tr><td>Gas tax</td><td>County-level consumption data unreliable</td></tr>
                <tr><td>Vehicle purchases (Highway Use Tax)</td><td>Separate 3% NC tax; variable spending</td></tr>
                <tr><td>Corporate / business taxes</td><td>Incidence contested; V3</td></tr>
                <tr><td>Employer-side payroll tax incidence</td><td>Contested methodology; V3</td></tr>
                <tr><td>Lottery</td><td>Requires separate methodology</td></tr>
                <tr><td>Itemized deductions</td><td>Standard deduction used throughout</td></tr>
                <tr><td>Future NC rate reductions (2027–2028)</td><td>Require annual legislative confirmation; V3</td></tr>
                <tr><td>Capital gains / investment income</td><td>Separate bracket structure needed</td></tr>
              </tbody>
            </table>
          </Section>

          <Section title="Household Size">
            <p>
              Household size was evaluated and excluded from V1. Variation in taxable consumption by household
              size at the same income level produces a sales tax difference of approximately $200/year (0.4%
              of income at the $50K bracket) — within the estimation uncertainty of CEX-based modeling.
            </p>
          </Section>

          <Section title="Data Sources and Vintages">
            <table className="meth-table">
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Source</th>
                  <th scope="col">Vintage</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>County property tax rates</td><td>NCDOR 2024–2025 County Tax Rates</td><td>FY 2024–25</td></tr>
                <tr><td>Municipal property tax rates</td><td>NC DST AFIR FY2025</td><td>FY2025 (as of 6/30/2025)</td></tr>
                <tr><td>County sales tax rates</td><td>NCDOR Current S&U Tax Rates</td><td>Effective 7/1/2024</td></tr>
                <tr><td>NC income tax rate + std. deduction</td><td>NCDOR / NCGS § 105-153.7</td><td>2026 tax year</td></tr>
                <tr><td>NC income tax history (2020–2026)</td><td>NCDOR rate schedules; NCGS § 105-153.7</td><td>Per tax year</td></tr>
                <tr><td>Median home value by county (B25077)</td><td>ACS 5-year 2023, CensusReporter.org</td><td>2019–2023</td></tr>
                <tr><td>Median gross rent by county (B25064)</td><td>ACS 5-year 2023, CensusReporter.org</td><td>2019–2023</td></tr>
                <tr><td>Home value by income (B25121)</td><td>ACS 5-year 2023, NC state level</td><td>2019–2023</td></tr>
                <tr><td>Taxable consumption by bracket</td><td>BLS CEX 2024</td><td>Calendar year 2024</td></tr>
                <tr><td>Federal income tax effective rates</td><td>ITEP (2024) + IRS SOI (2022)</td><td>2024 / 2022</td></tr>
                <tr><td>Payroll tax parameters</td><td>IRS 2026; SSA wage base announcement</td><td>2026 tax year</td></tr>
                <tr><td>State budget allocations</td><td>NC OSBM FY2024 Budget Summary</td><td>FY2024</td></tr>
                <tr><td>Local budget allocations</td><td>NC DST County AFIR FY2025</td><td>FY2025</td></tr>
                <tr><td>Federal budget allocations</td><td>OMB Historical Table 3.2</td><td>FY2023</td></tr>
              </tbody>
            </table>
            <p>
              <a href="./pipeline_audit.csv" download>Download the full pipeline audit CSV</a> — source,
              vintage, assumption, and quality flag for every cell in the dataset.
            </p>
          </Section>

          <Section title="Challenging These Estimates">
            <p>
              We expect methodological disagreements. If you're a researcher, policy analyst, or
              practitioner and see something that should be different, please open an issue or contact us.
            </p>
            <ol className="meth-list">
              <li>The income-bracket home value multipliers (derived from ACS B25121 — the state cross-tab is coarse)</li>
              <li>The 6% rental unit cap rate assumption</li>
              <li>The CEX taxable consumption estimates, especially at the $25K and $200K+ brackets</li>
              <li>The federal income tax effective rates (sensitive to the payroll/income split methodology)</li>
              <li>The budget allocation percentages (especially local allocations for the 22 counties using statewide averages)</li>
            </ol>
            <p>
              <a href="https://github.com/zanedavis/nc-fiscal-explorer/issues" target="_blank" rel="noopener noreferrer">
                Open an issue on GitHub
              </a>
            </p>
          </Section>

        </div>
      )}
    </section>
  )
}
