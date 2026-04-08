import type { User } from '@/types/models'

export const TOKEN_STORAGE_KEY = 'token'
export const USER_INFO_STORAGE_KEY = 'userInfo'
export const AUTH_STORAGE_CHANGED_EVENT = 'auth-storage-changed'

const emitAuthStorageChanged = () => {
  window.dispatchEvent(new CustomEvent(AUTH_STORAGE_CHANGED_EVENT))
}

export const getToken = () => {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export const getStoredUserInfo = (): User | null => {
  const raw = localStorage.getItem(USER_INFO_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as User
  } catch {
    localStorage.removeItem(USER_INFO_STORAGE_KEY)
    return null
  }
}

export const setAuthSession = (token: string, userInfo: User) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
  localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(userInfo))
  emitAuthStorageChanged()
}

export const setStoredUserInfo = (userInfo: User) => {
  localStorage.setItem(USER_INFO_STORAGE_KEY, JSON.stringify(userInfo))
  emitAuthStorageChanged()
}

export const clearAuthSession = (emitEvent = true) => {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(USER_INFO_STORAGE_KEY)

  if (emitEvent) {
    emitAuthStorageChanged()
  }
}

export const syncAuthStorageState = () => {
  const token = getToken()
  if (token) {
    return true
  }

  if (localStorage.getItem(USER_INFO_STORAGE_KEY)) {
    localStorage.removeItem(USER_INFO_STORAGE_KEY)
  }

  return false
}
