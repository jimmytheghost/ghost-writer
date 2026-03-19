import { useEffect, useMemo, useRef, useState } from 'react'
import './ModelDropdown.css'

function normalizeOptions(options = []) {
  const normalized = []

  for (const option of options) {
    const value = String(option ?? '').trim()
    if (!value) continue
    normalized.push({ value, label: value })
  }

  return normalized
}

function ModelDropdown({
  id,
  value = '',
  options = [],
  onChange = () => {},
  onOpen = () => {},
  ariaLabel,
  title,
  includeEmptyOption = false,
  emptyOptionLabel = 'Use current model',
  emptyStateLabel = 'No models available',
  placement = 'bottom',
  align = 'start',
}) {
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)

  const normalizedOptions = useMemo(() => normalizeOptions(options), [options])
  const menuItems = useMemo(() => {
    const items = []

    if (includeEmptyOption) {
      items.push({
        value: '',
        label: emptyOptionLabel,
      })
    }

    items.push(...normalizedOptions)

    if (!items.length) {
      items.push({
        value: '',
        label: emptyStateLabel,
        disabled: true,
      })
    }

    return items
  }, [emptyOptionLabel, emptyStateLabel, includeEmptyOption, normalizedOptions])

  const selectedItem =
    menuItems.find((item) => item.value === value && !item.disabled) ??
    (includeEmptyOption && value === '' ? menuItems[0] : null)

  const triggerLabel = selectedItem?.label ?? (value ? value : emptyStateLabel)
  const menuId = `${id}-menu`

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const selectedButton = menuRef.current?.querySelector('[aria-selected="true"]')
    const firstButton = menuRef.current?.querySelector('button:not([disabled])')
    const targetButton = selectedButton ?? firstButton

    targetButton?.focus()
  }, [isOpen, menuItems, value])

  const toggleMenu = () => {
    setIsOpen((current) => {
      if (current) return false
      onOpen()
      return true
    })
  }

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) onOpen()
      setIsOpen(true)
    }
  }

  const handleSelect = (nextValue) => {
    onChange(nextValue)
    setIsOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={`model-dropdown model-dropdown--placement-${placement} model-dropdown--align-${align}${
        isOpen ? ' model-dropdown--open' : ''
      }`}
    >
      <button
        id={id}
        type="button"
        className="model-dropdown__button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={ariaLabel}
        title={title ?? triggerLabel}
        onClick={toggleMenu}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="model-dropdown__value">{triggerLabel}</span>
        <svg
          className="model-dropdown__chevron"
          aria-hidden="true"
          viewBox="0 0 24 24"
          focusable="false"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          className="model-dropdown__menu"
          role="listbox"
          aria-label={ariaLabel}
        >
          {menuItems.map((item) => {
            const isSelected = item.value === value && !item.disabled
            const isDisabled = Boolean(item.disabled)

            return (
              <button
                key={`${item.value || '__empty__'}-${item.label}`}
                type="button"
                role="option"
                className={`model-dropdown__option${
                  isSelected ? ' model-dropdown__option--selected' : ''
                }${isDisabled ? ' model-dropdown__option--disabled' : ''}`}
                aria-selected={isSelected}
                aria-disabled={isDisabled || undefined}
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return
                  handleSelect(item.value)
                }}
              >
                <span className="model-dropdown__check" aria-hidden="true">
                  {isSelected ? '✓' : ''}
                </span>
                <span className="model-dropdown__option-label">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ModelDropdown
