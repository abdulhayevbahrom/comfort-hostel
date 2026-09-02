import dayjs from "dayjs";

const methodNames = { cash: "Naqd", online: "Click", card: "Karta", bank: "Bank" };

export function groupPayments(payments = []) {
  const groups = new Map();
  payments.forEach((payment) => {
    const key = `${payment.kind || "contract"}:${payment.paymentGroup || payment.id}`;
    if (!groups.has(key)) groups.set(key, { ...payment, id: payment.paymentGroup ? `group-${payment.kind || "contract"}-${payment.paymentGroup}` : payment.id, sourcePaymentIds: [], breakdown: [], amount: 0, isGrouped: Boolean(payment.paymentGroup) });
    const group = groups.get(key);
    group.sourcePaymentIds.push(payment.id);
    group.amount += Number(payment.amount || 0);
    group.breakdown.push({ method: payment.method, amount: payment.amount, paidAt: payment.createdAt });
  });
  return [...groups.values()].map((group) => ({ ...group, method: group.breakdown.length > 1 ? group.breakdown.map((part) => `${methodNames[part.method] || part.method}: ${Number(part.amount || 0).toLocaleString("uz-UZ")} so‘m (${dayjs(part.paidAt).format("DD.MM.YYYY HH:mm")})`).join(" / ") : group.breakdown[0]?.method })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
