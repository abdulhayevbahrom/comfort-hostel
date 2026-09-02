import { useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Popconfirm } from 'antd'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import { apiErrorMessage, useApproveCashSessionMutation, useCancelCashSessionMutation, useCloseCashSessionMutation, useGetCashSessionsQuery } from '../../store/baseApi'
import './Cash.css'
import './CashNotes.css'

const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const fullName = (employee) => `${employee?.firstname || ''} ${employee?.lastname || ''}`.trim() || '—'
const methodLabels = { cash: 'Naqd', card: 'Karta', online: 'Click', bank: 'Bank' }
const methodKeys = Object.keys(methodLabels)

export function CashPage({ currentEmployee }) {
  const [closeOpen, setCloseOpen] = useState(false)
  const [transferMethod, setTransferMethod] = useState('cash')
  const [selected, setSelected] = useState(null)
  const [contributorsSession, setContributorsSession] = useState(null)
  const [closeForm] = Form.useForm()
  const [approveForm] = Form.useForm()
  const closeAmount = Form.useWatch('amount', closeForm)
  const isCashier = currentEmployee?.role === 'cashier'
  const isHeadCashier = currentEmployee?.role === 'head_cashier'
  const isCashRole = isCashier || isHeadCashier
  const canReview = ['owner', 'admin'].includes(currentEmployee?.role)
  const { data, isLoading, error } = useGetCashSessionsQuery(undefined, { skip: !isCashRole && !canReview })
  const [closeCash, { isLoading: closing }] = useCloseCashSessionMutation()
  const [approveCash, { isLoading: approving }] = useApproveCashSessionMutation()
  const [cancelCash, { isLoading: cancelling }] = useCancelCashSessionMutation()

  const submitClose = async (values) => {
    try {
      await closeCash({ breakdown: { cash: 0, card: 0, online: 0, bank: 0, [transferMethod]: Number(values.amount) }, note: values.note?.trim() || '' }).unwrap()
      toast.success(isHeadCashier ? 'Mablag‘ owner tasdig‘iga yuborildi' : 'Mablag‘ bosh kassir tasdig‘iga yuborildi')
      setCloseOpen(false); closeForm.resetFields()
    } catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }

  const openApprove = (session) => {
    setSelected(session)
    approveForm.setFieldsValue({ receivedAmount: session.expectedAmount, reviewNote: '' })
  }

  const submitApprove = async (values) => {
    try {
      await approveCash({ id: selected.id, receivedAmount: Number(values.receivedAmount), reviewNote: values.reviewNote?.trim() || '' }).unwrap()
      toast.success(isHeadCashier ? 'Pul bosh kassir kassasiga qabul qilindi' : 'Pul qabul qilindi va markaziy kassaga o‘tkazildi')
      setSelected(null); approveForm.resetFields()
    } catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }
  const cancelRequest = async (id) => {
    try { await cancelCash(id).unwrap(); toast.success('Kassa topshirish so‘rovi bekor qilindi') }
    catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }

  if (!isCashRole && !canReview) return <div className="cash-loading">Bu bo‘lim faqat kassir, bosh kassir va owner uchun ochiq.</div>
  if (isLoading) return <div className="cash-loading">Kassa ma’lumotlari yuklanmoqda…</div>
  if (error) return <div className="form-error">{apiErrorMessage(error)}</div>

  return <div className="cash-page">
    {isCashRole ? <>
      <section className="cash-summary cashier-summary">
        <article><small>Ochiq kassada</small><strong>{money(data?.open?.balance)}</strong><Breakdown breakdown={data?.open?.breakdown} /></article>
        <article className="pending"><small>Tasdiqlanmagan summa</small><strong>{money(data?.pendingAmount)}</strong><span>{isHeadCashier ? 'Owner' : 'Bosh kassir'} qabul qilishi kutilmoqda</span></article>
      </section>
      <section className="cash-card cash-close-card"><div><h2>Mablag‘ni {isHeadCashier ? 'ownerga' : 'bosh kassirga'} topshirish</h2><p>Har safar bitta to‘lov turini to‘liq yoki qisman topshiring.</p></div><Button type="primary" disabled={!data?.open?.balance} onClick={() => { const firstMethod = methodKeys.find((key) => Number(data?.open?.breakdown?.[key] || 0) > 0) || 'cash'; setTransferMethod(firstMethod); closeForm.setFieldsValue({ amount: null, note: '' }); setCloseOpen(true) }}>Pul topshirish</Button></section>
      {isHeadCashier && <section className="cash-card"><div className="cash-card-title"><h2>Kassirlardan qabul qilish</h2><p>Kassir topshirgan mablag‘ni tekshirib, bosh kassir kassasiga oling.</p></div><CashTable sessions={data?.pendingSessions || []} onApprove={openApprove} onCancel={cancelRequest} onContributors={setContributorsSession} cancelling={cancelling} /></section>}
      <CashHistory sessions={data?.sessions || []} cashier={false} onCancel={cancelRequest} onContributors={setContributorsSession} cancelling={cancelling} />
      {isHeadCashier && <CashHistory sessions={data?.recentIncoming || []} cashier onContributors={setContributorsSession} />}
    </> : <>
      <section className="cash-summary">
        <article><small>Markaziy kassada</small><strong>{money(data?.summary?.centralCash)}</strong><Breakdown breakdown={data?.summary?.breakdown} /></article>
        <article className="pending"><small>Tasdiqlash kutilmoqda</small><strong>{money(data?.summary?.pendingAmount)}</strong><span>{data?.summary?.pendingCount || 0} ta topshirish</span></article>
        <article><small>Kassirlar qo‘lida</small><strong>{money(data?.summary?.cashierAmount)}</strong><span>Hali topshirilmagan mablag‘</span></article>
      </section>
      <section className="cash-card"><div className="cash-card-title"><h2>Kassirlardagi qoldiq</h2><p>Naqd va shaxsiy hisobga tushgan mablag‘lar.</p></div><CashierBalances rows={data?.cashierBalances || []} /></section>
      <section className="cash-card"><div className="cash-card-title"><h2>Tasdiqlash kutilayotgan kassalar</h2><p>Pulni sanang va haqiqiy summani kiriting.</p></div><CashTable sessions={data?.pendingSessions || []} onApprove={openApprove} onCancel={cancelRequest} onContributors={setContributorsSession} cancelling={cancelling} /></section>
      <CashHistory sessions={data?.recentSessions || []} cashier onContributors={setContributorsSession} />
    </>}

    <Modal open={closeOpen} onCancel={() => setCloseOpen(false)} footer={null} title="Mablag‘ni qisman yoki to‘liq topshirish" destroyOnHidden>
      <Form form={closeForm} layout="vertical" onFinish={submitClose} requiredMark={false}>
        <div className="cash-confirm-total"><span>Kassadagi jami</span><strong>{money(data?.open?.balance)}</strong></div>
        <div className="cash-method-balances">{methodKeys.map((key) => <button type="button" key={key} disabled={!Number(data?.open?.breakdown?.[key] || 0)} className={transferMethod === key ? 'active' : ''} onClick={() => { setTransferMethod(key); closeForm.setFieldValue('amount', null) }}><span>{methodLabels[key]}</span><strong>{money(data?.open?.breakdown?.[key])}</strong></button>)}</div>
        <Form.Item name="amount" label={`${methodLabels[transferMethod]}dan topshiriladigan summa`} rules={[{ required: true, message: 'Summani kiriting' }]}><InputNumber min={1} max={data?.open?.breakdown?.[transferMethod]} precision={0} addonAfter="so‘m" style={{ width: '100%' }} formatter={(value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(value) => String(value || '').replace(/[^\d]/g, '')} /></Form.Item>
        <div className="cash-confirm-total transfer"><span>Topshiriladi</span><strong>{money(closeAmount)}</strong></div>
        <Form.Item name="note" label="Izoh"><Input.TextArea rows={3} maxLength={500} /></Form.Item>
        <div className="cash-modal-actions"><Button onClick={() => setCloseOpen(false)}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={closing}>{isHeadCashier ? 'Ownerga' : 'Bosh kassirga'} yuborish</Button></div>
      </Form>
    </Modal>
    <Modal open={Boolean(selected)} onCancel={() => setSelected(null)} footer={null} title="Kassani qabul qilish" destroyOnHidden>
      <Form form={approveForm} layout="vertical" onFinish={submitApprove} requiredMark={false}>
        <div className="cash-confirm-total"><span>Dastur bo‘yicha</span><strong>{money(selected?.expectedAmount)}</strong></div>
        <div className="cash-sent-note"><span>Kassir izohi</span><p>{selected?.note || 'Izoh yozilmagan'}</p></div>
        <Form.Item name="receivedAmount" label="Sanalgan haqiqiy summa" rules={[{ required: true, message: 'Summani kiriting' }]}><InputNumber min={0} precision={0} addonAfter="so‘m" style={{ width: '100%' }} formatter={(value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(value) => String(value || '').replace(/[^\d]/g, '')} /></Form.Item>
        <Form.Item name="reviewNote" label="Izoh"><Input.TextArea rows={2} maxLength={500} /></Form.Item>
        <div className="cash-modal-actions"><Button onClick={() => setSelected(null)}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={approving}>Qabul qilish</Button></div>
      </Form>
    </Modal>
    <Modal open={Boolean(contributorsSession)} onCancel={() => setContributorsSession(null)} footer={<Button onClick={() => setContributorsSession(null)}>Yopish</Button>} title="Topshirilayotgan mablag‘ manbalari" width={760} destroyOnHidden>
      <Contributors session={contributorsSession} />
    </Modal>
  </div>
}

function Breakdown({ breakdown }) {
  const visibleMethods = methodKeys.filter((key) => Number(breakdown?.[key] || 0) > 0)
  return <div className={`cash-breakdown ${visibleMethods.length === 1 ? 'single' : ''}`}>{visibleMethods.map((key) => <span key={key}><b>{methodLabels[key]}</b> {money(breakdown?.[key])}</span>)}</div>
}

function CashierBalances({ rows }) {
  return <div className="cash-table-wrap"><table><thead><tr><th>Kassir</th><th>Jami qoldiq</th><th>Tarkibi</th></tr></thead><tbody>{rows.map((row) => <tr key={row.sessionId}><td data-label="Kassir"><strong>{fullName(row.cashier)}</strong><small>{row.cashier?.position}</small></td><td data-label="Jami"><b>{money(row.balance)}</b></td><td data-label="Tarkibi"><Breakdown breakdown={row.breakdown} /></td></tr>)}{!rows.length && <tr><td colSpan={3} className="cash-empty">Kassirlarda qoldiq yo‘q</td></tr>}</tbody></table></div>
}

function CancelRequestButton({ onConfirm, loading }) {
  return <Popconfirm title="Kassa topshirish so‘rovini bekor qilish" description="Mablag‘ kassir qoldig‘iga qaytariladi." okText="Bekor qilish" cancelText="Yopish" okButtonProps={{ danger: true, loading }} onConfirm={onConfirm}><Button size="small" danger>Bekor qilish</Button></Popconfirm>
}

function ContributorsButton({ session, onClick }) {
  const count = session?.contributors?.length || 0
  return <Button size="small" onClick={() => onClick(session)}>{count ? `${count} ta to‘lovchi` : 'Ko‘rish'}</Button>
}

function CashTable({ sessions, onApprove, onCancel, onContributors, cancelling }) {
  return <div className="cash-table-wrap"><table><thead><tr><th>Kassir</th><th>Topshirilgan vaqt</th><th>Summa</th><th>Tarkibi</th><th>To‘lovchilar</th><th>Kassir izohi</th><th>Amal</th></tr></thead><tbody>{sessions.map((session) => <tr key={session.id}><td data-label="Kassir"><strong>{fullName(session.cashier)}</strong><small>{session.cashier?.position}</small></td><td data-label="Vaqt">{dayjs(session.closedAt).format('DD.MM.YYYY HH:mm')}</td><td data-label="Summa"><b>{money(session.expectedAmount)}</b></td><td data-label="Tarkibi"><Breakdown breakdown={session.breakdown || { cash: session.expectedAmount }} /></td><td data-label="To‘lovchilar"><ContributorsButton session={session} onClick={onContributors} /></td><td data-label="Kassir izohi"><span className="cash-note">{session.note || '—'}</span></td><td data-label="Amal"><div className="cash-actions"><Button size="small" type="primary" onClick={() => onApprove(session)}>Pulni qabul qilish</Button><CancelRequestButton onConfirm={() => onCancel(session.id)} loading={cancelling} /></div></td></tr>)}{!sessions.length && <tr><td colSpan={7} className="cash-empty">Tasdiqlash kutilayotgan mablag‘ yo‘q</td></tr>}</tbody></table></div>
}

function CashHistory({ sessions, cashier, onCancel, onContributors, cancelling }) {
  return <section className="cash-card"><div className="cash-card-title"><h2>Kassa tarixi</h2><p>Topshirilgan va qabul qilingan mablag‘lar</p></div><div className="cash-table-wrap"><table><thead><tr>{cashier && <th>Kassir</th>}<th>Topshirilgan vaqt</th><th>Summa</th><th>Tarkibi</th><th>To‘lovchilar</th><th>Kassir izohi</th><th>Admin izohi</th><th>Holat</th>{onCancel && <th>Amal</th>}</tr></thead><tbody>{sessions.map((session) => <tr key={session.id}>{cashier && <td data-label="Kassir">{fullName(session.cashier)}</td>}<td data-label="Vaqt">{session.closedAt ? dayjs(session.closedAt).format('DD.MM.YYYY HH:mm') : '—'}</td><td data-label="Summa"><b>{money(session.expectedAmount)}</b></td><td data-label="Tarkibi"><Breakdown breakdown={session.breakdown || { cash: session.expectedAmount }} /></td><td data-label="To‘lovchilar"><ContributorsButton session={session} onClick={onContributors} /></td><td data-label="Kassir izohi"><span className="cash-note">{session.note || '—'}</span></td><td data-label="Admin izohi"><span className="cash-note">{session.reviewNote || '—'}</span></td><td data-label="Holat"><span className={`cash-status ${session.status}`}>{session.status === 'approved' ? 'Qabul qilingan' : session.status === 'pending' ? 'Kutilmoqda' : 'Rad etilgan'}</span></td>{onCancel && <td data-label="Amal">{session.status === 'pending' && <CancelRequestButton onConfirm={() => onCancel(session.id)} loading={cancelling} />}</td>}</tr>)}{!sessions.length && <tr><td colSpan={(cashier ? 8 : 7) + (onCancel ? 1 : 0)} className="cash-empty">Kassa tarixi hali yo‘q</td></tr>}</tbody></table></div></section>
}

function Contributors({ session }) {
  const contributors = session?.contributors || []
  if (!contributors.length) return <div className="cash-empty">Bu eski topshirish yozuvida to‘lovchilar tarkibi saqlanmagan.</div>
  return <div className="cash-table-wrap"><table><thead><tr><th>Talaba</th><th>To‘lov turi</th><th>Sana</th><th>Usul</th><th>Summa</th></tr></thead><tbody>{contributors.map((item, index) => <tr key={`${item.sourceKey}-${index}`}><td><strong>{item.studentName || '—'}</strong></td><td>{item.sourceType === 'deposit' ? 'Depozit' : item.sourceType === 'payment' ? 'Shartnoma to‘lovi' : 'Kassa topshirig‘i'}</td><td>{item.paidAt ? dayjs(item.paidAt).format('DD.MM.YYYY HH:mm') : '—'}</td><td>{methodLabels[item.method] || item.method}</td><td><b>{money(item.amount)}</b></td></tr>)}</tbody></table></div>
}
