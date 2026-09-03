import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { io } from 'socket.io-client'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7100/api'
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '')

let sharedSocket = null
let socketSubscriptionCount = 0
const invalidateTimers = new Map()
const pendingMutationRequests = new Map()

const requestBodyKey = (body) => {
  if (body instanceof FormData) return JSON.stringify([...body.entries()].map(([key, value]) => [key, value instanceof File ? `${value.name}:${value.size}:${value.lastModified}` : value]))
  try { return JSON.stringify(body ?? null) } catch { return String(body) }
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('hostelAuthToken')
    if (token) headers.set('authorization', `Bearer ${token}`)
    return headers
  },
})

const guardedBaseQuery = (args, api, extraOptions) => {
  const request = typeof args === 'string' ? { url: args } : args
  const method = String(request.method || 'GET').toUpperCase()
  if (method === 'GET' || method === 'HEAD') return rawBaseQuery(args, api, extraOptions)
  const key = `${method}:${request.url}:${requestBodyKey(request.body)}`
  if (pendingMutationRequests.has(key)) return pendingMutationRequests.get(key)
  const pending = rawBaseQuery(args, api, extraOptions).finally(() => pendingMutationRequests.delete(key))
  pendingMutationRequests.set(key, pending)
  return pending
}

const getSharedSocket = () => {
  if (!sharedSocket) sharedSocket = io(SOCKET_URL)
  return sharedSocket
}

const subscribeSocket = (events, handler) => {
  const socket = getSharedSocket()
  socketSubscriptionCount += 1
  events.forEach((event) => socket.on(event, handler))
  return () => {
    events.forEach((event) => socket.off(event, handler))
    socketSubscriptionCount = Math.max(0, socketSubscriptionCount - 1)
    if (!socketSubscriptionCount) {
      socket.disconnect()
      sharedSocket = null
    }
  }
}

const scheduleInvalidate = (dispatch, tags, key, delay = 250) => {
  window.clearTimeout(invalidateTimers.get(key))
  invalidateTimers.set(key, window.setTimeout(() => {
    invalidateTimers.delete(key)
    dispatch(baseApi.util.invalidateTags(tags))
  }, delay))
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: guardedBaseQuery,
  tagTypes: ['Dashboard', 'Report', 'Employee', 'Room', 'Student', 'StudentContract', 'Payment', 'Debtor', 'Attendance', 'EmployeeAttendance', 'FaceAccess', 'FaceDevice', 'Expense', 'Fine', 'Salary', 'Shop', 'University', 'Faculty', 'BuildingBlock', 'GeneralSetting', 'Notification', 'CashSession'],
  endpoints: (builder) => ({
    getDashboard: builder.query({
      query: ({ period, date, startDate, endDate } = {}) => ({ url: '/dashboard', params: { ...(period ? { period } : {}), ...(date ? { date } : {}), ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) } }),
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'Dashboard', id: 'MAIN' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'Dashboard', id: 'MAIN' }], 'Dashboard:MAIN')
        const events = ['students:changed', 'student-contracts:changed', 'rooms:changed', 'payments:changed', 'central-cash:changed', 'expenses:changed', 'fines:changed', 'attendance:changed', 'salaries:changed', 'employees:changed']
        const unsubscribe = subscribeSocket(events, refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getMonthlyReport: builder.query({
      query: (period) => ({ url: '/reports/monthly', params: period ? { period } : undefined }),
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'Report', id: 'MONTHLY' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'Report', id: 'MONTHLY' }], 'Report:MONTHLY')
        const events = ['students:changed', 'student-contracts:changed', 'rooms:changed', 'payments:changed', 'expenses:changed', 'fines:changed', 'salaries:changed', 'employees:changed']
        const unsubscribe = subscribeSocket(events, refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getYearlyReport: builder.query({
      query: (year) => ({ url: '/reports/yearly', params: year ? { year } : undefined }),
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'Report', id: 'YEARLY' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'Report', id: 'YEARLY' }], 'Report:YEARLY')
        const events = ['students:changed', 'student-contracts:changed', 'rooms:changed', 'payments:changed', 'expenses:changed', 'fines:changed', 'salaries:changed', 'employees:changed']
        const unsubscribe = subscribeSocket(events, refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    login: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: (response) => response.data,
    }),
    getMe: builder.query({
      query: () => '/auth/me',
      transformResponse: (response) => response.data,
    }),
    getEmployees: builder.query({
      query: (argument = '') => {
        const options = typeof argument === 'string' ? { search: argument } : argument || {}
        return { url: '/employees', params: { ...(options.search ? { search: options.search } : {}), ...(options.businessUnit ? { businessUnit: options.businessUnit } : {}) } }
      },
      transformResponse: (response) => response.data,
      providesTags: (result) => [
        { type: 'Employee', id: 'LIST' },
        ...(result?.employees || []).map((employee) => ({ type: 'Employee', id: employee.id })),
      ],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refreshEmployees = () => scheduleInvalidate(dispatch, [{ type: 'Employee', id: 'LIST' }], 'Employee:LIST')
        const unsubscribe = subscribeSocket(['employees:changed'], refreshEmployees)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getEmployee: builder.query({
      query: (id) => `/employees/${id}`,
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Employee', id }],
    }),
    createEmployee: builder.mutation({
      query: (body) => ({ url: '/employees', method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Employee', id: 'LIST' }],
    }),
    updateEmployee: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/employees/${id}`, method: 'PUT', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Employee', id }, { type: 'Employee', id: 'LIST' }],
    }),
    assignEmployeeRooms: builder.mutation({
      query: ({ id, assignedRooms }) => ({ url: `/employees/${id}/rooms`, method: 'PUT', body: { assignedRooms } }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Employee', id }, { type: 'Employee', id: 'LIST' }],
    }),
    deleteEmployee: builder.mutation({
      query: (argument) => ({ url: `/employees/${typeof argument === 'string' ? argument : argument.id}`, method: 'DELETE' }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, id) => [{ type: 'Employee', id }, { type: 'Employee', id: 'LIST' }],
    }),
    getSalaries: builder.query({
      query: (argument) => {
        const options = typeof argument === 'string' ? { period: argument } : argument || {}
        return { url: '/salaries', params: { ...(options.period ? { period: options.period } : {}), ...(options.businessUnit ? { businessUnit: options.businessUnit } : {}) } }
      },
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'Salary', id: 'SUMMARY' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'Salary', id: 'SUMMARY' }, { type: 'Salary', id: 'HISTORY' }], 'Salary:SUMMARY-HISTORY')
        const unsubscribe = subscribeSocket(['salaries:changed', 'employees:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getSalaryHistory: builder.query({
      query: (params = {}) => ({ url: '/salaries/history', params }),
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'Salary', id: 'HISTORY' }],
    }),
    createSalaryPayment: builder.mutation({
      query: (body) => ({ url: '/salaries/payments', method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Salary', id: 'SUMMARY' }, { type: 'Salary', id: 'HISTORY' }],
    }),
    deleteSalaryPayment: builder.mutation({
      query: (argument) => {
        const options = typeof argument === 'string' ? { id: argument } : argument
        return { url: `/salaries/payments/${options.id}`, method: 'DELETE', params: options.businessUnit ? { businessUnit: options.businessUnit } : undefined }
      },
      invalidatesTags: [{ type: 'Salary', id: 'SUMMARY' }, { type: 'Salary', id: 'HISTORY' }],
    }),
    createEmployeeBonus: builder.mutation({
      query: (body) => ({ url: '/salaries/bonuses', method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Salary', id: 'SUMMARY' }, { type: 'Salary', id: 'HISTORY' }],
    }),
    deleteEmployeeBonus: builder.mutation({
      query: (argument) => {
        const options = typeof argument === 'string' ? { id: argument } : argument
        return { url: `/salaries/bonuses/${options.id}`, method: 'DELETE', params: options.businessUnit ? { businessUnit: options.businessUnit } : undefined }
      },
      invalidatesTags: [{ type: 'Salary', id: 'SUMMARY' }, { type: 'Salary', id: 'HISTORY' }],
    }),
    getShopOverview: builder.query({
      query: (period) => ({ url: '/shop/overview', params: period ? { period } : undefined }),
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'Shop', id: 'OVERVIEW' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'Shop', id: 'OVERVIEW' }, { type: 'Shop', id: 'TRANSACTIONS' }], 'Shop:ALL')
        const unsubscribe = subscribeSocket(['shop:changed', 'salaries:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getShopTransactions: builder.query({
      query: (params = {}) => ({ url: '/shop/transactions', params }),
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'Shop', id: 'TRANSACTIONS' }],
    }),
    createShopTransaction: builder.mutation({
      query: (body) => ({ url: '/shop/transactions', method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Shop', id: 'OVERVIEW' }, { type: 'Shop', id: 'TRANSACTIONS' }],
    }),
    updateShopTransaction: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/shop/transactions/${id}`, method: 'PUT', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Shop', id: 'OVERVIEW' }, { type: 'Shop', id: 'TRANSACTIONS' }],
    }),
    deleteShopTransaction: builder.mutation({
      query: (id) => ({ url: `/shop/transactions/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Shop', id: 'OVERVIEW' }, { type: 'Shop', id: 'TRANSACTIONS' }],
    }),
    getRooms: builder.query({
      query: (period) => ({ url: '/rooms', params: period ? { period } : undefined }),
      transformResponse: (response) => response.data,
      providesTags: (result) => [{ type: 'Room', id: 'LIST' }, ...(result?.rooms || []).map((room) => ({ type: 'Room', id: room.id }))],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refreshRooms = () => scheduleInvalidate(dispatch, [{ type: 'Room', id: 'LIST' }], 'Room:LIST')
        const unsubscribe = subscribeSocket(['rooms:changed'], refreshRooms)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getRoomStudents: builder.query({
      query: ({ roomId, period }) => ({ url: `/rooms/${roomId}/students`, params: period ? { period } : undefined }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, { roomId }) => [{ type: 'Room', id: roomId }, { type: 'StudentContract', id: 'LIST' }],
    }),
    createRoom: builder.mutation({
      query: (body) => ({ url: '/rooms', method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Room', id: 'LIST' }],
    }),
    updateRoom: builder.mutation({
      query: ({ id, body }) => ({ url: `/rooms/${id}`, method: 'PUT', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Room', id }, { type: 'Room', id: 'LIST' }],
    }),
    deleteRoom: builder.mutation({
      query: (id) => ({ url: `/rooms/${id}`, method: 'DELETE' }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, id) => [{ type: 'Room', id }, { type: 'Room', id: 'LIST' }],
    }),
    getStudents: builder.query({
      query: ({ search = '', page = 1, university = '', faculty = '', course = '', room = '', studentStatus = '' } = {}) => ({
        url: '/students',
        params: { page, ...(search ? { search } : {}), ...(university ? { university } : {}), ...(faculty ? { faculty } : {}), ...(course ? { course } : {}), ...(room ? { room } : {}), ...(studentStatus ? { studentStatus } : {}) },
      }),
      transformResponse: (response) => response.data,
      providesTags: (result) => [{ type: 'Student', id: 'LIST' }, ...(result?.students || []).map((item) => ({ type: 'Student', id: item.id }))],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'Student', id: 'LIST' }], 'Student:LIST')
        const unsubscribe = subscribeSocket(['students:changed', 'student-contracts:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getStudent: builder.query({
      query: (id) => `/students/${id}`,
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Student', id }],
    }),
    getStudentHistory: builder.query({
      query: (params = {}) => ({ url: '/students/history', params }),
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'StudentContract', id: 'HISTORY' }],
    }),
    checkStudentBlacklist: builder.query({
      query: ({ jshr = '', passport = '' }) => ({ url: '/students/check-blacklist', params: { ...(jshr ? { jshr } : {}), ...(passport ? { passport } : {}) } }),
      transformResponse: (response) => response.data,
    }),
    createStudent: builder.mutation({
      query: (body) => ({ url: '/students', method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Student', id: 'LIST' }],
    }),
    updateStudent: builder.mutation({
      query: ({ id, body }) => ({ url: `/students/${id}`, method: 'PUT', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Student', id }, { type: 'Student', id: 'LIST' }],
    }),
    returnStudentDeposit: builder.mutation({
      query: (id) => ({ url: `/students/${id}/deposit-return`, method: 'POST' }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, id) => [{ type: 'Student', id }, { type: 'Student', id: 'LIST' }],
    }),
    deleteStudent: builder.mutation({
      query: (id) => ({ url: `/students/${id}`, method: 'DELETE' }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, id) => [{ type: 'Student', id }, { type: 'Student', id: 'LIST' }],
    }),
    getStudentContracts: builder.query({
      query: (studentId) => `/student-contracts/student/${studentId}`,
      transformResponse: (response) => response.data,
      providesTags: (result) => [{ type: 'StudentContract', id: 'LIST' }, ...(result?.contracts || []).map((item) => ({ type: 'StudentContract', id: item.id }))],
      async onCacheEntryAdded(studentId, { cacheEntryRemoved, dispatch }) {
        const refresh = (event) => {
          if (event?.studentId === studentId) scheduleInvalidate(dispatch, [{ type: 'StudentContract', id: 'LIST' }], `StudentContract:LIST:${studentId}`)
        }
        const unsubscribe = subscribeSocket(['student-contracts:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getActiveStudentContracts: builder.query({
      query: (params = {}) => ({ url: '/student-contracts/active', params }),
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'StudentContract', id: 'ACTIVE' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'StudentContract', id: 'ACTIVE' }], 'StudentContract:ACTIVE')
        const unsubscribe = subscribeSocket(['student-contracts:changed', 'rooms:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    createStudentContract: builder.mutation({
      query: (body) => ({ url: '/student-contracts', method: 'POST', body }),
      invalidatesTags: [{ type: 'StudentContract', id: 'LIST' }, { type: 'StudentContract', id: 'ACTIVE' }, { type: 'StudentContract', id: 'HISTORY' }, { type: 'Student', id: 'LIST' }, { type: 'Payment', id: 'LIST' }, { type: 'Payment', id: 'OPTIONS' }, { type: 'Debtor', id: 'LIST' }],
    }),
    updateStudentContract: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/student-contracts/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'StudentContract', id }, { type: 'StudentContract', id: 'LIST' }, { type: 'StudentContract', id: 'ACTIVE' }, { type: 'StudentContract', id: 'HISTORY' }, { type: 'Student', id: 'LIST' }, { type: 'Payment', id: 'LIST' }, { type: 'Payment', id: 'OPTIONS' }, { type: 'Debtor', id: 'LIST' }],
    }),
    deleteStudentContract: builder.mutation({
      query: (id) => ({ url: `/student-contracts/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'StudentContract', id }, { type: 'StudentContract', id: 'LIST' }, { type: 'StudentContract', id: 'ACTIVE' }, { type: 'StudentContract', id: 'HISTORY' }, { type: 'Student', id: 'LIST' }, { type: 'Payment', id: 'LIST' }, { type: 'Payment', id: 'OPTIONS' }, { type: 'Debtor', id: 'LIST' }],
    }),
    getPayments: builder.query({
      query: (params = {}) => ({ url: '/payments', params }),
      transformResponse: (response) => response.data,
      providesTags: (result) => [{ type: 'Payment', id: 'LIST' }, ...(result?.payments || []).map((item) => ({ type: 'Payment', id: item.id }))],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'Payment', id: 'LIST' }, { type: 'Payment', id: 'OPTIONS' }, { type: 'Debtor', id: 'LIST' }], 'Payment:LIST-OPTIONS-Debtor')
        const unsubscribe = subscribeSocket(['payments:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getPaymentOptions: builder.query({
      query: () => '/payments/options',
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'Payment', id: 'OPTIONS' }],
    }),
    getAdvancePayments: builder.query({
      query: () => '/payments/advance',
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'Payment', id: 'ADVANCE' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'Payment', id: 'ADVANCE' }], 'Payment:ADVANCE')
        const unsubscribe = subscribeSocket(['payments:changed', 'student-contracts:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getStudentPayments: builder.query({
      query: (studentId) => `/payments/student/${studentId}`,
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, studentId) => [{ type: 'Payment', id: `STUDENT-${studentId}` }, { type: 'Payment', id: 'LIST' }],
      async onCacheEntryAdded(studentId, { cacheEntryRemoved, dispatch }) {
        const refresh = (event) => {
          if (!event?.studentId || event.studentId === studentId) {
            scheduleInvalidate(dispatch, [{ type: 'Payment', id: `STUDENT-${studentId}` }, { type: 'Payment', id: 'LIST' }, { type: 'Payment', id: 'OPTIONS' }, { type: 'Debtor', id: 'LIST' }], `Payment:STUDENT-${studentId}`)
          }
        }
        const unsubscribe = subscribeSocket(['payments:changed', 'student-contracts:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getDebtors: builder.query({
      query: (period) => ({ url: '/debtors', params: period ? { period } : undefined }),
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'Debtor', id: 'LIST' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'Debtor', id: 'LIST' }], 'Debtor:LIST')
        const unsubscribe = subscribeSocket(['debtors:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    setDebtorDeadline: builder.mutation({
      query: ({ studentId, ...body }) => ({ url: `/debtors/${studentId}/deadline`, method: 'PUT', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Debtor', id: 'LIST' }],
    }),
    sendDebtorSms: builder.mutation({
      query: ({ studentId, ...body }) => ({ url: `/debtors/${studentId}/sms`, method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Debtor', id: 'LIST' }],
    }),
    getAttendance: builder.query({
      query: (params = {}) => ({ url: '/attendance', params }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, params) => [{ type: 'Attendance', id: params?.date || 'TODAY' }],
      async onCacheEntryAdded(params, { cacheEntryRemoved, dispatch }) {
        const refresh = (event) => {
          if (!params?.date || event?.attendanceDate === params.date) scheduleInvalidate(dispatch, [{ type: 'Attendance', id: params?.date || 'TODAY' }], `Attendance:${params?.date || 'TODAY'}`)
        }
        const unsubscribe = subscribeSocket(['attendance:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getAttendanceHistory: builder.query({
      query: ({ studentId, month }) => ({ url: `/attendance/history/${studentId}`, params: { month } }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, { studentId, month }) => [{ type: 'Attendance', id: `HISTORY-${studentId}-${month}` }],
    }),
    getAttendanceHistoryList: builder.query({
      query: (params = {}) => ({ url: '/attendance/history', params }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, params) => [{ type: 'Attendance', id: `HISTORY-LIST-${params.month || 'CURRENT'}` }],
    }),
    saveAttendance: builder.mutation({
      query: (body) => ({ url: '/attendance', method: 'PUT', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, body) => [
        { type: 'Attendance', id: body.attendanceDate },
        { type: 'Attendance', id: `HISTORY-LIST-${body.attendanceDate.slice(0, 7)}` },
        ...(body.records || []).map((item) => ({ type: 'Attendance', id: `HISTORY-${item.student}-${body.attendanceDate.slice(0, 7)}` })),
      ],
    }),
    getEmployeeAttendance: builder.query({
      query: (argument) => {
        const options = typeof argument === 'string' ? { date: argument } : argument || {}
        return { url: '/employee-attendance', params: { ...(options.date ? { date: options.date } : {}), ...(options.businessUnit ? { businessUnit: options.businessUnit } : {}) } }
      },
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, argument) => [{ type: 'EmployeeAttendance', id: (typeof argument === 'string' ? argument : argument?.date) || 'TODAY' }],
      async onCacheEntryAdded(argument, { cacheEntryRemoved, dispatch }) {
        const date = typeof argument === 'string' ? argument : argument?.date
        const refresh = (event) => {
          if (!date || event?.date === date) scheduleInvalidate(dispatch, [{ type: 'EmployeeAttendance', id: date || 'TODAY' }, { type: 'Salary', id: 'SUMMARY' }], `EmployeeAttendance:${date || 'TODAY'}`)
        }
        const unsubscribe = subscribeSocket(['employee-attendance:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getEmployeeAttendanceHistory: builder.query({
      query: ({ employeeId, month }) => ({ url: `/employee-attendance/${employeeId}/history`, params: { month } }),
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, { employeeId, month }) => [{ type: 'EmployeeAttendance', id: `HISTORY-${employeeId}-${month}` }],
    }),
    waiveEmployeeAttendancePenalty: builder.mutation({
      query: ({ employeeId, date, reason }) => ({ url: `/employee-attendance/${employeeId}/${date}/penalty-waiver`, method: 'POST', body: { reason } }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { employeeId, date }) => [
        { type: 'EmployeeAttendance', id: date },
        { type: 'EmployeeAttendance', id: `HISTORY-${employeeId}-${date.slice(0, 7)}` },
        { type: 'Salary', id: 'SUMMARY' },
      ],
    }),
    getExpenses: builder.query({
      query: (params = {}) => ({ url: '/expenses', params }),
      transformResponse: (response) => response.data,
      providesTags: (result) => [{ type: 'Expense', id: 'LIST' }, ...(result?.expenses || []).map((item) => ({ type: 'Expense', id: item.id }))],
      async onCacheEntryAdded(_params, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'Expense', id: 'LIST' }], 'Expense:LIST')
        const unsubscribe = subscribeSocket(['expenses:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    createExpense: builder.mutation({
      query: (body) => ({ url: '/expenses', method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Expense', id: 'LIST' }],
    }),
    updateExpense: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/expenses/${id}`, method: 'PUT', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Expense', id }, { type: 'Expense', id: 'LIST' }],
    }),
    deleteExpense: builder.mutation({
      query: (id) => ({ url: `/expenses/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Expense', id }, { type: 'Expense', id: 'LIST' }],
    }),
    getFines: builder.query({
      query: (params = {}) => ({ url: '/fines', params }),
      transformResponse: (response) => response.data,
      providesTags: (result) => [{ type: 'Fine', id: 'LIST' }, ...(result?.fines || []).map((item) => ({ type: 'Fine', id: item.id }))],
      async onCacheEntryAdded(_params, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'Fine', id: 'LIST' }], 'Fine:LIST')
        const unsubscribe = subscribeSocket(['fines:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getFineOptions: builder.query({ query: () => '/fines/options', transformResponse: (response) => response.data }),
    getStudentFines: builder.query({
      query: (studentId) => `/fines/student/${studentId}`,
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, studentId) => [{ type: 'Fine', id: `STUDENT-${studentId}` }],
    }),
    createFine: builder.mutation({
      query: (body) => ({ url: '/fines', method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, body) => [{ type: 'Fine', id: 'LIST' }, { type: 'Fine', id: `STUDENT-${body.student}` }],
    }),
    payFine: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/fines/${id}/payments`, method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { studentId, id }) => [{ type: 'Fine', id: 'LIST' }, { type: 'Fine', id: `STUDENT-${studentId}` }, { type: 'Fine', id: `PAYMENTS-${id}` }],
    }),
    getFinePayments: builder.query({
      query: (id) => `/fines/${id}/payments`,
      transformResponse: (response) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Fine', id: `PAYMENTS-${id}` }],
    }),
    updateFine: builder.mutation({
      query: ({ id, reason, amount }) => ({ url: `/fines/${id}`, method: 'PUT', body: { reason, amount } }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { studentId }) => [{ type: 'Fine', id: 'LIST' }, { type: 'Fine', id: `STUDENT-${studentId}` }],
    }),
    deleteFine: builder.mutation({
      query: ({ id }) => ({ url: `/fines/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { studentId }) => [{ type: 'Fine', id: 'LIST' }, { type: 'Fine', id: `STUDENT-${studentId}` }],
    }),
    createPayment: builder.mutation({
      query: (body) => ({ url: '/payments', method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Payment', id: 'LIST' }, { type: 'Payment', id: 'OPTIONS' }, { type: 'Payment', id: 'ADVANCE' }, { type: 'StudentContract', id: 'LIST' }, { type: 'Debtor', id: 'LIST' }],
    }),
    createDepositPayment: builder.mutation({
      query: ({ studentId, paymentParts }) => ({ url: `/students/${studentId}/deposit-payments`, method: 'POST', body: { paymentParts } }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _error, { studentId }) => [{ type: 'Student', id: 'LIST' }, { type: 'Student', id: studentId }, { type: 'Payment', id: 'LIST' }, { type: 'Payment', id: `STUDENT-${studentId}` }, { type: 'Payment', id: 'OPTIONS' }, { type: 'Debtor', id: 'LIST' }],
    }),
    deletePayment: builder.mutation({
      query: (id) => ({ url: `/payments/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Payment', id: 'LIST' }, { type: 'Payment', id: 'OPTIONS' }, { type: 'Payment', id: 'ADVANCE' }, { type: 'StudentContract', id: 'LIST' }, { type: 'Debtor', id: 'LIST' }],
    }),
    updatePayment: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/payments/${id}`, method: 'PUT', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Payment', id: 'LIST' }, { type: 'Payment', id: 'OPTIONS' }, { type: 'Payment', id: 'ADVANCE' }, { type: 'StudentContract', id: 'LIST' }, { type: 'Debtor', id: 'LIST' }],
    }),
    getUniversities: builder.query({
      query: () => '/universities',
      transformResponse: (response) => response.data,
      providesTags: (result) => [{ type: 'University', id: 'LIST' }, ...(result?.universities || []).map((item) => ({ type: 'University', id: item.id }))],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = (event) => {
          if (event?.resource === 'universities' || event?.resource === 'faculties') scheduleInvalidate(dispatch, [{ type: 'University', id: 'LIST' }], 'University:LIST')
        }
        const unsubscribe = subscribeSocket(['directories:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    createUniversity: builder.mutation({
      query: (body) => ({ url: '/universities', method: 'POST', body }),
      invalidatesTags: [{ type: 'University', id: 'LIST' }],
    }),
    updateUniversity: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/universities/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'University', id }, { type: 'University', id: 'LIST' }, { type: 'Faculty', id: 'LIST' }],
    }),
    deleteUniversity: builder.mutation({
      query: (id) => ({ url: `/universities/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'University', id }, { type: 'University', id: 'LIST' }],
    }),
    getFaculties: builder.query({
      query: (university = '') => ({ url: '/faculties', params: university ? { university } : undefined }),
      transformResponse: (response) => response.data,
      providesTags: (result) => [{ type: 'Faculty', id: 'LIST' }, ...(result?.faculties || []).map((item) => ({ type: 'Faculty', id: item.id }))],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = (event) => {
          if (event?.resource === 'faculties' || event?.resource === 'universities') scheduleInvalidate(dispatch, [{ type: 'Faculty', id: 'LIST' }], 'Faculty:LIST')
        }
        const unsubscribe = subscribeSocket(['directories:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    createFaculty: builder.mutation({
      query: (body) => ({ url: '/faculties', method: 'POST', body }),
      invalidatesTags: [{ type: 'Faculty', id: 'LIST' }, { type: 'University', id: 'LIST' }],
    }),
    updateFaculty: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/faculties/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Faculty', id }, { type: 'Faculty', id: 'LIST' }, { type: 'University', id: 'LIST' }],
    }),
    deleteFaculty: builder.mutation({
      query: (id) => ({ url: `/faculties/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Faculty', id }, { type: 'Faculty', id: 'LIST' }, { type: 'University', id: 'LIST' }],
    }),
    getBuildingBlocks: builder.query({
      query: () => '/building-blocks',
      transformResponse: (response) => response.data,
      providesTags: (result) => [{ type: 'BuildingBlock', id: 'LIST' }, ...(result?.blocks || []).map((item) => ({ type: 'BuildingBlock', id: item.id }))],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = (event) => {
          if (event?.resource === 'building-blocks') scheduleInvalidate(dispatch, [{ type: 'BuildingBlock', id: 'LIST' }], 'BuildingBlock:LIST')
        }
        const unsubscribe = subscribeSocket(['directories:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    createBuildingBlock: builder.mutation({
      query: (body) => ({ url: '/building-blocks', method: 'POST', body }),
      invalidatesTags: [{ type: 'BuildingBlock', id: 'LIST' }],
    }),
    updateBuildingBlock: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/building-blocks/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'BuildingBlock', id }, { type: 'BuildingBlock', id: 'LIST' }, { type: 'Room', id: 'LIST' }],
    }),
    deleteBuildingBlock: builder.mutation({
      query: (id) => ({ url: `/building-blocks/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'BuildingBlock', id }, { type: 'BuildingBlock', id: 'LIST' }],
    }),
    getGeneralSettings: builder.query({
      query: () => '/settings/general',
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'GeneralSetting', id: 'GENERAL' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'GeneralSetting', id: 'GENERAL' }], 'GeneralSetting:GENERAL')
        const unsubscribe = subscribeSocket(['settings:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    updateGeneralSettings: builder.mutation({
      query: (body) => ({ url: '/settings/general', method: 'PUT', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'GeneralSetting', id: 'GENERAL' }],
    }),
    getNotifications: builder.query({
      query: () => '/notifications',
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'Notification', id: 'LIST' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'Notification', id: 'LIST' }], 'Notification:LIST')
        const unsubscribe = subscribeSocket(['notifications:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PUT' }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'Notification', id: 'LIST' }],
    }),
    getCashSessions: builder.query({
      query: () => '/cash-sessions',
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'CashSession', id: 'LIST' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'CashSession', id: 'LIST' }], 'CashSession:LIST')
        const unsubscribe = subscribeSocket(['cash-sessions:changed', 'payments:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    closeCashSession: builder.mutation({
      query: (body) => ({ url: '/cash-sessions/close', method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'CashSession', id: 'LIST' }, { type: 'Notification', id: 'LIST' }],
    }),
    approveCashSession: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/cash-sessions/${id}/approve`, method: 'PUT', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'CashSession', id: 'LIST' }, { type: 'Dashboard', id: 'MAIN' }],
    }),
    cancelCashSession: builder.mutation({
      query: (id) => ({ url: `/cash-sessions/${id}/cancel`, method: 'PUT' }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'CashSession', id: 'LIST' }, { type: 'Notification', id: 'LIST' }],
    }),
    getFaceAccessEvents: builder.query({
      query: (params = {}) => ({ url: '/face-access/events', params }),
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'FaceAccess', id: 'EVENTS' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'FaceAccess', id: 'EVENTS' }, { type: 'FaceAccess', id: 'STATES' }], 'FaceAccess:ALL')
        const unsubscribe = subscribeSocket(['face-access:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getFaceAccessStates: builder.query({
      query: () => '/face-access/states',
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'FaceAccess', id: 'STATES' }],
    }),
    getStudentPresence: builder.query({
      query: () => '/face-access/presence',
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'FaceAccess', id: 'PRESENCE' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'FaceAccess', id: 'PRESENCE' }], 'FaceAccess:PRESENCE')
        const unsubscribe = subscribeSocket(['student-presence:changed', 'student-contracts:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    getStudentStaySessions: builder.query({
      query: (params = {}) => ({ url: '/face-access/sessions', params }),
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'FaceAccess', id: 'SESSIONS' }],
      async onCacheEntryAdded(_argument, { cacheEntryRemoved, dispatch }) {
        const refresh = () => scheduleInvalidate(dispatch, [{ type: 'FaceAccess', id: 'SESSIONS' }], 'FaceAccess:SESSIONS')
        const unsubscribe = subscribeSocket(['student-presence:changed'], refresh)
        await cacheEntryRemoved
        unsubscribe()
      },
    }),
    resetFaceAccessState: builder.mutation({
      query: (studentId) => ({ url: `/face-access/students/${studentId}/reset`, method: 'POST' }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'FaceAccess', id: 'EVENTS' }, { type: 'FaceAccess', id: 'STATES' }],
    }),
    getFaceDevices: builder.query({
      query: () => '/faceid/devices',
      transformResponse: (response) => response.data,
      providesTags: [{ type: 'FaceDevice', id: 'LIST' }],
    }),
    createFaceDevice: builder.mutation({
      query: (body) => ({ url: '/faceid/devices', method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'FaceDevice', id: 'LIST' }],
    }),
    updateFaceDevice: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/faceid/devices/${id}`, method: 'PUT', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: [{ type: 'FaceDevice', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetDashboardQuery,
  useGetMonthlyReportQuery,
  useGetYearlyReportQuery,
  useLoginMutation,
  useGetMeQuery,
  useGetEmployeesQuery,
  useGetEmployeeQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useAssignEmployeeRoomsMutation,
  useDeleteEmployeeMutation,
  useGetSalariesQuery,
  useGetSalaryHistoryQuery,
  useCreateSalaryPaymentMutation,
  useDeleteSalaryPaymentMutation,
  useCreateEmployeeBonusMutation,
  useDeleteEmployeeBonusMutation,
  useGetShopOverviewQuery,
  useGetShopTransactionsQuery,
  useCreateShopTransactionMutation,
  useUpdateShopTransactionMutation,
  useDeleteShopTransactionMutation,
  useGetRoomsQuery,
  useGetRoomStudentsQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
  useGetStudentsQuery,
  useGetStudentQuery,
  useGetStudentHistoryQuery,
  useLazyCheckStudentBlacklistQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useReturnStudentDepositMutation,
  useDeleteStudentMutation,
  useGetStudentContractsQuery,
  useGetActiveStudentContractsQuery,
  useCreateStudentContractMutation,
  useUpdateStudentContractMutation,
  useDeleteStudentContractMutation,
  useGetPaymentsQuery,
  useGetPaymentOptionsQuery,
  useGetAdvancePaymentsQuery,
  useGetStudentPaymentsQuery,
  useGetDebtorsQuery,
  useSetDebtorDeadlineMutation,
  useSendDebtorSmsMutation,
  useGetAttendanceQuery,
  useGetAttendanceHistoryQuery,
  useGetAttendanceHistoryListQuery,
  useSaveAttendanceMutation,
  useGetEmployeeAttendanceQuery,
  useGetEmployeeAttendanceHistoryQuery,
  useWaiveEmployeeAttendancePenaltyMutation,
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetFinesQuery,
  useGetFineOptionsQuery,
  useGetStudentFinesQuery,
  useCreateFineMutation,
  usePayFineMutation,
  useGetFinePaymentsQuery,
  useUpdateFineMutation,
  useDeleteFineMutation,
  useCreatePaymentMutation,
  useCreateDepositPaymentMutation,
  useDeletePaymentMutation,
  useUpdatePaymentMutation,
  useGetUniversitiesQuery,
  useCreateUniversityMutation,
  useUpdateUniversityMutation,
  useDeleteUniversityMutation,
  useGetFacultiesQuery,
  useCreateFacultyMutation,
  useUpdateFacultyMutation,
  useDeleteFacultyMutation,
  useGetBuildingBlocksQuery,
  useCreateBuildingBlockMutation,
  useUpdateBuildingBlockMutation,
  useDeleteBuildingBlockMutation,
  useGetGeneralSettingsQuery,
  useUpdateGeneralSettingsMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useGetCashSessionsQuery,
  useCloseCashSessionMutation,
  useApproveCashSessionMutation,
  useCancelCashSessionMutation,
  useGetFaceAccessEventsQuery,
  useGetFaceAccessStatesQuery,
  useGetStudentPresenceQuery,
  useGetStudentStaySessionsQuery,
  useResetFaceAccessStateMutation,
  useGetFaceDevicesQuery,
  useCreateFaceDeviceMutation,
  useUpdateFaceDeviceMutation,
} = baseApi

export function apiErrorMessage(error) {
  return error?.data?.message || error?.error || error?.message || 'Server bilan bog‘lanishda xatolik'
}
