import { useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Pagination, Popconfirm, Select } from 'antd'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiErrorMessage, useCreateFineMutation, useDeleteFineMutation, useGetFineOptionsQuery, useGetFinesQuery, useUpdateFineMutation } from '../../store/baseApi'
import './Fines.css'
import { FinePaymentModal } from './FinePaymentModal'
import './FinePayments.css'
import { FinePaymentHistoryModal } from './FinePaymentHistoryModal'
import { canEditOrDelete } from '../../utils/permissions'

const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const employeeName = (employee) => `${employee?.firstname || ''} ${employee?.lastname || ''}`.trim() || 'Noma’lum xodim'

export function FinesPage({ currentEmployee }) {
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [search, setSearch] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [paymentFine, setPaymentFine] = useState(null)
  const [historyFine, setHistoryFine] = useState(null)
  const [actionFine, setActionFine] = useState(null)
  const { data, isLoading, isFetching, error } = useGetFinesQuery({ page, month, ...(search ? { search } : {}), ...(studentFilter ? { student: studentFilter } : {}) })
  const { data: optionsData } = useGetFineOptionsQuery()
  const [createFine, { isLoading: creating }] = useCreateFineMutation()
  const [updateFine, { isLoading: updating }] = useUpdateFineMutation()
  const [deleteFine] = useDeleteFineMutation()
  const canManage = canEditOrDelete(currentEmployee)
  const studentOptions = (optionsData?.students || []).map((student) => ({ value: student.id, label: `${student.fullName} · ${student.room?.block || ''} ${student.room?.roomNumber || ''}-xona`, search: `${student.fullName} ${student.phone} ${student.room?.roomNumber || ''}` }))

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = (fine) => { setEditing(fine); form.setFieldsValue({ student: fine.student.id, reason: fine.reason, amount: fine.amount }); setModalOpen(true) }
  const close = () => { setModalOpen(false); setEditing(null); form.resetFields() }
  const submit = async (values) => {
    try {
      if (editing) await updateFine({ id: editing.id, studentId: editing.student.id, reason: values.reason.trim(), amount: Number(values.amount) }).unwrap()
      else await createFine({ student: values.student, reason: values.reason.trim(), amount: Number(values.amount) }).unwrap()
      toast.success(editing ? 'Jarima yangilandi' : 'Talabaga jarima yozildi')
      close()
    } catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }
  const remove = async (fine) => { try { await deleteFine({ id: fine.id, studentId: fine.student.id }).unwrap(); toast.success('Jarima o‘chirildi') } catch (requestError) { toast.error(apiErrorMessage(requestError)) } }
  const summary = data?.summary || {}

  return <div className="fines-page">
    <section className="fine-stats"><article className="total"><small>Jami jarimalar</small><strong>{money(summary.totalAmount)}</strong><span>{month} oyi</span></article><article className="paid"><small>To‘langan</small><strong>{money(summary.paidAmount)}</strong><span>qabul qilingan</span></article><article className="remaining"><small>To‘lanmagan qoldiq</small><strong>{money(summary.remainingAmount)}</strong><span>undirilishi kerak</span></article><article className="count"><small>Jarimalar soni</small><strong>{summary.count || 0} ta</strong><span>tanlangan davrda</span></article><article className="students"><small>Jarima olgan talabalar</small><strong>{summary.studentCount || 0} ta</strong><span>noyob talaba</span></article></section>
    <section className="fines-card">
      <div className="fines-tools"><div><h3>Jarimalar ro‘yxati</h3><p>Talabalarga berilgan ma’muriy jarimalar</p></div><div className="fine-filters"><div className="fine-search"><span>⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Talaba yoki sabab" /></div><Select allowClear showSearch optionFilterProp="search" value={studentFilter || undefined} placeholder="Barcha talabalar" options={studentOptions} onChange={(value = '') => { setStudentFilter(value); setPage(1) }} /><DatePicker picker="month" allowClear={false} value={dayjs(month)} format="MMMM YYYY" onChange={(value) => { setMonth(value.format('YYYY-MM')); setPage(1) }} /><button className="fine-add-button" onClick={openCreate}>+ Jarima yozish</button></div></div>
      {error && <div className="form-error">{apiErrorMessage(error)}</div>}
      {isLoading ? <div className="fine-state">Jarimalar yuklanmoqda…</div> : <div className={`fine-table-wrap ${isFetching ? 'refreshing' : ''}`}><table className="fine-table">
        <thead><tr><th>Talaba</th><th>Universitet</th><th>Jarima sababi</th><th>Summa</th><th>To‘lov holati</th><th>Sana</th><th>Jarima bergan xodim</th><th>Amal</th></tr></thead>
        <tbody>{(data?.fines || []).map((fine) => { const remaining = Math.max(0, fine.amount - (fine.paidAmount || 0)); const paymentStatus = remaining <= 0 ? 'paid' : fine.paidAmount > 0 ? 'partial' : 'unpaid'; return <tr key={fine.id}>
          <td data-label="Talaba"><button className="fine-student" onClick={() => navigate(`/student/${fine.student.id}`)}>{fine.student.photo ? <img src={fine.student.photo.thumbnailUrl || fine.student.photo.url} alt="" /> : <span>{fine.student.fullName?.[0]}</span>}<div><strong>{fine.student.fullName}</strong><small>{fine.student.phone}</small></div></button></td>
          <td data-label="Universitet"><strong>{fine.student.university?.shortName || fine.student.university?.name || '—'}</strong><small>{fine.student.course}-kurs · {fine.student.faculty?.name || '—'}</small></td>
          <td data-label="Sabab"><p className="fine-reason">{fine.reason}</p></td>
          <td data-label="Summa"><b className="fine-money">{money(fine.amount)}</b><small>Qoldiq: {money(remaining)}</small></td>
          <td data-label="Holat"><span className={`fine-payment-status ${paymentStatus}`}>{paymentStatus === 'paid' ? 'To‘langan' : paymentStatus === 'partial' ? 'Qisman to‘langan' : 'To‘lanmagan'}</span></td>
          <td data-label="Sana"><strong>{dayjs(fine.createdAt).format('DD.MM.YYYY')}</strong><small>{dayjs(fine.createdAt).format('HH:mm')}</small></td>
          <td data-label="Xodim"><strong>{employeeName(fine.issuedBy)}</strong><small>{fine.issuedBy?.position || '—'}</small></td>
          <td data-label="Amal"><div className="fine-actions">{remaining > 0 && <button className="pay" onClick={() => setPaymentFine(fine)}>To‘lov</button>}<button className="history" title="To‘lovlar tarixi" onClick={() => setHistoryFine(fine)}>Tarix</button>{canManage && <><button className="edit" title="Tahrirlash" onClick={() => openEdit(fine)}>✎</button><Popconfirm title="Jarima o‘chirilsinmi?" description="Bu amalni ortga qaytarib bo‘lmaydi." okText="O‘chirish" cancelText="Bekor" onConfirm={() => remove(fine)}><button className="delete" title="O‘chirish">×</button></Popconfirm></>}<button className="fine-more-btn" onClick={() => setActionFine(actionFine?.id === fine.id ? null : fine)}>⋯</button>{actionFine?.id === fine.id && <div className="fine-inline-actions"><button onClick={() => { if (remaining > 0) setPaymentFine(fine); setActionFine(null) }}>To‘lov</button><button onClick={() => { setHistoryFine(fine); setActionFine(null) }}>Tarix</button>{canManage && <><button onClick={() => { openEdit(fine); setActionFine(null) }}>Tahrirlash</button><button onClick={() => { remove(fine); setActionFine(null) }}>O‘chirish</button></>}</div>}</div></td>
        </tr>})}{!data?.fines?.length && <tr><td colSpan="8" className="fine-state">Tanlangan oy bo‘yicha jarima topilmadi</td></tr>}</tbody>
      </table></div>}
      {(data?.pagination?.total || 0) > 25 && <div className="fine-pagination"><span>Jami {data.pagination.total} ta jarima</span><Pagination current={data.pagination.page} pageSize={25} total={data.pagination.total} showSizeChanger={false} onChange={setPage} /></div>}
    </section>
    <Modal open={modalOpen} onCancel={close} footer={null} width={560} title={editing ? 'Jarimani tahrirlash' : 'Talabaga jarima yozish'} destroyOnHidden rootClassName="fine-modal"><Form form={form} layout="vertical" requiredMark={false} onFinish={submit}><Form.Item name="student" label="Talaba" rules={[{ required: true, message: 'Talabani tanlang' }]}><Select disabled={Boolean(editing)} showSearch optionFilterProp="search" options={studentOptions} placeholder="Talabani qidiring va tanlang" /></Form.Item><Form.Item name="reason" label="Jarima sababi" rules={[{ required: true, message: 'Jarima sababini kiriting' }]}><Input.TextArea rows={4} maxLength={1000} showCount placeholder="Talaba nima sababdan jarima olayotganini batafsil yozing" /></Form.Item><Form.Item name="amount" label="Jarima summasi" rules={[{ required: true, message: 'Summani kiriting' }]}><InputNumber min={1} precision={0} addonAfter="so‘m" formatter={(value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(value) => String(value || '').replace(/[^\d]/g, '')} /></Form.Item><div className="fine-modal-actions"><Button onClick={close}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={creating || updating}>{editing ? 'Saqlash' : 'Jarimani tasdiqlash'}</Button></div></Form></Modal>
    <FinePaymentModal fine={paymentFine} onClose={() => setPaymentFine(null)} />
    <FinePaymentHistoryModal fine={historyFine} onClose={() => setHistoryFine(null)} />
  </div>
}
