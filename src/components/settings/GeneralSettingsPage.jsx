import { useEffect, useState } from 'react'
import { Button, Form, Input, Upload } from 'antd'
import { toast } from 'react-toastify'
import { apiErrorMessage, useGetGeneralSettingsQuery, useUpdateGeneralSettingsMutation } from '../../store/baseApi'
import './SettingsPages.css'

const defaultDebtorSmsTemplate = "Hurmatli {studentName} sizda {period} uchun {debtAmount} so'm qarzdorlik mavjud. Qarzdorlikni to'lamasangiz binoga kirish taqiqlanadi. {hostelName}!"

function smsPreview(template) {
  return String(template || defaultDebtorSmsTemplate)
    .replaceAll('{studentName}', 'Bahromjon Abdulhayev')
    .replaceAll('{debtAmount}', '300 000')
    .replaceAll('{period}', 'Avgust oyi')
    .replaceAll('{hostelName}', 'TizimPlus Hostel')
}

export function GeneralSettingsPage() {
  const [form] = Form.useForm()
  const { data, isLoading, error: loadError } = useGetGeneralSettingsQuery()
  const [updateSettings, { isLoading: saving }] = useUpdateGeneralSettingsMutation()
  const [logoFiles, setLogoFiles] = useState([])
  const [removeLogo, setRemoveLogo] = useState(false)
  const [error, setError] = useState('')
  const settings = data?.settings
  const receiptThankYou = Form.useWatch('receiptThankYou', form)
  const debtorSmsTemplate = Form.useWatch('debtorSmsTemplate', form)

  useEffect(() => {
    if (!settings) return
    form.setFieldsValue({ hostelName: settings.hostelName, organizationPhone: settings.organizationPhone, organizationAddress: settings.organizationAddress, receiptThankYou: settings.receiptThankYou, debtorSmsTemplate: settings.debtorSmsTemplate || defaultDebtorSmsTemplate })
  }, [form, settings])

  const submit = async (values) => {
    try {
      setError('')
      const body = new FormData()
      body.append('payload', JSON.stringify({ hostelName: values.hostelName.trim(), organizationPhone: values.organizationPhone.trim(), organizationAddress: values.organizationAddress.trim(), receiptThankYou: values.receiptThankYou.trim(), debtorSmsTemplate: values.debtorSmsTemplate.trim(), removeLogo }))
      if (logoFiles[0]?.originFileObj) body.append('logo', logoFiles[0].originFileObj)
      await updateSettings(body).unwrap()
      setLogoFiles([])
      setRemoveLogo(false)
      toast.success('Umumiy sozlamalar saqlandi')
    } catch (requestError) { const message = apiErrorMessage(requestError); setError(message); toast.error(message) }
  }

  return (
    <div className="directory-page">
      <div className="directory-card general-settings-card">
        <div className="directory-toolbar"><div><h2>Umumiy sozlamalar</h2><p>Hostel brendi va to‘lov cheki matnini boshqaring</p></div></div>
        {(loadError || error) && <div className="form-error">{error || apiErrorMessage(loadError)}</div>}
        {isLoading ? <div className="directory-loading">Sozlamalar yuklanmoqda…</div> : (
          <Form form={form} layout="vertical" requiredMark={false} onFinish={submit} className="general-settings-form">
            <Form.Item name="hostelName" label="Hostel nomi" rules={[{ required: true, whitespace: true, message: 'Hostel nomini kiriting' }]}><Input maxLength={120} placeholder="Masalan: TizimPlus Hostel" /></Form.Item>
            <div className="general-setting-grid"><Form.Item name="organizationPhone" label="Tashkilot telefoni" rules={[{ required: true, message: 'Tashkilot telefonini kiriting' }, { pattern: /^\d{9}$/, message: 'Masalan: 939119572' }]}><Input maxLength={9} inputMode="numeric" placeholder="939119572" /></Form.Item><Form.Item name="organizationAddress" label="Tashkilot manzili" rules={[{ required: true, whitespace: true, message: 'Tashkilot manzilini kiriting' }]}><Input maxLength={300} placeholder="Viloyat, tuman, ko‘cha va uy" /></Form.Item></div>
            <Form.Item label="Hostel logosi">
              <div className="setting-logo-row">
                {settings?.logo && !removeLogo && !logoFiles.length && <div className="setting-current-logo"><img src={settings.logo.displayUrl || settings.logo.url} alt="Hostel logosi" /><button type="button" onClick={() => setRemoveLogo(true)}>×</button></div>}
                {(!settings?.logo || removeLogo || logoFiles.length > 0) && <Upload accept="image/jpeg,image/png,image/webp" listType="picture-card" fileList={logoFiles} maxCount={1} beforeUpload={() => false} onChange={({ fileList }) => setLogoFiles(fileList.slice(-1))}><div className="room-upload-button"><b>+</b><span>Logo tanlash</span></div></Upload>}
              </div>
              <div className="room-image-help">{settings?.logo && !removeLogo ? 'Yangi logo yuklash uchun avval mavjud logoni o‘chiring' : 'JPG, PNG yoki WEBP · maksimal 5 MB · faqat 1 ta logo'}</div>
            </Form.Item>
            <Form.Item name="receiptThankYou" label="To‘lov chekidagi rahmatnoma" rules={[{ required: true, whitespace: true, message: 'Rahmatnoma matnini kiriting' }]}><Input.TextArea rows={4} maxLength={500} showCount placeholder="Masalan: To‘lovingiz uchun rahmat!" /></Form.Item>
            <div className="receipt-preview"><span>Chekda ko‘rinishi</span><p>{receiptThankYou || 'Rahmatnoma matni'}</p></div>
            <Form.Item name="debtorSmsTemplate" label="Qarzdorlik uchun SMS matni" rules={[{ required: true, whitespace: true, message: 'SMS matnini kiriting' }]}><Input.TextArea rows={5} maxLength={500} showCount placeholder={defaultDebtorSmsTemplate} /></Form.Item>
            <div className="receipt-preview"><span>Talabaga shunday yuboriladi</span><p>{smsPreview(debtorSmsTemplate)}</p></div>
            <div className="room-image-help">Faqat kerak bo‘lsa, matndagi {'{studentName}'}, {'{debtAmount}'} va {'{period}'} qismlarini o‘zgartirmang — ular avtomatik to‘ldiriladi.</div>
            <div className="directory-form-actions"><Button htmlType="submit" loading={saving} className="directory-submit-btn">Sozlamalarni saqlash</Button></div>
          </Form>
        )}
      </div>
    </div>
  )
}
