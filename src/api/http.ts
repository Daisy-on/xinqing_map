import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { clearAuthSession, getToken } from '@/utils/auth'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const code = error?.response?.data?.code
    if (status === 401 || code === 401) {
      clearAuthSession()
    }
    return Promise.reject(error)
  },
)

export default http
