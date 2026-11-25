import { useMemo, useState } from 'react'
import Button from '../Button/Button'
import { crearDisponibilidad, mensajeError } from '../../services/tutoriaService'
import './PublicarBloques.css'
type Bloque = { clave: string; fecha: string; horaInicio: string; horaFin: string; estado: 'pendiente' | 'publicando' | 'publicado' | 'error'; error?: string }
const local = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const hora = (n: number) => `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`
const minutos = (h: string) => { const [a,b] = h.split(':').map(Number); return a*60+b }
const fechaTexto = (f: string) => new Date(`${f}T12:00:00`).toLocaleDateString('es-CO',{weekday:'short',day:'numeric',month:'short'})
const horas = Array.from({length:49},(_,i)=>hora(i*30))
export default function PublicarBloques({ onPublished, disabled = false }: { onPublished: () => void; disabled?: boolean }) {
 const [dias,setDias]=useState<string[]>([])
 const [inicio,setInicio]=useState('08:00')
 const [fin,setFin]=useState('12:00')
 const [duracion,setDuracion]=useState(60)
 const [bloques,setBloques]=useState<Bloque[]>([])
 const [busy,setBusy]=useState(false)
 const [mensaje,setMensaje]=useState('')
 const [error,setError]=useState('')
 const fechas=useMemo(()=>{const hoy=new Date();return Array.from({length:28},(_,i)=>local(new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()+i,12)))},[])
 const pendientes=bloques.filter(b=>b.estado==='pendiente'||b.estado==='error')
 const locked=busy||disabled
 function invalidar(){setBloques([]);setError('');setMensaje('')}
 function generar(){
  const desde=minutos(inicio),hasta=minutos(fin)
  setError('');setMensaje('')
  if(!dias.length||hasta<=desde||hasta-desde<duracion){setError('Selecciona días y un rango que permita un bloque completo.');return}
  if(Math.floor((hasta-desde)/duracion)*dias.length>100){setError('Máximo 100 bloques por operación.');return}
  const nuevos:Bloque[]=[]
  for(const fecha of dias)for(let n=desde;n+duracion<=hasta;n+=duracion){const a=hora(n),b=hora(n+duracion);if(new Date(`${fecha}T${a}:00`).getTime()>Date.now())nuevos.push({clave:`${fecha}-${a}-${b}`,fecha,horaInicio:a,horaFin:b,estado:'pendiente'})}
  setBloques(nuevos)
  setMensaje(`${nuevos.length} bloques futuros generados. Los minutos sobrantes no forman otro bloque.`)
 }
 function actualizar(clave:string,cambio:Partial<Bloque>){setBloques(prev=>prev.map(b=>b.clave===clave?{...b,...cambio}:b))}
 async function publicar(){
  if(locked||!pendientes.length)return
  const trabajo=[...pendientes];setBusy(true);setError('');setMensaje('');let ok=0,fallos=0
  try{for(const b of trabajo){actualizar(b.clave,{estado:'publicando',error:undefined});try{
   if(new Date(`${b.fecha}T${b.horaInicio}:00`).getTime()<=Date.now())throw new Error('El bloque ya inició. Quítalo de la selección.')
   await crearDisponibilidad({fecha:b.fecha,horaInicio:b.horaInicio,horaFin:b.horaFin});ok++;actualizar(b.clave,{estado:'publicado'})
  }catch(e){fallos++;actualizar(b.clave,{estado:'error',error:mensajeError(e)})}}
  setMensaje(`${ok} publicados; ${fallos} no publicados. Los publicados no se reenviarán.`)
  }finally{setBusy(false)}
  if(ok)onPublished()
 }
 return <section className="bloques" aria-busy={busy}>
  <header><h3>Publica tu disponibilidad</h3><p>Selecciona varios días y genera franjas independientes.</p></header>
  <div className="bloques__editor"><fieldset disabled={locked}><legend>1. Selecciona los días</legend><p>Próximos 28 días · {dias.length} seleccionados</p><div className="bloques__days">{fechas.map(f=><button type="button" key={f} aria-pressed={dias.includes(f)} onClick={()=>{invalidar();setDias(prev=>prev.includes(f)?prev.filter(d=>d!==f):[...prev,f].sort())}}>{fechaTexto(f)}</button>)}</div></fieldset>
  <fieldset disabled={locked}><legend>2. Configura los bloques</legend><label>Desde<select value={inicio} onChange={e=>{setInicio(e.target.value);invalidar()}}>{horas.slice(0,-1).map(h=><option key={h}>{h}</option>)}</select></label><label>Hasta<select value={fin} onChange={e=>{setFin(e.target.value);invalidar()}}>{horas.slice(1).map(h=><option key={h}>{h}</option>)}</select></label><label>Duración<select value={duracion} onChange={e=>{setDuracion(Number(e.target.value));invalidar()}}>{[60,90,120].map(n=><option value={n} key={n}>{n} minutos</option>)}</select></label><div className="bloques__actions"><Button variant="secondary" disabled={locked||!dias.length} onClick={generar}>Generar vista previa</Button><Button variant="secondary" disabled={locked} onClick={()=>{setDias([]);invalidar()}}>Limpiar</Button></div></fieldset></div>
  {error&&<p role="alert">{error}</p>}{mensaje&&<p role="status">{mensaje}</p>}
  {!!bloques.length&&<><div className="bloques__actions"><h4>3. Revisa y publica</h4><Button disabled={disabled||!pendientes.length} loading={busy} loadingText="Publicando bloques..." onClick={publicar}>Publicar o reintentar {pendientes.length} bloques</Button></div><div className="bloques__list">{bloques.map(b=><article key={b.clave} className={`bloques__slot bloques__slot--${b.estado}`}><span>{fechaTexto(b.fecha)}</span><strong>{b.horaInicio}–{b.horaFin}</strong><span>{b.estado==='error'?'No publicado':b.estado}</span>{b.error&&<p role="alert">{b.error}</p>}{b.estado!=='publicado'&&<Button variant="secondary" disabled={locked} onClick={()=>setBloques(prev=>prev.filter(x=>x.clave!==b.clave))}>Quitar</Button>}</article>)}</div></>}
 </section>
}
