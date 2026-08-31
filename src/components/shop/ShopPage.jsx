import { useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Segmented, Select } from 'antd'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import { EmployeeAttendanceTab } from '../attendance/EmployeeAttendanceTab'
import { EmployeesPage } from '../employees/EmployeesPage'
import { SalariesPage } from '../salaries/SalariesPage'
import {
  apiErrorMessage,
  useCreateShopTransactionMutation,
  useDeleteShopTransactionMutation,
  useGetShopOverviewQuery,
  useGetShopTransactionsQuery,
  useUpdateShopTransactionMutation,
} from '../../store/baseApi'
import './ShopPage.css'

const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const methods = { cash: 'Naqd', card: 'Karta', click: 'Click', bank: 'Bank' }
const tabs = [{ key: 'income', label: 'Kirim' }, { key: 'expense', label: 'Chiqim' }, { key: 'balance', label: 'Balans' }, { key: 'employees', label: 'Xodimlar' }]

function ShopOverviewCards() {
  const { data, isLoading, error } = useGetShopOverviewQuery()
  const overview = data?.allTime || {}
  const value = (amount) => isLoading ? 'Hisoblanmoqda…' : money(amount)
  return <section className="shop-overview-cards" aria-label="Do‘konning asosiy hisoblari">
    <article className="income"><div className="shop-overview-icon">↗</div><div><small>Jami kirim</small><strong>{value(overview.income)}</strong><span>Do‘konga tushgan pullar</span></div></article>
    <article className="expense"><div className="shop-overview-icon">↘</div><div><small>Jami chiqim</small><strong>{value(overview.expenses)}</strong><span>Do‘kon xarajatlari</span></div></article>
    <article className="salary"><div className="shop-overview-icon">₸</div><div><small>Berilgan oylik</small><strong>{value(overview.salaries)}</strong><span>Do‘kon xodimlariga</span></div></article>
    <article className={Number(overview.balance || 0) < 0 ? 'balance negative' : 'balance'}><div className="shop-overview-icon">Σ</div><div><small>Sof balans</small><strong>{value(overview.balance)}</strong><span>Kirim − chiqim − oylik</span></div></article>
    {error && <div className="shop-overview-error">Hisoblarni yuklab bo‘lmadi</div>}
  </section>
}

function TransactionModal({ type, transaction, categories, onClose }) {
  const [form] = Form.useForm()
  const [createTransaction, { isLoading: creating }] = useCreateShopTransactionMutation()
  const [updateTransaction, { isLoading: updating }] = useUpdateShopTransactionMutation()
  const isExpense = type === 'expense'
  const submit = async (values) => {
    try {
      const payload = {
        type,
        title: isExpense ? values.title?.trim() : values.title?.trim() || 'Do‘kon kirimi',
        amount: Number(values.amount),
        paymentType: values.paymentType,
        category: isExpense ? (Array.isArray(values.category) ? values.category[0] : values.category) : '',
        occurredAt: values.occurredAt.toISOString(),
        note: values.note?.trim() || '',
      }
      if (transaction) await updateTransaction({ id: transaction.id, ...payload }).unwrap()
      else await createTransaction(payload).unwrap()
      toast.success(isExpense ? 'Do‘kon chiqimi saqlandi' : 'Do‘kon kirimi saqlandi')
      onClose()
    } catch (error) { toast.error(apiErrorMessage(error)) }
  }
  const initialValues = transaction ? {
    title: transaction.title,
    amount: transaction.amount,
    paymentType: transaction.paymentType,
    category: transaction.category ? [transaction.category] : [],
    occurredAt: dayjs(transaction.occurredAt),
    note: transaction.note,
  } : { paymentType: 'cash', occurredAt: dayjs(), category: [] }
  return <Modal open onCancel={onClose} footer={null} destroyOnHidden title={transaction ? 'Operatsiyani tahrirlash' : isExpense ? 'Yangi chiqim' : 'Yangi kirim'} rootClassName="shop-modal">
    <Form form={form} layout="vertical" initialValues={initialValues} onFinish={submit} requiredMark={false}>
      {isExpense && <Form.Item name="title" label="Xarajat" rules={[{ required: true, whitespace: true, message: 'Xarajat nomini kiriting' }]}><Input maxLength={180} placeholder="Masalan: mahsulot xaridi" /></Form.Item>}
      {!isExpense && <Form.Item name="title" label="Kirim izohi"><Input maxLength={180} placeholder="Masalan: kunlik savdo" /></Form.Item>}
      <Form.Item name="amount" label="Summa" rules={[{ required: true, type: 'number', min: 1, message: 'Summani kiriting' }]}><InputNumber min={1} precision={0} addonAfter="so‘m" style={{ width: '100%' }} formatter={(value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(value) => String(value || '').replace(/[^\d]/g, '')} /></Form.Item>
      {isExpense && <Form.Item name="category" label="Kategoriya" rules={[{ required: true, message: 'Kategoriyani tanlang yoki kiriting' }]}><Select mode="tags" maxCount={1} tokenSeparators={[',']} placeholder="Tanlang yoki yangi kategoriya yozing" options={categories.map((value) => ({ value, label: value }))} /></Form.Item>}
      <Form.Item name="paymentType" label="Pul turi" rules={[{ required: true }]}><Segmented className={`shop-payment-methods ${isExpense ? 'expense' : 'income'}`} block options={Object.entries(methods).map(([value, label]) => ({ value, label }))} /></Form.Item>
      <Form.Item name="occurredAt" label="Sana va vaqt" rules={[{ required: true }]}><DatePicker showTime format="DD.MM.YYYY HH:mm" allowClear={false} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="note" label="Qo‘shimcha izoh"><Input.TextArea rows={3} maxLength={1000} /></Form.Item>
      <div className="shop-modal-actions"><Button onClick={onClose}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={creating || updating}>Saqlash</Button></div>
    </Form>
  </Modal>
}

function TransactionsTab({ type, currentEmployee }) {
  const { data, isLoading, error } = useGetShopTransactionsQuery({ type })
  const { data: overview } = useGetShopOverviewQuery()
  const [deleteTransaction, { isLoading: deleting }] = useDeleteShopTransactionMutation()
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const isExpense = type === 'expense'
  const canManage = ['manager', 'owner', 'admin'].includes(currentEmployee?.role)
  const remove = async (id) => {
    try { await deleteTransaction(id).unwrap(); toast.success('Operatsiya o‘chirildi') } catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }
  const transactions = data?.transactions || []
  return <section className="shop-card">
    <div className="shop-card-toolbar"><div><h2>{isExpense ? 'Do‘kon chiqimlari' : 'Do‘kon kirimlari'}</h2><p>{isExpense ? 'Xarajatlar va kategoriyalar tarixi' : 'Do‘konga tushgan pullar tarixi'}</p></div>{canManage && <button onClick={() => { setEditing(null); setModalOpen(true) }}>+ {isExpense ? 'Chiqim' : 'Kirim'}</button>}</div>
    {error ? <div className="form-error">{apiErrorMessage(error)}</div> : isLoading ? <div className="shop-state">Yuklanmoqda…</div> : <div className="shop-table-wrap"><table><thead><tr><th>Sana</th><th>{isExpense ? 'Xarajat' : 'Kirim'}</th>{isExpense && <th>Kategoriya</th>}<th>Pul turi</th><th>Summa</th><th>Kiritgan</th><th>Amal</th></tr></thead><tbody>
      {transactions.map((item) => <tr key={item.id}><td data-label="Sana"><strong>{dayjs(item.occurredAt).format('DD.MM.YYYY')}</strong><small>{dayjs(item.occurredAt).format('HH:mm')}</small></td><td data-label={isExpense ? 'Xarajat' : 'Kirim'}><strong>{item.title || 'Do‘kon kirimi'}</strong><small>{item.note || ''}</small></td>{isExpense && <td data-label="Kategoriya"><span className="shop-category">{item.category}</span></td>}<td data-label="Pul turi"><span className={`shop-method ${item.paymentType}`}>{methods[item.paymentType]}</span></td><td data-label="Summa"><b className={isExpense ? 'shop-out' : 'shop-in'}>{isExpense ? '− ' : '+ '}{money(item.amount)}</b></td><td data-label="Kiritgan">{item.createdBy ? `${item.createdBy.firstname} ${item.createdBy.lastname}` : '—'}</td><td data-label="Amal">{canManage ? <div className="shop-row-actions"><button onClick={() => { setEditing(item); setModalOpen(true) }}>Tahrirlash</button><Popconfirm title="Operatsiya o‘chirilsinmi?" okText="O‘chirish" cancelText="Yo‘q" onConfirm={() => remove(item.id)}><button className="danger" disabled={deleting}>O‘chirish</button></Popconfirm></div> : '—'}</td></tr>)}
      {!transactions.length && <tr><td colSpan={isExpense ? 7 : 6} className="shop-state">Hali operatsiya kiritilmagan</td></tr>}
    </tbody></table></div>}
    {modalOpen && <TransactionModal type={type} transaction={editing} categories={overview?.categories || []} onClose={() => { setModalOpen(false); setEditing(null) }} />}
  </section>
}

function BalanceTab() {
  const [period, setPeriod] = useState(dayjs())
  const { data, isLoading, error } = useGetShopOverviewQuery(period.format('YYYY-MM'))
  const all = data?.allTime || {}; const month = data?.month || {}
  return <div className="shop-balance-page">
    <section className="shop-balance-toolbar"><div><h2>Do‘kon balansi</h2><p>Asosiy hostel dashboardidan mustaqil hisob</p></div><DatePicker picker="month" allowClear={false} value={period} format="MMMM YYYY" onChange={(value) => value && setPeriod(value)} /></section>
    {error ? <div className="form-error">{apiErrorMessage(error)}</div> : isLoading ? <div className="shop-state">Balans hisoblanmoqda…</div> : <>
      <section className="shop-method-card"><h3>Pul turlari bo‘yicha balans</h3><div>{Object.entries(methods).map(([key, label]) => <article key={key}><span>{label}</span><strong className={Number(all.methods?.[key] || 0) < 0 ? 'negative-text' : ''}>{money(all.methods?.[key])}</strong></article>)}</div></section>
      <section className="shop-month-card"><h3>{period.format('MMMM YYYY')}</h3><div><span>Kirim <b>{money(month.income)}</b></span><span>Chiqim <b>{money(month.expenses)}</b></span><span>Oylik to‘lovi <b>{money(month.salaries)}</b></span><span>Oy balansi <b>{money(month.balance)}</b></span></div></section>
    </>}
  </div>
}

function ShopEmployees({ currentEmployee }) {
  const [tab, setTab] = useState('list')
  return <div className="shop-employees"><nav><button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>Ro‘yxat</button><button className={tab === 'attendance' ? 'active' : ''} onClick={() => setTab('attendance')}>FaceID davomat</button><button className={tab === 'salary' ? 'active' : ''} onClick={() => setTab('salary')}>Oyliklar</button></nav>{tab === 'list' ? <EmployeesPage currentEmployee={currentEmployee} businessUnit="shop" /> : tab === 'attendance' ? <EmployeeAttendanceTab businessUnit="shop" /> : <SalariesPage currentEmployee={currentEmployee} businessUnit="shop" />}</div>
}

export function ShopPage({ currentEmployee }) {
  const [active, setActive] = useState('income')
  return <div className="shop-page"><section className="shop-hero"><div><small>ALOHIDA MOLIYA</small><h1>Do‘kon boshqaruvi</h1><p>Kirim, chiqim, balans va xodimlar hisobi hostel kassasidan mustaqil.</p></div></section><ShopOverviewCards /><nav className="shop-tabs">{tabs.map((tab) => <button key={tab.key} className={active === tab.key ? 'active' : ''} onClick={() => setActive(tab.key)}>{tab.label}</button>)}</nav>{active === 'income' ? <TransactionsTab type="income" currentEmployee={currentEmployee} /> : active === 'expense' ? <TransactionsTab type="expense" currentEmployee={currentEmployee} /> : active === 'balance' ? <BalanceTab /> : <ShopEmployees currentEmployee={currentEmployee} />}</div>
}
