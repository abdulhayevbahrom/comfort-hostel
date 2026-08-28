export function calculateContractPayment(startDate, endDate, paymentType, paymentAmount) {
  if (!startDate?.isValid?.() || !endDate?.isValid?.() || !endDate.isAfter(startDate, 'day')) return { durationDays: 0, billingQuantity: 0, totalAmount: 0 }

  const durationDays = endDate.startOf('day').diff(startDate.startOf('day'), 'day')
  const billingQuantity = paymentType === 'daily' ? durationDays : Math.ceil(endDate.diff(startDate, 'month', true))
  return {
    durationDays,
    billingQuantity,
    totalAmount: Math.round(billingQuantity * (Number(paymentAmount) || 0)),
  }
}
