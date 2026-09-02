import { useMemo, useState } from 'react'
import { DatePicker, Image, Modal, Select } from 'antd'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { apiErrorMessage, useCreateRoomMutation, useDeleteRoomMutation, useGetRoomsQuery, useGetRoomStudentsQuery, useUpdateRoomMutation } from '../../store/baseApi'
import { RoomCard } from './RoomCard'
import { RoomFormModal } from './RoomFormModal'
import { categoryOptions, genderOptions, statusOptions } from './roomConstants'
import './Rooms.css'
import { canEditOrDelete } from '../../utils/permissions'

export function RoomsPage({ currentEmployee }) {
  const navigate = useNavigate()
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().startOf('month'))
  const period = selectedMonth.format('YYYY-MM')
  const { data, isLoading, error: listError } = useGetRoomsQuery(period)
  const [createRoom, { isLoading: creating }] = useCreateRoomMutation()
  const [updateRoom, { isLoading: updating }] = useUpdateRoomMutation()
  const [deleteRoom, { isLoading: deleting }] = useDeleteRoomMutation()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [floor, setFloor] = useState(undefined)
  const [category, setCategory] = useState(undefined)
  const [gender, setGender] = useState(undefined)
  const [status, setStatus] = useState(undefined)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [galleryRoom, setGalleryRoom] = useState(null)
  const [residentsRoom, setResidentsRoom] = useState(null)
  const { data: residentsData, isLoading: residentsLoading, error: residentsError } = useGetRoomStudentsQuery({ roomId: residentsRoom?.id, period }, { skip: !residentsRoom })
  const rooms = useMemo(() => data?.rooms || [], [data?.rooms])
  const floors = useMemo(() => [...new Set(rooms.map((room) => String(room.floor)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((value) => ({ value, label: `${value}-qavat` })), [rooms])
  const filtered = useMemo(() => rooms.filter((room) => {
    const text = query.trim().toLowerCase()
    return (!text || [room.roomNumber, room.block, room.category].some((value) => String(value).toLowerCase().includes(text))) && (!floor || room.floor === floor) && (!category || room.category === category) && (!gender || room.gender === gender) && (!status || room.status === status)
  }), [rooms, query, floor, category, gender, status])
  const roomsByFloor = useMemo(() => {
    const groupedRooms = new Map()
    filtered.forEach((room) => {
      const floorValue = String(room.floor)
      if (!groupedRooms.has(floorValue)) groupedRooms.set(floorValue, [])
      groupedRooms.get(floorValue).push(room)
    })
    return [...groupedRooms.entries()].sort(([firstFloor], [secondFloor]) => firstFloor.localeCompare(secondFloor, undefined, { numeric: true }))
  }, [filtered])
  const residentBedLabel = (bedNumber) => {
    const bed = residentsRoom?.beds?.find((item) => Number(item.number) === Number(bedNumber))
    if (!bed?.level) return `${bedNumber}-o‘rin`
    const typeLabel = bed.level === 'single' ? '[1]' : bed.level === 'lower' ? '[2.1]' : '[2.2]'
    return <>{bedNumber} <small className="room-resident-bed-type">{typeLabel}</small></>
  }

  const closeModal = () => { setModalOpen(false); setEditingRoom(null); setError('') }
  const submit = async ({ values, newImages, existingImages }) => {
    try {
      setError('')
      const formData = new FormData()
      formData.append('payload', JSON.stringify({ ...values, images: existingImages }))
      newImages.forEach((item) => formData.append('images', item.originFileObj))
      if (editingRoom) await updateRoom({ id: editingRoom.id, body: formData }).unwrap()
      else await createRoom(formData).unwrap()
      toast.success(editingRoom ? 'Xona yangilandi' : 'Xona qo‘shildi')
      closeModal()
    } catch (requestError) { setError(apiErrorMessage(requestError)) }
  }
  const remove = async (id) => {
    try { await deleteRoom(id).unwrap(); toast.success('Xona o‘chirildi') }
    catch (requestError) { toast.error(apiErrorMessage(requestError)) }
  }

  return (
    <div className="rooms-page">
      <div className="rooms-panel">
        <div className="rooms-toolbar">
          <div className="room-filters">
            <div className="room-filters-main">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Qidirish: xona raqami, blok" />
              <button className="room-filter-toggle" type="button" onClick={() => setFiltersOpen(true)} aria-label="Filterlarni ochish" title="Filterlar">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4"/></svg>
              </button>
            </div>
            <div className="room-filters-desktop">
              <DatePicker picker="month" allowClear={false} value={selectedMonth} onChange={(value) => value && setSelectedMonth(value.startOf('month'))} format="MM.YYYY" placeholder="Oy" />
              <Select size="large" allowClear classNames={{ popup: { root: 'room-filter-dropdown' } }} placeholder="Qavat" options={floors} value={floor} onChange={setFloor} />
              <Select size="large" allowClear classNames={{ popup: { root: 'room-filter-dropdown' } }} placeholder="Kategoriya" options={categoryOptions} value={category} onChange={setCategory} />
              <Select size="large" allowClear classNames={{ popup: { root: 'room-filter-dropdown' } }} placeholder="Kimlar uchun" options={genderOptions} value={gender} onChange={setGender} />
              <Select size="large" allowClear classNames={{ popup: { root: 'room-filter-dropdown' } }} placeholder="Status" options={statusOptions} value={status} onChange={setStatus} />
            </div>
            <button className="add-room-btn" onClick={() => { setEditingRoom(null); setModalOpen(true) }}>+ Yangi xona</button>
          </div>
        </div>
        {listError && <div className="form-error">{apiErrorMessage(listError)}</div>}
        {isLoading ? <div className="rooms-loading">Xonalar yuklanmoqda…</div> : <div className="rooms-grid">{roomsByFloor.map(([floorValue, floorRooms]) => <section className="rooms-floor-group" key={floorValue} aria-labelledby={`floor-${floorValue}-title`}><div className="rooms-floor-heading"><h2 id={`floor-${floorValue}-title`}>{floorValue}-qavat</h2><span aria-hidden="true" /></div><div className="rooms-floor-grid">{floorRooms.map((room) => <RoomCard key={room.id} room={room} deleting={deleting} canManage={canEditOrDelete(currentEmployee)} onResidents={setResidentsRoom} onView={setGalleryRoom} onEdit={(item) => { setEditingRoom(item); setModalOpen(true) }} onDelete={remove} />)}</div></section>)}{!filtered.length && <div className="rooms-empty">Xonalar topilmadi</div>}</div>}
      </div>
      <RoomFormModal open={modalOpen} room={editingRoom} loading={creating || updating} error={error} onClose={closeModal} onSubmit={submit} />
      <Modal open={filtersOpen} onCancel={() => setFiltersOpen(false)} footer={null} title="Filterlar" destroyOnHidden rootClassName="room-filters-modal">
        <div className="room-filters-mobile">
          <DatePicker picker="month" allowClear={false} value={selectedMonth} onChange={(value) => value && setSelectedMonth(value.startOf('month'))} format="MM.YYYY" placeholder="Oy" />
          <Select size="large" allowClear classNames={{ popup: { root: 'room-filter-dropdown' } }} placeholder="Qavat" options={floors} value={floor} onChange={setFloor} />
          <Select size="large" allowClear classNames={{ popup: { root: 'room-filter-dropdown' } }} placeholder="Kategoriya" options={categoryOptions} value={category} onChange={setCategory} />
          <Select size="large" allowClear classNames={{ popup: { root: 'room-filter-dropdown' } }} placeholder="Kimlar uchun" options={genderOptions} value={gender} onChange={setGender} />
          <Select size="large" allowClear classNames={{ popup: { root: 'room-filter-dropdown' } }} placeholder="Status" options={statusOptions} value={status} onChange={setStatus} />
        </div>
      </Modal>
      <Modal open={Boolean(galleryRoom)} onCancel={() => setGalleryRoom(null)} footer={null} width={900} title={galleryRoom ? `Xona ${galleryRoom.roomNumber} rasmlari` : ''} rootClassName="room-gallery-modal">
        {galleryRoom?.images?.length ? <Image.PreviewGroup><div className="room-gallery-grid">{galleryRoom.images.map((image, index) => <Image key={image.url} src={image.displayUrl || image.url} alt={`Xona rasmi ${index + 1}`} />)}</div></Image.PreviewGroup> : <div className="room-gallery-empty">Bu xona uchun hali rasm qo‘shilmagan</div>}
      </Modal>
      <Modal open={Boolean(residentsRoom)} onCancel={() => setResidentsRoom(null)} footer={null} width={820} title={residentsRoom ? `Xona ${residentsRoom.roomNumber} — biriktirilgan talabalar` : ''} rootClassName="room-residents-modal">
        {residentsError && <div className="form-error">{apiErrorMessage(residentsError)}</div>}
        {residentsLoading ? <div className="room-residents-state">Talabalar yuklanmoqda…</div> : <div className="room-residents-table-wrap"><table className="room-residents-table"><thead><tr><th>O‘rin</th><th>Talaba</th><th>Shartnoma</th><th>Muddati</th></tr></thead><tbody>{(residentsData?.students || []).map(({ student, contract }) => <tr key={contract.id}><td data-label="O‘rin"><strong>{residentBedLabel(contract.bedNumber)}</strong></td><td data-label="Talaba"><button className="room-resident-person" onClick={() => navigate(`/student/${student.id}`)} title="Talaba profilini ochish">{student.photo ? <img src={student.photo.thumbnailUrl || student.photo.url} alt="" /> : <span>{student.fullName?.[0]}</span>}<div><strong>{student.fullName}</strong><small>{student.phone}</small></div></button></td><td data-label="Shartnoma"><strong>{contract.contractNumber}</strong></td><td data-label="Muddati">{dayjs(contract.startDate).format('DD.MM.YYYY')}<small>{dayjs(contract.endDate).format('DD.MM.YYYY')} gacha</small></td></tr>)}{!residentsData?.students?.length && <tr><td colSpan="4" className="room-residents-state">Bu xonaga hali talaba biriktirilmagan</td></tr>}</tbody></table></div>}
      </Modal>
    </div>
  )
}
