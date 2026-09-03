import { useState } from 'react'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
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
} from '../../store/baseApi'
import './ShopPage.css'

const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const methods = { cash: 'Naqd', card: 'Karta', click: 'Click', bank: 'Bank' }
const incomeSources = { sales: 'Kunlik savdo', director: 'Investitsiya' }
const tabs = [{ key: 'income', label: 'Kirim' }, { key: 'expense', label: 'Chiqim' }, { key: 'employees', label: 'Xodimlar' }]
const emptyPaymentParts = () => Object.fromEntries(Object.keys(methods).map((method) => [method, 0]))

function groupShopTransactions(transactions = []) {
  const groups = new Map()
  transactions.forEach((transaction) => {
    const createdBy = transaction.createdBy?.id || transaction.createdBy?._id || transaction.createdBy || ''
    const key = transaction.paymentGroup || `legacy:${transaction.type}:${transaction.occurredAt}:${transaction.title || ''}:${transaction.incomeSource || ''}:${transaction.category || ''}:${transaction.note || ''}:${createdBy}`
    if (!groups.has(key)) groups.set(key, { ...transaction, id: transaction.paymentGroup ? `group-${transaction.paymentGroup}` : transaction.id, sourceIds: [], breakdown: [], amount: 0, isGrouped: Boolean(transaction.paymentGroup) })
    const group = groups.get(key)
    group.sourceIds.push(transaction.id)
    group.amount += Number(transaction.amount || 0)
    group.breakdown.push({ paymentType: transaction.paymentType, amount: transaction.amount })
  })
  return [...groups.values()].map((group) => ({ ...group, isGrouped: group.isGrouped || group.sourceIds.length > 1 })).sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt) || new Date(b.createdAt) - new Date(a.createdAt))
}

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
  const [deleteTransaction, { isLoading: deleting }] = useDeleteShopTransactionMutation()
  const isExpense = type === 'expense'
  const submit = async (values) => {
    try {
      const paymentParts = Object.fromEntries(Object.keys(methods).map((method) => [method, Number(values.paymentParts?.[method] || 0)]))
      const payload = {
        type,
        title: isExpense ? values.title?.trim() : values.title?.trim() || 'Do‘kon kirimi',
        incomeSource: isExpense ? undefined : values.incomeSource,
        amount: Number(values.amount),
        paymentType: Object.entries(paymentParts).find(([, amount]) => amount > 0)?.[0] || 'cash',
        paymentParts,
        category: isExpense ? (Array.isArray(values.category) ? values.category[0] : values.category) : '',
        occurredAt: values.occurredAt.toISOString(),
        note: values.note?.trim() || '',
      }
      if (transaction) {
        await Promise.all((transaction.sourceIds || [transaction.id]).map((id) => deleteTransaction(id).unwrap()))
        await createTransaction(payload).unwrap()
      } else await createTransaction(payload).unwrap()
      toast.success(isExpense ? 'Do‘kon chiqimi saqlandi' : 'Do‘kon kirimi saqlandi')
      onClose()
    } catch (error) { toast.error(apiErrorMessage(error)) }
  }
  const initialValues = transaction ? {
    title: transaction.title,
    incomeSource: transaction.incomeSource || 'sales',
    amount: transaction.amount,
    paymentType: transaction.paymentType,
    paymentParts: transaction.breakdown?.length ? { ...emptyPaymentParts(), ...Object.fromEntries(transaction.breakdown.map((part) => [part.paymentType, part.amount])) } : { ...emptyPaymentParts(), [transaction.paymentType]: transaction.amount },
    category: transaction.category ? [transaction.category] : [],
    occurredAt: dayjs(transaction.occurredAt),
    note: transaction.note,
  } : { incomeSource: 'sales', paymentType: 'cash', paymentParts: emptyPaymentParts(), occurredAt: dayjs(), category: [] }
  return <Modal open onCancel={onClose} footer={null} destroyOnHidden title={transaction ? 'Operatsiyani tahrirlash' : isExpense ? 'Yangi chiqim' : 'Yangi kirim'} rootClassName="shop-modal">
    <Form form={form} layout="vertical" initialValues={initialValues} onFinish={submit} requiredMark={false}>
      {isExpense && <Form.Item name="title" label="Xarajat" rules={[{ required: true, whitespace: true, message: 'Xarajat nomini kiriting' }]}><Input maxLength={180} placeholder="Masalan: mahsulot xaridi" /></Form.Item>}
      {!isExpense && <Form.Item name="incomeSource" label="Kirim turi" rules={[{ required: true, message: 'Kirim turini tanlang' }]}><Segmented className="shop-income-source-segment" block options={Object.entries(incomeSources).map(([value, label]) => ({ value, label }))} /></Form.Item>}
      {!isExpense && <Form.Item name="title" label="Kirim izohi"><Input maxLength={180} placeholder="Masalan: kunlik savdo" /></Form.Item>}
      <Form.Item name="amount" label="Summa" rules={[{ required: true, type: 'number', min: 1, message: 'Summani kiriting' }]}><InputNumber min={1} precision={0} addonAfter="so‘m" style={{ width: '100%' }} formatter={(value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(value) => String(value || '').replace(/[^\d]/g, '')} /></Form.Item>
      {isExpense && <Form.Item name="category" label="Kategoriya" rules={[{ required: true, message: 'Kategoriyani tanlang yoki kiriting' }]}><Select mode="tags" maxCount={1} tokenSeparators={[',']} placeholder="Tanlang yoki yangi kategoriya yozing" options={categories.map((value) => ({ value, label: value }))} /></Form.Item>}
      <>
        <div className="shop-payment-split-label">To‘lov usullari</div>
        <div className="shop-payment-split">{Object.entries(methods).map(([value, label]) => <Form.Item key={value} name={['paymentParts', value]} label={label}><InputNumber min={0} precision={0} addonAfter="so‘m" style={{ width: '100%' }} formatter={(inputValue) => String(inputValue || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(inputValue) => String(inputValue || '').replace(/[^\d]/g, '')} /></Form.Item>)}</div>
        <Form.Item shouldUpdate noStyle>{() => {
          const total = Object.values(form.getFieldValue('paymentParts') || {}).reduce((sum, value) => sum + (Number(value) || 0), 0)
          const amount = Number(form.getFieldValue('amount') || 0)
          const mismatch = amount > 0 && total !== amount
          return <div className={`shop-payment-split-summary ${mismatch ? 'mismatch' : 'matched'}`}><span>To‘lovlar jami: <strong>{money(total)}</strong></span><span>Umumiy summa: {money(amount)}</span></div>
        }}</Form.Item>
        <Form.Item name="paymentPartsValidation" dependencies={['amount', 'paymentParts']} rules={[{ validator: () => {
          const total = Object.values(form.getFieldValue('paymentParts') || {}).reduce((sum, value) => sum + (Number(value) || 0), 0)
          const amount = Number(form.getFieldValue('amount') || 0)
          if (total <= 0) return Promise.reject(new Error('Kamida bitta to‘lov usuliga summa kiriting'))
          return total === amount ? Promise.resolve() : Promise.reject(new Error('To‘lov usullari yig‘indisi umumiy summaga teng bo‘lishi kerak'))
        } }]}><Input type="hidden" /></Form.Item>
      </>
      <Form.Item name="occurredAt" label="Sana va vaqt" rules={[{ required: true }]}><DatePicker showTime format="DD.MM.YYYY HH:mm" allowClear={false} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="note" label="Qo‘shimcha izoh"><Input.TextArea rows={3} maxLength={1000} /></Form.Item>
      <div className="shop-modal-actions"><Button onClick={onClose}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={creating || deleting}>Saqlash</Button></div>
    </Form>
  </Modal>
}

function TransactionsTab({ type, currentEmployee }) {
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [incomeSourceFilter, setIncomeSourceFilter] = useState('')
  const [page, setPage] = useState(1)
  const isExpense = type === 'expense'
  const { data, isLoading, error } = useGetShopTransactionsQuery({ type, ...(isExpense || !incomeSourceFilter ? {} : { incomeSource: incomeSourceFilter }) })
  const { data: overview } = useGetShopOverviewQuery()
  const [deleteTransaction, { isLoading: deleting }] = useDeleteShopTransactionMutation()
  const canManage = ['manager', 'owner', 'admin'].includes(currentEmployee?.role)
  const remove = async (item) => {
    try {
      await Promise.all((item.sourceIds || [item.id]).map((id) => deleteTransaction(id).unwrap()))
      toast.success('Operatsiya o‘chirildi')
    } catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }
  const transactions = groupShopTransactions(data?.transactions || [])
  const totalAmount = transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const pageSize = 25
  const pageCount = Math.max(1, Math.ceil(transactions.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visibleTransactions = transactions.slice((safePage - 1) * pageSize, safePage * pageSize)
  return <section className="shop-card">
    <div className="shop-card-toolbar"><div><h2>{isExpense ? 'Do‘kon chiqimlari' : 'Do‘kon kirimlari'}</h2><p>{isExpense ? 'Xarajatlar va kategoriyalar tarixi' : 'Kunlik savdo va direktor bergan pullar tarixi'}</p></div><div className="shop-toolbar-actions">{!isExpense && <Select value={incomeSourceFilter} onChange={(value) => { setIncomeSourceFilter(value); setPage(1) }} style={{ width: 210 }} options={[{ value: '', label: 'Barcha kirimlar' }, ...Object.entries(incomeSources).map(([value, label]) => ({ value, label }))]} />}{canManage && <button onClick={() => { setEditing(null); setModalOpen(true) }}>+ {isExpense ? 'Chiqim' : 'Kirim'}</button>}</div></div>
    {!isExpense && <div className="shop-filter-total"><span>{incomeSourceFilter ? incomeSources[incomeSourceFilter] : 'Barcha kirimlar'} jami</span><strong>{money(totalAmount)}</strong></div>}
    {error ? <div className="form-error">{apiErrorMessage(error)}</div> : isLoading ? <div className="shop-state">Yuklanmoqda…</div> : <div className="shop-table-wrap"><table><thead><tr><th>Sana</th><th>{isExpense ? 'Xarajat' : 'Kirim'}</th>{!isExpense && <th>Kirim turi</th>}{isExpense && <th>Kategoriya</th>}<th>Pul turi</th><th>Summa</th><th>Kiritgan</th><th>Amal</th></tr></thead><tbody>
      {visibleTransactions.map((item) => <tr key={item.id}><td data-label="Sana"><strong>{dayjs(item.occurredAt).format('DD.MM.YYYY')}</strong><small>{dayjs(item.occurredAt).format('HH:mm')}</small></td><td data-label={isExpense ? 'Xarajat' : 'Kirim'}><strong>{item.title || 'Do‘kon kirimi'}</strong><small>{item.note || ''}</small></td>{!isExpense && <td data-label="Kirim turi"><span className={`shop-income-source ${item.incomeSource || 'sales'}`}>{incomeSources[item.incomeSource] || incomeSources.sales}</span></td>}{isExpense && <td data-label="Kategoriya"><span className="shop-category">{item.category}</span></td>}<td data-label="Pul turi"><div className="shop-method-breakdown">{item.breakdown?.map((part) => <span className={`shop-method ${part.paymentType}`} key={part.paymentType}>{methods[part.paymentType]} · {money(part.amount)}</span>)}</div></td><td data-label="Summa"><b className={isExpense ? 'shop-out' : 'shop-in'}>{isExpense ? '− ' : '+ '}{money(item.amount)}</b></td><td data-label="Kiritgan">{item.createdBy ? `${item.createdBy.firstname} ${item.createdBy.lastname}` : '—'}</td><td data-label="Amal">{canManage ? <div className="shop-row-actions"><button className="icon" onClick={() => { setEditing(item); setModalOpen(true) }} aria-label="Tahrirlash" title="Tahrirlash"><EditOutlined /></button><Popconfirm title="Operatsiya o‘chirilsinmi?" okText="O‘chirish" cancelText="Yo‘q" onConfirm={() => remove(item)}><button className="icon danger" disabled={deleting} aria-label="O‘chirish" title="O‘chirish"><DeleteOutlined /></button></Popconfirm></div> : '—'}</td></tr>)}
      {!transactions.length && <tr><td colSpan={isExpense ? 7 : 8} className="shop-state">Hali operatsiya kiritilmagan</td></tr>}
    </tbody></table>{transactions.length > pageSize && <div className="shop-pagination"><span>{transactions.length} ta yozuvdan {(safePage - 1) * pageSize + 1}-{Math.min(safePage * pageSize, transactions.length)} ko‘rsatilmoqda</span><div><button disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Oldingi</button><b>{safePage} / {pageCount}</b><button disabled={safePage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Keyingi</button></div></div>}</div>}
    {modalOpen && <TransactionModal type={type} transaction={editing} categories={overview?.categories || []} onClose={() => { setModalOpen(false); setEditing(null) }} />}
  </section>
}

function ShopEmployees({ currentEmployee }) {
  const [tab, setTab] = useState('list')
  return <div className="shop-employees"><nav><button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>Ro‘yxat</button><button className={tab === 'attendance' ? 'active' : ''} onClick={() => setTab('attendance')}>FaceID davomat</button><button className={tab === 'salary' ? 'active' : ''} onClick={() => setTab('salary')}>Oyliklar</button></nav>{tab === 'list' ? <EmployeesPage currentEmployee={currentEmployee} businessUnit="shop" /> : tab === 'attendance' ? <EmployeeAttendanceTab businessUnit="shop" /> : <SalariesPage currentEmployee={currentEmployee} businessUnit="shop" />}</div>
}

export function ShopPage({ currentEmployee }) {
  const [active, setActive] = useState('income')
  return <div className="shop-page"><section className="shop-hero"><div><small>ALOHIDA MOLIYA</small><h1>Do‘kon boshqaruvi</h1><p>Kirim, chiqim va xodimlar hisobi hostel kassasidan mustaqil.</p></div></section><ShopOverviewCards /><nav className="shop-tabs">{tabs.map((tab) => <button key={tab.key} className={active === tab.key ? 'active' : ''} onClick={() => setActive(tab.key)}>{tab.label}</button>)}</nav>{active === 'income' ? <TransactionsTab type="income" currentEmployee={currentEmployee} /> : active === 'expense' ? <TransactionsTab type="expense" currentEmployee={currentEmployee} /> : <ShopEmployees currentEmployee={currentEmployee} />}</div>
}
