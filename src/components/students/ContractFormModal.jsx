import { useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Segmented, Select } from 'antd'
import dayjs from 'dayjs'
import { calculateContractPayment } from '../../utils/contractPayment'
import { bedLabel } from '../rooms/roomConstants'

const createInitialValues = () => ({ contractNumber: `SHARTNOMA-${dayjs().format('YYYY-MM')}`, room: undefined, startDate: dayjs(), endDate: dayjs().add(1, 'month'), paymentType: 'monthly', paymentAmount: 0, status: 'active', note: '' })

function RoomPicker({ value, onChange, rooms, bedNumber, onBedChange, currentContractId }) {
  if (!rooms.length) return <div className="contract-room-empty">Mos bo‘sh xona mavjud emas</div>
  const selectedRoom = rooms.find((room) => room.id === value)
  return <>
    <div className="contract-room-picker">{rooms.map((room) => {
      const available = Math.max(0, room.capacity - (room.occupiedCount || 0))
      return <button type="button" key={room.id} className={value === room.id ? 'selected' : ''} onClick={() => { onChange(room.id); onBedChange(undefined) }}><strong>{room.roomNumber}-xona</strong><span>{room.block ? `${room.block} · ` : ''}{room.floor}-qavat</span><small>{available} ta bo‘sh</small></button>
    })}</div>
    {selectedRoom && <div className="contract-bed-picker"><span>Bo‘sh o‘rinni tanlang</span><div>{(selectedRoom.beds || Array.from({ length: selectedRoom.capacity }, (_, index) => ({ number: index + 1, status: 'available' }))).filter((bed) => bed.status !== 'occupied' || bed.contractId === currentContractId).map((bed) => {
      const occupiedByCurrentContract = bed.contractId === currentContractId
      return <button type="button" key={bed.number} title={bed.label || bedLabel(bed.number)} className={`${bedNumber === bed.number ? 'selected ' : ''}${occupiedByCurrentContract ? 'selected' : 'available'}`} onClick={() => onBedChange(bed.number)}>{bed.number}</button>
    })}</div><small>Faqat bo‘sh o‘rinlar ko‘rsatilgan.</small></div>}
  </>
}

export function ContractFormModal({ open, contract, rooms, loading, error, onClose, onSubmit }) {
  const [form] = Form.useForm()
  const [floor, setFloor] = useState()
  const paymentType = Form.useWatch('paymentType', form)
  const startDate = Form.useWatch('startDate', form)
  const endDate = Form.useWatch('endDate', form)
  const paymentAmount = Form.useWatch('paymentAmount', form)
  const selectedRoomId = Form.useWatch('room', form)
  const bedNumber = Form.useWatch('bedNumber', form)
  const calculation = calculateContractPayment(startDate, endDate, paymentType, paymentAmount)
  const floors = [...new Set(rooms.map((room) => String(room.floor)))].sort((first, second) => first.localeCompare(second, undefined, { numeric: true }))
  const visibleRooms = floor ? rooms.filter((room) => room.floor === floor) : rooms
  const prepare = (visible) => {
    if (visible) { setFloor(undefined); form.setFieldsValue(contract ? { ...contract, room: contract.room?.id || contract.room, bedNumber: contract.bedNumber, paymentType: contract.paymentType || 'monthly', paymentAmount: contract.paymentAmount ?? contract.monthlyAmount ?? 0, startDate: dayjs(contract.startDate), endDate: dayjs(contract.endDate) } : createInitialValues()) }
    else form.resetFields()
  }

  return (
    <Modal open={open} onCancel={onClose} afterOpenChange={prepare} footer={null} destroyOnHidden width={650} rootClassName="contract-form-modal" title={contract ? 'Shartnomani tahrirlash' : 'Yangi shartnoma tuzish'}>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={(values) => onSubmit({ ...values, startDate: values.startDate.format('YYYY-MM-DD'), endDate: values.endDate.format('YYYY-MM-DD') })}>
        <div className="contract-form-grid"><Form.Item name="contractNumber" label="Shartnoma raqami" rules={[{ required: true, whitespace: true, message: 'Shartnoma raqamini kiriting' }]}><Input maxLength={60} placeholder="Masalan: TTJ-2026-0001" /></Form.Item><Form.Item name="paymentType" label="Shartnoma turi"><Segmented className="contract-status-segmented" block options={[{ value: 'daily', label: 'Kunlik' }, { value: 'monthly', label: 'Oylik' }]} /></Form.Item></div>
        <div className="contract-room-filter"><span>Bo‘sh xonalar</span><Select allowClear value={floor} placeholder="Barcha qavatlar" options={floors.map((value) => ({ value, label: `${value}-qavat` }))} onChange={(value) => { setFloor(value); form.setFieldValue('room', undefined) }} /></div>
        <Form.Item name="room" rules={[{ required: true, message: 'Xonani tanlang' }]}><RoomPicker rooms={visibleRooms} bedNumber={bedNumber} onBedChange={(value) => form.setFieldValue('bedNumber', value)} currentContractId={contract?.id} /></Form.Item>
        {selectedRoomId && <Form.Item name="bedNumber" rules={[{ required: true, message: 'Xonadagi o‘rinni tanlang' }]} hidden><Input /></Form.Item>}
        <div className="contract-form-grid"><Form.Item name="startDate" label="Boshlanish sanasi" rules={[{ required: true, message: 'Sanani kiriting' }]}><DatePicker format="DD.MM.YYYY" placeholder="Sanani tanlang" style={{ width: '100%' }} /></Form.Item><Form.Item name="endDate" label="Tugash sanasi" dependencies={['startDate']} rules={[{ required: true, message: 'Sanani kiriting' }, ({ getFieldValue }) => ({ validator(_, value) { return !value || value.isAfter(getFieldValue('startDate'), 'day') ? Promise.resolve() : Promise.reject(new Error('Tugash sanasi keyin bo‘lishi kerak')) } })]}><DatePicker format="DD.MM.YYYY" placeholder="Sanani tanlang" style={{ width: '100%' }} /></Form.Item></div>
        <Form.Item name="paymentAmount" label={paymentType === 'daily' ? 'Bir kunlik to‘lov' : 'Bir oylik to‘lov'} rules={[{ required: true, type: 'number', min: 1, message: 'To‘lov summasi 0 dan katta bo‘lishi kerak' }]}><InputNumber min={1} precision={0} style={{ width: '100%' }} formatter={(value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(value) => String(value || '').replace(/\D/g, '')} addonAfter="so‘m" /></Form.Item>
        <div className="contract-payment-calculation"><div><span>Shartnoma muddati</span><strong>{calculation.durationDays} kun</strong></div><div><span>Hisob birligi</span><strong>{paymentType === 'daily' ? `${calculation.billingQuantity} kun` : `${calculation.billingQuantity} oy`}</strong></div><div><span>Shartnoma qiymati</span><strong>{calculation.totalAmount.toLocaleString('uz-UZ')} so‘m</strong></div></div>
        {paymentType === 'monthly' && calculation.billingQuantity > 0 && <div className="contract-payment-note">To‘lov {calculation.billingQuantity} oyga bo‘linadi. Har oy uchun {Number(paymentAmount || 0).toLocaleString('uz-UZ')} so‘mdan alohida hisob yuritiladi.</div>}
        {contract && <Form.Item name="status" label="Shartnoma holati"><Segmented className="contract-status-segmented" block options={[{ value: 'active', label: 'Aktiv' }, { value: 'cancelled', label: 'Bekor qilish' }]} /></Form.Item>}
        <Form.Item name="note" label="Izoh"><Input.TextArea rows={3} maxLength={1000} showCount placeholder="Shartnoma bo‘yicha izoh" /></Form.Item>
        {error && <div className="form-error">{error}</div>}
        <div className="contract-form-actions"><Button htmlType="submit" loading={loading} className="contract-submit-btn">{contract ? 'Yangilash' : 'Shartnoma tuzish'}</Button><Button onClick={onClose}>Yopish</Button></div>
      </Form>
    </Modal>
  )
}
