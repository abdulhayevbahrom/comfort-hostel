import { useEffect, useRef, useState } from 'react'
import { Modal } from 'antd'
import { toast } from 'react-toastify'
import './PaymentReceiptField.css'

const MAX_BYTES = 1.5 * 1024 * 1024
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function ReceiptPreview({ file, onRemove }) {
  const imageRef = useRef(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  useEffect(() => {
    const url = URL.createObjectURL(file)
    if (imageRef.current) imageRef.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <><div className="payment-receipt-preview-wrap">
    <button type="button" className="payment-receipt-preview-button" onClick={() => { setPreviewUrl(imageRef.current?.src || ''); setPreviewOpen(true) }} title="Tanlangan rasmni ko‘rish" aria-label="Tanlangan kvitansiya rasmini ko‘rish"><img ref={imageRef} className="payment-receipt-picker-preview" alt="Tanlangan kvitansiya rasmi" /><span className="payment-receipt-preview-overlay" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M2.5 12s3.4-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.4 5.5-9.5 5.5S2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8"/></svg></span></button>
    <button type="button" className="payment-receipt-remove" onClick={onRemove} aria-label="Tanlangan kvitansiya rasmini o‘chirish" title="Rasmni o‘chirish">×</button>
    </div>
    <Modal open={previewOpen} onCancel={() => setPreviewOpen(false)} footer={null} title="Kvitansiya rasmi" centered width={700} destroyOnHidden><img className="payment-receipt-large-preview" src={previewUrl} alt="Kvitansiya rasmi" /></Modal>
  </>
}

export function PaymentReceiptField({ value, onChange, disabled }) {
  return <div className="payment-receipt-picker">{!(value instanceof File) && <label className={`payment-receipt-upload${disabled ? ' is-disabled' : ''}`}>
    <input className="payment-receipt-picker-input" type="file" accept="image/jpeg,image/png,image/webp" multiple={false} disabled={disabled} onChange={(event) => {
      if (event.target.files?.length > 1) { toast.error('Har bir to‘lov usuli uchun faqat bitta rasm tanlang'); event.target.value = ''; return }
      const file = event.target.files?.[0]
      if (!file) return
      if (!TYPES.has(file.type)) { toast.error('Kvitansiya JPG, PNG yoki WEBP rasm bo‘lishi kerak'); event.target.value = ''; onChange(null); return }
      if (file.size > MAX_BYTES) { toast.error('Kvitansiya rasmi 1,5 MB dan oshmasligi kerak'); event.target.value = ''; onChange(null); return }
      onChange(file)
    }} />
    <span className="payment-receipt-picker-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4.5 15.5v3A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
    <span className="payment-receipt-upload-label">Rasm tanlash</span>
  </label>}{value instanceof File && <ReceiptPreview key={`${value.name}:${value.size}:${value.lastModified}`} file={value} onRemove={() => onChange(null)} />}</div>
}
