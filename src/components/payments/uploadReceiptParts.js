import { API_URL } from '../../store/baseApi'

export async function uploadReceiptParts(parts, files = {}) {
  return Promise.all(parts.map(async (part) => {
    if (part.method === 'cash') return part
    const file = files[part.method]
    if (!file) return part
    if (!(file instanceof File)) throw new Error('Kvitansiya rasmi noto‘g‘ri formatda')
    const body = new FormData()
    body.append('receipt', file)
    const response = await fetch(`${API_URL}/payments/receipt`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('hostelAuthToken') || ''}` }, body })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'Kvitansiya yuklanmadi')
    return { ...part, receiptImage: result.data.receiptImage }
  }))
}
