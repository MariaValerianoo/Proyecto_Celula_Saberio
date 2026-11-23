
import type { Monitor } from '../types/monitoring'
import { normalize } from './format'

export interface MonitorFilters {
  query: string
  modality: string
  minRating: string
  sort: string
}

export function filterMonitors(
  monitors: Monitor[],
  filters: MonitorFilters,
): Monitor[] {
  const words = normalize(filters.query)
    .split(/\s+/)
    .filter((word) => word.length >= 2)

  const minRating = parseFloat(filters.minRating) || 0

  const scored = monitors.map((monitor) => {
    const fields = [
      monitor.name,
      monitor.subject,
      monitor.career,
      ...monitor.topics,
      ...monitor.keywords,
    ].map(normalize)

    const matches = words.map((word) =>
      fields.some((field) => field.includes(word)),
    )

    const score = matches.filter(Boolean).length

    return { monitor, score, matchesAll: matches.every(Boolean) }
  })

  const result = scored
    .filter(({ matchesAll }) => words.length === 0 || matchesAll)
    .filter(
      ({ monitor }) =>
        !filters.modality ||
        monitor.modality === filters.modality ||
        monitor.modality === 'Ambas',
    )
    .filter(({ monitor }) => monitor.rating >= minRating)

  result.sort((a, b) => {
    if (filters.sort === 'rating') {
      return b.monitor.rating - a.monitor.rating
    }

    if (filters.sort === 'exp') {
      return b.monitor.helped - a.monitor.helped
    }

    if (filters.sort === 'slots') {
      return b.monitor.slots.length - a.monitor.slots.length
    }

    return (
      b.score - a.score ||
      Number(b.monitor.online) - Number(a.monitor.online)
    )
  })

  return result.map((item) => item.monitor)
}
