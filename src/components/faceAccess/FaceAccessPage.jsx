import { Button, DatePicker, Form, Input, Modal, Popconfirm, Select } from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'
import { toast } from 'react-toastify'
import {
  apiErrorMessage,
  API_URL,
  useCreateFaceDeviceMutation,
  useGetFaceAccessStatesQuery,
  useGetFaceDevicesQuery,
  useGetStudentPresenceQuery,
  useGetStudentStaySessionsQuery,
  useResetFaceAccessStateMutation,
  useUpdateFaceDeviceMutation,
} from '../../store/baseApi'
import './FaceAccess.css'
import './FaceAccessDevices.css'

const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const dateTime = (value) => value ? new Date(value).toLocaleString('uz-UZ') : '—'
const dateOnly = (value) => value ? new Date(value).toLocaleDateString('uz-UZ') : '—'
const timeOnly = (value) => value ? new Date(value).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'
const directionName = (value) => value === 'OUT' ? 'Chiqish' : value === 'IN' ? 'Kirish' : 'Kirish/chiqish'
const durationText = (minutes) => {
  const value = Math.max(0, Math.round(Number(minutes) || 0))
  const hours = Math.floor(value / 60)
  const rest = value % 60
  return hours ? `${hours} soat ${rest} daqiqa` : `${rest} daqiqa`
}

export function FaceAccessPage({ currentEmployee }) {
  const [deviceForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('presence')
  const [sessionMonth, setSessionMonth] = useState(dayjs().format('YYYY-MM'))
  const [deviceModal, setDeviceModal] = useState(false)
  const canManageDevices = ['owner', 'admin'].includes(currentEmployee?.role)
  const canReset = ['owner', 'admin'].includes(currentEmployee?.role)
  const { data: stateData, isLoading: statesLoading, error: stateError } = useGetFaceAccessStatesQuery()
  const { data: presenceData, isLoading: presenceLoading, error: presenceError } = useGetStudentPresenceQuery()
  const { data: sessionData, isLoading: sessionsLoading, error: sessionsError } = useGetStudentStaySessionsQuery({ month: sessionMonth, limit: 300 })
  const { data: deviceData, isLoading: devicesLoading, error: deviceError } = useGetFaceDevicesQuery(undefined, { skip: !canManageDevices })
  const [resetState, { isLoading: resetting }] = useResetFaceAccessStateMutation()
  const [createDevice, { isLoading: creatingDevice }] = useCreateFaceDeviceMutation()
  const [updateDevice, { isLoading: updatingDevice }] = useUpdateFaceDeviceMutation()
  const states = stateData?.states || []
  const presenceRows = presenceData?.rows || []
  const presenceSummary = presenceData?.summary || { total: 0, inside: 0, outside: 0, unknown: 0 }
  const sessions = sessionData?.sessions || []
  const devices = deviceData?.devices || []
  const callbackUrl = (device) => `${API_URL.replace(/\/$/, '')}/faceid/device/event/${device.deviceKey}`

  const reset = async (studentId) => {
    try {
      await resetState(studentId).unwrap()
      toast.success('FaceID SMS ogohlantirish hisoblagichi nollandi')
    } catch (error) { toast.error(apiErrorMessage(error)) }
  }

  const addDevice = async (values) => {
    try {
      await createDevice({ ...values, transport: 'http_listening', controlMode: 'attendance_only', doorControlEnabled: false }).unwrap()
      toast.success(values.direction === 'OUT' ? 'Chiqish qurilmasi saqlandi' : 'Kirish qurilmasi saqlandi')
      setDeviceModal(false)
      deviceForm.resetFields()
    } catch (error) { toast.error(apiErrorMessage(error)) }
  }
  const toggleDevice = async (device, field) => {
    try { await updateDevice({ id: device.id, [field]: !device[field] }).unwrap(); toast.success('Qurilma holati yangilandi') } catch (error) { toast.error(apiErrorMessage(error)) }
  }
  const copyCallback = async (device) => {
    try { await navigator.clipboard.writeText(callbackUrl(device)); toast.success('Callback manzili nusxalandi') } catch { toast.info(callbackUrl(device)) }
  }

  return <div className="face-access-page">
    <section className="face-access-hero">
      <div><small>HIKVISION DS-K1T341CMF</small><h2>FaceID kirish-chiqish nazorati</h2><p>Davomat, qarzdorlik SMSi va talabaning binodagi joriy holati.</p></div>
      <div className="face-access-summary">
        <article><span>Binoda</span><strong>{presenceSummary.inside}</strong></article>
        <article><span>Tashqarida</span><strong>{presenceSummary.outside}</strong></article>
        <article><span>Hali aniqlanmagan</span><strong>{presenceSummary.unknown}</strong></article>
        <article><span>Faol qarzdorlar</span><strong>{states.length}</strong></article>
        <article><span>3/3 SMS yuborilgan</span><strong>{states.filter((item) => item.warningCount >= 3).length}</strong></article>
      </div>
    </section>

    <nav className="face-access-tabs" aria-label="FaceID bo‘limlari">
      <button className={activeTab === 'presence' ? 'active' : ''} onClick={() => setActiveTab('presence')}>Joriy holat</button>
      <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>Kirish-chiqish tarixi</button>
      <button className={activeTab === 'debt' ? 'active' : ''} onClick={() => setActiveTab('debt')}>Qarzdorlik SMS</button>
      {canManageDevices && <button className={activeTab === 'devices' ? 'active' : ''} onClick={() => setActiveTab('devices')}>Qurilmalar</button>}
    </nav>

    {activeTab === 'devices' && canManageDevices && <section className="face-access-card">
      <header><div><h3>Hikvision qurilmalar</h3><p>Kirish va chiqish terminallari alohida Callback URL orqali ishlaydi. Backend eshik buyrug‘i yubormaydi.</p></div><button onClick={() => { deviceForm.setFieldsValue({ name: 'Asosiy kirish', model: 'DS-K1T341CMF', direction: 'IN' }); setDeviceModal(true) }}>+ Qurilma</button></header>
      {deviceError ? <div className="face-access-state error">{apiErrorMessage(deviceError)}</div> : devicesLoading ? <div className="face-access-state">Yuklanmoqda…</div> : <div className="face-access-table-wrap"><table><thead><tr><th>Qurilma</th><th>Ulanish</th><th>Yo‘nalish</th><th>Vazifa</th><th>Callback URL</th><th>Amal</th></tr></thead><tbody>
        {devices.map((device) => <tr key={device.id}><td><strong>{device.name}</strong><small>{device.model}</small></td><td><code>Outbound HTTPS</code><small><span className={`device-online-dot ${device.online ? 'online' : ''}`} />{device.online ? 'Online' : 'Offline'} · HTTP Listening</small></td><td><span className={`access-chip ${device.direction === 'OUT' ? 'exit' : 'granted'}`}>{directionName(device.direction)}</span></td><td><strong>{device.direction === 'OUT' ? 'Chiqish + presence' : 'Davomat + SMS + presence'}</strong><small>Remote Verification o‘chiq</small></td><td><button className="callback-button" onClick={() => copyCallback(device)} title={callbackUrl(device)}>URL nusxalash</button></td><td><div className="face-device-actions"><button className={device.isActive ? 'danger' : ''} onClick={() => toggleDevice(device, 'isActive')} disabled={updatingDevice}>{device.isActive ? 'O‘chirish' : 'Faollashtirish'}</button></div></td></tr>)}
        {!devices.length && <tr><td colSpan="6" className="face-access-state">Hikvision qurilma qo‘shilmagan</td></tr>}
      </tbody></table></div>}
    </section>}

    {activeTab === 'presence' && <section className="face-access-card">
      <header><div><h3>Talabalarning joriy holati</h3><p>Hozirgi bitta kirish qurilmasi kirganlarni ko‘rsatadi. Chiqish terminali o‘rnatilgach holat avtomatik yopiladi.</p></div><span className="face-access-total">Jami {presenceSummary.total} talaba</span></header>
      {presenceError ? <div className="face-access-state error">{apiErrorMessage(presenceError)}</div> : presenceLoading ? <div className="face-access-state">Yuklanmoqda…</div> : <div className="face-access-table-wrap"><table><thead><tr><th>Talaba</th><th>Xona</th><th>Holat</th><th>Oxirgi kirish</th><th>Oxirgi chiqish</th><th>Oxirgi qurilma</th></tr></thead><tbody>
        {presenceRows.map((row) => <tr key={row.student.id}><td><strong>{row.student.fullName}</strong><small>{row.student.faceIdCode || 'FaceID biriktirilmagan'}</small></td><td>{row.room ? <><strong>{row.room.block ? `${row.room.block} · ` : ''}{row.room.roomNumber}-xona</strong><small>{row.room.floor}-qavat</small></> : '—'}</td><td><span className={`presence-chip ${row.status}`}>{row.status === 'inside' ? 'Binoda' : row.status === 'outside' ? 'Tashqarida' : 'Aniqlanmagan'}</span></td><td>{dateTime(row.lastEntryAt)}</td><td>{dateTime(row.lastExitAt)}</td><td><strong>{row.lastDevice?.name || '—'}</strong><small>{row.lastDirection ? directionName(row.lastDirection) : ''}</small></td></tr>)}
        {!presenceRows.length && <tr><td colSpan="6" className="face-access-state">Faol shartnomali talabalar topilmadi</td></tr>}
      </tbody></table></div>}
    </section>}

    {activeTab === 'history' && <section className="face-access-card">
      <header><div><h3>Kirish-chiqish tarixi</h3><p>Har bir kirish uchun chiqish vaqti, davomiyligi va ishlatilgan qurilmalar.</p></div><DatePicker picker="month" allowClear={false} value={dayjs(`${sessionMonth}-01`)} format="MMMM YYYY" onChange={(value) => value && setSessionMonth(value.format('YYYY-MM'))} /></header>
      {sessionsError ? <div className="face-access-state error">{apiErrorMessage(sessionsError)}</div> : sessionsLoading ? <div className="face-access-state">Yuklanmoqda…</div> : <div className="face-access-table-wrap"><table><thead><tr><th>Sana</th><th>Talaba</th><th>Kirish</th><th>Chiqish</th><th>Davomiylik</th><th>Qurilmalar</th><th>Holat</th></tr></thead><tbody>
        {sessions.map((session) => <tr key={session.id}><td>{dateOnly(session.entryAt)}</td><td><strong>{session.student?.fullName || 'Talaba o‘chirilgan'}</strong><small>{session.student?.faceIdCode || ''}</small></td><td><strong>{timeOnly(session.entryAt)}</strong><small>{session.entryDevice?.name || 'Eski event'}</small></td><td><strong>{timeOnly(session.exitAt)}</strong><small>{session.exitDevice?.name || ''}</small></td><td>{session.status === 'closed' ? durationText(session.durationMinutes) : session.status === 'open' ? 'Davom etmoqda' : 'Hisoblanmadi'}</td><td><span className="movement-route"><i>IN</i><b>→</b><i className={session.exitAt ? 'out' : ''}>{session.exitAt ? 'OUT' : '…'}</i></span></td><td><span className={`session-chip ${session.status}`}>{session.status === 'open' ? 'Binoda' : session.status === 'closed' ? 'Yakunlangan' : 'Chiqish qaydi yo‘q'}</span></td></tr>)}
        {!sessions.length && <tr><td colSpan="7" className="face-access-state">Bu oyda kirish-chiqish tarixi yo‘q</td></tr>}
      </tbody></table></div>}
    </section>}

    {activeTab === 'debt' && <section className="face-access-card">
      <header><div><h3>Qarzdorlik SMS holati</h3><p>Qarzdorga ko‘pi bilan 3 marta SMS yuboriladi. Eshik hech qachon backend tomonidan bloklanmaydi.</p></div></header>
      {stateError ? <div className="face-access-state error">{apiErrorMessage(stateError)}</div> : statesLoading ? <div className="face-access-state">Yuklanmoqda…</div> : <div className="face-access-table-wrap"><table><thead><tr><th>Talaba</th><th>FaceID kodi</th><th>Qarz</th><th>SMS</th><th>Holat</th><th>Amal</th></tr></thead><tbody>
        {states.map((state) => <tr key={state.id}><td><strong>{state.student?.fullName || 'Talaba topilmadi'}</strong><small>{state.student?.phone || ''}</small></td><td><code>{state.student?.faceIdCode || '—'}</code></td><td>{money(state.lastDebtAmount)}</td><td><b>{state.warningCount}/3</b></td><td><span className={state.warningCount >= 3 ? 'access-chip granted' : 'access-chip warning'}>{state.warningCount >= 3 ? 'SMS limiti tugagan' : 'Ogohlantirilmoqda'}</span></td><td>{canReset ? <Popconfirm title="SMS hisobini nollash" description="Talabaga yana 3 martagacha SMS yuborish boshlanadi. Davom etilsinmi?" okText="Nollash" cancelText="Yo‘q" onConfirm={() => reset(state.student?.id)}><button disabled={resetting || !state.student?.id}>SMS hisobini nollash</button></Popconfirm> : '—'}</td></tr>)}
        {!states.length && <tr><td colSpan="6" className="face-access-state">Faol qarzdorlik ogohlantirishi yo‘q</td></tr>}
      </tbody></table></div>}
    </section>}

    <Modal open={deviceModal} onCancel={() => setDeviceModal(false)} footer={null} title="Hikvision DS-K1T341CMF qo‘shish" destroyOnHidden>
      <Form form={deviceForm} layout="vertical" onFinish={addDevice} requiredMark={false}>
        <Form.Item name="name" label="Qurilma nomi" rules={[{ required: true, whitespace: true, message: 'Qurilma nomini kiriting' }]}><Input /></Form.Item>
        <Form.Item name="model" label="Model"><Input /></Form.Item>
        <Form.Item name="direction" label="Yo‘nalish" rules={[{ required: true, message: 'Yo‘nalishni tanlang' }]}><Select options={[{ value: 'IN', label: 'Kirish — davomat va SMS' }, { value: 'OUT', label: 'Chiqish — faqat chiqish qaydi' }]} /></Form.Item>
        <p className="face-device-warning">Saqlagach aynan shu qurilmaning Callback URL’ini terminaldagi HTTP Listening maydoniga kiriting. Remote Verification o‘chiq qoladi.</p>
        <div className="face-device-modal-actions"><Button onClick={() => setDeviceModal(false)}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={creatingDevice}>Saqlash</Button></div>
      </Form>
    </Modal>
  </div>
}
