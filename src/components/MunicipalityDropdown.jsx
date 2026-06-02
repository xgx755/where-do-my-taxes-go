import SearchableSelect from './SearchableSelect'

export const UNINCORPORATED = '__unincorporated__'

export default function MunicipalityDropdown({ county, municipalRates, value, onChange }) {
  const munis = municipalRates?.[county] ?? []

  const options = [
    { value: UNINCORPORATED, label: 'Unincorporated / no city tax' },
    ...munis.map(m => ({
      value: m.name,
      label: `${m.name}`,
      sublabel: `$${m.rate.toFixed(3)}/100`,
    })),
  ]

  return (
    <SearchableSelect
      id="muni-select"
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Search municipalities…"
      ariaLabel="Municipality"
    />
  )
}
