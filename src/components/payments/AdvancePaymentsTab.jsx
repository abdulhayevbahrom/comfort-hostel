import { useState } from 'react'
import { Modal } from 'antd'
import dayjs from 'dayjs'
import { apiErrorMessage, useGetAdvancePaymentsQuery } from '../../store/baseApi'

const methods = { cash: 'Naqd', online: 'Click', bank: 'Bank', card: 'Karta' }
const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`

export function AdvancePaymentsTab() {
  const { data, isLoading, error } = useGetAdvancePaymentsQuery()
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const summary = data?.summary || {}
  const periods = data?.periods || []

  return <>
    <section className="advance-payment-stats">
      <article><small>Oldindan to‘langan</small><strong>{money(summary.totalAmount)}</strong></article>
      <article><small>Talabalar</small><strong>{summary.studentCount || 0} ta</strong></article>
      <article><small>To‘lovlar</small><strong>{summary.paymentCount || 0} ta</strong></article>
      <article><small>Oylar</small><strong>{summary.periodCount || 0} ta</strong></article>
    </section>
    <section className="payment-card">
      <div className="payment-card-head"><div><h3>Oldindan qilingan to‘lovlar</h3><p>Kelajak oylari uchun avvalroq qabul qilingan to‘lovlar</p></div></div>
      {error && <div className="form-error">{apiErrorMessage(error)}</div>}
      {isLoading ? <div className="payment-loader"><span /> Ma’lumotlar yuklanmoqda...</div> : <div className="payment-table-wrap">
        <table className="payment-table advance-payment-table"><thead><tr><th>To‘lov oyi</th><th>Jami summa</th><th>Talabalar</th><th>Tranzaksiyalar</th><th>Amal</th></tr></thead><tbody>
          {periods.map((period) => <tr key={period.periodKey}><td data-label="To‘lov oyi"><span className="payment-period">{period.periodKey}</span></td><td data-label="Jami summa"><b className="payment-amount">{money(period.totalAmount)}</b></td><td data-label="Talabalar">{period.studentCount} ta</td><td data-label="Tranzaksiyalar">{period.paymentCount} ta</td><td data-label="Amal"><button className="advance-view-button" onClick={() => setSelectedPeriod(period)}>Ko‘rish</button></td></tr>)}
          {!periods.length && <tr><td className="payment-empty" colSpan="5"><strong>Oldindan to‘lov mavjud emas</strong><p>Kelajak oylari uchun qilingan to‘lovlar shu yerda chiqadi.</p></td></tr>}
        </tbody></table>
      </div>}
    </section>
    <Modal open={Boolean(selectedPeriod)} onCancel={() => setSelectedPeriod(null)} footer={null} width={760} title={selectedPeriod ? `${selectedPeriod.periodKey} uchun oldindan to‘lovlar` : 'Oldindan to‘lovlar'} rootClassName="advance-payment-modal" destroyOnHidden>
      <div className="advance-modal-summary"><span>Jami</span><strong>{money(selectedPeriod?.totalAmount)}</strong><small>{selectedPeriod?.studentCount || 0} ta talaba</small></div>
      <div className="payment-table-wrap"><table className="payment-table advance-detail-table"><thead><tr><th>Talaba</th><th>Shartnoma</th><th>To‘lov sanasi</th><th>Usuli</th><th>Summa</th></tr></thead><tbody>
        {(selectedPeriod?.payments || []).map((payment) => <tr key={payment.id}><td data-label="Talaba"><strong>{payment.student?.fullName || '—'}</strong><small>{payment.student?.phone || '—'}</small></td><td data-label="Shartnoma">{payment.contract?.contractNumber || '—'}</td><td data-label="To‘lov sanasi">{dayjs(payment.createdAt).format('DD.MM.YYYY HH:mm')}</td><td data-label="Usuli"><span className={`method-badge ${payment.method}`}>{methods[payment.method] || payment.method}</span></td><td data-label="Summa"><b className="payment-amount">{money(payment.amount)}</b></td></tr>)}
      </tbody></table></div>
    </Modal>
  </>
}
