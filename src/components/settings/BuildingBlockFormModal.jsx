import { Button, Form, Input, Modal } from 'antd'

export function BuildingBlockFormModal({ open, block, loading, error, onClose, onSubmit }) {
  const [form] = Form.useForm()
  const prepare = (visible) => {
    if (visible) form.setFieldsValue({ name: block?.name || '' })
    else form.resetFields()
  }

  return (
    <Modal open={open} onCancel={onClose} afterOpenChange={prepare} footer={null} destroyOnHidden width={520} rootClassName="directory-modal" title={block ? 'Bino yoki blokni tahrirlash' : 'Yangi bino yoki blok'}>
      <Form form={form} layout="vertical" requiredMark={false} onFinish={onSubmit}>
        <Form.Item name="name" label="Bino yoki blok nomi" rules={[{ required: true, whitespace: true, message: 'Bino yoki blok nomini kiriting' }]}><Input maxLength={80} placeholder="Masalan: A blok yoki 1-bino" /></Form.Item>
        {error && <div className="form-error">{error}</div>}
        <div className="directory-form-actions"><Button htmlType="submit" loading={loading} className="directory-submit-btn">{block ? 'Yangilash' : 'Saqlash'}</Button><Button onClick={onClose}>Yopish</Button></div>
      </Form>
    </Modal>
  )
}
