import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import './Modal.css'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

function Modal({ open, title, onClose, children, footer }: ModalProps) {
  // Cerrar con Escape
  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h3>{title}</h3>

          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div className="modal__body">
          {children}
        </div>

        {footer && (
          <footer className="modal__footer">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  )
}

export default Modal