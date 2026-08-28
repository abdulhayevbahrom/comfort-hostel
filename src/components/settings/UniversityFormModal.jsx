import { Button, Form, Input, Modal } from 'antd'

const initialValues = { name: '', shortName: '' }

export function UniversityFormModal({ open, university, loading, error, onClose, onSubmit }) {
  const [form] = Form.useForm()
  const prepare = (visible) => {
    if (visible) form.setFieldsValue(university || initialValues)
    else form.resetFields()
  }

  return (
    <Modal open={open} onCancel={onClose} afterOpenChange={prepare} footer={null} destroyOnHidden width={560} rootClassName="directory-modal" title={university ? 'Universitetni tahrirlash' : 'Yangi universitet'}>
      <Form form={form} layout="vertical" initialValues={initialValues} requiredMark={false} onFinish={onSubmit}>
        <Form.Item name="name" label="Universitet nomi" rules={[{ required: true, whitespace: true, message: 'Universitet nomini kiriting' }]}><Input placeholder="Masalan: Toshkent davlat iqtisodiyot universiteti" /></Form.Item>
        <Form.Item name="shortName" label="Qisqa nomi"><Input maxLength={30} placeholder="Masalan: TDIU" /></Form.Item>
        {error && <div className="form-error">{error}</div>}
        <div className="directory-form-actions"><Button htmlType="submit" loading={loading} className="directory-submit-btn">{university ? 'Yangilash' : 'Saqlash'}</Button><Button onClick={onClose}>Yopish</Button></div>
      </Form>
    </Modal>
  )
}
