import { useRef, useState } from 'react'
import { ContractDocument } from './ContractPreviewModal'
import { createContractCanvases, createContractPdf } from './contractPdf'

export function ContractPrintButton({ contract, student, organization }) {
  const documentRef = useRef(null)
  const [printing, setPrinting] = useState(false)
  const print = async () => {
    const printWindow = window.open('', '_blank')
    try {
      setPrinting(true)
      if (printWindow) {
        printWindow.document.write('<p style="font-family:Arial,sans-serif">Shartnoma tayyorlanmoqda…</p>')
        printWindow.document.close()
      }
      if (!printWindow) {
        const pdf = await createContractPdf(documentRef.current)
        pdf.save(`Shartnoma-${contract.contractNumber}.pdf`)
        return
      }
      const canvases = await createContractCanvases(documentRef.current)
      const images = canvases.map((canvas) => canvas.toDataURL('image/jpeg', 0.98))
      const printDocument = printWindow.document
      printDocument.open()
      printDocument.write('<!doctype html><html><head><meta charset="utf-8"><title>Shartnoma</title><style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0}img{display:block;width:210mm;height:297mm;object-fit:contain;break-after:page}@media screen{body{background:#303438;padding:12px}img{max-width:100%;height:auto;margin:0 auto 12px;background:#fff}}</style></head><body></body></html>')
      printDocument.close()
      const loaded = images.map((src) => new Promise((resolve, reject) => {
        const image = printDocument.createElement('img')
        image.alt = 'Shartnoma sahifasi'
        image.onload = resolve
        image.onerror = () => reject(new Error('Shartnoma sahifasi yuklanmadi'))
        image.src = src
        printDocument.body.appendChild(image)
      }))
      await Promise.all(loaded)
      printWindow.focus()
      printWindow.print()
    } catch (error) {
      printWindow?.close()
      throw error
    } finally {
      setPrinting(false)
    }
  }
  return <><button onClick={print} disabled={printing} aria-label="Chop etish" title="Chop etish"><svg viewBox="0 0 24 24"><path d="M6 9V3H18V9M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1-2 2v5H6Z"/><path d="M6 14H18V21H6Z"/></svg></button><div className="contract-download-source" aria-hidden="true"><ContractDocument ref={documentRef} contract={contract} student={student} organization={organization} /></div></>
}
