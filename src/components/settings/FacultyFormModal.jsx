import { Button, Form, Input, Modal, Select } from 'antd'

export function FacultyFormModal({ open, faculty, universityId, universities, loading, error, onClose, onSubmit }) {
  const [form] = Form.useForm()
  const options = universities.map((item) => ({ value: item.id, label: item.shortName ? `${item.name} (${item.shortName})` : item.name }))
  const prepare = (visible) => {
    if (visible) form.setFieldsValue({ name: faculty?.name || '', university: faculty?.university?.id || faculty?.university || universityId })
    else form.resetFields()
  }

  return (
    <Modal open={open} onCancel={onClose} afterOpenChange={prepare} footer={null} destroyOnHidden width={560} rootClassName="directory-modal" title={faculty ? 'Fakultetni tahrirlash' : 'Yangi fakultet'}>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={onSubmit}>
        <Form.Item name="university" label="Universitet" rules={[{ required: true, message: 'Universitetni tanlang' }]}><Select disabled={Boolean(universityId)} showSearch optionFilterProp="label" placeholder="Universitetni tanlang" options={options} /></Form.Item>
        <Form.Item name="name" label="Fakultet nomi" rules={[{ required: true, whitespace: true, message: 'Fakultet nomini kiriting' }]}><Input placeholder="Masalan: Axborot texnologiyalari fakulteti" /></Form.Item>
        {error && <div className="form-error">{error}</div>}
        <div className="directory-form-actions"><Button htmlType="submit" loading={loading} className="directory-submit-btn">{faculty ? 'Yangilash' : 'Saqlash'}</Button><Button onClick={onClose}>Yopish</Button></div>
      </Form>
    </Modal>
  )
}
