import dayjs from 'dayjs'

const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const money = (value) => Number(value || 0).toLocaleString('uz-UZ')

export function printDebtors(data, organization) {
  const debtors = data?.debtors || []
  const rows = debtors.map((debtor, index) => {
    const contract = debtor.contracts?.[0]
    const room = contract?.room
    const periods = debtor.periods?.map((item) => item.periodKey).join(', ') || (debtor.depositDebt ? 'Depozit' : '—')
    return `<tr><td>${index + 1}</td><td><b>${safe(debtor.student?.fullName || '—')}</b><br><small>${safe(debtor.student?.phone || '')}</small></td><td>${safe(debtor.student?.university?.name || '—')}<br><small>${safe(debtor.student?.faculty?.name || '')}</small></td><td>${safe(room ? `${room.block || ''} ${room.roomNumber || ''}-xona` : '—')}</td><td>${safe(periods)}</td><td class="number">${money(data?.isFuturePeriod ? debtor.waitingAmount : debtor.totalDebt)}</td><td class="number">${money(debtor.overdueDebt)}</td></tr>`
  }).join('')
  const frame = document.createElement('iframe')
  frame.setAttribute('title', 'Qarzdorlar ro‘yxatini chop etish')
  frame.style.cssText = 'position:fixed;inset:0;z-index:99999;width:100vw;height:100vh;border:0;background:#fff'
  document.body.appendChild(frame)
  const printDocument = frame.contentDocument
  printDocument.open()
  printDocument.write(`<!doctype html><html><head><meta charset="utf-8"><title>Qarzdorlar ro‘yxati</title><style>
    @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{margin:0;color:#111;font-family:Arial,sans-serif;font-size:9px}header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px;border-bottom:2px solid #333;padding-bottom:8px}h1{margin:0;font-size:18px}header p{margin:3px 0 0;color:#555}.meta{text-align:right}.summary{display:flex;gap:24px;margin:8px 0 12px;font-size:10px}.summary b{font-size:12px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{padding:5px 4px;border:1px solid #999;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#e9eeee;font-size:8px;text-transform:uppercase}th:first-child,td:first-child{width:6%;text-align:center}th:nth-child(2){width:22%}th:nth-child(3){width:20%}th:nth-child(4){width:12%}th:nth-child(5){width:15%}th:nth-child(6),th:nth-child(7){width:12.5%}.number{text-align:right;font-weight:700;white-space:nowrap}small{color:#555}thead{display:table-header-group}tr{break-inside:avoid}
  </style></head><body><header><div><h1>${safe(organization?.hostelName || 'Comfort Hostel')}</h1><p>${data?.isFuturePeriod ? 'Kutilayotgan to‘lovlar' : 'Qarzdor talabalar'} ro‘yxati</p></div><div class="meta"><b>${safe(data?.selectedPeriod || '')}</b><br>${dayjs().format('DD.MM.YYYY HH:mm')}</div></header><div class="summary"><span>Jami: <b>${debtors.length} ta</b></span><span>Umumiy summa: <b>${money(data?.isFuturePeriod ? data?.summary?.waitingAmount : data?.summary?.totalDebt)} so‘m</b></span></div><table><thead><tr><th>№</th><th>Talaba</th><th>Universitet</th><th>Xona</th><th>Davr</th><th>Jami qarz</th><th>Muddati o‘tgan</th></tr></thead><tbody>${rows || '<tr><td colspan="7">Ma’lumot topilmadi</td></tr>'}</tbody></table></body></html>`)
  printDocument.close()
  const cleanup = () => frame.remove()
  frame.contentWindow.addEventListener('afterprint', cleanup, { once: true })
  setTimeout(() => { frame.contentWindow.focus(); frame.contentWindow.print() }, 400)
  setTimeout(() => { if (frame.isConnected) cleanup() }, 60000)
}
