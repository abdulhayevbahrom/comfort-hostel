import dayjs from 'dayjs'

const methods = { cash: 'Naqd', online: 'Click', bank: 'Bank', card: 'Karta' }
const money = (value) => `${Number(value || 0).toLocaleString('uz-UZ')} so‘m`
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])

export function printPaymentReceipt(payment, organization) {
  if (!payment) return
  const installment = payment.allocations?.[0]?.installment
  const room = payment.contract?.room
  const frame = document.createElement('iframe')
  frame.setAttribute('title', 'To‘lov chekini chop etish')
  frame.style.cssText = 'position:fixed;inset:0;z-index:99999;width:100vw;height:100vh;height:100dvh;border:0;background:#fff'
  document.body.appendChild(frame)
  const printDocument = frame.contentDocument
  printDocument.open()
  printDocument.write(`<!doctype html><html><head><meta charset="utf-8"><title>To‘lov cheki</title><style>
    @page { size: 80mm 160mm; margin: 0; } html,body{width:80mm;margin:0;padding:0;background:#fff}.receipt{width:80mm;padding:4mm;margin:0;color:#111;background:#fff;font-family:"Courier New",monospace;font-size:12px;line-height:1.35;box-sizing:border-box}.receipt *{box-sizing:border-box}.receipt header,.receipt footer{text-align:center}.receipt h2{margin:0 0 4px;font-size:17px}.receipt p{margin:2px 0}.divider{padding:7px 0;margin:10px 0;border-top:1px dashed #111;border-bottom:1px dashed #111;font-weight:800;letter-spacing:1px;text-align:center}.receipt dl{margin:0}.receipt dl div{display:flex;justify-content:space-between;gap:10px;padding:3px 0}.receipt dt{flex:0 0 43%;color:#333}.receipt dd{margin:0;font-weight:700;text-align:right;overflow-wrap:anywhere}.total{display:flex;align-items:center;justify-content:space-between;padding:9px 0;margin-top:8px;border-top:1px dashed #111;border-bottom:1px dashed #111;font-size:16px}.note{padding:7px 0;border-bottom:1px dashed #111}.receipt footer{padding-top:10px}.receipt footer p{font-weight:800}.receipt footer small{font-size:10px}
  </style></head><body><article class="receipt"><header><h2>${safe(organization?.hostelName || 'TizimPlus Hostel')}</h2>${organization?.organizationAddress ? `<p>${safe(organization.organizationAddress)}</p>` : ''}${organization?.organizationPhone ? `<p>Tel: ${safe(organization.organizationPhone)}</p>` : ''}</header><div class="divider">TO‘LOV CHEKI</div><dl><div><dt>Chek №</dt><dd>${safe(payment.id?.slice(-8).toUpperCase() || '—')}</dd></div><div><dt>Sana</dt><dd>${safe(dayjs(payment.createdAt).format('DD.MM.YYYY HH:mm'))}</dd></div><div><dt>Talaba</dt><dd>${safe(payment.student?.fullName || '—')}</dd></div><div><dt>Telefon</dt><dd>${safe(payment.student?.phone || '—')}</dd></div><div><dt>Shartnoma</dt><dd>${safe(payment.contract?.contractNumber || '—')}</dd></div><div><dt>Xona</dt><dd>${safe(room ? `${room.block || ''} ${room.roomNumber || ''}-xona` : '—')}</dd></div><div><dt>To‘lov davri</dt><dd>${safe(installment?.periodKey || '—')}</dd></div><div><dt>To‘lov usuli</dt><dd>${safe(methods[payment.method] || payment.method)}</dd></div></dl><div class="total"><span>JAMI</span><strong>${safe(money(payment.amount))}</strong></div>${payment.note ? `<p class="note">Izoh: ${safe(payment.note)}</p>` : ''}<footer><p>To‘lovingiz uchun rahmat!</p><small>Ushbu chek to‘lov qabul qilinganini tasdiqlaydi.</small></footer></article></body></html>`)
  printDocument.close()
  const cleanup = () => frame.remove()
  frame.contentWindow.addEventListener('afterprint', cleanup, { once: true })
  setTimeout(() => {
    frame.contentWindow.focus()
    frame.contentWindow.print()
  }, 500)
  setTimeout(() => {
    if (frame.isConnected) cleanup()
  }, 60000)
}
