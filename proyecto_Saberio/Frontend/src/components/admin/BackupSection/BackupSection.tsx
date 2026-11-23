import Button from '../../Button/Button'
export default function BackupSection() {
  return <div>
    <b>Respaldo de datos</b>
    <p style={{ margin: '6px 0 10px', fontSize: 14 }}>La creación de respaldos desde la aplicación todavía no está implementada. Esta pantalla no puede confirmar la existencia ni la programación de respaldos de la base de datos.</p>
    <Button variant="secondary" disabled>Respaldo desde la aplicación no disponible</Button>
  </div>
}
