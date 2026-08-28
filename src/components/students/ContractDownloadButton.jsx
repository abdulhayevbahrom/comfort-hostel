import { useRef, useState } from 'react'
import { ContractDocument } from './ContractPreviewModal'
import { createSinglePageContractPdf } from './contractPdf'

export function ContractDownloadButton({ contract, student, organization }) {
  const documentRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const download = async () => {
    try {
      setDownloading(true)
      const pdf = await createSinglePageContractPdf(documentRef.current)
      pdf.save(`Shartnoma-${contract.contractNumber}.pdf`)
    } finally { setDownloading(false) }
  }
  return <><button onClick={download} disabled={downloading} aria-label="PDF yuklab olish" title="PDF yuklab olish"><svg viewBox="0 0 24 24"><path d="M12 3V15M7 10L12 15L17 10M4 20H20"/></svg></button><div className="contract-download-source" aria-hidden="true"><ContractDocument ref={documentRef} contract={contract} student={student} organization={organization} /></div></>
}
