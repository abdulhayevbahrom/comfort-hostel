import { Modal } from 'antd'
import dayjs from 'dayjs'
import { apiErrorMessage, useGetFinePaymentsQuery } from '../../store/baseApi'
import './FineHistory.css'

const methods = { cash: 'Naqd', card: 'Karta', click: 'Click', bank: 'Bank' }
const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const employeeName = (employee) => `${employee?.firstname || ''} ${employee?.lastname || ''}`.trim() || 'Noma’lum xodim'

export function FinePaymentHistoryModal({ fine, onClose }) {
  const { data, isLoading, error } = useGetFinePaymentsQuery(fine?.id, { skip: !fine })
  const payments = data?.payments || []
  const total = payments.reduce((sum, item) => sum + item.amount, 0)
  return <Modal open={Boolean(fine)} onCancel={onClose} footer={null} width={720} title={fine ? `${fine.student?.fullName || 'Talaba'} — jarima to‘lovlari tarixi` : 'To‘lovlar tarixi'} rootClassName="fine-history-modal"><div className="fine-history-summary"><div><span>Jarima summasi</span><strong>{money(fine?.amount)}</strong></div><div><span>Jami to‘langan</span><strong>{money(total)}</strong></div><div><span>Qolgan qarz</span><strong>{money(Math.max(0, Number(fine?.amount || 0) - total))}</strong></div></div>{error && <div className="form-error">{apiErrorMessage(error)}</div>}{isLoading ? <div className="fine-state">To‘lovlar tarixi yuklanmoqda…</div> : <div className="fine-history-table-wrap"><table className="fine-history-table"><thead><tr><th>Sana</th><th>To‘lov turi</th><th>Summa</th><th>Qabul qilgan xodim</th><th>Izoh</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td data-label="Sana"><strong>{dayjs(payment.createdAt).format('DD.MM.YYYY')}</strong><small>{dayjs(payment.createdAt).format('HH:mm')}</small></td><td data-label="To‘lov turi"><span className={`fine-history-method ${payment.method}`}>{methods[payment.method] || payment.method}</span></td><td data-label="Summa"><b>{money(payment.amount)}</b></td><td data-label="Qabul qilgan"><strong>{employeeName(payment.receivedBy)}</strong><small>{payment.receivedBy?.position || '—'}</small></td><td data-label="Izoh">{payment.note || '—'}</td></tr>)}{!payments.length && <tr><td colSpan="5" className="fine-state">Bu jarima bo‘yicha to‘lov qilinmagan</td></tr>}</tbody></table></div>}</Modal>
}
