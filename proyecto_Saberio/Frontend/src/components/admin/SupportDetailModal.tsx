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

function SupportDetailModal({
  support,
  onClose,
  onApprove,
  onReject,
}: SupportDetailModalProps) {
  const [reason, setReason] = useState('')
  const pending = support.status === 'pendiente'

  return (
    <Modal
      open
      title="Verificar soporte académico"
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

            <Button onClick={onApprove}>
              Aprobar
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>
            Cerrar
          </Button>
        )
      }
    >
      <div className="support-detail">

        {/* Información del monitor */}
        <div className="support-detail__head">
          <Avatar
            initials={getInitials(support.monitor)}
            color="purple"
            size={56}
          />

          <div className="support-detail__identity">
            <b>{support.monitor}</b>
            <span>{support.email}</span>
          </div>
        </div>

        {/* Información del documento */}
        <div className="support-detail__info">
          {/* Información del soporte */}
          <div className="support-details">
            <div className="support-details__item">
              <dt>Tipo de soporte</dt>
              <dd>{support.kind}</dd>
            </div>

            <div className="support-details__item">
              <dt>Materia</dt>
              <dd>{support.subject}</dd>
            </div>

            <div className="support-details__item">
              <dt>Fecha de carga</dt>
              <dd>{support.date}</dd>
            </div>

            <div className="support-details__item">
              <dt>Estado</dt>
              <dd>{support.status}</dd>
            </div>
          </div>
        </div>

        {/* Documento adjunto */}
        <div className="support-detail__document">
          <span className="support-detail__document-label">
            Documento adjunto
          </span>

          <b className="support-detail__filename">
            historico_academico.pdf
          </b>

          <span className="support-detail__document-meta">
            2.4 MB · Cargado el {support.date}
          </span>
        </div>

        {/* Motivo de rechazo */}
        {pending && (
          <div className="support-detail__reason">
            <TextAreaField
              id="motivo-soporte"
              label="Motivo del rechazo (opcional)"
              value={reason}
              onChange={setReason}
              placeholder="Solo se usa si rechazas el soporte"
            />
          </div>
        )}

      </div>
    </Modal>
  )
}

export default SupportDetailModal