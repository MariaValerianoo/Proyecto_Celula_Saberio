import { useState } from 'react'
import AssistantChat from '../AssistantChat/AssistantChat'
import './FloatingAssistant.css'

interface FloatingAssistantProps {
  onStudentMatch: (subject: string, topic: string | null) => void
}

function FloatingAssistant({ onStudentMatch }: FloatingAssistantProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="floating-assistant">

      {/* Ventana del chat */}
      {open && (
        <div className="floating-assistant__window">

          {/* Encabezado sin botón de cerrar */}
          <div className="floating-assistant__header">
            <div className="floating-assistant__header-info">
              <strong>Asistente Saberio</strong>
              <span>● Te responde al instante</span>
            </div>
          </div>

          {/* Chat */}
          <AssistantChat
            mode="student"
            onStudentMatch={onStudentMatch}
          />
        </div>
      )}

      {/* Único botón flotante */}
      <button
        type="button"
        className={`floating-assistant__button ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((previous) => !previous)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'}
      >
        {open ? (
          <span className="floating-assistant__close-icon">×</span>
        ) : (
          /* Icono de chat */
          <svg
            viewBox="0 0 24 24"
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.8-.85L3 21l1.85-4.7A8.5 8.5 0 1 1 21 11.5Z" />
          </svg>
        )}
      </button>

    </div>
  )
}

export default FloatingAssistant