import { Modal } from 'antd'
import { DirectoryActions } from './DirectoryActions'

export function FacultyListModal({ open, university, faculties, deleting, canManage, onClose, onEdit, onDelete }) {
  return (
    <Modal open={open} onCancel={onClose} footer={null} width={720} rootClassName="directory-modal faculty-list-modal" title={university ? `${university.name} fakultetlari` : 'Fakultetlar'}>
      <div className="faculty-list-summary"><span>Universitet</span><strong>{university?.shortName || university?.name}</strong><b>{faculties.length} ta fakultet</b></div>
      <div className="directory-table-wrap">
        <table className="directory-table">
          <thead><tr><th>Fakultet nomi</th><th>Amal</th></tr></thead>
          <tbody>
            {faculties.map((faculty) => <tr key={faculty.id}><td data-label="Fakultet">{faculty.name}</td><td data-label="Amal"><DirectoryActions name="Fakultet" deleting={deleting} canManage={canManage} onEdit={() => onEdit(faculty)} onDelete={() => onDelete(faculty.id)} /></td></tr>)}
            {!faculties.length && <tr><td className="directory-empty" colSpan={2}>Bu universitetga hali fakultet biriktirilmagan</td></tr>}
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
