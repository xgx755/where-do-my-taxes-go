import SearchableSelect from './SearchableSelect'

export default function CountyDropdown({ counties, value, onChange }) {
  const options = counties.map(c => ({ value: c, label: `${c} County` }))
  return (
    <SearchableSelect
      id="county-select"
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Search counties…"
      ariaLabel="County"
    />
  )
}
