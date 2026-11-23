import type { Monitor, PendingRequest, SessionRecord, StudentProfile, UpcomingSession } from '../types/monitoring'
import type { AppNotification } from '../types/notification'

import { ASSISTANT_SUBJECTS } from './assistantMock'

// Conservamos los monitores originales.
const baseMonitors: Monitor[] = [
  {
    id: 1, name: 'Carlos Ruiz', initials: 'CR', color: 'purple', career: 'Ingeniería de Sistemas',
    subject: 'Cálculo Diferencial', rating: 4.8, helped: 61, response: '8 min', online: true, modality: 'Virtual',
    tagline: 'Derivadas e integrales sin miedo: primero entiendes la idea, después la fórmula.',
    topics: ['Límites', 'Derivadas', 'Integrales por partes'], keywords: ['calculo', 'matematicas'],
    slots: ['Hoy 4:00 PM', 'Mañana 10:00 AM', 'Jue 2:00 PM'],
  },
  {
    id: 2, name: 'Laura Gutiérrez', initials: 'LG', color: 'primary', career: 'Economía',
    subject: 'Microeconomía', rating: 4.9, helped: 48, response: '10 min', online: true, modality: 'Ambas',
    tagline: 'La oferta y la demanda se entienden dibujando. Trae tu taller y lo resolvemos juntas.',
    topics: ['Elasticidad', 'Equilibrio de mercado', 'Costos'], keywords: ['microeconomia', 'economia'],
    slots: ['Hoy 6:00 PM', 'Mié 8:00 AM', 'Vie 11:00 AM'],
  },
  {
    id: 3, name: 'Diego Herrera', initials: 'DH', color: 'blue', career: 'Ingeniería de Sistemas',
    subject: 'Programación I', rating: 4.7, helped: 36, response: '15 min', online: true, modality: 'Presencial',
    tagline: 'Si tu código no corre, lo depuramos paso a paso hasta que sí.',
    topics: ['Python', 'Ciclos', 'Funciones'], keywords: ['programacion', 'codigo'],
    slots: ['Hoy 5:00 PM', 'Mañana 3:00 PM', 'Jue 9:00 AM'],
  },
  {
    id: 4, name: 'Ana María López', initials: 'AL', color: 'purple', career: 'Matemáticas',
    subject: 'Álgebra Lineal', rating: 4.9, helped: 27, response: '20 min', online: false, modality: 'Virtual',
    tagline: 'Matrices, vectores y espacios vectoriales: todo se conecta cuando ves el patrón.',
    topics: ['Matrices', 'Determinantes', 'Valores propios'], keywords: ['algebra', 'matematicas'],
    slots: ['Mañana 1:00 PM', 'Jue 4:00 PM', 'Sáb 10:00 AM'],
  },
  {
    id: 5, name: 'Andrés Morales', initials: 'AM', color: 'dark', career: 'Ingeniería de Sistemas',
    subject: 'Programación I', rating: 4.6, helped: 22, response: '25 min', online: false, modality: 'Ambas',
    tagline: 'Aprender a programar es practicar. Te dejo ejercicios justos para tu nivel.',
    topics: ['Condicionales', 'Listas', 'Depuración'], keywords: ['programacion', 'codigo'],
    slots: ['Mié 2:00 PM', 'Vie 3:00 PM', 'Sáb 9:00 AM'],
  },
]

// Agregamos los monitores del asistente sin duplicar los que ya existen.
let nextMonitorId = Math.max(...baseMonitors.map((monitor) => monitor.id)) + 1

export const monitors: Monitor[] = [...baseMonitors]

ASSISTANT_SUBJECTS.forEach((subject) => {
  subject.monitors.forEach((assistantMonitor) => {
    const existing = monitors.find(
      (monitor) =>
        monitor.name === assistantMonitor.name &&
        monitor.subject === subject.name,
    )

    if (existing) {
      existing.topics = Array.from(
        new Set([...existing.topics, ...subject.topics.map((topic) => topic.label)]),
      )
      existing.keywords = Array.from(
        new Set([...existing.keywords, ...subject.keywords]),
      )
      return
    }

    monitors.push({
      id: nextMonitorId++,
      name: assistantMonitor.name,
      initials: assistantMonitor.initials,
      color: assistantMonitor.color,
      career: 'Por definir',
      subject: subject.name,
      rating: Number(assistantMonitor.rating),
      helped: 0,
      response: 'Sin datos',
      online: assistantMonitor.online,
      modality: assistantMonitor.modality,
      tagline: `Monitor de ${subject.name}.`,
      topics: subject.topics.map((topic) => topic.label),
      keywords: [...subject.keywords],
      slots: [...assistantMonitor.slots],
    })
  })
})

export const studentProfile: StudentProfile = {
  career: 'Ingeniería de Sistemas',
  semester: 5,
  subjects: 'Cálculo, Programación I',
  availability: 'Mañanas, Lun-Mié-Vie',
  modality: 'Virtual',
}

export const initialRequests: PendingRequest[] = [
  { id: 1, initials: 'AL', color: 'blue', subject: 'Álgebra Lineal', detail: 'Enviada a Ana María López', status: 'pending' },
  { id: 2, initials: 'AM', color: 'dark', subject: 'Programación I', detail: 'Enviada a Andrés Morales', status: 'review' },
]

export const upcomingSessions: UpcomingSession[] = [
  { id: 1, person: 'Carlos Ruiz', initials: 'CR', color: 'purple', subject: 'Cálculo Diferencial', modality: 'Virtual', date: 'Mié 17 Sep, 10:00 AM', status: 'Confirmada' },
]

export const studentHistory: SessionRecord[] = [
  { id: 1, subject: 'Cálculo Diferencial', person: 'Carlos Ruiz', date: '10 Sep 2026, 4:00 PM', status: 'Realizada', rating: 5 },
  { id: 2, subject: 'Programación I', person: 'Diego Herrera', date: '03 Sep 2026, 5:00 PM', status: 'Cancelada', rating: null },
  { id: 3, subject: 'Álgebra Lineal', person: 'Ana María López', date: '28 Ago 2026, 1:00 PM', status: 'Realizada', rating: 4 },
]

export const studentNotifications: AppNotification[] = [
  {
    id: 1,
    type: 'request',
    title: 'Nueva solicitud de monitoría',
    text: 'Álgebra Lineal, Vie 19 Sep, 2:00 PM',
    details:
      'Has recibido una nueva solicitud de monitoría de Álgebra Lineal.\n\nFecha: Viernes 19 de septiembre\nHora: 2:00 PM\nEstado: Pendiente de revisión.',
    time: 'Hace 5 min',
    read: false,
  },
  {
    id: 2,
    type: 'success',
    title: 'Solicitud aceptada',
    text: 'Carlos Ruiz aceptó tu solicitud de Cálculo Diferencial',
    details:
      'Carlos Ruiz ha aceptado tu solicitud de monitoría.\n\nMateria: Cálculo Diferencial\nEstado: Aceptada\nPuedes consultar los detalles de tu monitoría en tu sección de monitorías.',
    time: 'Hace 1 hora',
    read: false,
  },
  {
    id: 3,
    type: 'warning',
    title: 'Recordatorio',
    text: 'Monitoría de Cálculo mañana, 10:00 AM',
    details:
      'Recuerda que tienes una monitoría programada.\n\nMateria: Cálculo Diferencial\nMonitor: Carlos Ruiz\nFecha: Mañana\nHora: 10:00 AM\nModalidad: Virtual',
    time: 'Hace 2 horas',
    read: false,
  },
]
