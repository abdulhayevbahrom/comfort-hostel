import dayjs from 'dayjs'
import { useState } from 'react'
import { apiErrorMessage, useGetStudentFinesQuery } from '../../store/baseApi'
import { FinePaymentModal } from '../fines/FinePaymentModal'
import { FinePaymentHistoryModal } from '../fines/FinePaymentHistoryModal'
import '../fines/FinePayments.css'

const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const employeeName = (employee) => `${employee?.firstname || ''} ${employee?.lastname || ''}`.trim() || 'Noma’lum xodim'

export function StudentFinesTab({ student }) {
  const [paymentFine, setPaymentFine] = useState(null)
  const [historyFine, setHistoryFine] = useState(null)
  const { data, isLoading, error } = useGetStudentFinesQuery(student.id)
  if (isLoading) return <div className="student-fine-state">Jarimalar yuklanmoqda…</div>
  if (error) return <div className="student-fine-state error">{apiErrorMessage(error)}</div>
  return <div className="student-fines-tab">
    <div className="student-fine-summary"><div><span>Jami jarima</span><strong>{money(data?.summary?.totalAmount)}</strong></div><div className="paid"><span>To‘langan</span><strong>{money(data?.summary?.paidAmount)}</strong></div><div><span>Qolgan qarz</span><strong>{money(data?.summary?.remainingAmount)}</strong></div></div>
    <div className="student-fine-table-wrap"><table className="student-fine-table"><thead><tr><th>Sana</th><th>Jarima sababi</th><th>Summa</th><th>Holat</th><th>Jarima bergan xodim</th><th>Amal</th></tr></thead><tbody>{(data?.fines || []).map((fine) => { const remaining = Math.max(0, fine.amount - (fine.paidAmount || 0)); const status = remaining <= 0 ? 'paid' : fine.paidAmount > 0 ? 'partial' : 'unpaid'; const fineWithStudent = { ...fine, student }; return <tr key={fine.id}><td data-label="Sana"><strong>{dayjs(fine.createdAt).format('DD.MM.YYYY')}</strong><small>{dayjs(fine.createdAt).format('HH:mm')}</small></td><td data-label="Sabab"><p>{fine.reason}</p></td><td data-label="Summa"><b>{money(fine.amount)}</b><small>Qoldiq: {money(remaining)}</small></td><td data-label="Holat"><span className={`student-fine-status ${status}`}>{status === 'paid' ? 'To‘langan' : status === 'partial' ? 'Qisman' : 'To‘lanmagan'}</span></td><td data-label="Xodim"><strong>{employeeName(fine.issuedBy)}</strong><small>{fine.issuedBy?.position || '—'}</small></td><td data-label="Amal"><div className="student-fine-actions">{remaining > 0 && <button className="student-fine-pay" onClick={() => setPaymentFine(fineWithStudent)}>To‘lov</button>}<button className="student-fine-history" onClick={() => setHistoryFine(fineWithStudent)}>Tarix</button></div></td></tr>})}{!data?.fines?.length && <tr><td colSpan="6" className="student-fine-state">Talabaga jarima yozilmagan</td></tr>}</tbody></table></div>
    <FinePaymentModal fine={paymentFine} onClose={() => setPaymentFine(null)} />
    <FinePaymentHistoryModal fine={historyFine} onClose={() => setHistoryFine(null)} />
  </div>
}
