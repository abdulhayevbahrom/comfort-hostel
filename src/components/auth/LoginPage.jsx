import { useState } from 'react'
import { Button, Form, Input } from 'antd'
import { apiErrorMessage, useLoginMutation } from '../../store/baseApi'
import logo from '../../assets/tizim-plus-logo.png'
import './LoginPage.css'

const UserIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21v-2.5a7.5 7.5 0 0 1 15 0V21"/></svg>
const LockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>

export function LoginPage({ onLogin }) {
  const [login, { isLoading }] = useLoginMutation()
  const [error, setError] = useState('')
  const submit = async (values) => {
    try { const data = await login(values).unwrap(); localStorage.setItem('hostelAuthToken', data.token); onLogin(data) }
    catch (requestError) { setError(apiErrorMessage(requestError)) }
  }
  return <main className="login-page"><div className="login-overlay" /><section className="login-card"><img className="login-logo" src={logo} alt="Tizim Plus" /><p className="login-subtitle">Talabalar turar joyi boshqaruv tizimiga kiring</p><Form layout="vertical" requiredMark={false} onFinish={submit}><Form.Item name="login" label="Login" rules={[{ required: true, message: 'Loginni kiriting' }]}><Input autoFocus size="large" prefix={<UserIcon />} placeholder="Login" autoComplete="username" /></Form.Item><Form.Item name="password" label="Parol" rules={[{ required: true, message: 'Parolni kiriting' }]}><Input.Password size="large" prefix={<LockIcon />} placeholder="Parol" autoComplete="current-password" /></Form.Item>{error && <div className="form-error">{error}</div>}<Button block type="primary" htmlType="submit" loading={isLoading}>Kirish</Button></Form></section></main>
}
