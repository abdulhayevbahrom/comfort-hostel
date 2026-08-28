export const categoryOptions = [
  { label: 'Standart', value: 'standart' },
  { label: 'Komfort', value: 'komfort' },
  { label: 'Premium', value: 'premium' },
  { label: 'Maxsus ehtiyojli', value: 'maxsus' },
]

export const genderOptions = [
  { label: 'O‘g‘il bolalar', value: 'male' },
  { label: 'Qiz bolalar', value: 'female' },
  { label: 'Oila', value: 'family' },
  { label: 'Mehmon', value: 'guest' },
]

export const statusOptions = [
  { label: 'Bo‘sh joy bor', value: 'available' },
  { label: 'Ta’mirda', value: 'maintenance' },
]
export const optionLabel = (options, value) => options.find((item) => item.value === value)?.label || value || '—'

export const bedLabel = (number) => `${Math.ceil(Number(number) / 2)}-krovat · ${Number(number) % 2 ? 'pastki' : 'yuqori'} o‘rin`
