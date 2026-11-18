import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useSession } from '@/context/SessionContext'
import { AppShell } from '@/components/layout/AppShell'
import { Loading } from '@/components/ui'
import { LoginPage } from '@/features/auth/LoginPage'

function Protegida() {
  const { ready, auth, turno } = useSession()
  if (!ready) return <div className="p-8"><Loading /></div>
  if (!auth || !turno) return <Navigate to="/ingresar" replace />
  return <Suspense fallback={<div className="p-8"><Loading /></div>}><AppShell /></Suspense>
}

const InicioPage = lazy(() => import('@/features/inicio/InicioPage').then((m) => ({ default: m.InicioPage })))
const HabitacionesPage = lazy(() => import('@/features/habitaciones/HabitacionesPage').then((m) => ({ default: m.HabitacionesPage })))
const TarifasPage = lazy(() => import('@/features/habitaciones/TarifasPage').then((m) => ({ default: m.TarifasPage })))
const CalendarioPage = lazy(() => import('@/features/reservas/CalendarioPage').then((m) => ({ default: m.CalendarioPage })))
const NuevaReservaPage = lazy(() => import('@/features/reservas/NuevaReservaPage').then((m) => ({ default: m.NuevaReservaPage })))
const CajaLayout = lazy(() => import('@/features/caja/CajaLayout').then((m) => ({ default: m.CajaLayout })))
const CajaTurnoPage = lazy(() => import('@/features/caja/CajaTurnoPage').then((m) => ({ default: m.CajaTurnoPage })))
const VentaABPage = lazy(() => import('@/features/caja/VentaABPage').then((m) => ({ default: m.VentaABPage })))
const CierrePage = lazy(() => import('@/features/caja/CierrePage').then((m) => ({ default: m.CierrePage })))
const ReportePage = lazy(() => import('@/features/caja/ReportePage').then((m) => ({ default: m.ReportePage })))
const HistorialConExportacion = lazy(() => import('@/features/reservas/HistorialConExportacion').then((m) => ({ default: m.HistorialConExportacion })))

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
