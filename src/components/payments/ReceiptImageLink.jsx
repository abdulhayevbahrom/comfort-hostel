import { useState } from 'react'
import { Modal } from 'antd'
import { toast } from 'react-toastify'
import { API_URL } from '../../store/baseApi'

export function ReceiptImageLink({ receiptImage }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  if (!receiptImage) return null
  if (!receiptImage.startsWith('/payments/receipt/')) {
    return <a href={receiptImage} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}> · Kvitansiya</a>
  }

  const openPreview = async (event) => {
    event.stopPropagation()
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}${receiptImage}`, { headers: { Authorization: `Bearer ${localStorage.getItem('hostelAuthToken') || ''}` } })
      if (!response.ok) throw new Error('Kvitansiya rasmini ochib bo‘lmadi')
      setPreviewUrl(URL.createObjectURL(await response.blob()))
    } catch (error) { toast.error(error.message) }
    finally { setLoading(false) }
  }
  const closePreview = () => {
    URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
  }
  return <>
    <button type="button" className="payment-receipt-history-link" disabled={loading} onClick={openPreview}> · Kvitansiya</button>
    <Modal open={Boolean(previewUrl)} onCancel={closePreview} footer={null} title="Kvitansiya rasmi" centered width={700} destroyOnHidden><img className="payment-receipt-large-preview" src={previewUrl} alt="Kvitansiya rasmi" /></Modal>
  </>
}
