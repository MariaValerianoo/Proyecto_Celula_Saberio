
import { useState } from 'react'
import './SearchFilters.css'

interface SearchFiltersProps {
  query: string
  onQueryChange: (value: string) => void
  onQuerySubmit: (value?: string) => void
  queryTags: string[]
  onRemoveQueryTag: (tag: string) => void

  modality: string
  onModalityChange: (value: string) => void
  minRating: string
  onMinRatingChange: (value: string) => void
  sort: string
  onSortChange: (value: string) => void
  quickSubjects: string[]
}

interface CustomSelectProps {
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (value: string) => void
}

function CustomSelect({
  label,
  value,
  options,
  onChange,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedOption = options.find(
    (option) => option.value === value
  )

  return (
    <div
      className={`search__filter ${open ? 'is-open' : ''}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setOpen(false)
        }
      }}
    >
      <span className="search__filter-label">{label}</span>

      <button
        type="button"
        className="search__select"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span>{selectedOption?.label ?? options[0].label}</span>
        <span className="search__arrow" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="search__options"
          role="listbox"
          aria-label={label}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className={`search__option ${value === option.value ? 'selected' : ''
                }`}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchFilters({
  query,
  onQueryChange,
  onQuerySubmit,
  queryTags,
  onRemoveQueryTag,
  modality,
  onModalityChange,
  minRating,
  onMinRatingChange,
  sort,
  onSortChange,
  quickSubjects,
}: SearchFiltersProps) {
  return (
    <div className="search">

      {/* Barra de búsqueda */}
      <form
        className="search__box"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          onQuerySubmit()
        }}
      >
        <span aria-hidden="true">🔎</span>

        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Ej: integrales por partes, parcial el jueves"
          aria-label="Buscar monitores"
        />

        <button type="submit" aria-label="Agregar búsqueda">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </form>

      {/* Búsquedas aplicadas */}
      {queryTags.length > 0 && (
        <div className="search__active-tags">
          {queryTags.map((tag) => (
            <span className="search__active-tag" key={tag}>
              <span>{tag}</span>

              <button
                type="button"
                onClick={() => onRemoveQueryTag(tag)}
                aria-label={`Eliminar búsqueda ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Filtros adicionales */}
      <div className="search__filters">

        <CustomSelect
          label="Modalidad"
          value={modality}
          onChange={onModalityChange}
          options={[
            { label: 'Todas', value: '' },
            { label: 'Presencial', value: 'Presencial' },
            { label: 'Virtual', value: 'Virtual' },
          ]}
        />

        <CustomSelect
          label="Calif. mínima"
          value={minRating}
          onChange={onMinRatingChange}
          options={[
            { label: 'Sin filtro', value: '' },
            { label: '4.5+', value: '4.5' },
            { label: '4.7+', value: '4.7' },
            { label: '4.9+', value: '4.9' },
          ]}
        />

        <CustomSelect
          label="Ordenar por"
          value={sort}
          onChange={onSortChange}
          options={[
            { label: 'Mejor coincidencia', value: 'best' },
            { label: 'Más horarios', value: 'slots' },
            { label: 'Calificación', value: 'rating' },
            { label: 'Experiencia', value: 'exp' },
          ]}
        />

      </div>

      {/* Materias rápidas */}
      <div className="search__chips">
        {quickSubjects.map((subject) => (
          <button
            key={subject}
            type="button"
            onClick={() => onQuerySubmit(subject)}
          >
            {subject}
          </button>
        ))}
      </div>

    </div>
  )
}

export default SearchFilters
