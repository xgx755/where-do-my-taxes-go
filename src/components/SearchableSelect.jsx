import { useState, useRef, useEffect } from 'react'

/**
 * SearchableSelect
 * Accessible autocomplete — type to filter, arrow keys + enter to navigate.
 *
 * Props:
 *   options     Array<{ value: string, label: string, sublabel?: string }>
 *   value       string  — currently selected value
 *   onChange    (value: string) => void
 *   placeholder string  — shown while typing (empty field)
 *   id          string
 *   ariaLabel   string
 */
export default function SearchableSelect({ options, value, onChange, placeholder, id, ariaLabel }) {
  const current   = options.find(o => o.value === value)
  const [query,       setQuery]       = useState('')
  const [open,        setOpen]        = useState(false)
  const [highlighted, setHighlighted] = useState(-1)

  const inputRef = useRef(null)
  const listRef  = useRef(null)
  const wrapRef  = useRef(null)

  // When query is empty and list is open, show all options; otherwise filter
  const filtered = (open && query === '')
    ? options
    : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))

  /* ── open / close helpers ── */
  const openList = () => {
    setQuery('')
    setOpen(true)
    // Pre-highlight the currently selected option
    const idx = options.findIndex(o => o.value === value)
    setHighlighted(idx >= 0 ? idx : 0)
  }

  const closeList = () => {
    setOpen(false)
    setQuery('')
    setHighlighted(-1)
  }

  const selectOption = (opt) => {
    onChange(opt.value)
    closeList()
    inputRef.current?.blur()
  }

  /* ── event handlers ── */
  const handleFocus = () => openList()

  const handleBlur = (e) => {
    // Keep open if focus moves to the dropdown list itself
    if (wrapRef.current?.contains(e.relatedTarget)) return
    closeList()
  }

  const handleInputChange = (e) => {
    setQuery(e.target.value)
    setHighlighted(0)
    if (!open) setOpen(true)
  }

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        openList()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlighted(h => Math.min(h + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlighted(h => Math.max(h - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (highlighted >= 0 && filtered[highlighted]) selectOption(filtered[highlighted])
        break
      case 'Escape':
        closeList()
        break
      case 'Tab':
        closeList()
        break
      default:
        break
    }
  }

  /* ── scroll highlighted item into view ── */
  useEffect(() => {
    if (!listRef.current || highlighted < 0) return
    const el = listRef.current.children[highlighted]
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  /* ── display value: show label when closed, query when open ── */
  const displayValue = open ? query : (current?.label ?? '')

  return (
    <div className="ss-wrap" ref={wrapRef}>
      <div className="ss-input-wrap">
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="ss-input"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${id}-list`}
          aria-label={ariaLabel}
          aria-activedescendant={highlighted >= 0 ? `${id}-opt-${highlighted}` : undefined}
          placeholder={open ? (placeholder ?? 'Type to search…') : undefined}
        />
        <span className={`ss-chevron${open ? ' ss-chevron--open' : ''}`} aria-hidden="true">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          className="ss-list"
          role="listbox"
          aria-label={ariaLabel}
          // Prevent the input from losing focus when clicking inside the list
          onMouseDown={e => e.preventDefault()}
        >
          {filtered.length === 0 ? (
            <li className="ss-empty" role="option" aria-selected="false">No matches</li>
          ) : (
            filtered.map((opt, i) => (
              <li
                key={opt.value}
                id={`${id}-opt-${i}`}
                className={[
                  'ss-option',
                  i === highlighted       ? 'ss-option--hl'       : '',
                  opt.value === value     ? 'ss-option--selected'  : '',
                ].filter(Boolean).join(' ')}
                role="option"
                aria-selected={opt.value === value}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => selectOption(opt)}
              >
                <span className="ss-option__label">{opt.label}</span>
                {opt.sublabel && <span className="ss-option__sub">{opt.sublabel}</span>}
                {opt.value === value && <span className="ss-option__check" aria-hidden="true">✓</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
