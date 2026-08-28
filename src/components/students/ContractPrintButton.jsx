import { useRef, useState } from 'react'
import { ContractDocument } from './ContractPreviewModal'
import { createContractCanvas, createSinglePageContractPdf } from './contractPdf'

export function ContractPrintButton({ contract, student, organization }) {
  const documentRef = useRef(null)
  const [printing, setPrinting] = useState(false)
  const print = async () => {
    const printWindow = window.open('', '_blank')
    let imageUrl
    try {
      setPrinting(true)
      if (printWindow) {
        printWindow.document.open()
        printWindow.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Shartnoma tayyorlanmoqda</title><style>html,body{height:100%;margin:0;background:#fff;font-family:Arial,sans-serif}body{display:grid;place-items:center;color:#345}p{font-size:16px}</style></head><body><p>Shartnoma tayyorlanmoqda…</p></body></html>')
        printWindow.document.close()
      }
      const canvas = await createContractCanvas(documentRef.current)
      if (!printWindow) {
        const pdf = await createSinglePageContractPdf(documentRef.current)
        pdf.save(`Shartnoma-${contract.contractNumber}.pdf`)
        return
      }
      const imageBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Shartnoma rasmi yaratilmadi')), 'image/jpeg', 0.98)
      })
      imageUrl = URL.createObjectURL(imageBlob)
      const printDocument = printWindow.document
      printDocument.open()
      printDocument.write(`<!doctype html><html><head><meta charset="utf-8"><title>Shartnoma-${contract.contractNumber}</title><style>@page{size:A4 portrait;margin:0}html,body{width:210mm;height:297mm;margin:0;padding:0;background:#fff;overflow:hidden}body{display:grid;place-items:center}img{display:block;max-width:210mm;max-height:297mm;width:auto;height:auto;object-fit:contain}@media screen{html,body{width:100%;min-height:100%;height:auto}body{background:#303438;padding:12px;box-sizing:border-box}img{width:min(210mm,100%);height:auto;background:#fff;box-shadow:0 3px 18px #0004}}</style></head><body></body></html>`)
      printDocument.close()
      const image = printDocument.createElement('img')
      image.alt = 'Shartnoma'
      const imageLoaded = new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = () => reject(new Error('Shartnoma rasmi yuklanmadi'))
      })
      image.src = imageUrl
      printDocument.body.appendChild(image)
      await imageLoaded
      if (image.decode) await image.decode().catch(() => undefined)
      const cleanup = () => {
        if (imageUrl) URL.revokeObjectURL(imageUrl)
        imageUrl = undefined
      }
      printWindow.addEventListener('afterprint', cleanup, { once: true })
      await new Promise((resolve) => setTimeout(resolve, 300))
      printWindow.focus()
      printWindow.print()
      setTimeout(() => {
        if (imageUrl) cleanup()
      }, 60000)
    } catch (error) {
      printWindow?.close()
      if (imageUrl) URL.revokeObjectURL(imageUrl)
      throw error
    } finally {
      setPrinting(false)
    }
  }
  return <><button onClick={print} disabled={printing} aria-label="Chop etish" title="Chop etish"><svg viewBox="0 0 24 24"><path d="M6 9V3H18V9M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14H18V21H6Z"/></svg></button><div className="contract-download-source" aria-hidden="true"><ContractDocument ref={documentRef} contract={contract} student={student} organization={organization} /></div></>
}
