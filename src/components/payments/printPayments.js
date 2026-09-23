import dayjs from "dayjs";

const methods = { cash: "Naqd", online: "Click", card: "Karta", bank: "Bank" };
const safe = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
const money = (value) => Number(value || 0).toLocaleString("uz-UZ");
const employeeName = (employee) =>
  employee
    ? `${employee.firstname || ""} ${employee.lastname || ""}`.trim()
    : "—";

export function printPayments(payments, filters, organization) {
  const rows = payments
    .map((payment, index) => {
      const room = payment.contract?.room;
      const method = payment.breakdown?.length
        ? [...new Set(payment.breakdown.map((part) => methods[part.method] || part.method))].join(", ")
        : methods[payment.method] || payment.method;
      return `<tr class="${payment.status === "cancelled" ? "cancelled" : ""}"><td>${index + 1}</td><td><b>${safe(payment.student?.fullName || "—")}</b><br><small>${safe(payment.student?.phone || "")}</small></td><td>${safe(payment.isDeposit ? "Depozit" : payment.contract?.contractNumber || "—")}<br><small>${safe(room ? `${room.block || ""} ${room.roomNumber || ""}-xona` : "")}</small></td><td>${safe(payment.isDeposit ? "Depozit" : payment.allocations?.[0]?.installment?.periodKey || "—")}</td><td>${dayjs(payment.createdAt).format("DD.MM.YYYY HH:mm")}</td><td>${safe(method)}</td><td>${safe(employeeName(payment.receivedBy))}</td><td class="number">${money(payment.amount)}</td></tr>`;
    })
    .join("");
  const filterLabel =
    [
      filters.from && `dan: ${dayjs(filters.from).format("DD.MM.YYYY")}`,
      filters.to && `gacha: ${dayjs(filters.to).format("DD.MM.YYYY")}`,
      filters.method && `usul: ${methods[filters.method]}`,
      filters.search && `qidiruv: ${filters.search}`,
    ]
      .filter(Boolean)
      .join(" · ") || "Barcha to‘lovlar";
  const total = payments
    .filter((payment) => payment.status !== "cancelled")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const frame = document.createElement("iframe");
  frame.setAttribute("title", "To‘lovlar ro‘yxatini chop etish");
  frame.style.cssText =
    "position:fixed;inset:0;z-index:99999;width:100vw;height:100vh;border:0;background:#fff";
  document.body.appendChild(frame);
  const printDocument = frame.contentDocument;
  printDocument.open();
  printDocument.write(`<!doctype html><html><head><meta charset="utf-8"><title>To‘lovlar ro‘yxati</title><style>
    @page{size:A4 portrait;margin:9mm}*{box-sizing:border-box}body{margin:0;color:#111;font-family:Arial,sans-serif;font-size:7px}header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px;padding-bottom:7px;border-bottom:2px solid #333}h1{margin:0;font-size:16px}header p{margin:3px 0 0;color:#555}.meta{text-align:right}.summary{display:flex;gap:18px;margin:7px 0 10px;font-size:9px}.summary b{font-size:11px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{padding:3px;border:1px solid #999;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#e9eeee;font-size:6.5px;text-transform:uppercase}th:first-child,td:first-child{width:4%;text-align:center}th:nth-child(2){width:19%}th:nth-child(3){width:15%}th:nth-child(4){width:9%}th:nth-child(5){width:14%}th:nth-child(6){width:10%}th:nth-child(7){width:17%}th:nth-child(8){width:12%}.number{text-align:right;font-weight:700;white-space:nowrap}.cancelled{color:#8c5555;text-decoration:line-through;background:#fff2f2}small{color:#555}thead{display:table-header-group}tr{break-inside:avoid}
  </style></head><body><header><div><h1>${safe(organization?.hostelName || "Comfort Hostel")}</h1><p>To‘lovlar ro‘yxati</p></div><div class="meta">${safe(filterLabel)}<br>${dayjs().format("DD.MM.YYYY HH:mm")}</div></header><div class="summary"><span>Jami: <b>${payments.length} ta</b></span><span>Amaldagi to‘lovlar summasi: <b>${money(total)} so‘m</b></span></div><table><thead><tr><th>№</th><th>Talaba</th><th>Shartnoma</th><th>Davr</th><th>Sana</th><th>Tolov usuli</th><th>Qabul qilgan</th><th>Summa</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Ma’lumot topilmadi</td></tr>'}</tbody></table></body></html>`);
  printDocument.close();
  const cleanup = () => frame.remove();
  frame.contentWindow.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }, 400);
  setTimeout(() => {
    if (frame.isConnected) cleanup();
  }, 60000);
}
