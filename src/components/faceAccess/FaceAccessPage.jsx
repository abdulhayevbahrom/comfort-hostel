import { Button, Checkbox, Form, Input, InputNumber, Modal, Popconfirm, Select } from 'antd'
import { useState } from 'react'
import { toast } from 'react-toastify'
import {
  apiErrorMessage,
  API_URL,
  useCreateFaceDeviceMutation,
  useGetFaceAccessEventsQuery,
  useGetFaceAccessStatesQuery,
  useGetFaceDevicesQuery,
  useResetFaceAccessStateMutation,
  useTestFaceDeviceDoorMutation,
  useUpdateFaceDeviceMutation,
} from '../../store/baseApi'
import './FaceAccess.css'
import './FaceAccessDevices.css'

const decisions = {
  granted: ['Ruxsat', 'granted'],
  granted_warning: ['SMS bilan ruxsat', 'warning'],
  denied_unknown: ['Noma’lum shaxs', 'denied'],
  denied_inactive: ['Faol shartnoma yo‘q', 'denied'],
  denied_disabled: ['Kirish o‘chirilgan', 'denied'],
  denied_debt_limit: ['Qarzdorlik sabab blok', 'blocked'],
  error: ['Xatolik', 'denied'],
}
const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const dateTime = (value) => value ? new Date(value).toLocaleString('uz-UZ') : '—'

export function FaceAccessPage({ currentEmployee }) {
  const [deviceForm] = Form.useForm()
  const selectedTransport = Form.useWatch('transport', deviceForm) || 'isup_gateway'
  const [decision, setDecision] = useState('')
  const [deviceModal, setDeviceModal] = useState(false)
  const canManageDevices = ['owner', 'admin'].includes(currentEmployee?.role)
  const { data: eventData, isLoading: eventsLoading, error: eventError } = useGetFaceAccessEventsQuery({ limit: 150, ...(decision ? { decision } : {}) })
  const { data: stateData, isLoading: statesLoading, error: stateError } = useGetFaceAccessStatesQuery()
  const { data: deviceData, isLoading: devicesLoading, error: deviceError } = useGetFaceDevicesQuery(undefined, { skip: !canManageDevices })
  const [resetState, { isLoading: resetting }] = useResetFaceAccessStateMutation()
  const [createDevice, { isLoading: creatingDevice }] = useCreateFaceDeviceMutation()
  const [updateDevice, { isLoading: updatingDevice }] = useUpdateFaceDeviceMutation()
  const [testDoor, { isLoading: testingDoor }] = useTestFaceDeviceDoorMutation()
  const canReset = ['owner', 'admin'].includes(currentEmployee?.role)
  const events = eventData?.events || []
  const states = stateData?.states || []
  const devices = deviceData?.devices || []
  const callbackUrl = (device) => device.transport === 'isup_gateway'
    ? `${API_URL.replace(/\/$/, '')}/faceid/isup/event`
    : `${API_URL.replace(/\/$/, '')}/faceid/device/event/${device.deviceKey}`

  const reset = async (studentId) => {
    try {
      await resetState(studentId).unwrap()
      toast.success('FaceID blok va SMS hisoblagichi bekor qilindi')
    } catch (error) { toast.error(apiErrorMessage(error)) }
  }

  const addDevice = async (values) => {
    try {
      await createDevice({
        ...values,
        host: String(values.host || '').trim(),
        isupDeviceId: String(values.isupDeviceId || '').trim(),
        doorControlEnabled: Boolean(values.doorControlEnabled),
      }).unwrap()
      toast.success('Hikvision qurilma saqlandi')
      setDeviceModal(false)
      deviceForm.resetFields()
    } catch (error) { toast.error(apiErrorMessage(error)) }
  }
  const toggleDevice = async (device, field) => {
    try { await updateDevice({ id: device.id, [field]: !device[field] }).unwrap(); toast.success('Qurilma holati yangilandi') } catch (error) { toast.error(apiErrorMessage(error)) }
  }
  const testDevice = async (device) => {
    try { const result = await testDoor(device.id).unwrap(); toast.success(result.opened ? 'Eshik ochish buyrug‘i bajarildi' : result.reason || 'Door control o‘chirilgan') } catch (error) { toast.error(apiErrorMessage(error)) }
  }
  const copyCallback = async (device) => {
    try { await navigator.clipboard.writeText(callbackUrl(device)); toast.success('Callback manzili nusxalandi') } catch { toast.info(callbackUrl(device)) }
  }

  return <div className="face-access-page">
    <section className="face-access-hero">
      <div><small>HIKVISION DS-K1T341AMF</small><h2>FaceID kirish nazorati</h2><p>Talaba kirishi, qarzdorlik ogohlantirishlari va eshik qarorlari.</p></div>
      <div className="face-access-summary"><article><span>Faol qarzdorlar</span><strong>{states.length}</strong></article><article><span>Bloklangan</span><strong>{states.filter((item) => item.blocked).length}</strong></article><article><span>Oxirgi eventlar</span><strong>{events.length}</strong></article></div>
    </section>

    {canManageDevices && <section className="face-access-card">
      <header><div><h3>Hikvision qurilmalar</h3><p>ISUP Gateway orqali Wi‑Fi’dagi terminal Contabo backend bilan ikki tomonlama ishlaydi.</p></div><button onClick={() => { deviceForm.setFieldsValue({ name: 'Asosiy kirish', model: 'DS-K1T341AMF', transport: 'isup_gateway', isupDeviceId: '', host: '', doorNo: 1, direction: 'IN', controlMode: 'remote_check', doorControlEnabled: false }); setDeviceModal(true) }}>+ Qurilma</button></header>
      {deviceError ? <div className="face-access-state error">{apiErrorMessage(deviceError)}</div> : devicesLoading ? <div className="face-access-state">Yuklanmoqda…</div> : <div className="face-access-table-wrap"><table><thead><tr><th>Qurilma</th><th>Ulanish</th><th>Yo‘nalish</th><th>Nazorat</th><th>Callback URL</th><th>Amal</th></tr></thead><tbody>
        {devices.map((device) => <tr key={device.id}><td><strong>{device.name}</strong><small>{device.model}</small></td><td><code>{device.transport === 'isup_gateway' ? device.isupDeviceId : device.host || 'env orqali'}</code><small><span className={`device-online-dot ${device.online ? 'online' : ''}`} />{device.online ? 'Online' : 'Offline'} · {device.transport === 'isup_gateway' ? 'ISUP 5.0' : 'Direct ISAPI'}</small></td><td>{device.direction}</td><td><span className={`access-chip ${device.doorControlEnabled ? 'granted' : 'warning'}`}>{device.doorControlEnabled ? 'Faol' : 'Sinov rejimi'}</span><small>{device.controlMode === 'remote_check' ? 'Remote tekshiruv' : 'Remote open'}</small></td><td><button className="callback-button" onClick={() => copyCallback(device)} title={callbackUrl(device)}>URL nusxalash</button></td><td><div className="face-device-actions"><button onClick={() => testDevice(device)} disabled={testingDoor}>Eshik testi</button><button className={device.doorControlEnabled ? 'danger' : ''} onClick={() => toggleDevice(device, 'doorControlEnabled')} disabled={updatingDevice}>{device.doorControlEnabled ? 'Nazoratni o‘chirish' : 'Nazoratni yoqish'}</button><button className={device.isActive ? 'danger' : ''} onClick={() => toggleDevice(device, 'isActive')} disabled={updatingDevice}>{device.isActive ? 'O‘chirish' : 'Faollashtirish'}</button></div></td></tr>)}
        {!devices.length && <tr><td colSpan="6" className="face-access-state">Hikvision qurilma qo‘shilmagan</td></tr>}
      </tbody></table></div>}
    </section>}

    <section className="face-access-card">
      <header><div><h3>Qarzdorlik ogohlantirish holati</h3><p>3 ta SMSdan keyingi kirish avtomatik bloklanadi.</p></div></header>
      {stateError ? <div className="face-access-state error">{apiErrorMessage(stateError)}</div> : statesLoading ? <div className="face-access-state">Yuklanmoqda…</div> : <div className="face-access-table-wrap"><table><thead><tr><th>Talaba</th><th>FaceID kodi</th><th>Qarz</th><th>SMS</th><th>Holat</th><th>Amal</th></tr></thead><tbody>
        {states.map((state) => <tr key={state.id}><td><strong>{state.student?.fullName || 'Talaba topilmadi'}</strong><small>{state.student?.phone || ''}</small></td><td><code>{state.student?.faceIdCode || '—'}</code></td><td>{money(state.lastDebtAmount)}</td><td><b>{state.warningCount}/3</b></td><td><span className={state.blocked ? 'access-chip blocked' : 'access-chip warning'}>{state.blocked ? 'Bloklangan' : 'Ogohlantirilmoqda'}</span></td><td>{canReset ? <Popconfirm title="Blokni bekor qilish" description="SMS hisoblagichi ham nollanadi. Davom etilsinmi?" okText="Bekor qilish" cancelText="Yo‘q" onConfirm={() => reset(state.student?.id)}><button disabled={resetting || !state.student?.id}>Blokni yechish</button></Popconfirm> : '—'}</td></tr>)}
        {!states.length && <tr><td colSpan="6" className="face-access-state">Faol qarzdorlik ogohlantirishi yo‘q</td></tr>}
      </tbody></table></div>}
    </section>

    <section className="face-access-card">
      <header><div><h3>Kirish jurnali</h3><p>Qurilma yuborgan oxirgi 150 ta qaror.</p></div><Select allowClear placeholder="Barcha holatlar" value={decision || undefined} onChange={(value) => setDecision(value || '')} options={Object.entries(decisions).map(([value, item]) => ({ value, label: item[0] }))} /></header>
      {eventError ? <div className="face-access-state error">{apiErrorMessage(eventError)}</div> : eventsLoading ? <div className="face-access-state">Yuklanmoqda…</div> : <div className="face-access-table-wrap"><table><thead><tr><th>Vaqt</th><th>Talaba</th><th>Qaror</th><th>Qarz</th><th>SMS</th><th>Qurilma</th></tr></thead><tbody>
        {events.map((event) => { const item = decisions[event.decision] || [event.decision, 'denied']; return <tr key={event.id}><td>{dateTime(event.occurredAt)}</td><td><strong>{event.student?.fullName || event.faceIdCode}</strong><small>{event.reason}</small></td><td><span className={`access-chip ${item[1]}`}>{item[0]}</span></td><td>{money(event.debtAmount)}</td><td>{event.smsStatus === 'sent' ? `${event.warningCount}/3 yuborildi` : ['queued', 'sending'].includes(event.smsStatus) ? `${event.warningCount}/3 navbatda` : event.smsStatus === 'failed' ? 'Qayta urinadi' : event.smsStatus === 'duplicate' ? 'Takroriy' : '—'}</td><td><code>{event.deviceKey || '—'}</code></td></tr> })}
        {!events.length && <tr><td colSpan="6" className="face-access-state">FaceID eventi hali yo‘q</td></tr>}
      </tbody></table></div>}
    </section>
    <Modal open={deviceModal} onCancel={() => setDeviceModal(false)} footer={null} title="Hikvision DS-K1T341AMF qo‘shish" destroyOnHidden>
      <Form form={deviceForm} layout="vertical" onFinish={addDevice} requiredMark={false}>
        <Form.Item name="name" label="Qurilma nomi" rules={[{ required: true, whitespace: true, message: 'Qurilma nomini kiriting' }]}><Input /></Form.Item>
        <Form.Item name="model" label="Model"><Input /></Form.Item>
        <Form.Item name="transport" label="Ulanish turi"><Select onChange={(value) => { if (value === 'isup_gateway') deviceForm.setFieldValue('controlMode', 'remote_check') }} options={[{ value: 'isup_gateway', label: 'ISUP 5.0 Gateway — tavsiya etiladi' }, { value: 'direct_isapi', label: 'Direct ISAPI — faqat LAN/VPN' }]} /></Form.Item>
        {selectedTransport === 'isup_gateway'
          ? <Form.Item name="isupDeviceId" label="ISUP Device ID" rules={[{ required: true, whitespace: true, message: 'Terminaldagi ISUP Device ID ni kiriting' }]}><Input placeholder="Masalan: 123456789" /></Form.Item>
          : <Form.Item name="host" label="Qurilma VPN/LAN manzili" rules={[{ required: true, whitespace: true, message: 'Masalan: http://10.10.0.2' }]}><Input placeholder="http://10.10.0.2" /></Form.Item>}
        <div className="face-device-form-grid"><Form.Item name="doorNo" label="Eshik №"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item><Form.Item name="direction" label="Yo‘nalish"><Select options={[{ value: 'IN', label: 'Kirish' }, { value: 'OUT', label: 'Chiqish' }, { value: 'BOTH', label: 'Kirish/chiqish navbat bilan' }]} /></Form.Item></div>
        <Form.Item name="controlMode" label="Eshik qarori"><Select disabled={selectedTransport === 'isup_gateway'} options={[{ value: 'remote_check', label: 'Remote check — xavfsiz rejim' }, { value: 'remote_open', label: 'Eventdan keyin remote open' }]} /></Form.Item>
        <Form.Item name="doorControlEnabled" valuePropName="checked"><Checkbox>Darhol real eshik nazoratini yoqish</Checkbox></Form.Item>
        <p className="face-device-warning">ISUP Gateway Contabo’da ishlashi, terminaldagi Device ID aynan mos bo‘lishi va lokal avtomatik ochilish o‘chirilishi kerak. Eshik testidan keyingina real nazoratni yoqing.</p>
        <div className="face-device-modal-actions"><Button onClick={() => setDeviceModal(false)}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={creatingDevice}>Saqlash</Button></div>
      </Form>
    </Modal>
  </div>
}
