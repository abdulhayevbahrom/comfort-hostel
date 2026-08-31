import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Header } from './components/header/Header'
import { Sidebar } from './components/sidebar/Sidebar'
import { navigationItems } from './constants/navigation'
import { EmployeesPage } from './components/employees/EmployeesPage'
import { RoomsPage } from './components/rooms/RoomsPage'
import { StudentsPage } from './components/students/StudentsPage'
import { StudentProfilePage } from './components/students/StudentProfilePage'
import { ActiveContractsTab } from './components/students/ActiveContractsTab'
import { BuildingBlocksPage } from './components/settings/BuildingBlocksPage'
import { GeneralSettingsPage } from './components/settings/GeneralSettingsPage'
import { SettingsSidebar } from './components/settings/SettingsSidebar'
import { UniversitiesPage } from './components/settings/UniversitiesPage'
import { PaymentsPage } from './components/payments/PaymentsPage'
import { DebtorsPage } from './components/debtors/DebtorsPage'
import { AttendancePage } from './components/attendance/AttendancePage'
import { ExpensesPage } from './components/expenses/ExpensesPage'
import { FinesPage } from './components/fines/FinesPage'
import { SalariesPage } from './components/salaries/SalariesPage'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { ReportsPage } from './components/reports/ReportsPage'
import { CashPage } from './components/cash/CashPage'
import { FaceAccessPage } from './components/faceAccess/FaceAccessPage'
import { ShopPage } from './components/shop/ShopPage'
import { baseApi, useGetGeneralSettingsQuery, useGetMeQuery } from './store/baseApi'
import { LoginPage } from './components/auth/LoginPage'
import './App.css'

function App() {
  const dispatch = useDispatch()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('hostelAuthToken'))
  const { data: meData, isLoading: authLoading, isError: authError } = useGetMeQuery(undefined, { skip: !authToken })
  const location = useLocation()
  const navigate = useNavigate()
  const { data: generalSettingsData } = useGetGeneralSettingsQuery()
  const generalSettings = generalSettingsData?.settings
  const isOwner = ['owner', 'admin'].includes(meData?.employee?.role)
  const allowedSections = new Set(meData?.employee?.sections || [])
  const allowedNavigationItems = isOwner ? navigationItems : navigationItems.filter((item) => allowedSections.has(item.id))
  const firstAllowedPath = allowedNavigationItems[0]?.path || null
  const guard = (section, element) => isOwner || allowedSections.has(section)
    ? element
    : firstAllowedPath ? <Navigate to={firstAllowedPath} replace /> : <div className="hotel-page-loader">Sizga hech bir bo‘lim uchun ruxsat berilmagan</div>
  const isSettings = location.pathname.startsWith('/settings')
  const currentItem = navigationItems.find((item) => item.path === location.pathname || (item.id === 'students' && location.pathname.startsWith('/student/')) || (item.id === 'settings' && isSettings)) || navigationItems[0]
  const title = location.pathname.startsWith('/student/') ? 'Talaba profili' : location.pathname === '/settings/general' ? 'Umumiy sozlamalar' : location.pathname === '/settings/building-blocks' ? 'Bino / bloklar' : location.pathname.startsWith('/settings') ? 'Universitetlar' : currentItem.label
  const goTo = (path) => { navigate(path); setMobileNavOpen(false) }
  const logout = () => { localStorage.removeItem('hostelAuthToken'); dispatch(baseApi.util.resetApiState()); setAuthToken(null) }
  const handleLogin = (data) => { dispatch(baseApi.util.resetApiState()); setAuthToken(data.token) }

  useEffect(() => {
    const isAuthenticated = Boolean(authToken && meData?.employee && !authError)
    if ((!authToken || authError) && location.pathname !== '/login') navigate('/login', { replace: true })
    else if (isAuthenticated && location.pathname === '/login') navigate('/', { replace: true })
  }, [authError, authToken, location.pathname, meData?.employee, navigate])

  if (!authToken || authError) {
    if (authError && authToken) localStorage.removeItem('hostelAuthToken')
    return <LoginPage onLogin={handleLogin} />
  }
  if (authLoading || !meData?.employee) return <div className="hotel-page-loader"><span />Tizim yuklanmoqda</div>

  return (
    <main className={`edu-shell ${mobileNavOpen ? 'nav-open' : ''}`}>
      <button className="sidebar-backdrop" aria-label="Menyuni yopish" onClick={() => setMobileNavOpen(false)} />
      <Sidebar active={currentItem.id} items={allowedNavigationItems} hostelName={generalSettings?.hostelName} logoUrl={generalSettings?.logo?.thumbnailUrl || generalSettings?.logo?.url} onNavigate={goTo} onClose={() => setMobileNavOpen(false)} />
      <section className="edu-main">
        <Header title={title} employee={meData.employee} onLogout={logout} onOpenMenu={() => setMobileNavOpen(true)} />
        <div className={isSettings ? 'settings-workspace' : 'edu-workspace'}>
          {isSettings && <SettingsSidebar />}
          <section className="edu-content" aria-label={`${title} sahifasi`}>
            <Routes>
              <Route path="/" element={guard('dashboard', <DashboardPage employee={meData.employee} />)} />
              <Route path="/students" element={guard('students', <StudentsPage currentEmployee={meData.employee} />)} />
              <Route path="/contracts" element={guard('contracts', <ActiveContractsTab currentEmployee={meData.employee} />)} />
              <Route path="/student/:id" element={guard('students', <StudentProfilePage currentEmployee={meData.employee} />)} />
              <Route path="/rooms" element={guard('rooms', <RoomsPage currentEmployee={meData.employee} />)} />
              <Route path="/attendance" element={guard('attendance', <AttendancePage />)} />
              <Route path="/face-access" element={guard('face-access', <FaceAccessPage currentEmployee={meData.employee} />)} />
              <Route path="/payments" element={guard('payments', <PaymentsPage currentEmployee={meData.employee} />)} />
              <Route path="/cash" element={guard('cash', <CashPage currentEmployee={meData.employee} />)} />
              <Route path="/debtors" element={guard('debtors', <DebtorsPage currentEmployee={meData.employee} />)} />
              <Route path="/fines" element={guard('fines', <FinesPage currentEmployee={meData.employee} />)} />
              <Route path="/employees" element={guard('employees', <EmployeesPage currentEmployee={meData.employee} />)} />
              <Route path="/salaries" element={guard('salaries', <SalariesPage currentEmployee={meData.employee} />)} />
              <Route path="/shop" element={guard('shop', <ShopPage currentEmployee={meData.employee} />)} />
              <Route path="/expenses" element={guard('expenses', <ExpensesPage currentEmployee={meData.employee} />)} />
              <Route path="/reports" element={guard('reports', <ReportsPage />)} />
              <Route path="/settings" element={guard('settings', <Navigate to="/settings/general" replace />)} />
              <Route path="/settings/general" element={guard('settings', <GeneralSettingsPage currentEmployee={meData.employee} />)} />
              <Route path="/settings/universities" element={guard('settings', <UniversitiesPage currentEmployee={meData.employee} />)} />
              <Route path="/settings/building-blocks" element={guard('settings', <BuildingBlocksPage currentEmployee={meData.employee} />)} />
              <Route path="/settings/faculties" element={guard('settings', <Navigate to="/settings/universities" replace />)} />
              <Route path="*" element={firstAllowedPath ? <Navigate to={firstAllowedPath} replace /> : <div className="hotel-page-loader">Sizga hech bir bo‘lim uchun ruxsat berilmagan</div>} />
            </Routes>
          </section>
        </div>
      </section>
    </main>
  )
}

export default App
