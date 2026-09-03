import { useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Segmented, Select } from 'antd'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import { apiErrorMessage, useCreateDepositPaymentMutation, useCreatePaymentMutation, useDeletePaymentMutation, useGetGeneralSettingsQuery, useGetStudentPaymentsQuery, useUpdatePaymentMutation } from '../../store/baseApi'
import { PaymentPrintIcon } from '../payments/PaymentReceiptModal'
import { printPaymentReceipt } from '../payments/paymentReceipt'
import { printDepositReceipt } from '../payments/depositReceipt'
import { canEditOrDelete } from '../../utils/permissions'
import { groupPayments } from '../../utils/groupPayments'

const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const methods = { cash: 'Naqd', online: 'Click', bank: 'Bank', card: 'Karta' }
const installmentStatus = { unpaid: 'To‘lanmagan', partial: 'Qisman', paid: 'To‘langan' }

export function StudentPaymentsTab({ student, currentEmployee }) {
  const [form] = Form.useForm()
  const [paymentForm] = Form.useForm()
  const { data, isLoading, error } = useGetStudentPaymentsQuery(student.id)
  const { data: settingsData } = useGetGeneralSettingsQuery()
  const [updatePayment, { isLoading: updating }] = useUpdatePaymentMutation()
  const [createPayment, { isLoading: creating }] = useCreatePaymentMutation()
  const [createDepositPayment, { isLoading: creatingDeposit }] = useCreateDepositPaymentMutation()
  const [deletePayment, { isLoading: deleting }] = useDeletePaymentMutation()
  const [editing, setEditing] = useState(null)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const method = Form.useWatch('method', form)
  const paymentKind = Form.useWatch('paymentKind', paymentForm)
  const paymentParts = Form.useWatch('paymentParts', paymentForm) || {}
  const selectedContractId = Form.useWatch('contract', paymentForm)
  const selectedInstallmentId = Form.useWatch('installment', paymentForm)
  const isOwner = canEditOrDelete(currentEmployee)
  const contracts = data?.contracts || []
  const contractById = new Map(contracts.map((item) => [item._id, item]))
  const contractOptions = contracts.map((contract) => ({ ...contract, balance: (data?.installments || []).filter((item) => String(item.contract) === contract._id).reduce((sum, item) => sum + Math.max(0, item.amount - item.paidAmount), 0) })).filter((contract) => contract.status === 'active' && contract.balance > 0)
  const paymentInstallments = (data?.installments || []).filter((item) => String(item.contract) === selectedContractId && item.paidAmount < item.amount)
  const selectedInstallment = paymentInstallments.find((item) => item._id === selectedInstallmentId)
  const groupedPayments = groupPayments(data?.payments || [])
  const partsTotal = Object.values(paymentParts).reduce((sum, value) => sum + (Number(value) || 0), 0)
  const depositPaid = (student.depositPayments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const depositBalance = student.depositType === 'money' ? Math.max(0, Number(student.depositAmount || 0) - depositPaid) : 0

  const openEdit = (payment) => { setEditing(payment); form.setFieldsValue({ amount: payment.amount, method: payment.method, payerType: payment.payerType || '', note: payment.note || '' }) }
  const save = async (values) => {
    try { await updatePayment({ id: editing.id, amount: Number(values.amount), method: values.method, payerType: values.payerType, note: values.note }).unwrap(); toast.success('To‘lov yangilandi'); setEditing(null) }
    catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }
  const remove = async (id) => {
    try { await deletePayment(id).unwrap(); toast.success('To‘lov bekor qilindi') }
    catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }
  const openPayment = () => { const contract = contractOptions[0]; const installment = (data?.installments || []).find((item) => String(item.contract) === contract?._id && item.paidAmount < item.amount); paymentForm.setFieldsValue({ paymentKind: contract ? 'contract' : 'deposit', contract: contract?._id, installment: installment?._id, paymentParts: { cash: 0, online: 0, card: 0, bank: 0 }, paymentDates: {}, payerType: '', note: '' }); setPaymentOpen(true) }
  const acceptPayment = async (values) => {
    try {
      const paymentParts = Object.entries(values.paymentParts || {}).filter(([, amount]) => Number(amount) > 0).map(([method, amount]) => ({ method, amount: Number(amount), paidAt: values.paymentDates?.[method]?.toISOString() }))
      const maximum = values.paymentKind === 'deposit' ? depositBalance : Number(selectedInstallment?.amount || 0) - Number(selectedInstallment?.paidAmount || 0)
      if (!partsTotal || partsTotal > maximum) return toast.error(partsTotal ? 'To‘lov summasi qoldiqdan oshmasligi kerak' : 'Kamida bitta to‘lov usuliga summa kiriting')
      if (values.paymentKind === 'deposit') {
        const result = await createDepositPayment({ studentId: student.id, paymentParts }).unwrap()
        printDepositReceipt(result.student || student, result.payments, settingsData?.settings)
      } else {
        const result = await createPayment({ contract: values.contract, installment: values.installment, amount: partsTotal, method: paymentParts[0].method, paymentParts, payerType: values.payerType, note: values.note || '' }).unwrap()
        printPaymentReceipt(result.payment, settingsData?.settings)
      }
      toast.success('To‘lov muvaffaqiyatli qabul qilindi'); setPaymentOpen(false); paymentForm.resetFields()
    }
    catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }

  if (isLoading) return <div className="student-payment-state">To‘lov ma’lumotlari yuklanmoqda…</div>
  if (error) return <div className="form-error">{apiErrorMessage(error)}</div>
  const summary = data?.summary || {}

  return <div className="student-payments-tab">
    <div className="student-payment-toolbar"><div><h3>To‘lov holati</h3><p>{summary.paymentCount || 0} ta to‘lov amalga oshirilgan</p></div><button disabled={!contractOptions.length && !depositBalance} onClick={openPayment}>+ To‘lov qabul qilish</button></div>
    <div className="student-payment-stats"><article className="total"><span>Shartnomalar jami</span><strong>{money(summary.total)}</strong></article><article className="paid"><span>To‘langan</span><strong>{money(summary.paid)}</strong></article><article className="debt"><span>Joriy qarzdorlik</span><strong>{money(summary.debt)}</strong></article><article className="overdue"><span>Muddati o‘tgan</span><strong>{money(summary.overdue)}</strong></article><article className="upcoming"><span>Kelgusi oylar rejasi</span><strong>{money(summary.upcoming)}</strong></article></div>

    <section className="student-payment-section"><div className="student-payment-title"><h3>To‘lov rejasi</h3><span>{data?.installments?.length || 0} ta davr</span></div><div className="student-payment-table-wrap"><table className="student-payment-table"><thead><tr><th>Shartnoma</th><th>Davr</th><th>To‘lov muddati</th><th>Hisoblangan</th><th>To‘langan</th><th>Qoldiq</th><th>Holati</th></tr></thead><tbody>{(data?.installments || []).map((item) => { const contract = contractById.get(String(item.contract)); const debt = Math.max(0, item.amount - item.paidAmount); const cancelled = contract?.status === 'cancelled'; const fullyPaid = item.status === 'paid' || debt === 0; const upcoming = !cancelled && !fullyPaid && dayjs(item.dueDate).isAfter(dayjs(), 'day'); const statusClass = cancelled ? 'cancelled' : fullyPaid ? 'paid' : upcoming ? 'upcoming' : item.status; const statusText = cancelled ? 'Shartnoma bekor qilingan' : fullyPaid ? 'To‘liq to‘langan' : upcoming ? (item.paidAmount > 0 ? 'Oldindan qisman to‘langan' : 'Kutilmoqda') : installmentStatus[item.status]; return <tr key={item._id}><td data-label="Shartnoma"><strong>{contract?.contractNumber || '—'}</strong></td><td data-label="Davr">{item.periodKey}</td><td data-label="Muddat">{dayjs(item.dueDate).format('DD.MM.YYYY')}</td><td data-label="Hisoblangan">{money(item.amount)}</td><td data-label="To‘langan" className="paid-text">{money(item.paidAmount)}</td><td data-label="Qoldiq" className={debt && !upcoming && !cancelled ? 'debt-text' : ''}>{money(debt)}</td><td data-label="Holati"><span className={`installment-status ${statusClass}`}>{statusText}</span></td></tr>})}{!data?.installments?.length && <tr><td colSpan="7" className="student-payment-state">To‘lov rejasi mavjud emas</td></tr>}</tbody></table></div></section>

    <section className="student-payment-section"><div className="student-payment-title"><h3>To‘lovlar tarixi</h3><span>{groupedPayments.length} ta</span></div><div className="student-payment-table-wrap"><table className="student-payment-table"><thead><tr><th>Sana</th><th>Shartnoma</th><th>Qaysi oy uchun</th><th>To‘lov turi</th><th>To‘lovchi</th><th>Summa</th><th>Izoh</th><th>Amal</th></tr></thead><tbody>{groupedPayments.map((payment) => <tr key={payment.id} className={payment.status === 'cancelled' ? 'payment-cancelled-row' : ''}><td data-label="Sana">{dayjs(payment.createdAt).format('DD.MM.YYYY HH:mm')}</td><td data-label="Shartnoma">{payment.isDeposit ? 'Depozit' : payment.contract?.contractNumber || '—'}</td><td data-label="Oy"><span className="payment-period">{payment.isDeposit ? 'Depozit' : payment.allocations?.[0]?.installment?.periodKey || '—'}</span></td><td data-label="Turi"><div className="payment-method-breakdown">{payment.breakdown?.map((part, index) => <span className={`method-badge ${part.method}`} key={`${part.method}-${index}`}>{methods[part.method]} · {money(part.amount)}</span>)}</div></td><td data-label="To‘lovchi"><strong>{payment.payerType || '—'}</strong></td><td data-label="Summa"><strong className="paid-text">{payment.status === 'cancelled' ? '' : '+ '}{money(payment.amount)}</strong>{payment.status === 'cancelled' && <small className="payment-cancelled-badge">Bekor qilingan</small>}</td><td data-label="Izoh">{payment.note || '—'}</td><td data-label="Amal"><div className="student-payment-actions"><button className="payment-receipt-btn" onClick={() => payment.isDeposit ? printDepositReceipt(payment.student, payment.breakdown, settingsData?.settings) : printPaymentReceipt(payment, settingsData?.settings)} aria-label="To‘lov chekini chiqarish" title="Chekni chop etish"><PaymentPrintIcon /></button>{isOwner && !payment.isDeposit && payment.status !== 'cancelled' && !payment.isGrouped && <><button onClick={() => openEdit(payment)} aria-label="Tahrirlash"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg></button><Popconfirm title="To‘lovni bekor qilish" description="Summa qarzdorlikka qaytariladi" okText="Bekor qilish" cancelText="Yo‘q" onConfirm={() => remove(payment.id)} okButtonProps={{ danger: true, loading: deleting }}><button className="danger" aria-label="Bekor qilish">×</button></Popconfirm></>}</div></td></tr>)}{!groupedPayments.length && <tr><td colSpan={8} className="student-payment-state">Hali to‘lov qilinmagan</td></tr>}</tbody></table></div></section>

    <Modal open={Boolean(editing)} onCancel={() => setEditing(null)} footer={null} title="To‘lovni tahrirlash" width={560} rootClassName="student-payment-modal" destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
        <Form.Item name="amount" label="To‘lov summasi" rules={[{ required: true, message: 'Summani kiriting' }]}><InputNumber min={1} precision={0} addonAfter="so‘m" formatter={(v) => String(v || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(v) => String(v || '').replace(/[^\d]/g, '')} /></Form.Item>
        <Form.Item name="method" hidden><Input /></Form.Item>
        <div className="student-method-field"><label>To‘lov turi</label><div>{Object.entries(methods).map(([value, label]) => <button type="button" className={method === value ? 'active' : ''} key={value} onClick={() => form.setFieldValue('method', value)}>{label}</button>)}</div></div>
        <Form.Item name="payerType" label="To‘lovni kim qildi?" rules={[{ required: true, whitespace: true, message: 'To‘lovchini kiriting' }]}><Input maxLength={150} placeholder="Masalan: otasi" /></Form.Item>
        <Form.Item name="note" label="Izoh"><Input placeholder="Ixtiyoriy" /></Form.Item>
        <div className="payment-modal-actions"><Button onClick={() => setEditing(null)}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={updating}>Saqlash</Button></div>
      </Form>
    </Modal>
    <Modal open={paymentOpen} onCancel={() => setPaymentOpen(false)} footer={null} title={`${student.fullName} — to‘lov qabul qilish`} width={910} rootClassName="student-payment-modal payment-modal" destroyOnHidden>
      <Form form={paymentForm} layout="vertical" onFinish={acceptPayment} requiredMark={false}>
        <Form.Item name="paymentKind" label="To‘lov yo‘nalishi"><Segmented className="payment-kind-segmented" block options={[{ value: 'contract', label: 'Shartnoma to‘lovi', disabled: !contractOptions.length }, { value: 'deposit', label: 'Depozit to‘lovi', disabled: !depositBalance }]} onChange={() => paymentForm.setFieldsValue({ paymentParts: { cash: 0, online: 0, card: 0, bank: 0 }, paymentDates: {} })} /></Form.Item>
        {paymentKind === 'contract' && <><Form.Item name="contract" label="Shartnoma" rules={[{ required: true, message: 'Shartnomani tanlang' }]}><Select onChange={() => paymentForm.setFieldsValue({ installment: undefined, paymentParts: { cash: 0, online: 0, card: 0, bank: 0 }, paymentDates: {} })} options={contractOptions.map((contract) => ({ value: contract._id, label: `${contract.contractNumber} — ${money(contract.balance)} qoldiq` }))} /></Form.Item><Form.Item name="installment" label="Qaysi oy uchun" rules={[{ required: true, message: 'To‘lov oyini tanlang' }]}><Select placeholder="Oy yoki davrni tanlang" options={paymentInstallments.map((item) => ({ value: item._id, label: `${item.periodKey} — ${money(item.amount - item.paidAmount)} qoldiq` }))} /></Form.Item></>}
        <div className="profile-payment-balance"><span>{paymentKind === 'deposit' ? 'Depozit qoldig‘i' : 'Tanlangan oy qoldig‘i'}</span><strong>{money(paymentKind === 'deposit' ? depositBalance : Number(selectedInstallment?.amount || 0) - Number(selectedInstallment?.paidAmount || 0))}</strong></div>
        <div className="payment-split-fields"><label>To‘lov usullari bo‘yicha summa va sana</label><div className="payment-method-rows">{Object.entries(methods).map(([partMethod, label]) => <div className="payment-method-row" key={partMethod}><Form.Item name={['paymentParts', partMethod]} label={label}><InputNumber min={0} precision={0} placeholder="Summa" formatter={(v) => String(v || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(v) => String(v || '').replace(/[^\d]/g, '')} /></Form.Item><Form.Item name={['paymentDates', partMethod]} label="To‘lov sanasi va vaqti" rules={Number(paymentParts[partMethod] || 0) > 0 ? [{ required: true, message: `${label} sanasini tanlang` }] : []}><DatePicker disabled={Number(paymentParts[partMethod] || 0) <= 0} showTime format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} /></Form.Item></div>)}</div><div className="selected-contract"><div><small>Jami to‘lov</small><b>{money(partsTotal)}</b></div><div><small>Maksimal</small><b>{money(paymentKind === 'deposit' ? depositBalance : Number(selectedInstallment?.amount || 0) - Number(selectedInstallment?.paidAmount || 0))}</b></div></div></div>
        <Form.Item name="payerType" label="To‘lovni kim qildi?" rules={[{ required: true, whitespace: true, message: 'To‘lovchini kiriting' }]}><Input maxLength={150} placeholder="Masalan: otasi" /></Form.Item>
        <Form.Item name="note" label="Izoh"><Input placeholder="Ixtiyoriy" /></Form.Item>
        <div className="payment-modal-actions"><Button onClick={() => setPaymentOpen(false)}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={creating || creatingDeposit}>To‘lovni tasdiqlash</Button></div>
      </Form>
    </Modal>
  </div>
}
