import { useMemo, useState } from 'react'
import { Popconfirm } from 'antd'
import { toast } from 'react-toastify'
import dayjs from 'dayjs'
import { apiErrorMessage, useCreateStudentContractMutation, useDeleteStudentContractMutation, useGetGeneralSettingsQuery, useGetRoomsQuery, useGetStudentContractsQuery, useUpdateStudentContractMutation } from '../../store/baseApi'
import { ContractFormModal } from './ContractFormModal'
import { ContractDownloadButton } from './ContractDownloadButton'
import { ContractPrintButton } from './ContractPrintButton'
import { ContractPreviewModal } from './ContractPreviewModal'
import { calculateContractPayment } from '../../utils/contractPayment'
import './ContractRules.css'
import { canEditOrDelete } from '../../utils/permissions'

const statusLabel = { active: 'Aktiv', completed: 'Yakunlangan', cancelled: 'Bekor qilingan' }
const formatDate = (value) => value ? new Date(value).toLocaleDateString('uz-UZ') : '—'
const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const totalFor = (contract) => contract.totalAmount ?? calculateContractPayment(dayjs(contract.startDate), dayjs(contract.endDate), contract.paymentType, contract.paymentAmount).totalAmount

export function StudentContractsTab({ student, currentEmployee }) {
  const studentId = student.id
  const { data, isLoading, error: listError } = useGetStudentContractsQuery(studentId)
  const { data: roomData } = useGetRoomsQuery()
  const { data: settingsData } = useGetGeneralSettingsQuery()
  const [createContract, { isLoading: creating }] = useCreateStudentContractMutation()
  const [updateContract, { isLoading: updating }] = useUpdateStudentContractMutation()
  const [deleteContract, { isLoading: deleting }] = useDeleteStudentContractMutation()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [previewContract, setPreviewContract] = useState(null)
  const contracts = useMemo(() => data?.contracts || [], [data?.contracts])
  const canManage = canEditOrDelete(currentEmployee)
  const summary = useMemo(() => contracts.reduce((result, contract) => {
    result.total += 1
    result.amount += Number(totalFor(contract) || 0)
    if (Object.prototype.hasOwnProperty.call(result, contract.status)) result[contract.status] += 1
    return result
  }, { total: 0, active: 0, completed: 0, cancelled: 0, amount: 0 }), [contracts])
  const rooms = useMemo(() => (roomData?.rooms || []).filter((room) => room.gender === student.gender && room.status !== 'maintenance' && ((room.occupiedCount || 0) < room.capacity || room.id === editing?.room?.id)), [editing?.room?.id, roomData?.rooms, student.gender])
  const close = () => { setModalOpen(false); setEditing(null); setError('') }
  const submit = async (values) => {
    try {
      const payload = { ...values, student: studentId, paymentAmount: Number(values.paymentAmount), status: values.status || 'active' }
      if (editing) await updateContract({ id: editing.id, ...payload }).unwrap()
      else await createContract(payload).unwrap()
      toast.success(editing ? 'Shartnoma yangilandi' : 'Shartnoma tuzildi')
      close()
    } catch (requestError) { const message = apiErrorMessage(requestError); setError(message); toast.error(message) }
  }
  const remove = async (id) => {
    try { await deleteContract(id).unwrap(); toast.success('Shartnoma o‘chirildi') }
    catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }

  return (
    <div className="student-contracts-tab">
      <div className="student-contract-toolbar"><div><h3>Talaba shartnomalari</h3><p>{contracts.length} ta shartnoma</p></div><button onClick={() => setModalOpen(true)}>+ Shartnoma tuzish</button></div>
      {listError && <div className="form-error">{apiErrorMessage(listError)}</div>}
      {!isLoading && <div className="student-contract-stats"><article className="total"><span>Jami shartnomalar</span><strong>{summary.total} ta</strong></article><article className="active"><span>Aktiv</span><strong>{summary.active} ta</strong></article><article className="completed"><span>Yakunlangan</span><strong>{summary.completed} ta</strong></article><article className="cancelled"><span>Bekor qilingan</span><strong>{summary.cancelled} ta</strong></article><article className="amount"><span>Umumiy summa</span><strong>{money(summary.amount)}</strong></article></div>}
      {isLoading ? <div className="contracts-state">Shartnomalar yuklanmoqda…</div> : <div className="contract-table-wrap"><table className="contract-table"><thead><tr><th>Shartnoma raqami</th><th>Xona</th><th>Muddati</th><th>To‘lov turi</th><th>Tarif</th><th>Jami</th><th>Holati</th><th>Amal</th></tr></thead><tbody>{contracts.map((contract) => <tr key={contract.id}><td data-label="Raqami"><strong>{contract.contractNumber}</strong></td><td data-label="Xona">{contract.room ? `${contract.room.block} · ${contract.room.roomNumber} · ${contract.bedNumber}-o‘rin` : '—'}</td><td data-label="Muddati">{formatDate(contract.startDate)} — {formatDate(contract.endDate)}</td><td data-label="Turi"><span className="contract-payment-type">{contract.paymentType === 'daily' ? 'Kunlik' : 'Oylik'}</span></td><td data-label="Tarif">{Number(contract.paymentAmount ?? contract.monthlyAmount ?? 0).toLocaleString('uz-UZ')} so‘m</td><td data-label="Jami"><strong>{Number(totalFor(contract)).toLocaleString('uz-UZ')} so‘m</strong></td><td data-label="Holati"><span className={`contract-status ${contract.status}`}>{statusLabel[contract.status]}</span></td><td data-label="Amal"><div className="contract-actions"><button onClick={() => setPreviewContract(contract)} aria-label="Ko‘rish" title="Ko‘rish"><svg viewBox="0 0 24 24"><path d="M2.5 12C4.7 7.8 8 5.7 12 5.7S19.3 7.8 21.5 12C19.3 16.2 16 18.3 12 18.3S4.7 16.2 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/></svg></button><ContractPrintButton contract={contract} student={student} organization={settingsData?.settings} /><ContractDownloadButton contract={contract} student={student} organization={settingsData?.settings} />{canManage && <><button onClick={() => { setEditing(contract); setModalOpen(true) }} aria-label="Tahrirlash"><svg viewBox="0 0 24 24"><path d="M4 20H8L18 10L14 6L4 16V20Z"/><path d="M12 8L16 12"/></svg></button><Popconfirm title="Shartnomani o‘chirish" description="Ushbu amalni tasdiqlaysizmi?" okText="O‘chirish" cancelText="Bekor" okButtonProps={{ danger: true, loading: deleting }} onConfirm={() => remove(contract.id)}><button className="danger" disabled={deleting} aria-label="O‘chirish"><svg viewBox="0 0 24 24"><path d="M4 7H20M9 7V5H15V7M7 7L8 20H16L17 7"/></svg></button></Popconfirm></>}</div></td></tr>)}{!contracts.length && <tr><td className="contracts-state" colSpan={8}>Bu talaba uchun shartnoma tuzilmagan</td></tr>}</tbody></table></div>}
      <ContractFormModal open={modalOpen} contract={editing} rooms={rooms} loading={creating || updating} error={error} onClose={close} onSubmit={submit} />
      <ContractPreviewModal open={Boolean(previewContract)} contract={previewContract} student={student} organization={settingsData?.settings} onClose={() => setPreviewContract(null)} />
    </div>
  )
}
