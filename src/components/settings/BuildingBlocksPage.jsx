import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { apiErrorMessage, useCreateBuildingBlockMutation, useDeleteBuildingBlockMutation, useGetBuildingBlocksQuery, useUpdateBuildingBlockMutation } from '../../store/baseApi'
import { BuildingBlockFormModal } from './BuildingBlockFormModal'
import { DirectoryActions } from './DirectoryActions'
import './SettingsPages.css'
import { canEditOrDelete } from '../../utils/permissions'

export function BuildingBlocksPage({ currentEmployee }) {
  const { data, isLoading, error: listError } = useGetBuildingBlocksQuery()
  const [createBlock, { isLoading: creating }] = useCreateBuildingBlockMutation()
  const [updateBlock, { isLoading: updating }] = useUpdateBuildingBlockMutation()
  const [deleteBlock, { isLoading: deleting }] = useDeleteBuildingBlockMutation()
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const canManage = canEditOrDelete(currentEmployee)
  const blocks = useMemo(() => data?.blocks || [], [data?.blocks])
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return search ? blocks.filter((item) => item.name.toLowerCase().includes(search)) : blocks
  }, [blocks, query])
  const close = () => { setModalOpen(false); setEditing(null); setError('') }
  const submit = async (values) => {
    try {
      const payload = { name: values.name.trim() }
      if (editing) await updateBlock({ id: editing.id, ...payload }).unwrap()
      else await createBlock(payload).unwrap()
      toast.success(editing ? 'Bino yoki blok yangilandi' : 'Bino yoki blok qo‘shildi')
      close()
    } catch (requestError) { const message = apiErrorMessage(requestError); setError(message); toast.error(message) }
  }
  const remove = async (id) => {
    try { await deleteBlock(id).unwrap(); toast.success('Bino yoki blok o‘chirildi') }
    catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }

  return (
    <div className="directory-page">
      <div className="directory-card">
        <div className="directory-toolbar"><div><h2>Bino va bloklar</h2><p>Xonalar joylashgan bino yoki bloklarni boshqaring</p></div><div className="directory-toolbar-actions"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bino yoki blokni qidirish" /><button onClick={() => setModalOpen(true)}>+ Bino / blok qo‘shish</button></div></div>
        {listError && <div className="form-error">{apiErrorMessage(listError)}</div>}
        {isLoading ? <div className="directory-loading">Ma’lumotlar yuklanmoqda…</div> : <div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>Bino yoki blok nomi</th><th>Xonalar</th><th>Amal</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td data-label="Bino / blok">{item.name}</td><td data-label="Xonalar"><span className="directory-count">{item.roomCount || 0} ta</span></td><td data-label="Amal"><DirectoryActions name="Bino yoki blok" deleting={deleting} canManage={canManage} onEdit={() => { setEditing(item); setModalOpen(true) }} onDelete={() => remove(item.id)} /></td></tr>)}{!filtered.length && <tr><td className="directory-empty" colSpan={3}>Bino yoki bloklar topilmadi</td></tr>}</tbody></table></div>}
      </div>
      <BuildingBlockFormModal open={modalOpen} block={editing} loading={creating || updating} error={error} onClose={close} onSubmit={submit} />
    </div>
  )
}
