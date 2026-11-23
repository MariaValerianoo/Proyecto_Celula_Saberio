import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Modality } from '../../types/monitoring'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import TextAreaField from '../shared/FormControls/TextAreaField'
import SelectField from '../shared/FormControls/SelectField'
import FormField from '../FormField/FormField'
import SoportesMateria from './SoportesMateria'
import { useMaterias, useLista, request, id, mensajeError } from '../../services/tutoriaService'
import type { Ref } from '../../services/tutoriaService'
export interface PublicacionFormReal {
  materiaId: string
  descripcion: string
  modalidad: Modality
  tarifaPorHora: number
  duracionMinutos: number
}
interface Props {
  materiaIdInicial?: string
  descripcionInicial?: string
  modalidadInicial?: Modality
  tarifaInicial?: number
  duracionInicial?: number
  onClose: () => void
  onSave: (datos: PublicacionFormReal) => void | Promise<void>
}
interface Soporte { id?: string; _id?: string; materia: Ref; estado: string; observacionesAdmin?: string }
const MODALIDADES = ['Presencial', 'Virtual', 'Ambas'].map(value => ({ value, label: value }))
const DURACIONES = [60, 90, 120].map(d => ({ value: String(d), label: `${d} minutos` }))
export default function PublicationModal({ materiaIdInicial = '', descripcionInicial = '', modalidadInicial, tarifaInicial = 0, duracionInicial = 60, onClose, onSave }: Props) {
  const materias = useMaterias()
  const soportes = useLista<Soporte>('/soportes/propios', 'soportes')
  const [ofrecidas, setOfrecidas] = useState<string[]>([])
  const [perfilLoading, setPerfilLoading] = useState(true)
  const [perfilError, setPerfilError] = useState('')
  const [revision, setRevision] = useState(0)
  const [form, setForm] = useState({ materiaId: materiaIdInicial, descripcion: descripcionInicial, modalidad: modalidadInicial ?? '', tarifa: String(tarifaInicial), duracion: String(duracionInicial) })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let active = true
    setPerfilLoading(true); setPerfilError('')
    request('/perfiles/monitor').then(data => {
      if (!Array.isArray(data.perfil?.materiasOfrecidas)) throw new Error('Guarda primero las materias en tu perfil de monitor.')
      if (active) setOfrecidas(data.perfil.materiasOfrecidas.map((m: Ref) => id(m)))
    }).catch(error => { if (active) { setOfrecidas([]); setPerfilError(mensajeError(error)) } }).finally(() => { if (active) setPerfilLoading(false) })
    return () => { active = false }
  }, [revision])
  const disponibles = materias.items.filter(m => ofrecidas.includes(id(m)))
  const opciones = disponibles.map(m => ({ value: id(m), label: `${m.nombre} (${m.codigo})` }))
  const documentos = soportes.items.filter(s => id(s.materia) === form.materiaId)
  const aprobado = documentos.some(s => s.estado === 'Aprobado')
  const pendiente = documentos.some(s => s.estado === 'Pendiente')
  const blocked = saving || materias.loading || !!materias.error || perfilLoading || !!perfilError || soportes.loading || !!soportes.error || !aprobado || !opciones.some(m => m.value === form.materiaId)
  const close = () => { if (!saving) onClose() }
  const refresh = () => { soportes.refresh(); setRevision(v => v + 1) }
  const update = (campo: keyof typeof form) => (valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setErrors(prev => ({ ...prev, [campo]: '', general: '' }))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (blocked) return
    const errores: Record<string, string> = {}
    if (form.descripcion.trim().length < 10 || form.descripcion.trim().length > 1000) errores.descripcion = 'La descripción debe tener entre 10 y 1000 caracteres'
    if (!MODALIDADES.some(m => m.value === form.modalidad)) errores.modalidad = 'Selecciona una modalidad'
    const tarifa = Number(form.tarifa)
    if (!Number.isFinite(tarifa) || tarifa < 0 || tarifa > 1000000) errores.tarifa = 'Ingresa una tarifa entre 0 y 1000000'
    setErrors(errores)
    if (Object.keys(errores).length) return
    setSaving(true)
    try {
      const data = await request('/soportes/propios')
      if (!Array.isArray(data.soportes) || !data.soportes.some((s: Soporte) => id(s.materia) === form.materiaId && s.estado === 'Aprobado')) throw new Error('Debes cargar un soporte y esperar la aprobación del administrador para esta materia.')
      await onSave({ materiaId: form.materiaId, descripcion: form.descripcion.trim(), modalidad: form.modalidad as Modality, tarifaPorHora: tarifa, duracionMinutos: Number(form.duracion) })
    } catch (error) { setErrors(prev => ({ ...prev, general: mensajeError(error) })); soportes.refresh() }
    finally { setSaving(false) }
  }
  return <Modal open title={materiaIdInicial ? 'Editar publicación' : 'Nueva publicación de monitoría'} onClose={close} footer={<><Button variant="secondary" disabled={saving} onClick={close}>Cerrar</Button><Button type="submit" form="form-publicacion" disabled={blocked} loading={saving} loadingText="Guardando...">{materiaIdInicial ? 'Guardar cambios' : 'Publicar'}</Button></>}>
    <p>1. Selecciona una materia de tu perfil. 2. Carga su soporte académico. 3. Espera la aprobación del administrador. Solo entonces podrás publicar esa materia.</p>
    {(materias.loading || perfilLoading || soportes.loading) && <p role="status">Consultando materias y acreditación...</p>}
    {(materias.error || perfilError || soportes.error) && <div role="alert"><p>{materias.error || perfilError || soportes.error}</p><Button variant="secondary" onClick={() => { materias.refresh(); refresh() }}>Reintentar</Button></div>}
    {!materias.loading && !perfilLoading && !perfilError && !opciones.length && <p>Debes seleccionar y guardar tus materias en Mi perfil antes de cargar soportes o publicar.</p>}
    {!saving && <a href="/monitor/perfil">Ir a Mi perfil para guardar materias</a>}
    <form id="form-publicacion" onSubmit={submit} noValidate style={{ display: 'grid', gap: 20, marginTop: 20 }}>
      {errors.general && <p role="alert">{errors.general}</p>}
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 20 }}>
        <SelectField id="pub-materia" label="Materia *" value={form.materiaId} onChange={update('materiaId')} options={opciones} />
        <TextAreaField id="pub-desc" label="Descripción *" value={form.descripcion} onChange={update('descripcion')} placeholder="Describe la monitoría que ofreces" error={errors.descripcion} />
        <div className="form-row"><SelectField id="pub-modalidad" label="Modalidad *" value={form.modalidad} onChange={update('modalidad')} options={MODALIDADES} error={errors.modalidad} /><SelectField id="pub-duracion" label="Duración" value={form.duracion} onChange={update('duracion')} options={DURACIONES} /></div>
        <FormField id="pub-tarifa" label="Tarifa por hora" type="number" min={0} max={1000000} step={0.01} value={form.tarifa} onChange={update('tarifa')} />
        {errors.tarifa && <p role="alert">{errors.tarifa}</p>}
      </fieldset>
    </form>
    {form.materiaId && <section style={{ marginTop: 24 }} aria-label="Aprobación de soportes">
      <h4>Acreditación de la materia</h4>
      {!soportes.loading && !soportes.error && <p role="status">{aprobado ? 'Aprobado por el administrador. Ya puedes publicar esta materia.' : pendiente ? 'Pendiente de aprobación. El administrador debe revisar el soporte antes de que puedas publicar.' : documentos.length ? 'Soporte rechazado. Revisa las observaciones y carga un documento corregido.' : 'Sin soporte. Carga un documento y espera la aprobación del administrador.'}</p>}
      {!aprobado && documentos.filter(s => s.estado === 'Rechazado' && s.observacionesAdmin).map(s => <p key={id(s)}>Observaciones: {s.observacionesAdmin}</p>)}
      <SoportesMateria key={`${form.materiaId}-${revision}`} materiasSeleccionadas={[form.materiaId]} materias={disponibles} disabled={saving} />
      <Button variant="secondary" disabled={saving || soportes.loading} onClick={refresh}>Consultar aprobación del administrador</Button>
    </section>}
  </Modal>
}
