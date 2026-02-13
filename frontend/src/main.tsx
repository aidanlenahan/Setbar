import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'

const token = localStorage.getItem('auth_token')
if (token) {
  axios.defaults.headers.common.Authorization = `Bearer ${token}`
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
