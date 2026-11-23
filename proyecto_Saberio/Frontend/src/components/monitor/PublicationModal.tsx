import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Modality } from '../../types/monitoring'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import TextAreaField from '../shared/FormControls/TextAreaField'
import SelectField from '../shared/FormControls/SelectField'
import FormField from '../FormField/FormField'
import { useMaterias, id } from '../../services/tutoriaService'
export interface PublicacionFormReal {
  materiaId: string
  descripcion: string
  modalidad: Modality
  tarifaPorHora: number
  duracionMinutos: number
}
interface PublicationModalProps {
  materiaIdInicial?: string
  descripcionInicial?: string
  modalidadInicial?: Modality
  tarifaInicial?: number
  duracionInicial?: number
  onClose: () => void
  onSave: (datos: PublicacionFormReal) => void | Promise<void>
}
const MODALIDADES = ['Presencial', 'Virtual', 'Ambas'].map(m => ({ value: m, label: m }))
const DURACIONES = [60, 90, 120].map(d => ({ value: String(d), label: `${d} minutos` }))
export default function PublicationModal({ materiaIdInicial = '', descripcionInicial = '', modalidadInicial, tarifaInicial = 0, duracionInicial = 60, onClose, onSave }: PublicationModalProps) {
  const materias = useMaterias()
  const [form, setForm] = useState({ materiaId: materiaIdInicial, descripcion: descripcionInicial, modalidad: modalidadInicial ?? '', tarifa: String(tarifaInicial), duracion: String(duracionInicial) })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const opciones = materias.items.map(m => ({ value: id(m), label: `${m.nombre} (${m.codigo})` }))
  const blocked = materias.loading || !!materias.error || opciones.length === 0 || saving
  const close = () => { if (!saving) onClose() }
  const update = (campo: keyof typeof form) => (valor: string) => {
    setForm(prev => ({ ...prev, [campo]: valor }))
    setErrors(prev => ({ ...prev, [campo]: '', general: '' }))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (blocked) return
    const errores: Record<string, string> = {}
    if (!opciones.some(m => m.value === form.materiaId)) errores.materiaId = 'Selecciona una materia disponible'
    if (form.descripcion.trim().length < 10 || form.descripcion.trim().length > 1000) errores.descripcion = 'La descripción debe tener entre 10 y 1000 caracteres'
    if (!MODALIDADES.some(m => m.value === form.modalidad)) errores.modalidad = 'Selecciona una modalidad'
    const tarifa = Number(form.tarifa)
    if (!Number.isFinite(tarifa) || tarifa < 0 || tarifa > 1000000) errores.tarifa = 'Ingresa una tarifa entre 0 y 1000000'
    setErrors(errores)
    if (Object.keys(errores).length) return
    setSaving(true)
    try {
      await onSave({ materiaId: form.materiaId, descripcion: form.descripcion.trim(), modalidad: form.modalidad as Modality, tarifaPorHora: tarifa, duracionMinutos: Number(form.duracion) })
    } catch (error) {
      setErrors(prev => ({ ...prev, general: error instanceof Error ? error.message : 'No se pudo guardar la publicación.' }))
    } finally { setSaving(false) }
  }
  return <Modal open title={materiaIdInicial ? 'Editar publicación' : 'Nueva publicación de monitoría'} onClose={close} footer={<><Button variant="secondary" disabled={saving} onClick={close}>Cancelar</Button><Button type="submit" form="form-publicacion" disabled={blocked} loading={saving} loadingText="Guardando...">{materiaIdInicial ? 'Guardar cambios' : 'Publicar'}</Button></>}>
    <form id="form-publicacion" onSubmit={submit} noValidate style={{ display: 'grid', gap: 20 }}>
      {materias.loading && <p role="status">Cargando materias disponibles...</p>}
      {materias.error && <div role="alert"><p>{materias.error}</p><Button variant="secondary" onClick={materias.refresh}>Reintentar materias</Button></div>}
      {!materias.loading && !materias.error && !opciones.length && <div role="status"><p>No hay materias disponibles. Solicita al administrador que registre el catálogo.</p><Button variant="secondary" onClick={materias.refresh}>Actualizar materias</Button></div>}
      {errors.general && <p role="alert">{errors.general}</p>}
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'grid', gap: 20 }}>
        <SelectField id="pub-materia" label="Materia *" value={form.materiaId} onChange={update('materiaId')} options={opciones} error={errors.materiaId} />
        <TextAreaField id="pub-desc" label="Descripción *" value={form.descripcion} onChange={update('descripcion')} placeholder="Ej: apoyo en derivadas y preparación de parciales..." error={errors.descripcion} />
        <div className="form-row"><SelectField id="pub-modalidad" label="Modalidad *" value={form.modalidad} onChange={update('modalidad')} options={MODALIDADES} error={errors.modalidad} /><SelectField id="pub-duracion" label="Duración de la sesión" value={form.duracion} onChange={update('duracion')} options={DURACIONES} /></div>
        <FormField id="pub-tarifa" label="Tarifa por hora (opcional)" type="number" min={0} max={1000000} step={0.01} value={form.tarifa} onChange={update('tarifa')} placeholder="Ej: 25000" />
        {errors.tarifa && <p role="alert">{errors.tarifa}</p>}
      </fieldset>
    </form>
  </Modal>
}
