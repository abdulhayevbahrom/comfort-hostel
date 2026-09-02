import { SidebarIcon } from './SidebarIcon'
import './Sidebar.css'

export function Sidebar({ active, items, hostelName, logoUrl, onNavigate, onClose }) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return (
    <aside className="edu-sidebar">
      <div className="edu-brand">
        <span className={`edu-brand-logo ${logoUrl ? 'has-image' : ''}`}>{logoUrl && <img src={logoUrl} alt={hostelName} />}</span>
        <div><strong>{hostelName || 'TizimPlus Hostel'}</strong><small>Turar joy boshqaruvi</small></div>
        <button className="sidebar-close" onClick={onClose} aria-label="Menyuni yopish">×</button>
      </div>
      <nav>
        {items.map((item) => (
          <button className={active === item.id ? 'active' : ''} onClick={() => onNavigate(item.path)} key={item.id}>
            <span><SidebarIcon name={item.icon} /></span>{item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar-today" aria-label={`Bugun: ${today}`}>
        <span>Bugun</span>
        <strong>{today}</strong>
      </div>
    </aside>
  )
}
