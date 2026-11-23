
import { useEffect, useRef, useState } from 'react'
import type { AppNotification } from '../../../types/notification'
import NotificationModal from '../NotificationModal/NotificationModal'
import './NotificationBell.css'

interface NotificationBellProps {
  notifications: AppNotification[]
}

function NotificationIcon({
  type,
}: {
  type: AppNotification['type']
}) {
  const commonProps = {
    width: 23,
    height: 23,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }

  switch (type) {
    case 'request':
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      )

    case 'success':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      )

    case 'warning':
      return (
        <svg {...commonProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      )

    default:
      return null
  }
}

function NotificationBell({ notifications }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [localNotifications, setLocalNotifications] = useState(
    notifications.map((notification) => ({
      ...notification,
      read: notification.read ?? false,
    })),
  )
  const [selectedNotification, setSelectedNotification] =
    useState<AppNotification | null>(null)

  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = localNotifications.filter(
    (notification) => !notification.read,
  ).length

  // Sincroniza las notificaciones recibidas desde el padre.
  useEffect(() => {
    setLocalNotifications((previous) =>
      notifications.map((notification) => {
        const existing = previous.find(
          (item) => item.id === notification.id,
        )

        return {
          ...notification,
          read: existing?.read ?? notification.read ?? false,
        }
      }),
    )
  }, [notifications])

  // Cierra el panel con clic afuera o con Escape.
  useEffect(() => {
    if (!open) return

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  // Marca una notificación como leída.
  const markAsRead = (id: number) => {
    setLocalNotifications((previous) =>
      previous.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification,
      ),
    )
  }

  // Marca todas las notificaciones como leídas.
  const markAllAsRead = () => {
    setLocalNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        read: true,
      })),
    )
  }

  // Abre los detalles de una notificación.
  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id)

    setSelectedNotification({
      ...notification,
      read: true,
    })

    setOpen(false)
  }

  return (
    <>
      <div className="bell" ref={ref}>
        <button
          type="button"
          className="bell__button"
          aria-label={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ''}`}
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          <svg
            className="mi-campana"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M10 21h4" />
          </svg>

          {unreadCount > 0 && (
            <i>{unreadCount > 99 ? '99+' : unreadCount}</i>
          )}
        </button>

        {open && (
          <div className="bell__panel">
            <header className="bell__header">
              <h4>Notificaciones</h4>

              <div className="bell__header-actions">
                <button
                  type="button"
                  className="bell__mark-all"
                  onClick={markAllAsRead}
                  disabled={unreadCount === 0}
                >
                  Marcar todo como leído
                </button>

                <button
                  type="button"
                  className="bell__close"
                  aria-label="Cerrar notificaciones"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>
            </header>

            <div className="bell__list">
              {localNotifications.length === 0 && (
                <p className="bell__empty">
                  No tienes notificaciones.
                </p>
              )}

              {localNotifications.map((notification) => (
                <button
                  type="button"
                  className={`bell__item ${
                    notification.read ? 'is-read' : 'is-unread'
                  }`}
                  key={notification.id}
                  onClick={() =>
                    handleNotificationClick(notification)
                  }
                >
                  <span
                    className={`bell__icon bell__icon--${notification.type}`}
                  >
                    <NotificationIcon type={notification.type} />
                  </span>

                  <div className="bell__content">
                    <b>{notification.title}</b>
                    <p>{notification.text}</p>
                    <time>{notification.time}</time>
                  </div>

                  {!notification.read && (
                    <span
                      className="bell__unread-dot"
                      aria-label="No leída"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <NotificationModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />
    </>
  )
}

export default NotificationBell
