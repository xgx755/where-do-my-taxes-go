/**
 * budgetAllocations.js
 * --------------------
 * Budget allocation shares for the "Your Taxes → Services" feature (F1/F6).
 *
 * Local allocations are now county-specific (Feature 6), derived from
 * NC DST County AFIR FY2025. State and federal remain statewide static values.
 *
 * Sources:
 *   State:   NC OSBM FY2024 Budget Summary, expenditures by function
 *            (K-12 38%, Medicaid/Human Services 20%, NCDOT 9%, Community Colleges 7%, Other 26%)
 *   Local:   NC DST County AFIR FY2025, extracted via pipeline/county_expenditures.py
 *            (78 counties from AFIR; 22 missing counties use statewide weighted-average fallback)
 *   Federal: OMB Historical Table 3.2 FY2023, outlays by function and subfunction
 *            (K-12 2%, Human Services/Medicaid 10%, Roads/Transp 3%, Comm Colleges <1%, Other 84.5%)
 *            Note: federal "Other" includes Social Security, Medicare, defense, and net interest —
 *            together ~75% of federal outlays. Only ~15% flows to named services below.
 *
 * IMPORTANT: Local allocations are loaded at runtime from county_local_allocations.json.
 * This file provides state and federal constants + the fallback local values.
 */

// State budget allocations (of NC General Fund expenditures)
// Source: OSBM FY2024 Budget Summary
export const BUDGET_ALLOCATIONS_STATE = {
  k12:               0.38,
  human_services:    0.20,  // primarily Medicaid at state level
  roads:             0.09,
  community_college: 0.07,
  other:             0.26,
}

// Federal budget allocations (of federal outlays)
// Source: OMB Historical Table 3.2 FY2023
// Note: "other" includes SS, Medicare, defense, debt service (~84.5% of federal outlays)
export const BUDGET_ALLOCATIONS_FEDERAL = {
  k12:               0.02,
  human_services:    0.10,  // primarily Medicaid at federal level
  roads:             0.03,
  community_college: 0.005,
  other:             0.845,
}

// Statewide weighted-average local allocation fallback.
// Used for 22 counties not in the AFIR and as a reference value.
// Source: NC DST County AFIR FY2025, weighted average of 78 counties with data.
export const BUDGET_ALLOCATIONS_LOCAL_FALLBACK = {
  k12:               0.2824,
  community_college: 0.0219,
  human_services:    0.1459,
  roads:             0.0,    // not separately tracked in county AFIR; embedded in Other
  other:             0.5498,
}

// State "Other" drill-down categories derived from the NC state expenditures-by-committee CSV.
// Shares sum to 1.0 within the state breakdown.
export const STATE_OTHER_BREAKDOWN = [
  { key: 'health_human_services', label: 'Health and Human Services', share: 0.526178 },
  { key: 'education', label: 'Education', share: 0.286658 },
  { key: 'transportation', label: 'Transportation', share: 0.108995 },
  { key: 'justice_public_safety', label: 'Justice and Public Safety', share: 0.050620 },
  { key: 'natural_economic_resources', label: 'Natural and Economic Resources', share: 0.016752 },
  { key: 'general_government', label: 'General Government', share: 0.010798 },
]

// Federal "Other" drill-down categories derived from USAspending obligations by budget function.
// The final row captures the remainder after the largest categories are shown.
export const FEDERAL_OTHER_BREAKDOWN = [
  { key: 'medicare', label: 'Medicare', share: 0.179765 },
  { key: 'social_security', label: 'Social Security', share: 0.163234 },
  { key: 'national_defense', label: 'National Defense', share: 0.138653 },
  { key: 'net_interest', label: 'Net Interest', share: 0.122421 },
  { key: 'health', label: 'Health', share: 0.112059 },
  { key: 'income_security', label: 'Income Security', share: 0.074300 },
  { key: 'general_government', label: 'General Government', share: 0.050049 },
  { key: 'veterans_benefits', label: 'Veterans Benefits and Services', share: 0.040454 },
  { key: 'education_workforce', label: 'Education, Training, Employment, and Social Services', share: 0.021683 },
  { key: 'transportation', label: 'Transportation', share: 0.019360 },
  { key: 'international_affairs', label: 'International Affairs', share: 0.017660 },
  { key: 'natural_resources', label: 'Natural Resources and Environment', share: 0.012844 },
  { key: 'other_federal_programs', label: 'Other Federal Programs', share: 0.047519 },
]

// Public-purpose taxonomy for "Where your taxes go".
// These buckets are designed to be understandable to a general audience while
// still keeping local, state, and federal spending distinct in the UI.
export const PURPOSE_BUCKETS = [
  { key: 'education', label: 'Education' },
  { key: 'health_human_services', label: 'Health & Human Services' },
  { key: 'transportation_infrastructure', label: 'Transportation & Infrastructure' },
  { key: 'public_safety_justice', label: 'Public Safety & Justice' },
  { key: 'government_operations_debt', label: 'Government Operations & Debt' },
  { key: 'retirement_insurance_transfers', label: 'Retirement, Insurance & Transfers' },
  { key: 'defense_veterans', label: 'Defense & Veterans' },
  { key: 'environment_natural_resources', label: 'Environment & Natural Resources' },
  { key: 'other_residual', label: 'Other / Residual' },
]

// Legacy service definitions kept for the Who Funds What panel and any other
// parts of the app that still use the older summary model.
export const SERVICES = [
  { key: 'k12',               label: 'K–12 Education' },
  { key: 'human_services',    label: 'Human Services (incl. Medicaid)' },
  { key: 'roads',             label: 'Roads & Transportation' },
  { key: 'community_college', label: 'Community Colleges' },
  { key: 'other',             label: 'All Other Government Functions' },
]
