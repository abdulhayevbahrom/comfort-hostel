import { useRef, useState } from 'react'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import { useReactToPrint } from 'react-to-print'
import { apiErrorMessage, useGetMonthlyReportQuery, useGetYearlyReportQuery } from '../../store/baseApi'
import './Reports.css'

const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const methodNames = { cash: 'Naqd', card: 'Karta', bank: 'Bank o‘tkazma', online: 'Click / Online' }

function ReportIcon({ type }) {
  const paths = {
    income: <><path d="M5 19 19 5M10 5h9v9" /></>,
    expense: <><path d="M5 5h14v14H5zM9 9h6M9 13h6" /></>,
    salary: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" /></>,
    balance: <><path d="M3 7h18v12H3zM15 11h6v4h-6a2 2 0 0 1 0-4Z" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type]}</svg>
}

function ReportChart({ rows, compactLabels = false }) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.income, row.expenses + row.salaries]))
  return (
    <div className="report-chart-scroll">
      <div className="report-chart" style={{ '--columns': rows.length }}>
        {rows.map((row) => (
          <div className="report-chart-column" key={row.key} title={`${row.label}: tushum ${money(row.income)}, chiqim ${money(row.expenses + row.salaries)}`}>
            <div className="report-bars">
              <i className="income" style={{ height: `${Math.max(row.income ? 3 : 0, (row.income / max) * 100)}%` }} />
              <i className="outflow" style={{ height: `${Math.max(row.expenses + row.salaries ? 3 : 0, ((row.expenses + row.salaries) / max) * 100)}%` }} />
            </div>
            <span>{compactLabels ? row.key : row.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Breakdown({ title, rows, labelFor }) {
  const max = Math.max(1, ...rows.map((row) => row.amount))
  return (
    <section className="report-panel report-breakdown">
      <header><h2>{title}</h2><span>{rows.reduce((sum, row) => sum + row.count, 0)} ta operatsiya</span></header>
      <div>
        {rows.length ? rows.map((row) => (
          <article key={row._id}>
            <p><span>{labelFor(row._id)}</span><b>{money(row.amount)}</b></p>
            <i><em style={{ width: `${(row.amount / max) * 100}%` }} /></i>
            <small>{row.count} ta</small>
          </article>
        )) : <p className="report-empty">Ma’lumot mavjud emas</p>}
      </div>
    </section>
  )
}

function DetailCard({ title, tone = 'default', items }) {
  return (
    <section className={`report-detail-card ${tone}`}>
      <h3>{title}</h3>
      <div>
        {items.map((item) => (
          <p key={item.label}>
            <span>{item.label}</span>
            <b>{item.value}</b>
          </p>
        ))}
      </div>
    </section>
  )
}

export function ReportsPage() {
  const now = dayjs()
  const [type, setType] = useState('monthly')
  const [month, setMonth] = useState(now.format('YYYY-MM'))
  const [year, setYear] = useState(now.year())
  const reportRef = useRef(null)
  const monthly = useGetMonthlyReportQuery(month, { skip: type !== 'monthly' })
  const yearly = useGetYearlyReportQuery(year, { skip: type !== 'yearly' })
  const query = type === 'monthly' ? monthly : yearly
  const report = query.data
  const printReport = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Moliyaviy hisobot - ${type === 'monthly' ? month : year}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 10mm; }
      @media print {
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
        .report-print-content { width: 100%; }
        .report-detail-card, .report-summary article, .report-panel { break-inside: avoid; page-break-inside: avoid; }
        .report-summary article, .report-summary article * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .report-dynamics { display: none !important; }
        .report-chart-scroll { overflow: visible; }
      }
    `,
  })

  return (
    <div className="reports-page">
      <div className="reports-toolbar">
        <div>
          <h1>Moliyaviy hisobot</h1>
          <p>Tushum, xarajat va xodimlar oyligi bo‘yicha umumiy natijalar</p>
        </div>
        <div className="reports-actions">
          {type === 'monthly'
            ? <DatePicker picker="month" value={dayjs(`${month}-01`)} format="MMMM, YYYY" allowClear={false} onChange={(value) => setMonth(value.format('YYYY-MM'))} />
            : <DatePicker picker="year" value={dayjs(`${year}-01-01`)} format="YYYY" allowClear={false} onChange={(value) => setYear(value.year())} />}
          <button type="button" className="report-print-button" onClick={() => printReport()} disabled={!report}>Print qilish</button>
        </div>
      </div>

      <nav className="report-tabs" aria-label="Hisobot turi">
        <button className={type === 'monthly' ? 'active' : ''} onClick={() => setType('monthly')}>Oylik hisobot</button>
        <button className={type === 'yearly' ? 'active' : ''} onClick={() => setType('yearly')}>Yillik hisobot</button>
      </nav>

      {query.isLoading ? <div className="report-status"><span />Hisobot tayyorlanmoqda...</div>
        : query.isError ? <div className="report-status error"><b>{apiErrorMessage(query.error)}</b><button onClick={query.refetch}>Qayta urinish</button></div>
          : report && <>
            <div ref={reportRef} className="report-print-content">
            {(() => {
              const details = report.details || {}
              const findCount = (rows = [], key) => rows.find((row) => row._id === key)?.count || 0
              return (
                <section className="report-detail-grid">
                  <DetailCard title="Talabalar" tone="students" items={[
                    { label: 'Jami talabalar', value: details.students?.total || 0 },
                    { label: 'Yangi qo‘shilgan', value: details.students?.new || 0 },
                    { label: 'Erkak', value: findCount(details.students?.byGender, 'male') },
                    { label: 'Ayol', value: findCount(details.students?.byGender, 'female') },
                  ]} />
                  <DetailCard title="Shartnomalar" tone="contracts" items={[
                    { label: 'Faol shartnomalar', value: details.contracts?.active || 0 },
                    { label: 'Yangi shartnomalar', value: details.contracts?.created || 0 },
                    { label: 'Yangi shartnoma summasi', value: money(details.contracts?.amount) },
                    { label: 'Bekor qilingan', value: findCount(details.contracts?.byStatus, 'cancelled') },
                  ]} />
                  <DetailCard title="Xonalar" tone="rooms" items={[
                    { label: 'Jami xonalar', value: details.rooms?.total || 0 },
                    { label: 'Jami joy', value: details.rooms?.capacity || 0 },
                    { label: 'Band joy', value: details.rooms?.occupied || 0 },
                    { label: 'Bo‘sh joy', value: details.rooms?.free || 0 },
                  ]} />
                  <DetailCard title="Jarimalar" tone="fines" items={[
                    { label: 'Yozilgan jarimalar', value: details.fines?.issued || 0 },
                    { label: 'To‘langan jarimalar', value: details.fines?.paidCount || 0 },
                    { label: 'To‘langan summa', value: money(details.fines?.paidAmount) },
                    { label: 'Jami qarzdorlik', value: money(details.fines?.debt) },
                  ]} />
                  <DetailCard title="Hodimlar" tone="employees" items={[
                    { label: 'Jami hodimlar', value: details.employees?.total || 0 },
                    { label: 'Faol hodimlar', value: details.employees?.active || 0 },
                    { label: 'Nofaol hodimlar', value: details.employees?.inactive || 0 },
                    { label: 'Oylik fondi', value: money(details.employees?.payroll) },
                  ]} />
                  <DetailCard title="Oyliklar" tone="salaries" items={[
                    { label: 'To‘lovlar soni', value: details.salaries?.paidCount || 0 },
                    { label: 'To‘langan oylik', value: money(details.salaries?.paidAmount) },
                    { label: 'Jami oylik fondi', value: money(details.employees?.payroll) },
                    { label: 'Qolgan majburiyat', value: money(Math.max((details.employees?.payroll || 0) - (details.salaries?.paidAmount || 0), 0)) },
                  ]} />
                </section>
              )
            })()}

            <div className="report-summary">
              <article className="income"><i><ReportIcon type="income" /></i><span>Jami tushum</span><strong>{money(report.summary.income)}</strong><small>Talabalar to‘lovlari</small></article>
              <article className="expense"><i><ReportIcon type="expense" /></i><span>Jami xarajat</span><strong>{money(report.summary.expenses)}</strong><small>Yotoqxona xarajatlari</small></article>
              <article className="salary"><i><ReportIcon type="salary" /></i><span>To‘langan oyliklar</span><strong>{money(report.summary.salaries)}</strong><small>Xodimlar ish haqi</small></article>
              <article className={report.summary.balance >= 0 ? 'balance' : 'negative'}><i><ReportIcon type="balance" /></i><span>Sof qoldiq</span><strong>{money(report.summary.balance)}</strong><small>Tushum − barcha chiqimlar</small></article>
            </div>

            <section className="report-panel report-dynamics">
              <header><div><h2>{type === 'monthly' ? 'Kunlik dinamika' : 'Oylik dinamika'}</h2><p><i className="income" /> Tushum <i className="outflow" /> Jami chiqim</p></div><span>{type === 'monthly' ? month : `${year}-yil`}</span></header>
              <ReportChart rows={report.rows} compactLabels={type === 'monthly'} />
            </section>

            <div className="report-breakdowns">
              <Breakdown title="To‘lov turlari" rows={report.methods || []} labelFor={(key) => methodNames[key] || key} />
              <Breakdown title="Xarajat kategoriyalari" rows={report.categories || []} labelFor={(key) => key} />
            </div>
            </div>
          </>}
    </div>
  )
}
