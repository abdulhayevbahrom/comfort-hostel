export const canEditOrDelete = (employee) =>
  ['manager', 'owner', 'admin'].includes(employee?.role)

export const canManageStudents = (employee, settings) =>
  canEditOrDelete(employee) ||
  (settings?.cashierStudentManageEnabled === true && ['cashier', 'head_cashier'].includes(employee?.role))
