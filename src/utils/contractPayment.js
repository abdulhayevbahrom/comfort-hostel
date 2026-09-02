export function calculateContractPayment(startDate, endDate, paymentType, paymentAmount) {
  if (!startDate?.isValid?.() || !endDate?.isValid?.() || !endDate.isAfter(startDate, 'day')) return { durationDays: 0, billingQuantity: 0, totalAmount: 0 }

  const durationDays = endDate.startOf('day').diff(startDate.startOf('day'), 'day') + 1
  if (paymentType === 'daily') {
    return { durationDays, billingQuantity: durationDays, totalAmount: Math.round(durationDays * (Number(paymentAmount) || 0)) }
  }
  const rate = Number(paymentAmount) || 0
  let monthStart = startDate.startOf('month')
  const finalMonthStart = endDate.startOf('month')
  const installments = []
  while (monthStart.isBefore(finalMonthStart, 'month') || monthStart.isSame(finalMonthStart, 'month')) {
    const monthEnd = monthStart.endOf('month')
    const coveredStart = startDate.isAfter(monthStart, 'day') ? startDate : monthStart
    const coveredEnd = endDate.isBefore(monthEnd, 'day') ? endDate : monthEnd
    const coveredDays = coveredEnd.startOf('day').diff(coveredStart.startOf('day'), 'day') + 1
    installments.push(Math.round((coveredDays / monthStart.daysInMonth()) * rate))
    monthStart = monthStart.add(1, 'month').startOf('month')
  }
  return {
    durationDays,
    billingQuantity: installments.length,
    totalAmount: installments.reduce((sum, amount) => sum + amount, 0),
  }
}
