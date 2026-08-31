import { Button, Form, Input, Modal, Popconfirm, Select } from 'antd'
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
  useUpdateFaceDeviceMutation,
} from '../../store/baseApi'
import './FaceAccess.css'
import './FaceAccessDevices.css'

const decisions = {
  granted: ['Davomat yozildi', 'granted'],
  granted_warning: ['Davomat + qarz SMS', 'warning'],
  observed_unknown: ['Biriktirilmagan FaceID', 'denied'],
  denied_unknown: ['Eski noma’lum event', 'denied'],
  denied_inactive: ['Eski faol shartnomasiz event', 'denied'],
  denied_disabled: ['Eski o‘chirilgan event', 'denied'],
  denied_debt_limit: ['Eski bloklangan event', 'blocked'],
  error: ['Xatolik', 'denied'],
}
const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const dateTime = (value) => value ? new Date(value).toLocaleString('uz-UZ') : '—'

export function FaceAccessPage({ currentEmployee }) {
  const [deviceForm] = Form.useForm()
  const [decision, setDecision] = useState('')
  const [deviceModal, setDeviceModal] = useState(false)
  const canManageDevices = ['owner', 'admin'].includes(currentEmployee?.role)
  const { data: eventData, isLoading: eventsLoading, error: eventError } = useGetFaceAccessEventsQuery({ limit: 150, ...(decision ? { decision } : {}) })
  const { data: stateData, isLoading: statesLoading, error: stateError } = useGetFaceAccessStatesQuery()
  const { data: deviceData, isLoading: devicesLoading, error: deviceError } = useGetFaceDevicesQuery(undefined, { skip: !canManageDevices })
  const [resetState, { isLoading: resetting }] = useResetFaceAccessStateMutation()
  const [createDevice, { isLoading: creatingDevice }] = useCreateFaceDeviceMutation()
  const [updateDevice, { isLoading: updatingDevice }] = useUpdateFaceDeviceMutation()
  const canReset = ['owner', 'admin'].includes(currentEmployee?.role)
  const events = eventData?.events || []
  const states = stateData?.states || []
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
      await createDevice({
        ...values,
        transport: 'http_listening',
        controlMode: 'attendance_only',
        doorControlEnabled: false,
      }).unwrap()
      toast.success('Hikvision qurilma saqlandi')
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
      <div><small>HIKVISION DS-K1T341CMF</small><h2>FaceID davomat</h2><p>Talaba davomati va qarzdorlik bo‘yicha 3 martagacha SMS ogohlantirish.</p></div>
      <div className="face-access-summary"><article><span>Faol qarzdorlar</span><strong>{states.length}</strong></article><article><span>3/3 SMS yuborilgan</span><strong>{states.filter((item) => item.warningCount >= 3).length}</strong></article><article><span>Oxirgi eventlar</span><strong>{events.length}</strong></article></div>
    </section>

    {canManageDevices && <section className="face-access-card">
      <header><div><h3>Hikvision qurilmalar</h3><p>Terminal HTTP Listening orqali Contaboga faqat event yuboradi. Backend eshik buyrug‘i yubormaydi.</p></div><button onClick={() => { deviceForm.setFieldsValue({ name: 'Asosiy kirish', model: 'DS-K1T341CMF', direction: 'IN' }); setDeviceModal(true) }}>+ Qurilma</button></header>
      {deviceError ? <div className="face-access-state error">{apiErrorMessage(deviceError)}</div> : devicesLoading ? <div className="face-access-state">Yuklanmoqda…</div> : <div className="face-access-table-wrap"><table><thead><tr><th>Qurilma</th><th>Ulanish</th><th>Yo‘nalish</th><th>Nazorat</th><th>Callback URL</th><th>Amal</th></tr></thead><tbody>
        {devices.map((device) => <tr key={device.id}><td><strong>{device.name}</strong><small>{device.model}</small></td><td><code>Outbound HTTPS</code><small><span className={`device-online-dot ${device.online ? 'online' : ''}`} />{device.online ? 'Online' : 'Offline'} · HTTP Listening</small></td><td>{device.direction}</td><td><span className="access-chip granted">Davomat + SMS</span><small>Remote Verification o‘chiq</small></td><td><button className="callback-button" onClick={() => copyCallback(device)} title={callbackUrl(device)}>URL nusxalash</button></td><td><div className="face-device-actions"><button className={device.isActive ? 'danger' : ''} onClick={() => toggleDevice(device, 'isActive')} disabled={updatingDevice}>{device.isActive ? 'O‘chirish' : 'Faollashtirish'}</button></div></td></tr>)}
        {!devices.length && <tr><td colSpan="6" className="face-access-state">Hikvision qurilma qo‘shilmagan</td></tr>}
      </tbody></table></div>}
    </section>}

    <section className="face-access-card">
      <header><div><h3>Qarzdorlik SMS holati</h3><p>Qarzdorga ko‘pi bilan 3 marta SMS yuboriladi. Eshik hech qachon backend tomonidan bloklanmaydi.</p></div></header>
      {stateError ? <div className="face-access-state error">{apiErrorMessage(stateError)}</div> : statesLoading ? <div className="face-access-state">Yuklanmoqda…</div> : <div className="face-access-table-wrap"><table><thead><tr><th>Talaba</th><th>FaceID kodi</th><th>Qarz</th><th>SMS</th><th>Holat</th><th>Amal</th></tr></thead><tbody>
        {states.map((state) => <tr key={state.id}><td><strong>{state.student?.fullName || 'Talaba topilmadi'}</strong><small>{state.student?.phone || ''}</small></td><td><code>{state.student?.faceIdCode || '—'}</code></td><td>{money(state.lastDebtAmount)}</td><td><b>{state.warningCount}/3</b></td><td><span className={state.warningCount >= 3 ? 'access-chip granted' : 'access-chip warning'}>{state.warningCount >= 3 ? 'SMS limiti tugagan' : 'Ogohlantirilmoqda'}</span></td><td>{canReset ? <Popconfirm title="SMS hisobini nollash" description="Talabaga yana 3 martagacha SMS yuborish boshlanadi. Davom etilsinmi?" okText="Nollash" cancelText="Yo‘q" onConfirm={() => reset(state.student?.id)}><button disabled={resetting || !state.student?.id}>SMS hisobini nollash</button></Popconfirm> : '—'}</td></tr>)}
        {!states.length && <tr><td colSpan="6" className="face-access-state">Faol qarzdorlik ogohlantirishi yo‘q</td></tr>}
      </tbody></table></div>}
    </section>

    <section className="face-access-card">
      <header><div><h3>FaceID davomat jurnali</h3><p>Qurilma yuborgan oxirgi 150 ta davomat eventi.</p></div><Select allowClear placeholder="Barcha holatlar" value={decision || undefined} onChange={(value) => setDecision(value || '')} options={Object.entries(decisions).map(([value, item]) => ({ value, label: item[0] }))} /></header>
      {eventError ? <div className="face-access-state error">{apiErrorMessage(eventError)}</div> : eventsLoading ? <div className="face-access-state">Yuklanmoqda…</div> : <div className="face-access-table-wrap"><table><thead><tr><th>Vaqt</th><th>Talaba</th><th>Qaror</th><th>Qarz</th><th>SMS</th><th>Qurilma</th></tr></thead><tbody>
        {events.map((event) => { const item = decisions[event.decision] || [event.decision, 'denied']; return <tr key={event.id}><td>{dateTime(event.occurredAt)}</td><td><strong>{event.student?.fullName || event.faceIdCode}</strong><small>{event.reason}</small></td><td><span className={`access-chip ${item[1]}`}>{item[0]}</span></td><td>{money(event.debtAmount)}</td><td>{event.smsStatus === 'sent' ? `${event.warningCount}/3 yuborildi` : ['queued', 'sending'].includes(event.smsStatus) ? `${event.warningCount}/3 navbatda` : event.smsStatus === 'failed' ? 'Qayta urinadi' : event.smsStatus === 'duplicate' ? 'Takroriy' : event.smsStatus === 'limit_reached' ? '3/3, yangi SMS yo‘q' : '—'}</td><td><code>{event.deviceKey || '—'}</code></td></tr> })}
        {!events.length && <tr><td colSpan="6" className="face-access-state">FaceID eventi hali yo‘q</td></tr>}
      </tbody></table></div>}
    </section>
    <Modal open={deviceModal} onCancel={() => setDeviceModal(false)} footer={null} title="Hikvision DS-K1T341CMF qo‘shish" destroyOnHidden>
      <Form form={deviceForm} layout="vertical" onFinish={addDevice} requiredMark={false}>
        <Form.Item name="name" label="Qurilma nomi" rules={[{ required: true, whitespace: true, message: 'Qurilma nomini kiriting' }]}><Input /></Form.Item>
        <Form.Item name="model" label="Model"><Input /></Form.Item>
        <Form.Item name="direction" label="Yo‘nalish"><Select options={[{ value: 'IN', label: 'Kirish' }, { value: 'OUT', label: 'Chiqish' }, { value: 'BOTH', label: 'Kirish/chiqish navbat bilan' }]} /></Form.Item>
        <p className="face-device-warning">Saqlagach Callback URL’ni terminaldagi HTTP Listening maydoniga kiriting. Terminalda Remote Verification o‘chiq qolishi shart.</p>
        <div className="face-device-modal-actions"><Button onClick={() => setDeviceModal(false)}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={creatingDevice}>Saqlash</Button></div>
      </Form>
    </Modal>
  </div>
}
