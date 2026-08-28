export const canEditOrDelete = (employee) =>
  ['manager', 'owner', 'admin'].includes(employee?.role)
