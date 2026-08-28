import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
  apiErrorMessage,
  useCreateFacultyMutation,
  useCreateUniversityMutation,
  useDeleteFacultyMutation,
  useDeleteUniversityMutation,
  useGetFacultiesQuery,
  useGetUniversitiesQuery,
  useUpdateFacultyMutation,
  useUpdateUniversityMutation,
} from '../../store/baseApi'
import { DirectoryActions } from './DirectoryActions'
import { FacultyFormModal } from './FacultyFormModal'
import { FacultyListModal } from './FacultyListModal'
import { UniversityFormModal } from './UniversityFormModal'
import './SettingsPages.css'
import { canEditOrDelete } from '../../utils/permissions'

export function UniversitiesPage({ currentEmployee }) {
  const { data, isLoading, error: listError } = useGetUniversitiesQuery()
  const { data: facultyData, error: facultyListError } = useGetFacultiesQuery()
  const [createUniversity, { isLoading: creating }] = useCreateUniversityMutation()
  const [updateUniversity, { isLoading: updating }] = useUpdateUniversityMutation()
  const [deleteUniversity, { isLoading: deleting }] = useDeleteUniversityMutation()
  const [createFaculty, { isLoading: creatingFaculty }] = useCreateFacultyMutation()
  const [updateFaculty, { isLoading: updatingFaculty }] = useUpdateFacultyMutation()
  const [deleteFaculty, { isLoading: deletingFaculty }] = useDeleteFacultyMutation()
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [facultyError, setFacultyError] = useState('')
  const [facultyUniversity, setFacultyUniversity] = useState(null)
  const [facultyFormOpen, setFacultyFormOpen] = useState(false)
  const [facultyListUniversity, setFacultyListUniversity] = useState(null)
  const [editingFaculty, setEditingFaculty] = useState(null)
  const canManage = canEditOrDelete(currentEmployee)
  const universities = useMemo(() => data?.universities || [], [data?.universities])
  const faculties = useMemo(() => facultyData?.faculties || [], [facultyData?.faculties])
  const visibleFaculties = useMemo(() => faculties.filter((item) => (item.university?.id || item.university) === facultyListUniversity?.id), [faculties, facultyListUniversity])
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return search ? universities.filter((item) => `${item.name} ${item.shortName}`.toLowerCase().includes(search)) : universities
  }, [query, universities])
  const close = () => { setModalOpen(false); setEditing(null); setError('') }
  const submit = async (values) => {
    try {
      const payload = { name: values.name.trim(), shortName: String(values.shortName || '').trim() }
      if (editing) await updateUniversity({ id: editing.id, ...payload }).unwrap()
      else await createUniversity(payload).unwrap()
      toast.success(editing ? 'Universitet yangilandi' : 'Universitet qo‘shildi')
      close()
    } catch (requestError) { const message = apiErrorMessage(requestError); setError(message); toast.error(message) }
  }
  const remove = async (id) => {
    try { await deleteUniversity(id).unwrap(); toast.success('Universitet o‘chirildi') }
    catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }
  const openFacultyCreate = (university) => {
    setFacultyUniversity(university); setEditingFaculty(null); setFacultyError(''); setFacultyFormOpen(true)
  }
  const openFacultyEdit = (faculty) => {
    setFacultyUniversity(facultyListUniversity); setEditingFaculty(faculty); setFacultyError(''); setFacultyFormOpen(true)
  }
  const closeFacultyForm = () => { setFacultyFormOpen(false); setEditingFaculty(null); setFacultyError('') }
  const submitFaculty = async (values) => {
    try {
      const payload = { name: values.name.trim(), university: facultyUniversity.id }
      if (editingFaculty) await updateFaculty({ id: editingFaculty.id, ...payload }).unwrap()
      else await createFaculty(payload).unwrap()
      toast.success(editingFaculty ? 'Fakultet yangilandi' : 'Fakultet biriktirildi')
      closeFacultyForm()
    } catch (requestError) { const message = apiErrorMessage(requestError); setFacultyError(message); toast.error(message) }
  }
  const removeFaculty = async (id) => {
    try { await deleteFaculty(id).unwrap(); toast.success('Fakultet o‘chirildi') }
    catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }

  return (
    <div className="directory-page">
      <div className="directory-card">
        <div className="directory-toolbar"><div><h2>Universitetlar ro‘yxati</h2><p>Talabalar o‘qiydigan universitetlarni kiriting</p></div><div className="directory-toolbar-actions"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Universitetni qidirish" /><button onClick={() => setModalOpen(true)}>+ Universitet qo‘shish</button></div></div>
        {(listError || facultyListError) && <div className="form-error">{apiErrorMessage(listError || facultyListError)}</div>}
        {isLoading ? <div className="directory-loading">Ma’lumotlar yuklanmoqda…</div> : <div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>Universitet nomi</th><th>Qisqa nomi</th><th>Fakultetlar</th><th>Fakultet boshqaruvi</th><th>Amal</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td data-label="Universitet">{item.name}</td><td data-label="Qisqa nomi">{item.shortName || '—'}</td><td data-label="Fakultetlar"><span className="directory-count">{item.facultyCount || 0} ta</span></td><td data-label="Fakultet boshqaruvi"><div className="faculty-row-actions">{canManage && <button className="directory-icon-btn add" onClick={() => openFacultyCreate(item)} title="Fakultet biriktirish" aria-label="Fakultet biriktirish">+</button>}<button className="directory-icon-btn" onClick={() => setFacultyListUniversity(item)} title="Fakultetlarni ko‘rish" aria-label="Fakultetlarni ko‘rish"><svg viewBox="0 0 24 24"><path d="M2.5 12C4.7 7.8 8 5.7 12 5.7S19.3 7.8 21.5 12C19.3 16.2 16 18.3 12 18.3S4.7 16.2 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/></svg></button></div></td><td data-label="Amal"><DirectoryActions name="Universitet" deleting={deleting} canManage={canManage} onEdit={() => { setEditing(item); setModalOpen(true) }} onDelete={() => remove(item.id)} /></td></tr>)}{!filtered.length && <tr><td className="directory-empty" colSpan={5}>Universitetlar topilmadi</td></tr>}</tbody></table></div>}
      </div>
      <UniversityFormModal open={modalOpen} university={editing} loading={creating || updating} error={error} onClose={close} onSubmit={submit} />
      <FacultyListModal open={Boolean(facultyListUniversity)} university={facultyListUniversity} faculties={visibleFaculties} deleting={deletingFaculty} canManage={canManage} onClose={() => setFacultyListUniversity(null)} onEdit={openFacultyEdit} onDelete={removeFaculty} />
      <FacultyFormModal open={facultyFormOpen} faculty={editingFaculty} universityId={facultyUniversity?.id} universities={universities} loading={creatingFaculty || updatingFaculty} error={facultyError} onClose={closeFacultyForm} onSubmit={submitFaculty} />
    </div>
  )
}
