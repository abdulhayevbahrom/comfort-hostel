export async function createContractCanvas(element) {
  const { default: html2canvas } = await import('html2canvas')
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: 1200,
    backgroundColor: '#ffffff',
  })
}

export async function createSinglePageContractPdf(element) {
  const [canvas, { jsPDF }] = await Promise.all([
    createContractCanvas(element),
    import('jspdf'),
  ])
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = 210
  const pageHeight = 297
  const margin = 5
  const scale = Math.min(
    (pageWidth - margin * 2) / canvas.width,
    (pageHeight - margin * 2) / canvas.height,
  )
  const width = canvas.width * scale
  const height = canvas.height * scale
  const x = (pageWidth - width) / 2
  const y = (pageHeight - height) / 2
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', x, y, width, height)
  return pdf
}
