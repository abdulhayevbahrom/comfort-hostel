import { useState } from 'react'
import { Button, Form, Input, InputNumber, Modal } from 'antd'
import { toast } from 'react-toastify'
import { apiErrorMessage, usePayFineMutation } from '../../store/baseApi'

const methods = { cash: 'Naqd', card: 'Karta', click: 'Click', bank: 'Bank' }
const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`

export function FinePaymentModal({ fine, onClose }) {
  const [form] = Form.useForm()
  const [method, setMethod] = useState('cash')
  const [payFine, { isLoading }] = usePayFineMutation()
  const remaining = Math.max(0, Number(fine?.amount || 0) - Number(fine?.paidAmount || 0))
  const submit = async (values) => {
    try {
      await payFine({ id: fine.id, studentId: fine.student?.id || fine.student, amount: Number(values.amount), method, note: values.note?.trim() || '' }).unwrap()
      toast.success('Jarima to‘lovi qabul qilindi')
      form.resetFields()
      onClose()
    } catch (error) { toast.error(apiErrorMessage(error)) }
  }
  return <Modal open={Boolean(fine)} onCancel={onClose} footer={null} width={520} title={fine ? `${fine.student?.fullName || 'Talaba'} — jarima to‘lovi` : 'Jarima to‘lovi'} destroyOnHidden rootClassName="fine-payment-modal"><Form form={form} layout="vertical" requiredMark={false} onFinish={submit}><div className="fine-payment-balance"><div><span>Jarima summasi</span><strong>{money(fine?.amount)}</strong></div><div><span>To‘langan</span><strong>{money(fine?.paidAmount)}</strong></div><div><span>Qoldiq</span><strong>{money(remaining)}</strong></div></div><Form.Item name="amount" label="To‘lov summasi" initialValue={remaining} rules={[{ required: true, message: 'Summani kiriting' }]}><InputNumber min={1} max={remaining} precision={0} addonAfter="so‘m" formatter={(value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} parser={(value) => String(value || '').replace(/[^\d]/g, '')} /></Form.Item><div className="fine-payment-method"><label>To‘lov turi</label><div>{Object.entries(methods).map(([value, label]) => <button type="button" key={value} className={method === value ? 'active' : ''} onClick={() => setMethod(value)}>{label}</button>)}</div></div><Form.Item name="note" label="Izoh"><Input placeholder="Ixtiyoriy" maxLength={500} /></Form.Item><div className="fine-modal-actions"><Button onClick={onClose}>Bekor qilish</Button><Button type="primary" htmlType="submit" loading={isLoading}>To‘lovni tasdiqlash</Button></div></Form></Modal>
}
