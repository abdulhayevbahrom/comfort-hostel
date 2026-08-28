import { useMemo, useState } from 'react'
import { DatePicker, Pagination, Select } from 'antd'
import dayjs from 'dayjs'
import { apiErrorMessage, useGetAttendanceHistoryListQuery, useGetRoomsQuery } from '../../store/baseApi'
import './AttendanceHistory.css'

const statusMeta = {
  present: { icon: '✓', label: 'Keldi' },
  absent: { icon: '×', label: 'Kelmadi' },
  late: { icon: '◷', label: 'Kech qoldi' },
}

export function AttendanceHistoryTab() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [block, setBlock] = useState('')
  const [room, setRoom] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data: roomsData } = useGetRoomsQuery()
  const { data, isLoading, isFetching, error } = useGetAttendanceHistoryListQuery({ month, page, ...(block ? { block } : {}), ...(room ? { room } : {}), ...(search ? { search } : {}) })
  const blocks = useMemo(() => [...new Set((roomsData?.rooms || []).map((item) => item.block))].sort(), [roomsData?.rooms])
  const roomOptions = useMemo(() => (roomsData?.rooms || []).filter((item) => !block || item.block === block), [block, roomsData?.rooms])
  const days = useMemo(() => { const start = dayjs(`${month}-01`); return Array.from({ length: start.daysInMonth() }, (_, index) => start.date(index + 1)) }, [month])
  const summary = data?.summary || {}
  const attendancePercent = summary.totalRecords ? Math.round((summary.present || 0) / summary.totalRecords * 100) : 0

  return <div className="attendance-history-page">
    <section className="history-summary-cards">
      <article className="total"><span>Jami yozuvlar</span><strong>{summary.totalRecords || 0}</strong><small>{month} oyi</small></article>
      <article className="present"><span>Keldi</span><strong>{summary.present || 0}</strong><small>{attendancePercent}% davomat</small></article>
      <article className="absent"><span>Kelmadi</span><strong>{summary.absent || 0}</strong><small>kelmagan</small></article>
      <article className="late"><span>Kech qoldi</span><strong>{summary.late || 0}</strong><small>kechikkan</small></article>
    </section>
    <section className="history-table-card">
      <div className="history-filters">
        <div className="attendance-search"><span>⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Talaba, telefon yoki xona" /></div>
        <Select allowClear value={block || undefined} placeholder="Barcha bloklar" onChange={(value = '') => { setBlock(value); setRoom(''); setPage(1) }} options={blocks.map((value) => ({ value, label: value }))} />
        <Select allowClear value={room || undefined} placeholder="Barcha xonalar" onChange={(value = '') => { setRoom(value); setPage(1) }} options={roomOptions.map((item) => ({ value: item.id, label: `${item.roomNumber}-xona` }))} />
        <DatePicker picker="month" allowClear={false} value={dayjs(month)} format="MMMM YYYY" onChange={(value) => { setMonth(value.format('YYYY-MM')); setPage(1) }} />
      </div>
      {error && <div className="form-error">{apiErrorMessage(error)}</div>}
      {isLoading ? <div className="attendance-state">Davomat tarixi yuklanmoqda…</div> : <div className={`history-matrix-wrap ${isFetching ? 'refreshing' : ''}`}><table className="history-matrix">
        <thead><tr><th className="student-col">Talaba</th><th className="room-col">Xona</th>{days.map((day) => <th key={day.format('DD')}><b>{day.format('D')}</b><small>{day.format('dd')}</small></th>)}<th className="count present">Keldi</th><th className="count absent">Kelmadi</th><th className="count late">Kech</th></tr></thead>
        <tbody>{(data?.rows || []).map((row) => { const byDate = new Map(row.records.map((item) => [item.attendanceDate, item])); const counts = { present: 0, absent: 0, late: 0 }; row.records.forEach((item) => { counts[item.status] += 1 }); return <tr key={row.student.id}>
          <td className="student-col"><div className="history-student">{row.student.photo ? <img src={row.student.photo.thumbnailUrl || row.student.photo.url} alt="" /> : <span>{row.student.fullName?.[0]}</span>}<div><strong>{row.student.fullName}</strong><small>{row.student.phone}</small></div></div></td>
          <td className="room-col"><strong>{row.room.block} · {row.room.roomNumber}</strong><small>{row.student.university?.shortName || row.student.university?.name || '—'}</small></td>
          {days.map((day) => { const record = byDate.get(day.format('YYYY-MM-DD')); const meta = statusMeta[record?.status]; return <td key={day.format('DD')} className={`day-cell ${record?.status || 'empty'}`} title={record ? `${day.format('DD.MM.YYYY')} — ${meta.label}${record.note ? `: ${record.note}` : ''}` : 'Belgilanmagan'}>{meta ? <span>{meta.icon}</span> : '—'}</td> })}
          <td className="count present"><b>{counts.present}</b></td><td className="count absent"><b>{counts.absent}</b></td><td className="count late"><b>{counts.late}</b></td>
        </tr>})}{!data?.rows?.length && <tr><td colSpan={days.length + 5} className="attendance-state">Tanlangan oy va filtr bo‘yicha davomat tarixi yo‘q</td></tr>}</tbody>
      </table></div>}
      {(data?.pagination?.total || 0) > 25 && <div className="attendance-pagination"><span>Jami {data.pagination.total} ta talaba</span><Pagination current={data.pagination.page} pageSize={25} total={data.pagination.total} showSizeChanger={false} onChange={setPage} /></div>}
    </section>
  </div>
}
