import { useState } from 'react'
import type { FormEvent } from 'react'
import Modal from '../Modal/Modal'
import FormField from '../FormField/FormField'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { sendRecoveryLink, resetPassword } from '../../services/authService'
import { isInstitutionalEmail, isStrongPassword } from '../../utils/validators'
import './ForgotPassword.css'
export default function ForgotPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  function close() { if (busy) return; setEmail(''); setCode(''); setPassword(''); setConfirmation(''); setStep('request'); setMessage(''); setError(''); onClose() }
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      if (!isInstitutionalEmail(email)) throw new Error('Ingresa un correo institucional válido.')
      if (step === 'request') { const result = await sendRecoveryLink(email); setMessage(result.mensaje); setStep('reset') }
      else {
        if (!/^\d{6}$/.test(code.trim())) throw new Error('El código debe tener seis dígitos.')
        if (!isStrongPassword(password) || password !== confirmation) throw new Error('Revisa la contraseña y su confirmación: mínimo 8 caracteres, una mayúscula y un número.')
        const result = await resetPassword(email, code, password, confirmation)
        setPassword(''); setConfirmation(''); setCode(''); setMessage(result.mensaje); setStep('done')
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo completar la solicitud.') }
    finally { setBusy(false) }
  }
  return <Modal open={open} title="Recuperar contraseña" onClose={close} footer={<Button onClick={close}>{step === 'done' ? 'Volver al login' : 'Cerrar'}</Button>}>
    <div className="forgot-password__form">
      {message && <Alert type="success" title="Estado de la solicitud" message={message} />}
      {error && <Alert type="error" title="Revisa los datos" message={error} />}
      {step !== 'done' && <form onSubmit={submit}>
        {step === 'request' ? <FormField id="recovery-email" label="Correo institucional" type="email" value={email} onChange={setEmail} /> : <>
          <p>Introduce el código enviado a {email} y tu nueva contraseña.</p>
          <FormField id="recovery-code" label="Código de seis dígitos" value={code} onChange={setCode} autoComplete="one-time-code" />
          <FormField id="new-password" label="Nueva contraseña" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
          <FormField id="confirm-password" label="Confirmar contraseña" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
        </>}
        <div className="forgot-password__actions">
          <Button type="submit" loading={busy}>{step === 'request' ? 'Solicitar código' : 'Actualizar contraseña'}</Button>
          {step === 'reset' && <button type="button" className="link-button" disabled={busy} onClick={() => { setStep('request'); setCode(''); setPassword(''); setConfirmation(''); setMessage(''); setError('') }}>Cambiar correo o solicitar otro código</button>}
        </div>
      </form>}
    </div>
  </Modal>
}
