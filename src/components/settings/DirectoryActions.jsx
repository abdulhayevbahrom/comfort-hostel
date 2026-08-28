import { Popconfirm } from 'antd'

export function DirectoryActions({ name, deleting, canManage, onEdit, onDelete }) {
  if (!canManage) return null
  return (
    <div className="directory-actions">
      <button className="directory-icon-btn" onClick={onEdit} aria-label="Tahrirlash" title="Tahrirlash"><svg viewBox="0 0 24 24"><path d="M4 20H8L18 10L14 6L4 16V20Z"/><path d="M12 8L16 12"/></svg></button>
      <Popconfirm title={`${name}ni o‘chirish`} description="Ushbu amalni tasdiqlaysizmi?" okText="O‘chirish" cancelText="Bekor" okButtonProps={{ danger: true, loading: deleting }} onConfirm={onDelete}>
        <button className="directory-icon-btn danger" disabled={deleting} aria-label="O‘chirish" title="O‘chirish"><svg viewBox="0 0 24 24"><path d="M4 7H20M9 7V5H15V7M7 7L8 20H16L17 7"/></svg></button>
      </Popconfirm>
    </div>
  )
}
