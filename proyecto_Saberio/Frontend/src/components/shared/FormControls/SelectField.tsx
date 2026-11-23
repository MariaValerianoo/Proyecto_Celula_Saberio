
import { useEffect, useRef, useState } from 'react'
import './FormControl.css'

interface SelectFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  error?: string
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Selecciona',
  error,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(
    (option) => option.value === value
  )

  // Cerrar al hacer clic fuera o presionar Escape
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const selectOption = (optionValue: string) => {
    onChange(optionValue)
    setOpen(false)
  }

  return (
    <div
      className={`control ${error ? 'control--error' : ''}`}
      ref={ref}
    >
      <label id={`${id}-label`} htmlFor={id}>
        {label}
      </label>

      <div className={`control__select-wrapper ${open ? 'is-open' : ''}`}>
        <button
          id={id}
          type="button"
          className="control__select"
          aria-labelledby={`${id}-label`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          onClick={() => setOpen((previous) => !previous)}
        >
          <span className={!selectedOption ? 'placeholder' : ''}>
            {selectedOption?.label ?? placeholder}
          </span>

          <span className="control__arrow" aria-hidden="true" />
        </button>

        {open && (
          <div
            id={`${id}-options`}
            className="control__options"
            role="listbox"
            aria-labelledby={`${id}-label`}
          >
            <button
              type="button"
              role="option"
              aria-selected={value === ''}
              className={`control__option ${value === '' ? 'selected' : ''}`}
              onClick={() => selectOption('')}
            >
              {placeholder}
            </button>

            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`control__option ${
                  value === option.value ? 'selected' : ''
                }`}
                onClick={() => selectOption(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p>{error}</p>}
    </div>
  )
}

export default SelectField
