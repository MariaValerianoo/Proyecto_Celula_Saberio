import { useState } from 'react'
import type { IncomingRequest } from '../../../types/monitoring'
import Modal from '../../Modal/Modal'
import Button from '../../Button/Button'
import Avatar from '../../shared/Avatar/Avatar'
import TextAreaField from '../../shared/FormControls/TextAreaField'
import './RequestDetailModal.css'

interface RequestDetailModalProps {
  request: IncomingRequest
  onClose: () => void
  onAccept: () => void
  onReject: (reason: string) => void
}

function RequestDetailModal({
  request,
  onClose,
  onAccept,
  onReject,
}: RequestDetailModalProps) {
  const [reason, setReason] = useState('')
  const pending = request.status === 'pendiente'

  const details = [
    { label: 'Fecha y hora', value: request.date },
    { label: 'Modalidad', value: request.modality },
    { label: 'Tema', value: request.topic },
    { label: 'Objetivo', value: request.goal },
    ...(request.location
      ? [{ label: 'Ubicación', value: request.location }]
      : []),
    ...(request.notes
      ? [{ label: 'Observaciones', value: request.notes }]
      : []),
  ]

  return (
    <Modal
      open
      title="Detalle de solicitud"
      onClose={onClose}
      footer={
        pending ? (
          <>
            <Button
              variant="secondary"
              onClick={() => onReject(reason.trim())}
            >
              Rechazar
            </Button>

            <Button onClick={onAccept}>
              Aceptar
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>
            Cerrar
          </Button>
        )
      }
    >
      <div className="request-detail-content">

        {/* Información del estudiante */}
        <div className="request-head">
          <Avatar
            initials={request.initials}
            color={request.color}
            size={52}
          />

          <div className="request-head__info">
            <b>{request.student}</b>
            <span>{request.subject}</span>
          </div>
        </div>

        {/* Información de la solicitud */}
        <dl className="request-details">
          {details.map((detail) => (
            <div
              className="request-details__item"
              key={detail.label}
            >
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>

        {/* Motivo de rechazo */}
        {pending && (
          <div className="request-rejection">
            <TextAreaField
              id="motivo"
              label="Motivo del rechazo (opcional)"
              value={reason}
              onChange={setReason}
              placeholder="Escribe un motivo si deseas informárselo al estudiante..."
            />
          </div>
        )}

      </div>
    </Modal>
  )
}

export default RequestDetailModal