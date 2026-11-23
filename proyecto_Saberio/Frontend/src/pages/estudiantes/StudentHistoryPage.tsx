import { useState } from 'react'
import type { FormEvent } from 'react'
import DashboardLayout from '../../components/layout/DashboardLayout/DashboardLayout'
import PageHero from '../../components/layout/PageHero/PageHero'
import Card from '../../components/shared/Card/Card'
import { useLista, request, id, nombre, dia, datos, mensajeError } from '../../services/tutoriaService'
import type { Sesion } from '../../services/tutoriaService'
export default function StudentHistoryPage() {
  const remote = useLista<Sesion>('/sesiones', 'sesiones')
  const [selected, setSelected] = useState<Sesion | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy) return
    const form = datos(event.currentTarget); setBusy(true); setError(''); setMessage('')
    try {
      const result = await request('/evaluaciones', 'POST', { sesion: id(selected), calificacion: Number(form.calificacion), comentario: form.comentario })
      setMessage(result.mensaje || 'Evaluación registrada.'); setSelected(null); remote.refresh()
    } catch (err) { setError(mensajeError(err)) } finally { setBusy(false) }
  }
  return <DashboardLayout role="estudiante" notifications={[]}><PageHero title="Mis monitorías" description="Sesiones reales y evaluaciones asociadas a tu cuenta." />
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
    {remote.loading ? <p role="status">Cargando sesiones...</p> : remote.error ? <div role="alert"><p>{remote.error}</p><button onClick={remote.refresh}>Reintentar</button></div> : <Card title="Sesiones">
      {!remote.items.length && <p>No tienes sesiones registradas.</p>}
      {remote.items.map(s => <article key={id(s)} style={{ padding: '16px 0', borderBottom: '1px solid #ddd' }}><h3>{nombre(s.materia)} · {nombre(s.monitor)}</h3><p>{s.tema}</p><p>{dia(s.fecha)} · {s.hora} · {s.duracionHoras} horas · {s.modalidad}</p><p>Estado: {s.estado}</p>{s.estado === 'Realizada' && <button disabled={busy} onClick={() => { setSelected(s); setError('') }}>Evaluar monitor</button>}</article>)}
    </Card>}
    {selected && <Card title={`Evaluar a ${nombre(selected.monitor)}`}><form key={id(selected)} onSubmit={submit}><label>Calificación <select name="calificacion" required><option value="">Selecciona</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option></select></label><label>Comentario <textarea name="comentario" maxLength={500} /></label><button type="submit" disabled={busy}>{busy ? 'Enviando...' : 'Enviar evaluación'}</button><button type="button" disabled={busy} onClick={() => setSelected(null)}>Cancelar</button></form></Card>}
  </DashboardLayout>
}
