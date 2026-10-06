import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { api } from '../services/api'
import { ROLES } from '../permissions'

const roleMap = {
  PLATFORM_OWNER: ROLES.OWNER,
  SUPER_ADMIN: ROLES.SUPER_ADMIN,
  MODERATOR: ROLES.MODERATOR,
  SUPPORT: ROLES.SUPPORT,
  DIAMOND_STOCK: ROLES.DIAMOND_STOCK,
  DIAMOND_STOCK_MANAGER: ROLES.DIAMOND_STOCK,
  AGENCY: ROLES.AGENCY,
  HOST: ROLES.HOST,
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allAdmins, setAllAdmins] = useState([])

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token')
    const saved = sessionStorage.getItem('admin_user')
    if (token && saved) {
      try {
        setUser(JSON.parse(saved))
      } catch {
        sessionStorage.removeItem('admin_token')
        sessionStorage.removeItem('admin_user')
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user || user.role !== ROLES.OWNER) return
    api.listAdmins()
      .then((data) => {
        const list = Array.isArray(data) ? data : data.admins || data.data || []
        setAllAdmins(list.map((a) => ({
          id: a.adminId || a.id,
          name: a.name || a.email,
          email: a.email,
          role: roleMap[a.role] || a.role,
          country: a.countryCode || a.country,
        })))
      })
      .catch(() => {})
  }, [user])

  const login = async (email, password) => {
    const res = await api.login(email, password)
    const token = res.token
    const adminData = res.admin || res
    const role = roleMap[res.role || adminData.role] || ROLES.SUPER_ADMIN
    const userObj = {
      id: adminData.id || adminData.adminId || res.adminId || res.id || '1',
      adminId: adminData.id || adminData.adminId || res.adminId || res.id || '001',
      name: adminData.name || email.split('@')[0],
      email,
      role,
      country: adminData.country || res.country || '',
      backendRole: res.role || adminData.role,
      backendPermissions: res.permissions || adminData.permissions || [],
    }
    sessionStorage.setItem('admin_token', token)
    sessionStorage.setItem('admin_user', JSON.stringify(userObj))
    setUser(userObj)
    return { user: userObj, token }
  }

  const logout = () => {
    sessionStorage.removeItem('admin_token')
    sessionStorage.removeItem('admin_user')
    setUser(null)
  }

  const switchRole = (adminId) => {
    const selected = allAdmins.find((a) => String(a.id) === String(adminId))
    if (selected) {
      const updated = { ...user, name: selected.name, email: selected.email, role: selected.role, country: selected.country }
      sessionStorage.setItem('admin_user', JSON.stringify(updated))
      setUser(updated)
    }
  }

  const takenCountries = useMemo(() => [], [])
  const isCountryTaken = () => false
  const addAdmin = () => null
  const removeAdmin = () => {}

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, allAdmins, switchRole, addAdmin, removeAdmin, takenCountries, isCountryTaken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
