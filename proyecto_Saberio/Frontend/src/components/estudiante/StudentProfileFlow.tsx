import { createContext, useContext, useEffect, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, getSession, switchProfile } from '../../services/authService'
import { request, useMaterias, id, nombre, mensajeError } from '../../services/tutoriaService'
import type { Ref } from '../../services/tutoriaService'
import type { StudentProfile } from '../../types/monitoring'
import DashboardLayout from '../layout/DashboardLayout/DashboardLayout'
import PageHero from '../layout/PageHero/PageHero'
import Card from '../shared/Card/Card'
import Button from '../Button/Button'

interface Perfil {
  id?: string
  _id?: string
  carrera: string
  semestre: number
  materiasInteres: Ref[]
  disponibilidadPreferida: string
  modalidadPreferida: string
}

interface ContextValue {
  summary: StudentProfile
  edit: () => void
}

const ProfileContext = createContext<ContextValue | null>(null)

export function useStudentProfile() {
  const value = useContext(ProfileContext)

  if (!value) {
    throw new Error('El perfil debe cargarse dentro del área de estudiante.')
  }

  return value
}

function complete(value: Perfil | null) {
  return (
    !!value &&
    typeof value.carrera === 'string' &&
    value.carrera.trim().length >= 3 &&
    Number.isInteger(value.semestre) &&
    value.semestre >= 1 &&
    value.semestre <= 12 &&
    ['Presencial', 'Virtual', 'Ambas'].includes(value.modalidadPreferida)
  )
}

function readProfile(value: unknown): Perfil | null {
  if (value === null) return null

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Formato de perfil no válido.')
  }

  return value as Perfil
}

const control: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 12,
  border: '1px solid #dcdbea',
  borderRadius: 12,
  font: 'inherit',
  background: '#fff',
  color: 'inherit',
}

const field: CSSProperties = {
  display: 'grid',
  gap: 8,
}

export default function StudentProfileFlow({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const materias = useMaterias()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setLoadError('')
    setPerfil(null)

    request('/perfiles/estudiante')
      .then(data => {
        const value = readProfile(data.perfil)

        if (active) {
          setPerfil(value)
          setSelected((value?.materiasInteres || []).map(id))
        }
      })
      .catch(err => {
        if (!active) return

        if (
          err instanceof ApiError &&
          err.status === 404 &&
          err.code === 'PERFIL_NO_ENCONTRADO'
        ) {
          setPerfil(null)
          setSelected([])
        } else {
          setLoadError(mensajeError(err))
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [attempt])

  const ready = complete(perfil)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (busy) return

    const form = new FormData(event.currentTarget)

    setBusy(true)
    setError('')

    try {
      const body = {
        carrera: String(form.get('carrera') || '').trim(),
        semestre: Number(form.get('semestre')),
        materiasInteres: selected,
        disponibilidadPreferida: String(form.get('disponibilidad') || '').trim(),
        modalidadPreferida: String(form.get('modalidad') || ''),
      }

      const result = await request('/perfiles/estudiante', 'PUT', body)
      const saved = readProfile(result.perfil)

      if (!complete(saved)) {
        throw new Error(
          'El servidor no devolvió un perfil completo. Reintenta el guardado.'
        )
      }

      setPerfil(saved)
      setSelected((saved?.materiasInteres || []).map(id))
      setEditing(false)
      navigate('/estudiante', { replace: true })
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setBusy(false)
    }
  }

  async function changeToMonitor() {
    if (switching) return

    setSwitching(true)
    setSwitchError('')

    try {
      await switchProfile('monitor')
    } catch (err) {
      setSwitchError(mensajeError(err))
    } finally {
      setSwitching(false)
    }
  }

  const layout = (content: ReactNode) => (
    <DashboardLayout role="estudiante" notifications={[]}>
      <div className="student-page">{content}</div>
    </DashboardLayout>
  )

  if (loading) {
    return layout(
      <Card title="Tu perfil">
        <p role="status">Cargando tu perfil...</p>
      </Card>
    )
  }

  if (loadError) {
    return layout(
      <Card title="No pudimos cargar tu perfil">
        <p role="alert">{loadError}</p>
        <Button onClick={() => setAttempt(value => value + 1)}>
          Reintentar
        </Button>
      </Card>
    )
  }

  if (!ready || editing) {
    return layout(
      <>
        <PageHero
          greeting={`Hola, ${getSession()?.name || ''}`}
          title={ready ? 'Editar mi perfil' : 'Completa tu perfil'}
          description="Cuéntanos sobre tus estudios y tus preferencias de monitoría."
        />

        <Card title="Datos del estudiante">
          <form onSubmit={save} style={{ display: 'grid', gap: 20 }}>
            <p>
              {getSession()?.name} · {getSession()?.email}
            </p>

            {error && <p role="alert">{error}</p>}

            <fieldset
              disabled={busy}
              style={{
                border: 0,
                padding: 0,
                margin: 0,
                minWidth: 0,
                display: 'grid',
                gap: 20,
              }}
            >
              <label style={field}>
                Carrera o programa académico *
                <input
                  style={control}
                  name="carrera"
                  required
                  minLength={3}
                  maxLength={120}
                  defaultValue={perfil?.carrera || ''}
                  autoComplete="organization-title"
                />
              </label>

              <label style={field}>
                Semestre *
                <select
                  style={control}
                  name="semestre"
                  required
                  defaultValue={perfil?.semestre || ''}
                >
                  <option value="" disabled>
                    Selecciona tu semestre
                  </option>

                  {Array.from({ length: 12 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
              </label>

              <label style={field}>
                Modalidad preferida *
                <select
                  style={control}
                  name="modalidad"
                  required
                  defaultValue={perfil?.modalidadPreferida || ''}
                >
                  <option value="" disabled>
                    Selecciona una modalidad
                  </option>
                  <option>Presencial</option>
                  <option>Virtual</option>
                  <option>Ambas</option>
                </select>
              </label>

              <div style={field}>
                <span>Materias de interés (opcional)</span>

                {materias.loading ? (
                  <p role="status">Cargando materias...</p>
                ) : materias.error ? (
                  <div>
                    <p role="alert">{materias.error}</p>

                    <Button type="button" onClick={materias.refresh}>
                      Reintentar materias
                    </Button>

                    <p>
                      Puedes guardar el perfil y elegir tus materias después.
                    </p>
                  </div>
                ) : materias.items.length === 0 ? (
                  <p>No hay materias disponibles todavía.</p>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gap: 10,
                      maxHeight: 240,
                      overflowY: 'auto',
                    }}
                  >
                    {materias.items.map(materia => (
                      <label
                        key={id(materia)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(id(materia))}
                          onChange={event =>
                            setSelected(previous =>
                              event.target.checked
                                ? [...previous, id(materia)]
                                : previous.filter(
                                    value => value !== id(materia)
                                  )
                            )
                          }
                        />

                        {materia.nombre} ({materia.codigo})
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <label style={field}>
                Disponibilidad habitual (opcional)
                <textarea
                  style={control}
                  rows={3}
                  name="disponibilidad"
                  maxLength={200}
                  defaultValue={perfil?.disponibilidadPreferida || ''}
                  placeholder="Ej.: martes y jueves después de las 3 p. m."
                />
              </label>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <Button type="submit" disabled={busy}>
                  {busy ? 'Guardando...' : 'Guardar y continuar'}
                </Button>

                {ready && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditing(false)
                      setError('')
                    }}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </fieldset>
          </form>
        </Card>
      </>
    )
  }

  if (!perfil) return null

  const summary: StudentProfile = {
    career: perfil.carrera,
    semester: perfil.semestre,
    subjects:
      (perfil.materiasInteres || [])
        .map(
          ref =>
            materias.items.find(materia => id(materia) === id(ref))?.nombre ||
            nombre(ref)
        )
        .join(', ') || 'Sin registrar',
    availability: perfil.disponibilidadPreferida || 'Sin registrar',
    modality: perfil.modalidadPreferida,
  }

  const user = getSession()
  const canSwitch = !!user?.roles?.includes('monitor')

  return (
    <ProfileContext.Provider
      value={{
        summary,
        edit: () => {
          setSelected((perfil.materiasInteres || []).map(id))
          setError('')
          setEditing(true)
        },
      }}
    >
      {canSwitch && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '12px 24px 0',
          }}
        >
          <Button
            type="button"
            onClick={changeToMonitor}
            disabled={switching}
          >
            {switching ? 'Cambiando...' : 'Cambiar a monitor'}
          </Button>
        </div>
      )}

      {switchError && (
        <div style={{ padding: '8px 24px 0' }}>
          <p role="alert">{switchError}</p>
        </div>
      )}

      {children}
    </ProfileContext.Provider>
  )
}