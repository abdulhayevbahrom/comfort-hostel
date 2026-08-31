import { useEffect, useMemo, useState } from 'react'
import { DatePicker, Input, Modal, Pagination, Select } from 'antd'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import { apiErrorMessage, useGetAttendanceQuery, useGetRoomsQuery, useSaveAttendanceMutation } from '../../store/baseApi'
import './Attendance.css'
import './AttendanceDarkCards.css'
import { AttendanceHistoryTab } from './AttendanceHistoryTab'
import { EmployeeAttendanceTab } from './EmployeeAttendanceTab'
import './AttendanceTabsCompact.css'

const statuses = {
  present: { label: 'Keldi', icon: '✓' },
  absent: { label: 'Kelmadi', icon: '×' },
}

function AttendanceMarkingTab() {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [search, setSearch] = useState('')
  const [block, setBlock] = useState('')
  const [room, setRoom] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [drafts, setDrafts] = useState({})
  const [noteStudent, setNoteStudent] = useState(null)
  const { data: roomsData } = useGetRoomsQuery()
  const params = { date, page, ...(search ? { search } : {}), ...(block ? { block } : {}), ...(room ? { room } : {}), ...(status !== 'all' ? { status } : {}) }
  const { data, isLoading, isFetching, error } = useGetAttendanceQuery(params)
  const [saveAttendance, { isLoading: isSaving }] = useSaveAttendanceMutation()

  useEffect(() => {
    const next = {}
    for (const row of data?.rows || []) next[row.student.id] = { status: row.attendance?.status === 'late' ? 'present' : row.attendance?.status || '', note: row.attendance?.note || '', dirty: false }
    // Serverdagi sana/filtr natijasi o‘zgarganda tahrir buferi aynan shu ro‘yxatga tegishli bo‘lishi kerak.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrafts(next)
  }, [data])

  const blocks = useMemo(() => [...new Set((roomsData?.rooms || []).map((item) => item.block))].sort(), [roomsData?.rooms])
  const roomOptions = useMemo(() => (roomsData?.rooms || []).filter((item) => !block || item.block === block), [block, roomsData?.rooms])
  const changedCount = Object.values(drafts).filter((item) => item.dirty && item.status).length
  const markedVisible = Object.values(drafts).filter((item) => item.status).length

  const updateDraft = (studentId, patch) => setDrafts((current) => ({ ...current, [studentId]: { ...current[studentId], ...patch, dirty: true } }))
  const markAll = (nextStatus) => setDrafts((current) => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, { ...value, status: nextStatus, dirty: true }])))
  const save = async () => {
    const records = Object.entries(drafts).filter(([, value]) => value.dirty && value.status).map(([student, value]) => ({ student, status: value.status, note: value.note }))
    if (!records.length) return toast.info('Saqlash uchun davomat holatini belgilang')
    try {
      await saveAttendance({ attendanceDate: date, records }).unwrap()
      toast.success(`${records.length} ta talaba davomati saqlandi`)
    } catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }

  const summary = data?.summary || {}
  return <div className="attendance-page">
    <section className="attendance-hero">
      <div><span>KUNLIK NAZORAT</span><h2>Talabalar davomati</h2><p>Talabalarning kelgan-kelmagan holati hamda kirish-chiqish vaqtlari.</p></div>
      <DatePicker allowClear={false} value={dayjs(date)} disabledDate={(current) => current && current.isAfter(dayjs(), 'day')} format="DD MMMM, YYYY" onChange={(value) => { setDate(value.format('YYYY-MM-DD')); setPage(1) }} />
    </section>

    <section className="attendance-stats">
      <button className={status === 'all' ? 'active total' : 'total'} onClick={() => { setStatus('all'); setPage(1) }}><span>Jami talabalar</span><strong>{summary.total || 0}</strong><small>faol yashovchi</small></button>
      <button className={status === 'present' ? 'active present' : 'present'} onClick={() => { setStatus('present'); setPage(1) }}><span>Keldi</span><strong>{summary.present || 0}</strong><small>{summary.total ? Math.round((summary.present || 0) / summary.total * 100) : 0}%</small></button>
      <button className={status === 'absent' ? 'active absent' : 'absent'} onClick={() => { setStatus('absent'); setPage(1) }}><span>Kelmadi</span><strong>{summary.absent || 0}</strong><small>nazorat talab</small></button>
      <button className={status === 'unmarked' ? 'active unmarked' : 'unmarked'} onClick={() => { setStatus('unmarked'); setPage(1) }}><span>Belgilanmagan</span><strong>{summary.unmarked || 0}</strong><small>qolgan</small></button>
    </section>

    <section className="attendance-card">
      <div className="attendance-tools">
        <div><h3>Davomat ro‘yxati</h3><p>{dayjs(date).format('DD.MM.YYYY')} · ko‘rinayotgan {data?.rows?.length || 0} ta talaba</p></div>
        <div className="attendance-filters">
          <div className="attendance-search"><span>⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Talaba, telefon yoki xona" /></div>
          <Select value={block || undefined} allowClear placeholder="Barcha bloklar" onChange={(value = '') => { setBlock(value); setRoom(''); setPage(1) }} options={blocks.map((value) => ({ value, label: value }))} />
          <Select value={room || undefined} allowClear placeholder="Barcha xonalar" onChange={(value = '') => { setRoom(value); setPage(1) }} options={roomOptions.map((item) => ({ value: item.id, label: `${item.roomNumber}-xona` }))} />
        </div>
      </div>
      <div className="attendance-bulk">
        <span>Ko‘rinayotganlarning barchasini:</span>
        {Object.entries(statuses).map(([value, item]) => <button key={value} className={value} onClick={() => markAll(value)}><b>{item.icon}</b>{item.label}</button>)}
        <em>{markedVisible}/{data?.rows?.length || 0} belgilandi</em>
      </div>
      {error && <div className="form-error">{apiErrorMessage(error)}</div>}
      {isLoading ? <div className="attendance-state">Davomat yuklanmoqda…</div> : <div className={`attendance-table-wrap ${isFetching ? 'refreshing' : ''}`}><table className="attendance-table">
        <thead><tr><th>Talaba</th><th>Xona</th><th>Universitet</th><th>Davomat holati</th><th>Kirish</th><th>Chiqish</th><th>Belgilagan xodim</th><th>Izoh</th></tr></thead>
        <tbody>{(data?.rows || []).map((row) => { const draft = drafts[row.student.id] || {}; return <tr key={row.student.id} className={draft.dirty ? 'changed' : ''}>
          <td data-label="Talaba"><div className="attendance-student">{row.student.photo ? <img src={row.student.photo.thumbnailUrl || row.student.photo.url} alt="" /> : <span>{row.student.fullName?.[0]}</span>}<div><strong>{row.student.fullName}</strong><small>{row.student.phone}</small></div></div></td>
          <td data-label="Xona"><strong>{row.room.block} · {row.room.roomNumber}-xona</strong><small>{row.room.floor}-qavat</small></td>
          <td data-label="Universitet"><strong>{row.student.university?.shortName || row.student.university?.name || '—'}</strong><small>{row.student.course}-kurs · {row.student.faculty?.name || '—'}</small></td>
          <td data-label="Holat"><div className="attendance-statuses">{Object.entries(statuses).map(([value, item]) => <button key={value} title={item.label} className={`${value} ${draft.status === value ? 'active' : ''} ${draft.status && draft.status !== value ? 'muted' : ''}`} onClick={() => updateDraft(row.student.id, { status: value })}><b>{item.icon}</b><span>{item.label}</span></button>)}</div></td>
          <td data-label="Kirish"><strong>{row.entryAt || row.attendance?.firstEntry ? dayjs(row.entryAt || row.attendance.firstEntry).format('HH:mm') : '—'}</strong></td>
          <td data-label="Chiqish"><strong>{row.exitAt ? dayjs(row.exitAt).format('HH:mm') : '—'}</strong></td>
          <td data-label="Xodim">{row.attendance?.source === 'faceid' ? <><strong>FaceID qurilma</strong><small>{dayjs(row.attendance.firstEntry || row.attendance.markedAt).format('HH:mm')} da qayd etildi</small></> : row.attendance?.markedBy ? <><strong>{`${row.attendance.markedBy.firstname || ''} ${row.attendance.markedBy.lastname || ''}`.trim() || 'Noma’lum xodim'}</strong><small>{row.attendance.markedBy.position ? `${row.attendance.markedBy.position} · ` : ''}{dayjs(row.attendance.markedAt).format('HH:mm')}</small></> : <span className="not-marked">Hali belgilanmagan</span>}</td>
          <td data-label="Izoh"><button className={draft.note ? 'note-button has-note' : 'note-button'} onClick={() => setNoteStudent(row.student)}>{draft.note ? 'Izohni ko‘rish' : '+ Izoh'}</button></td>
        </tr>})}{!data?.rows?.length && <tr><td colSpan="8" className="attendance-state">Tanlangan filtr bo‘yicha talaba topilmadi</td></tr>}</tbody>
      </table></div>}
      {(data?.pagination?.total || 0) > 25 && <div className="attendance-pagination"><span>Jami {data.pagination.total} ta natija</span><Pagination current={data.pagination.page} pageSize={25} total={data.pagination.total} showSizeChanger={false} onChange={setPage} /></div>}
      <div className="attendance-footer"><div><strong>{changedCount}</strong> ta o‘zgarish saqlashga tayyor</div><button disabled={!changedCount || isSaving} onClick={save}>{isSaving ? 'Saqlanmoqda…' : 'Davomatni saqlash'}</button></div>
    </section>

    <Modal open={Boolean(noteStudent)} onCancel={() => setNoteStudent(null)} title={noteStudent ? `${noteStudent.fullName} — izoh` : 'Izoh'} footer={null} width={480}>
      <Input.TextArea rows={4} maxLength={500} showCount value={noteStudent ? drafts[noteStudent.id]?.note : ''} placeholder="Masalan: oilaviy sabab bilan kelmadi" onChange={(event) => updateDraft(noteStudent.id, { note: event.target.value })} />
      <div className="attendance-note-actions"><button onClick={() => setNoteStudent(null)}>Tayyor</button></div>
    </Modal>
  </div>
}

export function AttendancePage() {
  const [activeTab, setActiveTab] = useState('marking')
  return <div className="attendance-module">
    <nav className="attendance-tabs" aria-label="Davomat bo‘limlari">
      <button className={activeTab === 'marking' ? 'active' : ''} onClick={() => setActiveTab('marking')}>Davomat belgilash</button>
      <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>Davomat tarixi</button>
      <button className={activeTab === 'employees' ? 'active' : ''} onClick={() => setActiveTab('employees')}>Xodimlar FaceID</button>
    </nav>
    {activeTab === 'marking' ? <AttendanceMarkingTab /> : activeTab === 'history' ? <AttendanceHistoryTab /> : <EmployeeAttendanceTab />}
  </div>
}
