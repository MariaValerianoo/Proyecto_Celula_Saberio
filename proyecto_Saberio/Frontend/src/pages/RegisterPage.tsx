import { useState } from 'react'
import type { FormEvent } from 'react'
import Header from '../components/Header/Header'
import Footer from '../components/Footer/Footer'
import AuthCard from '../components/AuthCard/AuthCard'
import FormField from '../components/FormField/FormField'
import RoleSelector from '../components/RoleSelector/RoleSelector'
import Button from '../components/Button/Button'
import Alert from '../components/Alert/Alert'
import { api, register, requestVerification, confirmVerification } from '../services/authService'
import { isInstitutionalEmail, isStrongPassword } from '../utils/validators'
import type { SignUpRole } from '../types/auth'
const logo = new URL('../assets/logo.png', import.meta.url).href
export default function RegisterPage() {
  const [mode, setMode] = useState<'new' | 'existing' | 'pending'>('new')
  const [step, setStep] = useState<'email' | 'code' | 'details' | 'done'>('email')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailConfirm, setEmailConfirm] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [role, setRole] = useState<SignUpRole>(new URLSearchParams(location.search).get('rol') === 'monitor' ? 'monitor' : 'estudiante')
  const [terms, setTerms] = useState(false)
  const [code, setCode] = useState('')
  const [authorization, setAuthorization] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retryAt, setRetryAt] = useState(0)
  function changeMode(value: typeof mode) {
    setMode(value); setStep(value === 'existing' ? 'details' : 'email')
    setAuthorization(''); setCode(''); setPassword(''); setConfirmation(''); setMessage(''); setError(''); setTerms(false)
  }
  async function sendCode() {
    const correo = email.trim().toLowerCase()
    if (!isInstitutionalEmail(correo)) throw new Error('Usa un correo de una universidad autorizada en Saberio.')
    if (Date.now() < retryAt) throw new Error('Espera 60 segundos antes de solicitar otro código.')
    setAuthorization(''); setCode(''); setRetryAt(Date.now() + 60000)
    return mode === 'new' ? api('/verificacion/registro/solicitar', { correo }) : requestVerification(correo)
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('')
    try {
      if (step === 'email') {
        if (mode === 'new' && email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) throw new Error('Los correos no coinciden.')
        const result = await sendCode(); setEmail(email.trim().toLowerCase()); setMessage(result.mensaje); setStep('code')
      } else if (step === 'code') {
        if (!/^\d{6}$/.test(code.trim())) throw new Error('Introduce un código de seis dígitos.')
        if (mode === 'new') {
          const result = await api('/verificacion/registro/confirmar', { correo: email, codigo: code.trim() })
          setAuthorization(result.autorizacion); setMessage(result.mensaje); setCode(''); setStep('details')
        } else { const result = await confirmVerification(email, code); setMessage(result.mensaje); setCode(''); setStep('done') }
      } else if (step === 'details') {
        if (name.trim().length < 2 || name.trim().length > 100 || !isInstitutionalEmail(email)) throw new Error('Revisa el nombre y el correo institucional.')
        if (!isStrongPassword(password) || password !== confirmation || new TextEncoder().encode(password).length > 72) throw new Error('Contraseña: mínimo 8 caracteres, una mayúscula y un número; máximo 72 bytes. La confirmación debe coincidir.')
        if (!terms) throw new Error('Debes aceptar los términos y condiciones.')
        const result = mode === 'existing' ? await register({ name, email, password, role }) : await api('/auth/registro', { nombre: name.trim(), correo: email, password, rol: role, autorizacionRegistro: authorization })
        setPassword(''); setConfirmation(''); setAuthorization(''); setMessage(result.mensaje); setStep('done')
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo completar la solicitud.') }
    finally { setBusy(false) }
  }
  async function resend() {
    if (busy) return; setBusy(true); setError('')
    try { const result = await sendCode(); setMessage(result.mensaje) }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo solicitar el código.') }
    finally { setBusy(false) }
  }
  const emailError = email && !isInstitutionalEmail(email) ? 'El correo debe pertenecer a un dominio universitario autorizado.' : ''
  return <div className="page"><Header brand="Saberio" logo={logo} subtitle="Universidad del Rosario" /><main className="page__content"><AuthCard wide title={step === 'done' ? 'Cuenta lista' : mode === 'existing' ? 'Añadir otro rol' : mode === 'pending' ? 'Verificar cuenta pendiente' : 'Crear cuenta en Saberio'} subtitle="Usa tu correo institucional" footer={<a href="/login">Ir a iniciar sesión</a>}>
    <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
      {message && <Alert type="success" title="Estado de la solicitud" message={message} />}
      {error && <Alert type="error" title="Revisa la solicitud" message={error} />}
      {step !== 'done' && <form onSubmit={submit} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
        {step === 'email' && <>
          <p>{mode === 'new' ? 'Primero verifica tu correo. No crearemos una cuenta ni guardaremos una contraseña hasta completar la verificación.' : 'Este flujo es para cuentas que ya existen y aún no han verificado su correo.'}</p>
          <FormField id="email" label="Correo institucional" type="email" value={email} onChange={setEmail} autoComplete="email" error={emailError} />
          {mode === 'new' && <FormField id="email-confirm" label="Confirmar correo" type="email" value={emailConfirm} onChange={setEmailConfirm} />}
        </>}
        {step === 'code' && <><p>Introduce el código recibido en {email}.</p><FormField id="codigo" label="Código de seis dígitos" value={code} onChange={setCode} autoComplete="one-time-code" inputMode="numeric" maxLength={6} /></>}
        {step === 'details' && <>
          <p>{mode === 'existing' ? 'Usa tu contraseña actual. Tus datos no se reemplazarán. Añadir monitor no equivale a aprobación.' : `Correo verificado: ${email}. Completa el registro en los próximos 10 minutos.`}</p>
          <FormField id="nombre" label="Nombre completo" value={name} onChange={setName} autoComplete="name" />
          {mode === 'existing' && <FormField id="existing-email" label="Correo de tu cuenta" type="email" value={email} onChange={setEmail} error={emailError} />}
          <RoleSelector value={role} onChange={setRole} />
          <FormField id="password" label={mode === 'existing' ? 'Contraseña actual' : 'Contraseña'} type="password" value={password} onChange={setPassword} autoComplete={mode === 'existing' ? 'current-password' : 'new-password'} />
          <FormField id="password-confirm" label="Confirmar contraseña" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
          <label className="terms"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />Acepto los términos y condiciones y la política de privacidad.</label>
        </>}
        <Button type="submit" fullWidth loading={busy}>{step === 'email' ? 'Enviar código' : step === 'code' ? 'Confirmar código' : mode === 'existing' ? 'Añadir rol' : 'Crear cuenta verificada'}</Button>
      </form>}
      {step === 'code' && <Button onClick={resend} loading={busy}>Reenviar código</Button>}
      {step !== 'done' && <div style={{ display: 'grid', gap: 12 }}>
        <button type="button" className="link-button" disabled={busy} onClick={() => changeMode('new')}>Crear cuenta nueva / volver a verificar correo</button>
        <button type="button" className="link-button" disabled={busy} onClick={() => changeMode('existing')}>Ya tengo cuenta: añadir otro rol</button>
        <button type="button" className="link-button" disabled={busy} onClick={() => changeMode('pending')}>Ya tengo una cuenta pendiente de verificación</button>
      </div>}
    </div>
  </AuthCard></main><Footer /></div>
}
