import { useDeferredValue, useMemo, useState } from 'react'
import { Pagination, Select } from 'antd'
import dayjs from 'dayjs'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  apiErrorMessage,
  useGetActiveStudentContractsQuery,
  useGetGeneralSettingsQuery,
  useGetRoomsQuery,
  useUpdateStudentContractMutation,
} from '../../store/baseApi'
import { ContractFormModal } from './ContractFormModal'
import { ContractPreviewModal } from './ContractPreviewModal'
import { ContractDownloadButton } from './ContractDownloadButton'
import { ContractPrintButton } from './ContractPrintButton'
import './ContractRules.css'
import './ActiveContracts.css'
import { canEditOrDelete } from '../../utils/permissions'

const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const isExpiringWithinTwoDays = (endDate) => {
  const daysLeft = dayjs(endDate).startOf('day').diff(dayjs().startOf('day'), 'day')
  return daysLeft >= 0 && daysLeft <= 2
}

export function ActiveContractsTab({ currentEmployee }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [room, setRoom] = useState()
  const [contractType, setContractType] = useState()
  const [previewContract, setPreviewContract] = useState(null)
  const [editingContract, setEditingContract] = useState(null)
  const [formError, setFormError] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const { data, isLoading, isFetching, error } = useGetActiveStudentContractsQuery({ page, ...(deferredSearch ? { search: deferredSearch } : {}), ...(room ? { room } : {}), ...(contractType ? { contractType } : {}) })
  const { data: roomData } = useGetRoomsQuery()
  const { data: settingsData } = useGetGeneralSettingsQuery()
  const [updateContract, { isLoading: updating }] = useUpdateStudentContractMutation()
  const rooms = useMemo(() => roomData?.rooms || [], [roomData?.rooms])
  const editRooms = useMemo(() => rooms.filter((item) => item.gender === editingContract?.student?.gender && item.status !== 'maintenance' && ((item.occupiedCount || 0) < item.capacity || item.id === editingContract?.room?.id)), [editingContract?.room?.id, editingContract?.student?.gender, rooms])
  const pagination = data?.pagination || { page: 1, limit: 25, total: 0 }
  const summary = data?.summary || { total: 0, active: 0, completed: 0, cancelled: 0, amount: 0 }
  const canManage = canEditOrDelete(currentEmployee)

  const closeEdit = () => {
    setEditingContract(null)
    setFormError('')
  }

  const saveContract = async (values) => {
    try {
      setFormError('')
      await updateContract({
        id: editingContract.id,
        ...values,
        student: editingContract.student.id,
        paymentAmount: Number(values.paymentAmount),
        status: values.status || 'active',
      }).unwrap()
      toast.success('Shartnoma yangilandi')
      closeEdit()
    } catch (requestError) {
      const message = apiErrorMessage(requestError)
      setFormError(message)
      toast.error(message)
    }
  }

  return <section className="student-history-card active-contracts-card">
    <div className="student-history-tools"><div><h2>Amaldagi shartnomalar</h2><p>Hozir istiqomat qilayotgan {pagination.total} ta talaba</p></div><div><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Talaba, telefon yoki shartnoma" /><Select allowClear value={contractType} placeholder="Shartnoma turi" options={[{ value: 'student_contract', label: 'Talaba SH' }, { value: 'standard_contract', label: 'Oddiy SH' }]} onChange={(value) => { setContractType(value); setPage(1) }} /><Select allowClear showSearch optionFilterProp="label" value={room} placeholder="Xona" options={rooms.map((item) => ({ value: item.id, label: `${item.block} blok · ${item.roomNumber}-xona` }))} onChange={(value) => { setRoom(value); setPage(1) }} /></div></div>
    {error && <div className="form-error">{apiErrorMessage(error)}</div>}
    {!isLoading && <div className="active-contracts-summary"><article className="total"><span>Jami shartnomalar</span><strong>{summary.total} ta</strong></article><article className="active"><span>Aktiv</span><strong>{summary.active} ta</strong></article><article className="completed"><span>Yakunlangan</span><strong>{summary.completed} ta</strong></article><article className="cancelled"><span>Bekor qilingan</span><strong>{summary.cancelled} ta</strong></article><article className="amount"><span>Joriy oy summasi</span><strong>{money(summary.amount)}</strong></article></div>}
    {isLoading ? <div className="student-history-state">Shartnomalar yuklanmoqda…</div> : <div className={`student-history-table-wrap ${isFetching ? 'refreshing' : ''}`}><table className="student-history-table"><thead><tr><th>Talaba</th><th>Universitet</th><th>Xona</th><th>Shartnoma</th><th>Kirgan sana</th><th>Tugash sanasi</th><th>To‘lov turi</th><th>Shartnoma summasi</th><th>Holat</th><th>Amal</th></tr></thead><tbody>{(data?.contracts || []).map((contract) => <tr key={contract.id} className={isExpiringWithinTwoDays(contract.endDate) ? 'contract-expiring-soon' : ''}><td data-label="Talaba"><div className="history-person">{contract.student.photo ? <img src={contract.student.photo.thumbnailUrl || contract.student.photo.url} alt="" /> : <span>{contract.student.fullName?.[0]}</span>}<div><Link to={`/student/${contract.student.id}`}>{contract.student.fullName}</Link><small>{contract.student.phone}</small></div></div></td><td data-label="Universitet"><strong>{contract.student.university?.shortName || contract.student.university?.name || '—'}</strong><small>{contract.student.course}-kurs · {contract.student.faculty?.name || '—'}</small></td><td data-label="Xona"><strong>{contract.room.block} · {contract.room.roomNumber}-xona</strong><small>{contract.room.floor}-qavat</small></td><td data-label="Shartnoma"><strong>{contract.contractNumber}</strong></td><td data-label="Kirgan sana"><strong>{dayjs(contract.startDate).format('DD.MM.YYYY')}</strong></td><td data-label="Tugash sanasi"><strong>{dayjs(contract.endDate).format('DD.MM.YYYY')}</strong></td><td data-label="To‘lov turi"><span className="history-duration">{contract.paymentType === 'daily' ? 'Kunlik' : 'Oylik'}</span></td><td data-label="Summa"><b>{money(contract.totalAmount)}</b></td><td data-label="Holat"><span className="history-contract-status">Aktiv</span></td><td data-label="Amal"><div className="contract-actions"><button onClick={() => setPreviewContract(contract)} aria-label="Ko‘rish" title="Ko‘rish"><svg viewBox="0 0 24 24"><path d="M2.5 12C4.7 7.8 8 5.7 12 5.7S19.3 7.8 21.5 12C19.3 16.2 16 18.3 12 18.3S4.7 16.2 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/></svg></button><ContractPrintButton contract={contract} student={contract.student} organization={settingsData?.settings} /><ContractDownloadButton contract={contract} student={contract.student} organization={settingsData?.settings} />{canManage && <button onClick={() => { setFormError(''); setEditingContract(contract) }} aria-label="Tahrirlash" title="Tahrirlash"><svg viewBox="0 0 24 24"><path d="M4 20H8L18 10L14 6L4 16V20Z"/><path d="M12 8L16 12"/></svg></button>}</div></td></tr>)}{!data?.contracts?.length && <tr><td colSpan="10" className="student-history-state">Aktiv shartnoma topilmadi</td></tr>}</tbody></table></div>}
    {pagination.total > pagination.limit && <div className="student-history-pagination"><span>Jami {pagination.total} ta talaba</span><Pagination current={pagination.page} pageSize={pagination.limit} total={pagination.total} showSizeChanger={false} onChange={setPage} /></div>}
    <ContractPreviewModal open={Boolean(previewContract)} contract={previewContract} student={previewContract?.student} organization={settingsData?.settings} onClose={() => setPreviewContract(null)} />
    <ContractFormModal open={Boolean(editingContract)} contract={editingContract} rooms={editRooms} loading={updating} error={formError} onClose={closeEdit} onSubmit={saveContract} />
  </section>
}
