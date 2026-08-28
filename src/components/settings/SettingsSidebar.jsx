import { NavLink } from 'react-router-dom'
import './SettingsSidebar.css'

const settingsItems = [
  { path: '/settings/general', label: 'Umumiy sozlamalar', icon: 'S' },
  { path: '/settings/universities', label: 'Universitetlar', icon: 'U' },
  { path: '/settings/building-blocks', label: 'Bino / bloklar', icon: 'B' },
]

export function SettingsSidebar() {
  return (
    <aside className="settings-sidebar">
      <div className="settings-sidebar-title"><strong>Sozlamalar</strong><small>Ma’lumotnomalar</small></div>
      <nav>
        {settingsItems.map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'active' : ''}>
            <span>{item.icon}</span>{item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
