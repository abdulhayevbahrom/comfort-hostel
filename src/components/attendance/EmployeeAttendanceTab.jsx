import { DatePicker, Modal } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { apiErrorMessage, useGetEmployeeAttendanceHistoryQuery, useGetEmployeeAttendanceQuery } from '../../store/baseApi'
import './EmployeeAttendance.css'
import './EmployeeAttendanceExtra.css'

const fullName = (employee) => `${employee?.firstname || ''} ${employee?.lastname || ''}`.trim()
const clock = (value) => value ? dayjs(value).format('HH:mm') : '—'
const statusLabels = {
  inside: ['Ichkarida', 'inside'],
  present: ['Keldi', 'present'],
  late: ['Kech qoldi', 'late'],
  absent: ['Kelmadi', 'absent'],
  off_day: ['Dam olish', 'off'],
  pending: ['Hali kelmadi', 'pending'],
}

function HistoryModal({ employee, month, onClose }) {
  const { data, isLoading, error } = useGetEmployeeAttendanceHistoryQuery(
    { employeeId: employee?.id, month },
    { skip: !employee?.id },
  )
  const summary = data?.summary || {}
  return <Modal open={Boolean(employee)} onCancel={onClose} footer={null} width={860} title={`${fullName(employee)} — ${dayjs(`${month}-01`).format('MMMM YYYY')}`}>
    {error ? <div className="form-error">{apiErrorMessage(error)}</div> : isLoading ? <div className="employee-attendance-state">Yuklanmoqda…</div> : <>
      <div className="employee-history-summary">
        <span>Kelgan kun: <b>{summary.presentDays || 0}</b></span><span>Kech qolgan: <b>{summary.lateDays || 0}</b></span><span>Kechikish: <b>{summary.totalLateMinutes || 0} daq.</b></span><span>Ish vaqti: <b>{Number(summary.totalWorkedHours || 0).toFixed(1)} soat</b></span>
      </div>
      <div className="employee-attendance-table-wrap"><table><thead><tr><th>Sana</th><th>Kirish</th><th>Chiqish</th><th>Ishlagan vaqt</th><th>Kechikish</th><th>Erta ketish</th></tr></thead><tbody>
        {(data?.rows || []).map((row) => <tr key={row.attendance.id}><td>{dayjs(row.attendance.date).format('DD.MM.YYYY')}</td><td>{clock(row.attendance.firstEntry)}</td><td>{clock(row.attendance.lastExit)}</td><td>{Number(row.attendance.totalHours || 0).toFixed(1)} soat</td><td>{row.lateMinutes || 0} daq.</td><td>{row.earlyLeaveMinutes || 0} daq.</td></tr>)}
        {!data?.rows?.length && <tr><td colSpan="6" className="employee-attendance-state">Bu oyda FaceID davomati yo‘q</td></tr>}
      </tbody></table></div>
    </>}
  </Modal>
}

export function EmployeeAttendanceTab() {
  const [date, setDate] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [historyEmployee, setHistoryEmployee] = useState(null)
  const { data, isLoading, isFetching, error } = useGetEmployeeAttendanceQuery(date)
  const summary = data?.summary || {}
  const rows = data?.rows || []
  const month = date.slice(0, 7)

  return <div className="employee-attendance-page">
    <section className="employee-attendance-hero">
      <div><small>HIKVISION FACEID</small><h2>Xodimlar davomati</h2><p>Kirish, chiqish, kechikish va ish vaqti avtomatik hisoblanadi.</p></div>
      <DatePicker allowClear={false} value={dayjs(date)} disabledDate={(current) => current && current.isAfter(dayjs(), 'day')} onChange={(value) => value && setDate(value.format('YYYY-MM-DD'))} />
    </section>
    <section className="employee-attendance-stats">
      <article><span>Jami xodim</span><strong>{summary.total || 0}</strong></article><article className="present"><span>Kelgan</span><strong>{summary.present || 0}</strong></article><article className="late"><span>Kech qolgan</span><strong>{summary.late || 0}</strong></article><article className="absent"><span>Kelmagan</span><strong>{summary.absent || 0}</strong></article><article className="pending"><span>Hali kelmadi</span><strong>{summary.pending || 0}</strong></article><article className="inside"><span>Ichkarida</span><strong>{summary.inside || 0}</strong></article>
    </section>
    <section className="employee-attendance-card">
      <header><div><h3>Kunlik FaceID jurnali</h3><p>{dayjs(date).format('DD.MM.YYYY')}</p></div></header>
      {error ? <div className="form-error">{apiErrorMessage(error)}</div> : isLoading ? <div className="employee-attendance-state">Yuklanmoqda…</div> : <div className={`employee-attendance-table-wrap ${isFetching ? 'refreshing' : ''}`}><table><thead><tr><th>Xodim</th><th>FaceID</th><th>Kirish</th><th>Chiqish</th><th>Ish vaqti</th><th>Kechikish</th><th>Holat</th><th>Tarix</th></tr></thead><tbody>
        {rows.map((row) => { const status = statusLabels[row.status] || [row.status, 'off']; return <tr key={row.employee.id}><td><strong>{fullName(row.employee)}</strong><small>{row.employee.position}</small></td><td><code>{row.employee.faceIdCode || '—'}</code></td><td>{clock(row.attendance?.firstEntry)}</td><td>{clock(row.attendance?.lastExit)}</td><td>{row.attendance ? `${Number(row.attendance.totalHours || 0).toFixed(1)} soat` : '—'}</td><td>{row.lateMinutes ? `${row.lateMinutes} daq.` : '—'}</td><td><span className={`employee-attendance-chip ${status[1]}`}>{status[0]}</span></td><td><button onClick={() => setHistoryEmployee(row.employee)}>Oy tarixi</button></td></tr> })}
        {!rows.length && <tr><td colSpan="8" className="employee-attendance-state">Faol xodim topilmadi</td></tr>}
      </tbody></table></div>}
    </section>
    <HistoryModal employee={historyEmployee} month={month} onClose={() => setHistoryEmployee(null)} />
  </div>
}
