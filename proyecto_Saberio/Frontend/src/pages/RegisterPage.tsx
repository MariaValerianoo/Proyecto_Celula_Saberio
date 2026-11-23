import { useState } from 'react'
import type { FormEvent } from 'react'
import Header from '../components/Header/Header'
import Footer from '../components/Footer/Footer'
import AuthCard from '../components/AuthCard/AuthCard'
import FormField from '../components/FormField/FormField'
import RoleSelector from '../components/RoleSelector/RoleSelector'
import Button from '../components/Button/Button'
import Alert from '../components/Alert/Alert'
import { register, requestVerification, confirmVerification } from '../services/authService'
import { isInstitutionalEmail, isStrongPassword } from '../utils/validators'
import type { SignUpRole } from '../types/auth'
const logo = new URL('../assets/logo.png', import.meta.url).href
export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailConfirm, setEmailConfirm] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [role, setRole] = useState<SignUpRole>(new URLSearchParams(location.search).get('rol') === 'monitor' ? 'monitor' : 'estudiante')
  const [terms, setTerms] = useState(false)
  const [step, setStep] = useState<'register' | 'verify' | 'done'>('register')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [retryAt, setRetryAt] = useState(0)
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return; setError(''); setBusy(true)
    try {
      if (step === 'register') {
        if (name.trim().length < 2 || !isInstitutionalEmail(email)) throw new Error('Revisa el nombre y el correo institucional.')
        if (email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) throw new Error('Los correos no coinciden.')
        if (!isStrongPassword(password) || password !== confirmation) throw new Error('Revisa la contraseña y su confirmación: mínimo 8 caracteres, una mayúscula y un número.')
        if (!terms) throw new Error('Debes aceptar los términos y condiciones.')
        const result = await register({ name, email, password, role })
        setPassword(''); setConfirmation(''); setMessage(result.mensaje); setRetryAt(Date.now() + 60000); setStep(result.usuario?.correoVerificado ? 'done' : 'verify')
      } else {
        if (!/^\d{6}$/.test(code.trim())) throw new Error('Ingresa el código de seis dígitos.')
        const result = await confirmVerification(email, code)
        setCode(''); setMessage(result.mensaje); setStep('done')
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo completar la solicitud.') }
    finally { setBusy(false) }
  }
  async function resend() {
    setError('')
    if (busy) return
    if (Date.now() < retryAt) { setError('Espera al menos 60 segundos entre solicitudes.'); return }
    setBusy(true)
    try { const result = await requestVerification(email); setMessage(result.mensaje); setRetryAt(Date.now() + 60000) }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo solicitar el código.') }
    finally { setBusy(false) }
  }
  return <div className="page"><Header brand="Saberio" logo={logo} subtitle="Universidad del Rosario" /><main className="page__content"><AuthCard wide title={step === 'register' ? 'Crea tu cuenta o añade otro rol' : step === 'done' ? 'Cuenta lista' : 'Verifica tu correo'} subtitle="Usa tu correo institucional" footer={<a href="/login">Ir a iniciar sesión</a>}>
    <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
    {message && <Alert type="success" title="Estado de la cuenta" message={message} />}
    {error && <Alert type="error" title="Revisa la solicitud" message={error} />}
    {step !== 'done' && <form onSubmit={submit} style={{ display: 'grid', gap: 16, minWidth: 0 }}>
      {step === 'register' ? <>
        <p>Si ya tienes cuenta, usa el mismo correo y tu contraseña actual para registrar el otro rol. Tus datos y tu contraseña no se reemplazarán. Registrar monitor no equivale a aprobación.</p>
        <FormField id="nombre" label="Nombre completo" value={name} onChange={setName} autoComplete="name" />
        <FormField id="email" label="Correo institucional" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <FormField id="email-confirm" label="Confirmar correo" type="email" value={emailConfirm} onChange={setEmailConfirm} />
        <RoleSelector value={role} onChange={setRole} />
        <FormField id="password" label="Contraseña (la actual si ya tienes cuenta)" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
        <FormField id="password-confirm" label="Confirmar contraseña" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
        <label className="terms"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} />Acepto los términos y condiciones y la política de privacidad.</label>
      </> : <>
        <p>Introduce el código recibido en {email}. No vuelvas a registrar la cuenta.</p>
        <FormField id="codigo" label="Código de seis dígitos" value={code} onChange={setCode} autoComplete="one-time-code" inputMode="numeric" maxLength={6} />
      </>}
      <Button type="submit" fullWidth loading={busy}>{step === 'register' ? 'Registrar rol' : 'Confirmar correo'}</Button>
    </form>}
    {step === 'verify' && <Button onClick={resend} loading={busy}>Reenviar código</Button>}
    {step === 'register' && <button type="button" className="link-button" disabled={busy} onClick={() => { setStep('verify'); setError(''); setMessage('Introduce el correo de tu cuenta y solicita un código si lo necesitas.') }}>Ya tengo una cuenta pendiente de verificación</button>}
    {step === 'verify' && <FormField id="correo-verificacion" label="Correo de la cuenta" type="email" value={email} onChange={v => { setEmail(v); setCode('') }} />}
    </div>
  </AuthCard></main><Footer /></div>
}
