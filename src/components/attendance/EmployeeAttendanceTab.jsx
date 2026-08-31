import { Button, DatePicker, Input, Modal } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { apiErrorMessage, useGetEmployeeAttendanceHistoryQuery, useGetEmployeeAttendanceQuery, useWaiveEmployeeAttendancePenaltyMutation } from '../../store/baseApi'
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
  const [waiverRow, setWaiverRow] = useState(null)
  const [reason, setReason] = useState('')
  const { data, isLoading, error } = useGetEmployeeAttendanceHistoryQuery(
    { employeeId: employee?.id, month },
    { skip: !employee?.id },
  )
  const [waivePenalty, { isLoading: isWaiving }] = useWaiveEmployeeAttendancePenaltyMutation()
  const summary = data?.summary || {}
  const submitWaiver = async () => {
    if (reason.trim().length < 3) return toast.info('Bekor qilish sababini kiriting')
    try {
      await waivePenalty({ employeeId: employee.id, date: waiverRow.date, reason: reason.trim() }).unwrap()
      toast.success('Kunlik jarima bekor qilindi')
      setWaiverRow(null)
      setReason('')
    } catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }
  return <Modal open={Boolean(employee)} onCancel={onClose} footer={null} width={1040} title={`${fullName(employee)} — ${dayjs(`${month}-01`).format('MMMM YYYY')}`}>
    {error ? <div className="form-error">{apiErrorMessage(error)}</div> : isLoading ? <div className="employee-attendance-state">Yuklanmoqda…</div> : <>
      <div className={data?.hasOutDevice ? 'employee-exit-mode device' : 'employee-exit-mode schedule'}>{data?.hasOutDevice ? 'Chiqish vaqti OUT qurilma eventidan olinadi.' : `OUT qurilma yo‘q: chiqish ${data?.schedule?.checkOutTime || '18:00'} da avtomatik hisoblanadi.`}</div>
      <div className="employee-history-summary">
        <span>Kelgan kun: <b>{summary.presentDays || 0}</b></span><span>Kech qolgan: <b>{summary.lateDays || 0} kun</b></span><span>Erta ketgan: <b>{summary.earlyLeaveDays || 0} kun</b></span><span>Kechikish: <b>{summary.totalLateMinutes || 0} daq.</b></span><span>Erta ketish: <b>{summary.totalEarlyLeaveMinutes || 0} daq.</b></span><span>Ish vaqti: <b>{Number(summary.totalWorkedHours || 0).toFixed(1)} soat</b></span><span>Bekor qilingan: <b>{Number(summary.waivedAmount || 0).toLocaleString('uz-UZ')} so‘m</b></span><span>Jami jarima: <b>{Number(summary.totalDeduction || 0).toLocaleString('uz-UZ')} so‘m</b></span>
      </div>
      <div className="employee-attendance-table-wrap"><table><thead><tr><th>Sana</th><th>Kirish</th><th>Chiqish</th><th>Ishlagan vaqt</th><th>Kechikish</th><th>Erta ketish</th><th>Jarima</th><th>Amal</th></tr></thead><tbody>
        {(data?.rows || []).map((row) => { const originalPenalty = Number(row.originalLatePenalty || 0) + Number(row.originalEarlyLeavePenalty || 0) + Number(row.originalAbsencePenalty || 0); return <tr key={row.attendance?.id || row.date} className={row.penaltyWaived ? 'penalty-waived-row' : ''}><td>{dayjs(row.date).format('DD.MM.YYYY')} {!row.attendance && <small>Kelmadi</small>}</td><td>{clock(row.attendance?.firstEntry)}</td><td>{clock(row.attendance?.lastExit)}<small>{row.attendance?.exitSource === 'schedule' ? 'Reja bo‘yicha' : row.attendance?.exitSource === 'device' ? 'OUT qurilma' : ''}</small></td><td>{row.attendance ? `${Number(row.attendance.totalHours || 0).toFixed(1)} soat` : '—'}</td><td>{row.lateMinutes ? `${row.lateMinutes} daq.` : '—'}<small>{row.originalLatePenalty ? `${Number(row.originalLatePenalty).toLocaleString('uz-UZ')} so‘m` : ''}</small></td><td>{row.earlyLeaveMinutes ? `${row.earlyLeaveMinutes} daq.` : '—'}<small>{row.originalEarlyLeavePenalty ? `${Number(row.originalEarlyLeavePenalty).toLocaleString('uz-UZ')} so‘m` : ''}</small></td><td>{row.penaltyWaived ? <><span className="penalty-waived-badge">Bekor qilingan</span><small>{row.penaltyWaiver?.reason}</small></> : <><b>{originalPenalty.toLocaleString('uz-UZ')} so‘m</b>{row.originalAbsencePenalty ? <small>Kelmagan kun jarimasi</small> : null}</>}</td><td>{originalPenalty > 0 && !row.penaltyWaived ? <button className="waive-penalty-btn" onClick={() => { setWaiverRow(row); setReason('') }}>Jarimani bekor qilish</button> : '—'}</td></tr> })}
        {!data?.rows?.length && <tr><td colSpan="8" className="employee-attendance-state">Bu oyda FaceID davomati yo‘q</td></tr>}
      </tbody></table></div>
      {!!data?.waivers?.length && <section className="penalty-waiver-history"><h4>Jarima bekor qilish tarixi</h4>{data.waivers.map((waiver) => <article key={waiver.id}><div><strong>{dayjs(waiver.date).format('DD.MM.YYYY')}</strong><span>{Number(waiver.totalAmount || 0).toLocaleString('uz-UZ')} so‘m</span></div><p>{waiver.reason}</p><small>{waiver.waivedBy ? `${fullName(waiver.waivedBy)} · ` : ''}{dayjs(waiver.createdAt).format('DD.MM.YYYY HH:mm')}</small></article>)}</section>}
    </>}
    <Modal open={Boolean(waiverRow)} onCancel={() => setWaiverRow(null)} footer={null} title="Kunlik jarimani bekor qilish" width={500} destroyOnHidden>
      <p className="waiver-modal-help">{waiverRow ? `${dayjs(waiverRow.date).format('DD.MM.YYYY')} kungi ${Number((waiverRow.originalLatePenalty || 0) + (waiverRow.originalEarlyLeavePenalty || 0) + (waiverRow.originalAbsencePenalty || 0)).toLocaleString('uz-UZ')} so‘m jarima bekor qilinadi.` : ''}</p>
      <label className="waiver-reason-label">Bekor qilish sababi</label>
      <Input.TextArea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} maxLength={500} showCount placeholder="Masalan: shifokor ma’lumotnomasi taqdim etildi" />
      <div className="waiver-modal-actions"><Button onClick={() => setWaiverRow(null)}>Yopish</Button><Button type="primary" loading={isWaiving} onClick={submitWaiver}>Jarimani bekor qilish</Button></div>
    </Modal>
  </Modal>
}

export function EmployeeAttendanceTab({ businessUnit = 'hostel' }) {
  const [date, setDate] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [historyEmployee, setHistoryEmployee] = useState(null)
  const { data, isLoading, isFetching, error } = useGetEmployeeAttendanceQuery({ date, businessUnit })
  const summary = data?.summary || {}
  const rows = data?.rows || []
  const month = date.slice(0, 7)
  const schedule = data?.schedule

  return <div className="employee-attendance-page">
    <section className="employee-attendance-hero">
      <div><small>HIKVISION FACEID</small><h2>{businessUnit === 'shop' ? 'Do‘kon xodimlari davomati' : 'Xodimlar davomati'}</h2><p>Kirish, chiqish, kechikish va ish vaqti avtomatik hisoblanadi.</p></div>
      <DatePicker allowClear={false} value={dayjs(date)} disabledDate={(current) => current && current.isAfter(dayjs(), 'day')} onChange={(value) => value && setDate(value.format('YYYY-MM-DD'))} />
    </section>
    <section className="employee-attendance-stats">
      <article><span>Jami xodim</span><strong>{summary.total || 0}</strong></article><article className="present"><span>Kelgan</span><strong>{summary.present || 0}</strong></article><article className="late"><span>Kech qolgan</span><strong>{summary.late || 0}</strong></article><article className="absent"><span>Kelmagan</span><strong>{summary.absent || 0}</strong></article><article className="pending"><span>Hali kelmadi</span><strong>{summary.pending || 0}</strong></article><article className="inside"><span>Ichkarida</span><strong>{summary.inside || 0}</strong></article>
    </section>
    <section className="employee-attendance-card">
      <header><div><h3>Kunlik FaceID jurnali</h3><p>{dayjs(date).format('DD.MM.YYYY')} · {data?.hasOutDevice ? 'OUT qurilma faol' : `avtomatik chiqish ${schedule?.checkOutTime || '18:00'}`}</p></div></header>
      {error ? <div className="form-error">{apiErrorMessage(error)}</div> : isLoading ? <div className="employee-attendance-state">Yuklanmoqda…</div> : <div className={`employee-attendance-table-wrap ${isFetching ? 'refreshing' : ''}`}><table><thead><tr><th>Xodim</th><th>FaceID</th><th>Ish grafigi</th><th>Kirish</th><th>Chiqish</th><th>Ish vaqti</th><th>Kechikish</th><th>Erta ketish</th><th>Holat</th><th>Tarix</th></tr></thead><tbody>
        {rows.map((row) => { const status = statusLabels[row.status] || [row.status, 'off']; return <tr key={row.employee.id}><td><strong>{fullName(row.employee)}</strong><small>{row.employee.position}</small></td><td><code>{row.employee.faceIdCode || '—'}</code></td><td><strong>{schedule?.checkInTime || '09:00'}–{schedule?.checkOutTime || '18:00'}</strong></td><td>{clock(row.attendance?.firstEntry)}</td><td>{clock(row.attendance?.lastExit)}<small>{row.attendance?.exitSource === 'schedule' ? 'Reja bo‘yicha' : row.attendance?.exitSource === 'device' ? 'OUT qurilma' : ''}</small></td><td>{row.attendance ? `${Number(row.attendance.totalHours || 0).toFixed(1)} soat` : '—'}</td><td>{row.lateMinutes ? `${row.lateMinutes} daq.` : '—'}</td><td>{row.earlyLeaveMinutes ? `${row.earlyLeaveMinutes} daq.` : '—'}</td><td><span className={`employee-attendance-chip ${status[1]}`}>{status[0]}</span></td><td><button onClick={() => setHistoryEmployee(row.employee)}>Oy tarixi</button></td></tr> })}
        {!rows.length && <tr><td colSpan="10" className="employee-attendance-state">Faol xodim topilmadi</td></tr>}
      </tbody></table></div>}
    </section>
    <HistoryModal employee={historyEmployee} month={month} onClose={() => setHistoryEmployee(null)} />
  </div>
}
