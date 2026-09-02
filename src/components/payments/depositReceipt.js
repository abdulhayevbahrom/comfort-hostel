import dayjs from "dayjs";

const methodNames = { cash: "Naqd", online: "Click", card: "Karta", bank: "Bank" };
const money = (value) => `${Number(value || 0).toLocaleString("uz-UZ")} so‘m`;
const safe = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export function printDepositReceipt(student, payments, organization) {
  if (!student || !payments?.length) return;
  const total = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const paymentRows = payments.map((payment) => `<div><dt>${safe(methodNames[payment.method] || payment.method)}</dt><dd>${safe(money(payment.amount))}${payment.paidAt ? `<small>${safe(dayjs(payment.paidAt).format("DD.MM.YYYY HH:mm"))}</small>` : ""}</dd></div>`).join("");
  const frame = document.createElement("iframe");
  frame.setAttribute("title", "Depozit chekini chop etish");
  frame.style.cssText = "position:fixed;inset:0;z-index:99999;width:100vw;height:100vh;height:100dvh;border:0;background:#fff";
  document.body.appendChild(frame);
  const printDocument = frame.contentDocument;
  printDocument.open();
  printDocument.write(`<!doctype html><html><head><meta charset="utf-8"><title>Depozit cheki</title><style>
    @page{size:80mm 160mm;margin:0}html,body{width:80mm;margin:0;padding:0;background:#fff}.receipt{width:80mm;padding:4mm;color:#111;font-family:"Courier New",monospace;font-size:12px;line-height:1.35;box-sizing:border-box}.receipt *{box-sizing:border-box}header,footer{text-align:center}h2{margin:0 0 4px;font-size:17px}p{margin:2px 0}.divider{padding:7px 0;margin:10px 0;border-top:1px dashed #111;border-bottom:1px dashed #111;font-weight:800;letter-spacing:1px;text-align:center}dl{margin:0}dl div{display:flex;justify-content:space-between;gap:10px;padding:4px 0}dt{flex:0 0 43%;color:#333}dd{margin:0;font-weight:700;text-align:right;overflow-wrap:anywhere}dd small{display:block;margin-top:1px;color:#555;font-size:9px}.methods{padding-top:6px;margin-top:6px;border-top:1px dashed #777}.methods-title{margin:0 0 3px;font-weight:800}.total{display:flex;align-items:center;justify-content:space-between;padding:9px 0;margin-top:8px;border-top:1px dashed #111;border-bottom:1px dashed #111;font-size:16px}footer{padding-top:10px}footer p{font-weight:800}footer small{font-size:10px}
  </style></head><body><article class="receipt"><header><h2>${safe(organization?.hostelName || "TizimPlus Hostel")}</h2>${organization?.organizationAddress ? `<p>${safe(organization.organizationAddress)}</p>` : ""}${organization?.organizationPhone ? `<p>Tel: ${safe(organization.organizationPhone)}</p>` : ""}</header><div class="divider">DEPOZIT CHEKI</div><dl><div><dt>Chek №</dt><dd>${safe(student.id?.slice(-8).toUpperCase() || "—")}</dd></div><div><dt>Sana</dt><dd>${safe(dayjs(payments[payments.length - 1]?.paidAt || student.depositReceivedAt).format("DD.MM.YYYY HH:mm"))}</dd></div><div><dt>Talaba</dt><dd>${safe(student.fullName || "—")}</dd></div><div><dt>Telefon</dt><dd>${safe(student.phone || "—")}</dd></div></dl><div class="methods"><p class="methods-title">To‘lov tarkibi</p><dl>${paymentRows}</dl></div><div class="total"><span>JAMI</span><strong>${safe(money(total))}</strong></div><footer><p>Depozit qabul qilindi</p><small>Ushbu chek depozit to‘lovi olinganini tasdiqlaydi.</small></footer></article></body></html>`);
  printDocument.close();
  const cleanup = () => frame.remove();
  frame.contentWindow.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(() => { frame.contentWindow.focus(); frame.contentWindow.print(); }, 500);
  setTimeout(() => { if (frame.isConnected) cleanup(); }, 60000);
}
