import { useMemo, useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Segmented } from 'antd'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import { apiErrorMessage, useCreateEmployeeBonusMutation, useCreateSalaryPaymentMutation, useDeleteEmployeeBonusMutation, useDeleteSalaryPaymentMutation, useGetSalariesQuery } from '../../store/baseApi'
import './Salaries.css'
import './SalariesExtra.css'
import { canEditOrDelete } from '../../utils/permissions'

const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const fullName = (employee) => `${employee?.firstname || ''} ${employee?.lastname || ''}`.trim()
const paymentLabels = { cash: 'Naqd', card: 'Karta', bank: 'Bank' }

export function SalariesPage({ currentEmployee, businessUnit = 'hostel' }) {
  const [form] = Form.useForm()
  const [bonusForm] = Form.useForm()
  const [period, setPeriod] = useState(() => dayjs())
  const [selected, setSelected] = useState(null)
  const [historyRow, setHistoryRow] = useState(null)
  const [bonusRow, setBonusRow] = useState(null)
  const [query, setQuery] = useState('')
  const { data, isLoading, isFetching, error } = useGetSalariesQuery({ period: period.format('YYYY-MM'), businessUnit })
  const [createPayment, { isLoading: saving }] = useCreateSalaryPaymentMutation()
  const [deletePayment] = useDeleteSalaryPaymentMutation()
  const [createBonus, { isLoading: savingBonus }] = useCreateEmployeeBonusMutation()
  const [deleteBonus] = useDeleteEmployeeBonusMutation()
  const canManage = canEditOrDelete(currentEmployee)
  const canCreateFinancial = currentEmployee?.role === 'owner'
  const rows = useMemo(() => {
    const value = query.trim().toLowerCase()
    return (data?.rows || []).filter((row) => !value || `${fullName(row.employee)} ${row.employee.position}`.toLowerCase().includes(value))
  }, [data?.rows, query])

  const openPayment = (row) => {
    setSelected(row)
    form.setFieldsValue({ amount: Math.max(0, row.currentBalance), paymentType: 'cash', note: '' })
  }
  const closePayment = () => { setSelected(null); form.resetFields() }
  const submit = async (values) => {
    try {
      await createPayment({ businessUnit, employeeId: selected.employee.id, period: period.format('YYYY-MM'), amount: Number(values.amount), paymentType: values.paymentType, note: values.note?.trim() || '' }).unwrap()
      toast.success('Oylik to‘lovi saqlandi')
      closePayment()
    } catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }
  const remove = async (id) => {
    try { await deletePayment({ id, businessUnit }).unwrap(); toast.success('To‘lov o‘chirildi') } catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }
  const openBonus = (row) => {
    setBonusRow(row)
    bonusForm.setFieldsValue({ amount: null, reason: '' })
  }
  const closeBonus = () => { setBonusRow(null); bonusForm.resetFields() }
  const submitBonus = async (values) => {
    try {
      await createBonus({ businessUnit, employeeId: bonusRow.employee.id, period: period.format('YYYY-MM'), amount: Number(values.amount), reason: values.reason?.trim() }).unwrap()
      toast.success('Bonus oylik hisobiga qo‘shildi')
      closeBonus()
    } catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }
  const removeBonus = async (id) => {
    try { await deleteBonus({ id, businessUnit }).unwrap(); toast.success('Bonus o‘chirildi') } catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }
  const totals = data?.totals || {}

  return <div className="salaries-page">
    <section className="salary-summary">
      <article><small>Bazaviy oylik</small><strong>{money(totals.baseSalary)}</strong><span>belgilangan oyliklar</span></article>
      <article className="bonus"><small>Bonuslar</small><strong>{money(totals.bonuses)}</strong><span>shu oy qo‘shildi</span></article>
      <article className="penalty"><small>Jarimalar</small><strong>{money(totals.deductions)}</strong><span>kechikish, erta ketish, yo‘qlik</span></article>
      <article><small>Sof oylik fondi</small><strong>{money(totals.salary)}</strong><span>oylik + bonus − jarima</span></article>
      <article className="paid"><small>Berildi</small><strong>{money(totals.paid)}</strong><span>shu oy to‘langan</span></article>
      <article className="owed"><small>Xodimlar haqdor</small><strong>{money(totals.receivable)}</strong><span>berilishi kerak</span></article>
      <article className="advance"><small>Xodimlar qarzdor</small><strong>{money(totals.debt)}</strong><span>ortiqcha/avans</span></article>
    </section>
    <section className="salary-card">
      <div className="salary-tools"><div><h2>{businessUnit === 'shop' ? 'Do‘kon xodimlari oyligi' : 'Xodimlar oyligi'}</h2><p>Oylik, oldingi qoldiq va joriy hisob holati</p></div><div className="salary-filters"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Xodim yoki lavozim" /><DatePicker picker="month" allowClear={false} value={period} format="MMMM YYYY" onChange={(value) => value && setPeriod(value)} /></div></div>
      {error && <div className="form-error">{apiErrorMessage(error)}</div>}
      {isLoading ? <div className="salary-empty">Oylik ma’lumotlari yuklanmoqda…</div> : <div className={`salary-table-wrap ${isFetching ? 'refreshing' : ''}`}><table className="salary-table salary-table-small"><thead><tr><th>Xodim</th><th>Hisoblangan oylik</th><th>Oldingi qoldiq</th><th>Shu oy berildi</th><th>Joriy qoldiq</th><th>Holat</th><th>Amal</th></tr></thead><tbody>{rows.map((row) => <tr key={row.employee.id}><td data-label="Xodim"><strong>{fullName(row.employee)}</strong><small>{row.employee.position}</small></td><td data-label="Oyligi"><b>{money(row.salary)}</b><small>Bazaviy: {money(row.baseSalary)} · Bonus: {money(row.bonusAmount)} · Jarima: {money(row.payroll?.deductions?.totalDeduction)}</small></td><td data-label="Oldingi qoldiq"><span className={row.previousBalance > 0 ? 'positive' : row.previousBalance < 0 ? 'negative' : ''}>{money(Math.abs(row.previousBalance))}{row.previousBalance !== 0 && <small>{row.previousBalance > 0 ? 'haqdor' : 'qarzdor'}</small>}</span></td><td data-label="Berildi"><b>{money(row.paidThisMonth)}</b></td><td data-label="Joriy qoldiq"><b>{money(Math.abs(row.currentBalance))}</b></td><td data-label="Holat"><span className={`salary-status ${row.currentBalance > 0 ? 'owed' : row.currentBalance < 0 ? 'debt' : 'clear'}`}><small>{row.currentBalance > 0 ? 'Xodim haqdor' : row.currentBalance < 0 ? 'Xodim qarzdor' : 'Hisob yopilgan'}</small></span></td><td data-label="Amal"><div className="salary-actions"><button className="history-link" onClick={() => setHistoryRow(row)} aria-label="Hisob va to‘lovlar tarixini ko‘rish" title="Hisob va to‘lovlar tarixi"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 4v4h4M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>{row.payments.length + row.bonuses.length > 0 && <span>{row.payments.length + row.bonuses.length}</span>}</button>{canCreateFinancial && <><button className="bonus-button" onClick={() => openBonus(row)}>+ Bonus</button><button className="pay-button" onClick={() => openPayment(row)}>Oylik berish</button></>}</div></td></tr>)}{!rows.length && <tr><td colSpan={7} className="salary-empty">Xodim topilmadi</td></tr>}</tbody></table></div>}
    </section>
    <Modal open={Boolean(selected)} onCancel={closePayment} footer={null} title={selected ? `${fullName(selected.employee)}ga oylik berish` : ''} rootClassName="salary-modal" destroyOnHidden>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
        <div className="payment-balance"><span>Joriy haqdorlik</span><strong>{money(Math.max(0, selected?.currentBalance || 0))}</strong></div>
        <Form.Item name="amount" label="Beriladigan summa" rules={[{ required: true, message: 'Summani kiriting' }]}><InputNumber min={1} precision={0} addonAfter="so‘m" style={{ width: '100%' }} formatter={(value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(value) => String(value || '').replace(/[^\d]/g, '')} /></Form.Item>
        <Form.Item name="paymentType" label="To‘lov turi"><Segmented className="salary-payment-types" block options={[{ value: 'cash', label: 'Naqd' }, { value: 'card', label: 'Karta' }, { value: 'bank', label: 'Bank' }]} /></Form.Item>
        <Form.Item name="note" label="Izoh"><Input.TextArea rows={3} maxLength={500} /></Form.Item>
        <div className="salary-modal-actions"><Button onClick={closePayment}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={saving}>To‘lovni saqlash</Button></div>
      </Form>
    </Modal>
    <Modal open={Boolean(bonusRow)} onCancel={closeBonus} footer={null} title={bonusRow ? `${fullName(bonusRow.employee)}ga bonus berish` : ''} rootClassName="salary-modal" destroyOnHidden>
      <Form form={bonusForm} layout="vertical" requiredMark={false} onFinish={submitBonus}>
        <div className="bonus-balance"><span>Tanlangan davr</span><strong>{period.format('MMMM YYYY')}</strong></div>
        <Form.Item name="amount" label="Bonus summasi" rules={[{ required: true, message: 'Bonus summasini kiriting' }]}><InputNumber min={1} precision={0} addonAfter="so‘m" style={{ width: '100%' }} formatter={(value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(value) => String(value || '').replace(/[^\d]/g, '')} /></Form.Item>
        <Form.Item name="reason" label="Bonus sababi" rules={[{ required: true, whitespace: true, message: 'Bonus sababini kiriting' }]}><Input.TextArea rows={3} maxLength={500} placeholder="Masalan: yaxshi natija, qo‘shimcha smena" /></Form.Item>
        <div className="salary-modal-actions"><Button onClick={closeBonus}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={savingBonus}>Bonusni saqlash</Button></div>
      </Form>
    </Modal>
    <Modal open={Boolean(historyRow)} onCancel={() => setHistoryRow(null)} footer={null} width={820} title={historyRow ? `${fullName(historyRow.employee)} — ${period.format('MMMM YYYY')} tarixi` : ''} rootClassName="salary-history-modal">
      <div className="salary-payroll-breakdown"><span>Bazaviy oylik<b>{money(historyRow?.baseSalary)}</b></span><span>Kelgan / kelmagan<b>{historyRow?.payroll?.presentDays || 0} / {historyRow?.payroll?.absentDays || 0} kun</b></span><span>Kechikish / erta ketish<b>{historyRow?.payroll?.totalLateMinutes || 0} / {historyRow?.payroll?.totalEarlyLeaveMinutes || 0} daq.</b></span><span>Jami jarima<b>{money(historyRow?.payroll?.deductions?.totalDeduction)}</b></span><span>Bonus<b>{money(historyRow?.bonusAmount)}</b></span><span>Sof oylik<b>{money(historyRow?.salary)}</b></span></div>
      <div className="salary-history"><div className="salary-history-table-wrap"><table><thead><tr><th>Sana va vaqt</th><th>Summa</th><th>To‘lov turi</th><th>Izoh</th><th>Kiritgan xodim</th>{canManage && <th>Amal</th>}</tr></thead><tbody>{(historyRow?.payments || []).map((payment) => <tr key={payment.id}><td>{dayjs(payment.createdAt).format('DD.MM.YYYY HH:mm')}</td><td><b>{money(payment.amount)}</b></td><td><span className={`salary-payment-method ${payment.paymentType}`}>{paymentLabels[payment.paymentType]}</span></td><td>{payment.note || '—'}</td><td>{fullName(payment.createdBy) || '—'}</td>{canManage && <td><Popconfirm title="To‘lov o‘chirilsinmi?" okText="O‘chirish" cancelText="Bekor" onConfirm={() => remove(payment.id)}><button>O‘chirish</button></Popconfirm></td>}</tr>)}{!historyRow?.payments?.length && <tr><td colSpan={canManage ? 6 : 5} className="salary-history-empty">Bu oyda to‘lov qilinmagan.</td></tr>}</tbody></table></div></div>
      <h3 className="salary-history-title">Bonuslar</h3>
      <div className="salary-history"><div className="salary-history-table-wrap"><table><thead><tr><th>Sana va vaqt</th><th>Summa</th><th>Sabab</th><th>Kiritgan xodim</th>{canManage && <th>Amal</th>}</tr></thead><tbody>{(historyRow?.bonuses || []).map((bonus) => <tr key={bonus.id}><td>{dayjs(bonus.createdAt).format('DD.MM.YYYY HH:mm')}</td><td><b className="bonus-money">+ {money(bonus.amount)}</b></td><td>{bonus.reason}</td><td>{fullName(bonus.createdBy) || '—'}</td>{canManage && <td><Popconfirm title="Bonus o‘chirilsinmi?" okText="O‘chirish" cancelText="Bekor" onConfirm={() => removeBonus(bonus.id)}><button>O‘chirish</button></Popconfirm></td>}</tr>)}{!historyRow?.bonuses?.length && <tr><td colSpan={canManage ? 5 : 4} className="salary-history-empty">Bu oyda bonus berilmagan.</td></tr>}</tbody></table></div></div>
    </Modal>
  </div>
}
