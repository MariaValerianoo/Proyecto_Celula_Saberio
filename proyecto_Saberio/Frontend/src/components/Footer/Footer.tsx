
import type { LinkItem } from '../../types/navigation'
import './footer.css'

interface FooterProps {
  text?: string
  links?: LinkItem[]
}

const DEFAULT_LINKS: LinkItem[] = [
  { label: 'Términos', href: '#' },
  { label: 'Privacidad', href: '#' },
  { label: 'Contacto', href: '#' },
]

function Footer({
  text = '©Saberio, Universidad del Rosario',
  links = DEFAULT_LINKS,
}: FooterProps) {
  return (
    <footer className="footer">
      <div className="footer__wrap">
        <span>{text}</span>

        <nav aria-label="Pie de página" className="footer__links">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  )
}

export default Footer
