import { useState } from 'react'
import type { SupportDoc } from '../../types/admin'
import { getInitials } from '../../utils/format'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Avatar from '../shared/Avatar/Avatar'
import TextAreaField from '../shared/FormControls/TextAreaField'
import './SupportDetailModal.css'

interface SupportDetailModalProps {
  support: SupportDoc
  onClose: () => void
  onApprove: () => void
  onReject: (reason: string) => void
}

function SupportDetailModal({ support, onClose, onApprove, onReject }: SupportDetailModalProps) {
  const [reason, setReason] = useState('')
  const pending = support.status === 'Pendiente'

  return (
    <Modal open title="Verificar soporte académico" onClose={onClose}
      footer={pending ? (
        <>
          <Button variant="secondary" disabled={!reason.trim()} onClick={() => onReject(reason.trim())}>Rechazar</Button>
          <Button onClick={onApprove}>Aprobar</Button>
        </>
      ) : <Button onClick={onClose}>Cerrar</Button>}
    >
      <div className="support-detail">
        <div className="support-detail__head">
          <Avatar initials={getInitials(support.monitor)} color="purple" size={56} />
          <div className="support-detail__identity"><b>{support.monitor}</b><span>{support.email || 'Correo no disponible'}</span></div>
        </div>

        <div className="support-detail__info">
          <div className="support-details">
            <div className="support-details__item"><dt>Tipo de soporte</dt><dd>{support.kind}</dd></div>
            <div className="support-details__item"><dt>Materia</dt><dd>{support.subject}</dd></div>
            <div className="support-details__item"><dt>Fecha de carga</dt><dd>{support.date || 'No disponible'}</dd></div>
            <div className="support-details__item"><dt>Estado</dt><dd>{support.status}</dd></div>
          </div>
        </div>

        <div className="support-detail__document">
          <span className="support-detail__document-label">Documento adjunto</span>
          <a className="support-detail__filename" href={support.downloadUrl} target="_blank" rel="noopener noreferrer">{support.fileName}</a>
          <span className="support-detail__document-meta">{support.fileSize ? `${(support.fileSize / 1024 / 1024).toFixed(2)} MB` : ''} · Cargado el {support.date || '—'}</span>
        </div>

        {pending && (
          <div className="support-detail__reason">
            <TextAreaField id="motivo-soporte" label="Motivo del rechazo (obligatorio para rechazar)" value={reason} onChange={setReason} placeholder="Explica por qué no se aprueba el soporte" />
          </div>
        )}
      </div>
    </Modal>
  )
}

export default SupportDetailModal
