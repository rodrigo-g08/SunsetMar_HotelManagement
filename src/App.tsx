import { Navigate, Route, Routes } from 'react-router-dom'
import { useSession } from '@/context/SessionContext'
import { AppShell } from '@/components/layout/AppShell'
import { Loading } from '@/components/ui'
import { LoginPage } from '@/features/auth/LoginPage'
import { InicioPage } from '@/features/inicio/InicioPage'
import { HabitacionesPage } from '@/features/habitaciones/HabitacionesPage'
import { TarifasPage } from '@/features/habitaciones/TarifasPage'
import { CalendarioPage } from '@/features/reservas/CalendarioPage'
import { NuevaReservaPage } from '@/features/reservas/NuevaReservaPage'
import { CajaLayout } from '@/features/caja/CajaLayout'
import { CajaTurnoPage } from '@/features/caja/CajaTurnoPage'
import { VentaABPage } from '@/features/caja/VentaABPage'
import { CierrePage } from '@/features/caja/CierrePage'
import { ReportePage } from '@/features/caja/ReportePage'
import { HistorialConExportacion } from '@/features/reservas/HistorialConExportacion'

function Protegida() {
  const { ready, auth, turno } = useSession()
  if (!ready) return <div className="p-8"><Loading /></div>
  if (!auth || !turno) return <Navigate to="/ingresar" replace />
  return <AppShell />
}

export function App() {
  return (
    <Routes>
      <Route path="/ingresar" element={<LoginPage />} />
      <Route element={<Protegida />}>
        <Route index element={<InicioPage />} />
        <Route path="habitaciones" element={<HabitacionesPage />} />
        <Route path="habitaciones/tarifas" element={<TarifasPage />} />
        <Route path="reservas" element={<CalendarioPage />} />
        <Route path="reservas/nueva" element={<NuevaReservaPage />} />
        <Route path="reservas/historial" element={<HistorialConExportacion />} />
        <Route path="caja" element={<CajaLayout />}>
          <Route index element={<CajaTurnoPage />} />
          <Route path="venta" element={<VentaABPage />} />
          <Route path="cierre" element={<CierrePage />} />
          <Route path="reporte" element={<ReportePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
