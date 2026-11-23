import type { InputHTMLAttributes } from 'react'
import './FormField.css'

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'id'> {
  id: string
  label: string
  onChange?: (value: string) => void
  help?: string
  error?: string
}

function FormField({ id, label, onChange, type = 'text', help, error, ...inputProps }: FormFieldProps) {
  const description = [inputProps['aria-describedby'], error ? `${id}-error` : help ? `${id}-help` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input
        {...inputProps}
        id={id}
        type={type}
        onChange={onChange ? event => onChange(event.target.value) : undefined}
        aria-invalid={Boolean(error) || inputProps['aria-invalid']}
        aria-describedby={description}
      />
      {help && !error && <p id={`${id}-help`} className="field__help">{help}</p>}
      {error && <p id={`${id}-error`} className="field__error">{error}</p>}
    </div>
  )
}

export default FormField
