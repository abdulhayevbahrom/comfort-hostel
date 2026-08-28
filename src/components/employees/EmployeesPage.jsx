import { memo, useCallback, useMemo, useState } from 'react'
import { Button, Checkbox, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Popover, Select } from 'antd'
import dayjs from 'dayjs'
import { toast } from 'react-toastify'
import {
  apiErrorMessage,
  useAssignEmployeeRoomsMutation,
  useCreateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetEmployeesQuery,
  useGetRoomsQuery,
  useUpdateEmployeeMutation,
} from '../../store/baseApi'
import './Employees.css'
import { canEditOrDelete } from '../../utils/permissions'

const initialForm = {
  firstname: '',
  lastname: '',
  position: '',
  salary: '',
  payrollStartMonth: dayjs(),
  payrollOpeningBalance: 0,
  canLogin: false,
  role: 'employee',
  login: '',
  password: '',
  sections: [],
  assignedRooms: [],
  faceAccessEnabled: true,
  workSchedule: {
    checkInTime: '09:00',
    checkOutTime: '18:00',
    workDays: [1, 2, 3, 4, 5, 6],
    lateAfterMinutes: 0,
    earlyLeaveMinutes: 0,
    useTimePenalty: false,
    penaltyPerMinute: 0,
    penaltyStartDate: dayjs().format('YYYY-MM-DD'),
  },
}

const workDayOptions = [{ label: 'Du', value: 1 }, { label: 'Se', value: 2 }, { label: 'Ch', value: 3 }, { label: 'Pa', value: 4 }, { label: 'Ju', value: 5 }, { label: 'Sh', value: 6 }, { label: 'Ya', value: 0 }]

const sectionOptions = [
  { label: 'Bosh sahifa', value: 'dashboard' },
  { label: 'Talabalar', value: 'students' },
  { label: 'Shartnomalar', value: 'contracts' },
  { label: 'Xonalar', value: 'rooms' },
  { label: 'Davomat', value: 'attendance' },
  { label: 'FaceID nazorat', value: 'face-access' },
  { label: 'To‘lovlar', value: 'payments' },
  { label: 'Kassa', value: 'cash' },
  { label: 'Qarzdorlar', value: 'debtors' },
  { label: 'Xodimlar', value: 'employees' },
  { label: 'Oyliklar', value: 'salaries' },
  { label: 'Xarajatlar', value: 'expenses' },
  { label: 'Hisobot', value: 'reports' },
  { label: 'Sozlamalar', value: 'settings' },
]

const sectionLabels = new Map(sectionOptions.map((item) => [item.value, item.label]))

const EmployeeRow = memo(function EmployeeRow({ employee, isDeleting, canManage, onEdit, onManageRooms, onDelete }) {
  return (
    <tr>
      <td data-label="F.I.SH"><strong>{employee.firstname} {employee.lastname}</strong><small className="employee-face-code">{employee.faceIdCode || 'FaceID kodi yo‘q'}</small></td>
      <td data-label="Lavozim">{employee.position}</td>
      <td data-label="Oylik">{Number(employee.salary || 0).toLocaleString('uz-UZ')}</td>
      <td data-label="Rol"><span className={`employee-role ${employee.role}`}>{employee.role === 'owner' || employee.role === 'admin' ? 'Owner' : employee.role === 'manager' ? 'Menejer' : employee.role === 'cashier' ? 'Kassir' : 'Xodim'}</span></td>
      <td data-label="Login">{employee.login || '-'}</td>
      <td data-label="Ruxsatlar">
        {(employee.sections || []).length ? (
          <Popover
            trigger="click"
            placement="left"
            overlayClassName="hotel-popover"
            content={<div className="sections-popover">{employee.sections.map((section) => <div key={section} className="sections-popover-item">{sectionLabels.get(section) || section}</div>)}</div>}
          >
            <button className="section-view-btn" type="button">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M5 7H19M5 12H19M5 17H19" stroke="currentColor" strokeWidth="2" /></svg>
              <span>{employee.sections.length} ta</span>
            </button>
          </Popover>
        ) : '-'}
      </td>
      <td data-label="Biriktirilgan xonalar">
        {canManage ? <button className="section-view-btn" type="button" onClick={() => onManageRooms(employee)}><span>Xonalar ({(employee.assignedRooms || []).length})</span></button> : `${(employee.assignedRooms || []).length} ta`}
      </td>
      <td data-label="Amal">
        {canManage ? <div className="table-action-wrap">
          <button className="hotel-icon-btn" onClick={() => onEdit(employee)} aria-label="Tahrirlash" title="Tahrirlash">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M4 20H8L18 10L14 6L4 16V20Z" stroke="currentColor" strokeWidth="2"/><path d="M12 8L16 12" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
          <Popconfirm
            title="Xodimni o‘chirish"
            description="Ushbu amalni tasdiqlaysizmi?"
            okText="O‘chirish"
            cancelText="Bekor"
            okButtonProps={{ danger: true, loading: isDeleting }}
            onConfirm={() => onDelete(employee.id)}
            overlayClassName="hotel-popconfirm"
          >
            <button className="hotel-icon-btn danger" disabled={isDeleting} aria-label="O‘chirish" title="O‘chirish">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M4 7H20M9 7V5H15V7M7 7L8 20H16L17 7" stroke="currentColor" strokeWidth="2"/></svg>
            </button>
          </Popconfirm>
        </div> : '—'}
      </td>
    </tr>
  )
})

export function EmployeesPage({ currentEmployee }) {
  const [form] = Form.useForm()
  const { data, isLoading, error: listError } = useGetEmployeesQuery()
  const { data: roomsData, isLoading: areRoomsLoading } = useGetRoomsQuery()
  const [createEmployee, { isLoading: isCreating }] = useCreateEmployeeMutation()
  const [updateEmployee, { isLoading: isUpdating }] = useUpdateEmployeeMutation()
  const [assignEmployeeRooms, { isLoading: isAssigningRooms }] = useAssignEmployeeRoomsMutation()
  const [deleteEmployee, { isLoading: isDeleting }] = useDeleteEmployeeMutation()
  const [query, setQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [error, setError] = useState('')
  const [roomQuery, setRoomQuery] = useState('')
  const [roomBlock, setRoomBlock] = useState()
  const [roomFloor, setRoomFloor] = useState()
  const [roomEmployee, setRoomEmployee] = useState(null)
  const [selectedRoomIds, setSelectedRoomIds] = useState([])
  const canLogin = Form.useWatch('canLogin', form)
  const useTimePenalty = Form.useWatch(['workSchedule', 'useTimePenalty'], form)
  const employees = useMemo(() => data?.employees || [], [data?.employees])
  const rooms = useMemo(() => roomsData?.rooms || [], [roomsData?.rooms])
  const roomBlocks = useMemo(() => [...new Set(rooms.map((room) => room.block).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [rooms])
  const roomFloors = useMemo(() => [...new Set(rooms.filter((room) => !roomBlock || room.block === roomBlock).map((room) => String(room.floor)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [roomBlock, rooms])
  const filteredRooms = useMemo(() => {
    const search = roomQuery.trim().toLowerCase()
    return rooms.filter((room) => (
      (!search || String(room.roomNumber).toLowerCase().includes(search))
      && (!roomBlock || room.block === roomBlock)
      && (!roomFloor || room.floor === roomFloor)
    ))
  }, [roomBlock, roomFloor, roomQuery, rooms])
  const canManage = canEditOrDelete(currentEmployee)

  const filteredEmployees = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return employees
    return employees.filter((employee) => {
      const fullName = `${employee.firstname || ''} ${employee.lastname || ''}`.toLowerCase()
      return fullName.includes(value) || String(employee.position || '').toLowerCase().includes(value) || String(employee.login || '').toLowerCase().includes(value)
    })
  }, [employees, query])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setEditingId('')
    form.resetFields()
    setError('')
  }, [form])

  const openCreateModal = useCallback(() => {
    setError('')
    setEditingId('')
    form.setFieldsValue(initialForm)
    setIsModalOpen(true)
  }, [form])

  const openEditModal = useCallback((employee) => {
    setError('')
    setEditingId(employee.id)
    form.setFieldsValue({
      firstname: employee.firstname || '',
      lastname: employee.lastname || '',
      position: employee.position || '',
      salary: Number(employee.salary || 0),
      payrollStartMonth: dayjs(employee.payrollStartMonth || undefined),
      payrollOpeningBalance: Number(employee.payrollOpeningBalance || 0),
      canLogin: Boolean(employee.canLogin),
      role: employee.role === 'admin' ? 'owner' : employee.role || 'employee',
      login: employee.login || '',
      password: '',
      sections: employee.sections || [],
      assignedRooms: (employee.assignedRooms || []).map((room) => room.id),
      faceAccessEnabled: employee.faceAccessEnabled !== false,
      workSchedule: {
        checkInTime: employee.workSchedule?.checkInTime || '09:00',
        checkOutTime: employee.workSchedule?.checkOutTime || '18:00',
        workDays: employee.workSchedule?.workDays || [1, 2, 3, 4, 5, 6],
        lateAfterMinutes: Number(employee.workSchedule?.lateAfterMinutes || 0),
        earlyLeaveMinutes: Number(employee.workSchedule?.earlyLeaveMinutes || 0),
        useTimePenalty: Boolean(employee.workSchedule?.useTimePenalty),
        penaltyPerMinute: Number(employee.workSchedule?.penaltyPerMinute || 0),
        penaltyStartDate: employee.workSchedule?.penaltyStartDate || dayjs().format('YYYY-MM-DD'),
      },
    })
    setIsModalOpen(true)
  }, [form])

  const openRoomsModal = useCallback((employee) => {
    setRoomEmployee(employee)
    setSelectedRoomIds((employee.assignedRooms || []).map((room) => room.id))
    setRoomQuery('')
    setRoomBlock(undefined)
    setRoomFloor(undefined)
    setError('')
  }, [])

  const closeRoomsModal = useCallback(() => {
    setRoomEmployee(null)
    setSelectedRoomIds([])
  }, [])

  const saveAssignedRooms = useCallback(async () => {
    if (!roomEmployee) return
    try {
      await assignEmployeeRooms({ id: roomEmployee.id, assignedRooms: selectedRoomIds }).unwrap()
      toast.success('Xonalar biriktirildi')
      closeRoomsModal()
    } catch (requestError) {
      const message = apiErrorMessage(requestError)
      setError(message)
      toast.error(message)
    }
  }, [assignEmployeeRooms, closeRoomsModal, roomEmployee, selectedRoomIds])

  const toggleRoom = useCallback((roomId) => {
    setSelectedRoomIds((current) => current.includes(roomId) ? current.filter((id) => id !== roomId) : [...current, roomId])
  }, [])

  const onSubmit = useCallback(async (values) => {
    setError('')
    const payload = {
      firstname: String(values.firstname || '').trim(),
      lastname: String(values.lastname || '').trim(),
      position: String(values.position || '').trim(),
      salary: Number(values.salary),
      payrollStartMonth: values.payrollStartMonth.format('YYYY-MM'),
      payrollOpeningBalance: Number(values.payrollOpeningBalance || 0),
      canLogin: Boolean(values.canLogin),
      sections: values.sections || [],
      role: values.role || 'employee',
      assignedRooms: values.assignedRooms || [],
      faceAccessEnabled: values.faceAccessEnabled !== false,
      workSchedule: {
        checkInTime: values.workSchedule?.checkInTime,
        checkOutTime: values.workSchedule?.checkOutTime,
        workDays: values.workSchedule?.workDays || [],
        lateAfterMinutes: Number(values.workSchedule?.lateAfterMinutes || 0),
        earlyLeaveMinutes: Number(values.workSchedule?.earlyLeaveMinutes || 0),
        useTimePenalty: Boolean(values.workSchedule?.useTimePenalty),
        penaltyPerMinute: Number(values.workSchedule?.penaltyPerMinute || 0),
        penaltyStartDate: values.workSchedule?.penaltyStartDate,
      },
    }
    if (payload.canLogin) {
      payload.login = String(values.login || '').trim()
      if (values.password) payload.password = values.password
    }

    try {
      if (editingId) {
        await updateEmployee({ id: editingId, ...payload }).unwrap()
        toast.success('Xodim yangilandi')
      } else {
        await createEmployee(payload).unwrap()
        toast.success('Xodim qo‘shildi')
      }
      closeModal()
    } catch (requestError) {
      const message = apiErrorMessage(requestError)
      setError(message)
      toast.error(message)
    }
  }, [closeModal, createEmployee, editingId, updateEmployee])

  const onDelete = useCallback(async (id) => {
    try {
      await deleteEmployee(id).unwrap()
      toast.success('Xodim o‘chirildi')
    } catch (requestError) {
      const message = apiErrorMessage(requestError)
      setError(message)
      toast.error(message)
    }
  }, [deleteEmployee])

  return (
    <div className="hotel-employees-page">
      <div className="hotel-page-card">
        <div className="hotel-table-toolbar">
          <h2>Xodimlar ro‘yxati</h2>
          <div className="hotel-toolbar-actions">
            <input className="hotel-search-input" placeholder="Qidirish: ism, login, lavozim" value={query} onChange={(event) => setQuery(event.target.value)} />
            {canManage && <button className="hotel-primary-btn" onClick={openCreateModal}>+ Yangi xodim</button>}
          </div>
        </div>

        {listError && <div className="form-error">{apiErrorMessage(listError)}</div>}
        {isLoading ? (
          <div className="hotel-page-loader"><span />Xodimlar ro‘yxati tayyorlanmoqda</div>
        ) : (
          <div className="hotel-table-wrap">
            <table className="hotel-table">
              <thead><tr><th>F.I.SH</th><th>Lavozim</th><th>Oylik</th><th>Rol</th><th>Login</th><th>Ruxsatlar</th><th>Xonalar</th><th>Amal</th></tr></thead>
              <tbody>
                {filteredEmployees.map((employee) => <EmployeeRow key={employee.id} employee={employee} isDeleting={isDeleting} canManage={canManage} onEdit={openEditModal} onManageRooms={openRoomsModal} onDelete={onDelete} />)}
                {!filteredEmployees.length && <tr><td colSpan={8} className="hotel-table-empty">Hech narsa topilmadi</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={isModalOpen} onCancel={closeModal} footer={null} destroyOnHidden width={760} rootClassName="hotel-employee-modal" title={editingId ? 'Xodimni tahrirlash' : 'Yangi xodim qo‘shish'}>
        <Form form={form} layout="vertical" initialValues={initialForm} onFinish={onSubmit} requiredMark={false} onValuesChange={(changed) => {
          if (Object.prototype.hasOwnProperty.call(changed, 'canLogin') && !changed.canLogin) form.setFieldsValue({ login: '', password: '', sections: [] })
        }}>
          <div className="employee-form-grid">
            <Form.Item name="firstname" label="Ism" rules={[{ required: true, whitespace: true, message: 'Ism majburiy' }]}><Input placeholder="Ism kiriting" /></Form.Item>
            <Form.Item name="lastname" label="Familiya" rules={[{ required: true, whitespace: true, message: 'Familiya majburiy' }]}><Input placeholder="Familiya kiriting" /></Form.Item>
            <Form.Item name="position" label="Lavozim" rules={[{ required: true, whitespace: true, message: 'Lavozim majburiy' }]}><Input placeholder="Lavozim kiriting" /></Form.Item>
            <Form.Item name="salary" label="Oylik" rules={[{ required: true, message: 'Oylik majburiy' }, { type: 'number', min: 1, message: 'Eng kamida 1 so‘m kiriting' }]}>
              <InputNumber min={1} precision={0} style={{ width: '100%' }} formatter={(value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(value) => String(value || '').replace(/[^\d]/g, '').replace(/^0+/, '')} />
            </Form.Item>
            <Form.Item name="payrollStartMonth" label="Oylik hisobi boshlanadigan oy" rules={[{ required: true, message: 'Oyni tanlang' }]}><DatePicker picker="month" format="MMMM YYYY" allowClear={false} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="payrollOpeningBalance" label="Oldingi qoldiq (+ haqdor, − qarzdor)"><InputNumber precision={0} style={{ width: '100%' }} formatter={(value) => String(value ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(value) => String(value || '').replace(/[^\d-]/g, '')} /></Form.Item>
          </div>
          <section className="employee-schedule-section">
            <h3>FaceID va ish grafigi</h3>
            <Form.Item name="faceAccessEnabled" valuePropName="checked" className="hotel-checkbox-line"><Checkbox>FaceID orqali eshik va davomat faol</Checkbox></Form.Item>
            <div className="employee-form-grid">
              <Form.Item name={['workSchedule', 'checkInTime']} label="Ish boshlanishi" rules={[{ pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: 'HH:mm formatida kiriting' }]}><Input placeholder="09:00" /></Form.Item>
              <Form.Item name={['workSchedule', 'checkOutTime']} label="Ish tugashi" rules={[{ pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: 'HH:mm formatida kiriting' }]}><Input placeholder="18:00" /></Form.Item>
              <Form.Item name={['workSchedule', 'lateAfterMinutes']} label="Kechikish imtiyozi (daq.)"><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name={['workSchedule', 'earlyLeaveMinutes']} label="Erta ketish imtiyozi (daq.)"><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name={['workSchedule', 'penaltyStartDate']} label="Jarima hisobi boshlanish sanasi" rules={[{ required: true, pattern: /^\d{4}-\d{2}-\d{2}$/, message: 'YYYY-MM-DD formatida kiriting' }]}><Input placeholder="2026-08-28" /></Form.Item>
            </div>
            <Form.Item name={['workSchedule', 'workDays']} label="Ish kunlari" rules={[{ required: true, message: 'Kamida bitta ish kunini tanlang' }]}><Checkbox.Group options={workDayOptions} /></Form.Item>
            <Form.Item name={['workSchedule', 'useTimePenalty']} valuePropName="checked" className="hotel-checkbox-line"><Checkbox>Har kechikkan/erta ketgan daqiqa uchun qat’iy jarima</Checkbox></Form.Item>
            {useTimePenalty && <Form.Item name={['workSchedule', 'penaltyPerMinute']} label="1 daqiqa jarimasi" rules={[{ required: true, type: 'number', min: 0, message: 'Jarima summasini kiriting' }]}><InputNumber min={0} precision={0} addonAfter="so‘m" style={{ width: '100%' }} /></Form.Item>}
          </section>
          <Form.Item name="canLogin" valuePropName="checked" className="hotel-checkbox-line"><Checkbox>Dasturga kira oladi</Checkbox></Form.Item>
          {canLogin && <>
            <Form.Item name="role" label="Xodim roli" rules={[{ required: true }]}><Select options={[{ value: 'employee', label: 'Xodim' }, { value: 'manager', label: 'Menejer' }, { value: 'cashier', label: 'Kassir' }, { value: 'owner', label: 'Owner' }]} /></Form.Item>
            <div className="employee-form-grid">
              <Form.Item name="login" label="Login" rules={[{ required: true, whitespace: true, min: 3, message: 'Login kamida 3 ta belgi bo‘lsin' }]}><Input placeholder="Login kiriting" /></Form.Item>
              <Form.Item name="password" label={editingId ? 'Yangi parol (ixtiyoriy)' : 'Parol'} rules={[{ required: !editingId, min: 8, message: 'Parol kamida 8 ta belgi bo‘lsin' }]}><Input.Password placeholder="Parol kiriting" /></Form.Item>
            </div>
            <Form.Item name="sections" label="Qaysi qismlarga kiradi"><Checkbox.Group options={sectionOptions} /></Form.Item>
          </>}
          {error && <div className="form-error">{error}</div>}
          <div className="hotel-form-actions"><Button htmlType="submit" loading={isCreating || isUpdating} className="hotel-submit-btn">{editingId ? 'Yangilash' : 'Saqlash'}</Button><Button onClick={closeModal}>Yopish</Button></div>
        </Form>
      </Modal>

      <Modal open={Boolean(roomEmployee)} onCancel={closeRoomsModal} footer={null} width={760} rootClassName="hotel-employee-modal" title={`${roomEmployee?.firstname || ''} ${roomEmployee?.lastname || ''} — xonalarni biriktirish`}>
        <div className="employee-room-filters">
          <Input allowClear value={roomQuery} onChange={(event) => setRoomQuery(event.target.value)} placeholder="Xona raqamini qidiring" />
          <Select allowClear value={roomBlock} onChange={(value) => { setRoomBlock(value); setRoomFloor(undefined) }} placeholder="Barcha bloklar" options={roomBlocks.map((block) => ({ value: block, label: block }))} />
          <Select allowClear value={roomFloor} onChange={setRoomFloor} placeholder="Barcha qavatlar" options={roomFloors.map((floor) => ({ value: floor, label: `${floor}-qavat` }))} />
        </div>
        <div className="employee-room-summary">Tanlangan: {selectedRoomIds.length} ta · Ko‘rsatilgan: {filteredRooms.length} ta</div>
        <div className="employee-room-table-wrap">
          <table className="employee-room-table">
            <thead><tr><th>Tanlash</th><th>Xona</th><th>Blok</th><th>Qavat</th><th>Sig‘im</th></tr></thead>
            <tbody>
              {filteredRooms.map((room) => <tr key={room.id} onClick={() => toggleRoom(room.id)} className={selectedRoomIds.includes(room.id) ? 'selected' : ''}><td><Checkbox checked={selectedRoomIds.includes(room.id)} onClick={(event) => event.stopPropagation()} onChange={() => toggleRoom(room.id)} /></td><td>{room.roomNumber}</td><td>{room.block}</td><td>{room.floor}</td><td>{room.capacity}</td></tr>)}
              {!areRoomsLoading && !filteredRooms.length && <tr><td colSpan={5} className="hotel-table-empty">Xona topilmadi</td></tr>}
            </tbody>
          </table>
          {areRoomsLoading && <div className="employee-rooms-loading">Xonalar yuklanmoqda...</div>}
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="hotel-form-actions"><Button onClick={saveAssignedRooms} loading={isAssigningRooms} className="hotel-submit-btn">Saqlash</Button><Button onClick={closeRoomsModal}>Yopish</Button></div>
      </Modal>
    </div>
  )
}
