import { Navigate, Route, Routes } from 'react-router-dom'
import { useSession } from '@/context/SessionContext'
import { AppShell } from '@/components/layout/AppShell'
import { Loading, PageHeader } from '@/components/ui'
import { LoginPage } from '@/features/auth/LoginPage'
import { InicioPage } from '@/features/inicio/InicioPage'
import { HabitacionesPage } from '@/features/habitaciones/HabitacionesPage'
import { TarifasPage } from '@/features/habitaciones/TarifasPage'

function Protegida() {
  const { ready, auth, turno } = useSession()
  if (!ready) return <div className="p-8"><Loading /></div>
  if (!auth || !turno) return <Navigate to="/ingresar" replace />
  return <AppShell />
}

function Proximamente({ titulo }: { titulo: string }) {
  return <PageHeader title={titulo} subtitle="Este módulo se habilita en un hito posterior." />
}

export function App() {
  return (
    <Routes>
      <Route path="/ingresar" element={<LoginPage />} />
      <Route element={<Protegida />}>
        <Route index element={<InicioPage />} />
        <Route path="habitaciones" element={<HabitacionesPage />} />
        <Route path="habitaciones/tarifas" element={<TarifasPage />} />
        <Route path="reservas/*" element={<Proximamente titulo="Reservas" />} />
        <Route path="caja/*" element={<Proximamente titulo="Caja" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
