export async function createContractCanvases(element) {
  const { default: html2canvas } = await import('html2canvas')
  const pages = [...element.querySelectorAll('.contract-a4')]
  return Promise.all(pages.map((page) => html2canvas(page, {
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: 1200,
    backgroundColor: '#ffffff',
  })))
}

export async function createContractPdf(element) {
  const [canvases, { jsPDF }] = await Promise.all([
    createContractCanvases(element),
    import('jspdf'),
  ])
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  canvases.forEach((canvas, index) => {
    if (index) pdf.addPage()
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, 210, 297)
  })
  return pdf
}
