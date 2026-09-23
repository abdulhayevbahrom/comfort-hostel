import dayjs from 'dayjs'

const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const money = (value) => Number(value || 0).toLocaleString('uz-UZ')
const employeeName = (employee) => `${employee?.firstname || ''} ${employee?.lastname || ''}`.trim() || '—'
const methodLabels = { cash: 'Naqd', card: 'Karta', online: 'Click', bank: 'Bank' }

function openPrint(title, body, landscape = false) {
  const frame = document.createElement('iframe')
  frame.setAttribute('title', `${title}ni chop etish`)
  frame.style.cssText = 'position:fixed;inset:0;z-index:99999;width:100vw;height:100vh;border:0;background:#fff'
  document.body.appendChild(frame)
  const documentRef = frame.contentDocument
  documentRef.open()
  documentRef.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safe(title)}</title><style>@page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:10mm}*{box-sizing:border-box}body{margin:0;color:#111;font-family:Arial,sans-serif;font-size:8px}header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:7px;margin-bottom:10px;border-bottom:2px solid #333}h1{margin:0;font-size:17px}header p{margin:3px 0 0;color:#555}.meta{text-align:right}.summary{display:flex;gap:18px;margin:7px 0 10px;font-size:9px}.summary b{font-size:11px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{padding:4px;border:1px solid #999;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#e9eeee;font-size:7px;text-transform:uppercase}.number{text-align:right;font-weight:700;white-space:nowrap}small{color:#555}thead{display:table-header-group}tr{break-inside:avoid}</style></head><body>${body}</body></html>`)
  documentRef.close()
  const cleanup = () => frame.remove()
  frame.contentWindow.addEventListener('afterprint', cleanup, { once: true })
  setTimeout(() => { frame.contentWindow.focus(); frame.contentWindow.print() }, 400)
  setTimeout(() => { if (frame.isConnected) cleanup() }, 60000)
}

export function printSalaries(rows, totals, period, organization) {
  const bodyRows = rows.map((row, index) => `<tr><td>${index + 1}</td><td><b>${safe(employeeName(row.employee))}</b><br><small>${safe(row.employee?.position || '')}</small></td><td class="number">${money(row.baseSalary)}</td><td class="number">${money(row.bonusAmount)}</td><td class="number">${money(row.payroll?.deductions?.totalDeduction)}</td><td class="number">${money(row.salary)}</td><td class="number">${money(row.paidThisMonth)}</td><td class="number">${money(row.currentBalance)}</td></tr>`).join('')
  const body = `<header><div><h1>${safe(organization?.hostelName || 'Comfort Hostel')}</h1><p>Oyliklar hisoboti</p></div><div class="meta">${safe(period)}<br>${dayjs().format('DD.MM.YYYY HH:mm')}</div></header><div class="summary"><span>Xodimlar: <b>${rows.length} ta</b></span><span>Sof oylik: <b>${money(totals.salary)} so‘m</b></span><span>Berildi: <b>${money(totals.paid)} so‘m</b></span></div><table><thead><tr><th>№</th><th>Xodim</th><th>Bazaviy</th><th>Bonus</th><th>Jarima</th><th>Hisoblandi</th><th>Berildi</th><th>Qoldiq</th></tr></thead><tbody>${bodyRows || '<tr><td colspan="8">Ma’lumot topilmadi</td></tr>'}</tbody></table>`
  openPrint('Oyliklar hisoboti', body)
}

export function printCashSessions(sessions, date, organization) {
  const bodyRows = sessions.map((session, index) => {
    const methods = Object.entries(session.breakdown || { cash: session.expectedAmount }).filter(([, amount]) => Number(amount) > 0).map(([key]) => methodLabels[key] || key).join(', ')
    const status = session.status === 'approved' ? 'Qabul qilingan' : session.status === 'pending' ? 'Kutilmoqda' : 'Rad etilgan'
    return `<tr><td>${index + 1}</td><td>${safe(employeeName(session.cashier))}</td><td>${session.closedAt ? dayjs(session.closedAt).format('DD.MM.YYYY HH:mm') : '—'}</td><td>${safe(methods)}</td><td class="number">${money(session.expectedAmount)}</td><td>${safe(status)}</td><td>${safe(session.note || '—')}</td></tr>`
  }).join('')
  const total = sessions.reduce((sum, session) => sum + Number(session.expectedAmount || 0), 0)
  const body = `<header><div><h1>${safe(organization?.hostelName || 'Comfort Hostel')}</h1><p>Kassa tarixi</p></div><div class="meta">${date ? dayjs(date).format('DD.MM.YYYY') : 'Barcha sanalar'}<br>${dayjs().format('DD.MM.YYYY HH:mm')}</div></header><div class="summary"><span>Yozuvlar: <b>${sessions.length} ta</b></span><span>Jami: <b>${money(total)} so‘m</b></span></div><table><thead><tr><th>№</th><th>Kassir</th><th>Topshirilgan vaqt</th><th>Usul</th><th>Summa</th><th>Holat</th><th>Izoh</th></tr></thead><tbody>${bodyRows || '<tr><td colspan="7">Ma’lumot topilmadi</td></tr>'}</tbody></table>`
  openPrint('Kassa tarixi', body)
}
