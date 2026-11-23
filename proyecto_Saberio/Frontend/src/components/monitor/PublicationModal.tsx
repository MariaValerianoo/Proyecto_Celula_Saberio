import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Modality } from '../../types/monitoring'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import TextAreaField from '../shared/FormControls/TextAreaField'
import SelectField from '../shared/FormControls/SelectField'
import FormField from '../FormField/FormField'
import { useMaterias, id } from '../../services/tutoriaService'
import type { Materia } from '../../services/tutoriaService'

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
  onSave: (datos: PublicacionFormReal) => void
}

const MODALIDADES = ['Presencial', 'Virtual', 'Ambas'].map(m => ({ value: m, label: m }))
const DURACIONES = [60, 90, 120].map(d => ({ value: String(d), label: `${d} minutos` }))

export default function PublicationModal({ materiaIdInicial = '', descripcionInicial = '', modalidadInicial, tarifaInicial = 0, duracionInicial = 60, onClose, onSave }: PublicationModalProps) {
  const materias = useMaterias()
  const [form, setForm] = useState({ materiaId: materiaIdInicial, descripcion: descripcionInicial, modalidad: modalidadInicial ?? '', tarifa: String(tarifaInicial), duracion: String(duracionInicial) })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const update = (campo: keyof typeof form) => (valor: string) => { setForm({ ...form, [campo]: valor }); setErrors({ ...errors, [campo]: '' }) }
  function submit(event: FormEvent) {
    event.preventDefault()
    const errores: Record<string, string> = {}
    if (!form.materiaId) errores.materiaId = 'Selecciona una materia'
    if (form.descripcion.trim().length < 10) errores.descripcion = 'La descripción debe tener al menos 10 caracteres'
    if (!form.modalidad) errores.modalidad = 'Selecciona una modalidad'
    setErrors(errores)
    if (Object.keys(errores).length) return
    onSave({ materiaId: form.materiaId, descripcion: form.descripcion.trim(), modalidad: form.modalidad as Modality, tarifaPorHora: Number(form.tarifa) || 0, duracionMinutos: Number(form.duracion) })
  }
  return <Modal open title={materiaIdInicial ? 'Editar publicación' : 'Nueva publicación de monitoría'} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="form-publicacion">{materiaIdInicial ? 'Guardar cambios' : 'Publicar'}</Button></>}>
    <form id="form-publicacion" onSubmit={submit} noValidate>
      <SelectField id="pub-materia" label="Materia *" value={form.materiaId} onChange={update('materiaId')} options={materias.materias.map((m: Materia) => ({ value: id(m), label: `${m.nombre} (${m.codigo})` }))} error={errors.materiaId} />
      <TextAreaField id="pub-desc" label="Descripción *" value={form.descripcion} onChange={update('descripcion')} placeholder="Ej: apoyo en derivadas y preparación de parciales..." error={errors.descripcion} />
      <div className="form-row"><SelectField id="pub-modalidad" label="Modalidad *" value={form.modalidad} onChange={update('modalidad')} options={MODALIDADES} error={errors.modalidad} /><SelectField id="pub-duracion" label="Duración de la sesión" value={form.duracion} onChange={update('duracion')} options={DURACIONES} /></div>
      <FormField id="pub-tarifa" label="Tarifa por hora (opcional)" value={form.tarifa} onChange={update('tarifa')} placeholder="Ej: 25000" />
    </form>
  </Modal>
}
