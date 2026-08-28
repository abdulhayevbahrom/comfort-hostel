import { Popconfirm } from 'antd'
import { categoryOptions, genderOptions, optionLabel, statusOptions } from './roomConstants'

export function RoomCard({ room, deleting, canManage, onResidents, onView, onEdit, onDelete }) {
  const capacity = Math.max(0, Number(room.capacity) || 0)
  const recordedOccupiedCount = room.occupiedCount ?? room.residents?.length
  const occupiedCount = Math.min(capacity, Math.max(0, Number(recordedOccupiedCount) || 0))
  const availableCount = capacity - occupiedCount
  const displayedStatus = room.status === 'maintenance' ? optionLabel(statusOptions, room.status) : occupiedCount ? `${occupiedCount} ta band` : 'Bo‘sh'
  const displayedStatusClass = room.status === 'maintenance' ? room.status : occupiedCount ? 'occupied' : 'available'

  return (
    <article className={`room-card room-card-${room.status}`}>
      <div className="room-card-top">
        <div><h3>Xona {room.roomNumber}</h3></div>
        <span className={`room-status room-status-${displayedStatusClass}`}>{displayedStatus}</span>
      </div>
      <div className="room-meta">
        <div><span>Qavat:</span><strong>{room.floor}</strong></div>
        <div><span>Kategoriya:</span><strong>{optionLabel(categoryOptions, room.category)}</strong></div>
        <div><span>Kimlar uchun:</span><strong>{optionLabel(genderOptions, room.gender)}</strong></div>
        <div><span>Blok:</span><strong>{room.block || '—'}</strong></div>
      </div>
      <div className="room-seat-cards" aria-label={`${occupiedCount} ta band, ${availableCount} ta bo‘sh joy`}>
        {(room.beds || Array.from({ length: capacity }, (_, index) => ({ number: index + 1, status: index < occupiedCount ? 'occupied' : 'available' }))).map((bed) => (
          <i key={bed.number} className={`room-bed-dot ${bed.status}`} title={`${bed.label || `${bed.number}-o‘rin`}: ${bed.status === 'occupied' ? 'band' : 'bo‘sh'}`}>{bed.number}</i>
        ))}
      </div>
      <div className="room-card-actions">
        <button className="room-icon-btn residents" onClick={() => onResidents(room)} aria-label="Xonadagi talabalar" title="Xonadagi talabalar"><svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20v-2.5A4.5 4.5 0 0 1 7 13h2a4.5 4.5 0 0 1 4.5 4.5V20M14 14.5a4 4 0 0 1 7 2.5V20"/></svg></button>
        <button className="room-icon-btn" onClick={() => onView(room)} aria-label="Rasmlarni ko‘rish" title="Rasmlarni ko‘rish"><svg viewBox="0 0 24 24"><path d="M2.5 12C4.7 7.8 8 5.7 12 5.7S19.3 7.8 21.5 12C19.3 16.2 16 18.3 12 18.3S4.7 16.2 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/></svg></button>
        {canManage && <><button className="room-icon-btn" onClick={() => onEdit(room)} aria-label="Tahrirlash" title="Tahrirlash"><svg viewBox="0 0 24 24"><path d="M4 20H8L18 10L14 6L4 16V20Z"/><path d="M12 8L16 12"/></svg></button><Popconfirm title="Xonani o‘chirish" description="Ushbu amalni tasdiqlaysizmi?" okText="O‘chirish" cancelText="Bekor" okButtonProps={{ danger: true, loading: deleting }} onConfirm={() => onDelete(room.id)}><button className="room-icon-btn danger" disabled={deleting} aria-label="O‘chirish" title="O‘chirish"><svg viewBox="0 0 24 24"><path d="M4 7H20M9 7V5H15V7M7 7L8 20H16L17 7"/></svg></button></Popconfirm></>}
      </div>
    </article>
  )
}
