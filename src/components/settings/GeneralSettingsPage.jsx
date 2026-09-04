import { useEffect, useState } from 'react'
import { Button, Checkbox, Form, Input, InputNumber, Upload } from 'antd'
import { toast } from 'react-toastify'
import { apiErrorMessage, useGetGeneralSettingsQuery, useUpdateGeneralSettingsMutation } from '../../store/baseApi'
import './SettingsPages.css'

const workDayOptions = [{ label: 'Du', value: 1 }, { label: 'Se', value: 2 }, { label: 'Ch', value: 3 }, { label: 'Pa', value: 4 }, { label: 'Ju', value: 5 }, { label: 'Sh', value: 6 }, { label: 'Ya', value: 0 }]

export function GeneralSettingsPage() {
  const [form] = Form.useForm()
  const { data, isLoading, error: loadError } = useGetGeneralSettingsQuery()
  const [updateSettings, { isLoading: saving }] = useUpdateGeneralSettingsMutation()
  const [logoFiles, setLogoFiles] = useState([])
  const [removeLogo, setRemoveLogo] = useState(false)
  const [error, setError] = useState('')
  const settings = data?.settings
  const receiptThankYou = Form.useWatch('receiptThankYou', form)
  const useTimePenalty = Form.useWatch(['employeeWorkSchedule', 'useTimePenalty'], form)

  useEffect(() => {
    if (!settings) return
    form.setFieldsValue({
      hostelName: settings.hostelName,
      organizationPhone: settings.organizationPhone,
      organizationAddress: settings.organizationAddress,
      receiptThankYou: settings.receiptThankYou,
      employeeFaceAttendanceEnabled: settings.employeeFaceAttendanceEnabled !== false,
      employeeWorkSchedule: {
        checkInTime: settings.employeeWorkSchedule?.checkInTime || '09:00',
        checkOutTime: settings.employeeWorkSchedule?.checkOutTime || '18:00',
        workDays: settings.employeeWorkSchedule?.workDays || [1, 2, 3, 4, 5, 6],
        lateAfterMinutes: Number(settings.employeeWorkSchedule?.lateAfterMinutes || 0),
        earlyLeaveMinutes: Number(settings.employeeWorkSchedule?.earlyLeaveMinutes || 0),
        useTimePenalty: Boolean(settings.employeeWorkSchedule?.useTimePenalty),
        penaltyPerMinute: Number(settings.employeeWorkSchedule?.penaltyPerMinute || 0),
        penaltyStartDate: settings.employeeWorkSchedule?.penaltyStartDate || new Date().toISOString().slice(0, 10),
      },
    })
  }, [form, settings])

  const submit = async (values) => {
    try {
      setError('')
      const body = new FormData()
      body.append('payload', JSON.stringify({
        hostelName: values.hostelName.trim(),
        organizationPhone: values.organizationPhone.trim(),
        organizationAddress: values.organizationAddress.trim(),
        receiptThankYou: values.receiptThankYou.trim(),
        employeeFaceAttendanceEnabled: values.employeeFaceAttendanceEnabled !== false,
        employeeWorkSchedule: values.employeeWorkSchedule,
        removeLogo,
      }))
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
            <section className="general-employee-schedule">
              <div className="general-setting-section-title"><h3>Xodimlar FaceID va ish grafigi</h3><p>Bu grafik barcha faol xodimlar uchun bir xil ishlaydi.</p></div>
              <Form.Item name="employeeFaceAttendanceEnabled" valuePropName="checked"><Checkbox>FaceID orqali xodim kirish-chiqishi va davomati faol</Checkbox></Form.Item>
              <div className="general-setting-grid">
                <Form.Item name={['employeeWorkSchedule', 'checkInTime']} label="Ish boshlanishi" rules={[{ required: true }, { pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: 'HH:mm formatida kiriting' }]}><Input placeholder="09:00" /></Form.Item>
                <Form.Item name={['employeeWorkSchedule', 'checkOutTime']} label="Ish tugashi" rules={[{ required: true }, { pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: 'HH:mm formatida kiriting' }]}><Input placeholder="18:00" /></Form.Item>
                <Form.Item name={['employeeWorkSchedule', 'lateAfterMinutes']} label="Kech qolishga ruxsat (daq.)"><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
                <Form.Item name={['employeeWorkSchedule', 'earlyLeaveMinutes']} label="Erta ketishga ruxsat (daq.)"><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
                <Form.Item name={['employeeWorkSchedule', 'penaltyStartDate']} label="Jarima hisobi boshlanish sanasi" rules={[{ required: true, pattern: /^\d{4}-\d{2}-\d{2}$/, message: 'YYYY-MM-DD formatida kiriting' }]}><Input placeholder="2026-08-31" /></Form.Item>
              </div>
              <Form.Item name={['employeeWorkSchedule', 'workDays']} label="Ish kunlari" rules={[{ required: true, message: 'Kamida bitta ish kunini tanlang' }]}><Checkbox.Group options={workDayOptions} /></Form.Item>
              <Form.Item name={['employeeWorkSchedule', 'useTimePenalty']} valuePropName="checked"><Checkbox>Har kechikkan/erta ketgan daqiqa uchun qat’iy jarima</Checkbox></Form.Item>
              {useTimePenalty && <Form.Item name={['employeeWorkSchedule', 'penaltyPerMinute']} label="1 daqiqa jarimasi" rules={[{ required: true, type: 'number', min: 0, message: 'Jarima summasini kiriting' }]}><InputNumber min={0} precision={0} addonAfter="so‘m" style={{ width: '100%' }} /></Form.Item>}
              <div className="schedule-mode-note">Chiqish qurilmasi yo‘q paytda tizim xodimni belgilangan ish tugash vaqtida avtomatik chiqqan deb hisoblaydi. OUT qurilma qo‘shilgach, haqiqiy FaceID chiqish vaqti olinadi.</div>
            </section>
            <div className="directory-form-actions"><Button htmlType="submit" loading={saving} className="directory-submit-btn">Sozlamalarni saqlash</Button></div>
          </Form>
        )}
      </div>
    </div>
  )
}
