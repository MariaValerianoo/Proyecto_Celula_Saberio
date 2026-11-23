import type { AppNotification } from '../../../types/notification'
import './NotificationModal.css'

interface NotificationModalProps {
  notification: AppNotification | null
  onClose: () => void
}

function NotificationModal({
  notification,
  onClose,
}: NotificationModalProps) {
  if (!notification) return null

  return (
    <div
      className="notification-modal__overlay"
      onClick={onClose}
    >
      <div
        className="notification-modal"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
      >
        <div className="notification-modal__header">
          <div>
            <span className="notification-modal__eyebrow">
              Notificación
            </span>

            <h2 id="notification-modal-title">
              {notification.title}
            </h2>
          </div>

          <button
            type="button"
            className="notification-modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="notification-modal__body">
          <div className="notification-modal__details">
            {notification.details || notification.text
              ? (notification.details || notification.text)
                .split('\n')
                .filter(line => line.trim() !== '')
                .map((line, index) => {
                  const separator = line.indexOf(':')

                  if (separator !== -1) {
                    const label = line.substring(0, separator)
                    const value = line.substring(separator + 1)

                    return (
                      <p
                        key={index}
                        className="notification-modal__detail-row"
                      >
                        <strong>{label}:</strong>
                        <span>{value.trim()}</span>
                      </p>
                    )
                  }

                  return (
                    <p
                      key={index}
                      className="notification-modal__paragraph"
                    >
                      {line}
                    </p>
                  )
                })
              : null}
          </div>

          <span className="notification-modal__time">
            {notification.time}
          </span>
        </div>

        <div className="notification-modal__footer">
          <button
            type="button"
            onClick={onClose}
            className="notification-modal__button"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationModal