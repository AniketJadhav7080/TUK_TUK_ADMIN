import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import { hasPermission, PERMISSIONS, ROLES } from '../permissions'
import { api, resolveAssetUrl } from '../services/api'

const roleLabels = {
  [ROLES.OWNER]: 'Owner',
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.MODERATOR]: 'Moderator',
  [ROLES.SUPPORT]: 'Support',
  [ROLES.DIAMOND_STOCK]: 'Diamond Stock',
  [ROLES.AGENCY]: 'Agency',
  [ROLES.HOST]: 'Host',
}

const roleColors = {
  owner: '#ff6b35',
  super_admin: '#8b5cf6',
  moderator: '#0a7ea4',
  support: '#27ae60',
  diamond_stock: '#1abc9c',
  agency: '#e74c3c',
  host: '#f39c12',
}

const allLinks = [
  { to: '/', label: 'Dashboard', perm: PERMISSIONS.VIEW_DASHBOARD },
  { to: '/users', label: 'Users', perm: PERMISSIONS.VIEW_USERS },
  { to: '/hosts', label: 'Hosts', perm: PERMISSIONS.VIEW_HOSTS },
  { to: '/rooms', label: 'Rooms', perm: PERMISSIONS.MONITOR_ROOMS },
  { to: '/reports', label: 'Reports', perm: PERMISSIONS.VIEW_REPORTS },
  { to: '/tickets', label: 'Tickets', perm: PERMISSIONS.VIEW_TICKETS },
  { to: '/diamond-allocation', label: 'Diamond Allocation', perm: PERMISSIONS.MANAGE_DIAMOND },
  { to: '/gifts', label: 'Gifts', perm: PERMISSIONS.MANAGE_GIFTS },
  { to: '/country', label: 'Country', perm: PERMISSIONS.VIEW_COUNTRY_DASHBOARD },
  { to: '/allocation-history', label: 'Allocation History', perm: PERMISSIONS.VIEW_DIAMOND_DASHBOARD },


  { to: '/security', label: 'Security', perm: PERMISSIONS.VIEW_SECURITY },
  { to: '/events', label: 'Events', perm: PERMISSIONS.MANAGE_EVENTS },
  { to: '/payments', label: 'Payments', perm: PERMISSIONS.MANAGE_PAYMENTS },
  { to: '/vip', label: 'VIP Membership', perm: PERMISSIONS.MANAGE_VIP },
  { to: '/clans', label: 'Clans', perm: PERMISSIONS.MANAGE_CLANS },

  { to: '/dating', label: 'Dating', perm: PERMISSIONS.DATING_SYSTEM },
  { to: '/ai-moderation', label: 'AI Moderation', perm: PERMISSIONS.AI_MODERATION },
  { to: '/missions', label: 'Super Admin Missions', perm: PERMISSIONS.MANAGE_MISSIONS },
  { to: '/badges', label: 'Badges', perm: PERMISSIONS.MANAGE_BADGES },
  { to: '/notifications', label: 'Notifications', perm: PERMISSIONS.SEND_NOTIFICATIONS },
  { to: '/admins', label: 'Admins', perm: PERMISSIONS.MANAGE_ADMINS },
  { to: '/settings', label: 'Settings', perm: PERMISSIONS.VIEW_SETTINGS },
]

export default function Sidebar() {
  const { user } = useAuth()
  const { open, close } = useSidebar()
  const visibleLinks = allLinks.filter((l) => hasPermission(user, l.perm))
  const [profilePic, setProfilePic] = useState(null)
  const [deco, setDeco] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem('profile_pic_' + user?.id)
    if (saved) setProfilePic(saved)
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    api.getAdminDecorations(user.id).then((d) => setDeco(d)).catch(() => setDeco(null))
  }, [user?.id])

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={close} />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/tuk-tuk_logo.png" className="sidebar-logo-img" alt="Tuk Tuk" />
          <span className="logo-text">TUK TUK VOICE CHAT</span>
        </div>
          <div className="sidebar-user">
            <span style={{ position: 'relative', display: 'inline-block', width: 36, height: 36, flexShrink: 0 }}>
              {profilePic ? <img src={profilePic} alt="" className="sidebar-avatar-img" /> : <div className="sidebar-avatar" style={{ background: roleColors[user?.role] || 'var(--primary)' }}>{user?.name?.charAt(0) || 'A'}</div>}
              {deco?.frameUrl && <img src={resolveAssetUrl(deco.frameUrl)} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} style={{ position: 'absolute', inset: -4, width: 44, height: 44, objectFit: 'contain', pointerEvents: 'none' }} />}
            </span>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-role">
              {roleLabels[user?.role] || user?.role}
            </span>
            {user?.country && <span className="sidebar-user-role" style={{ fontSize: 11, opacity: 0.7 }}>{user.country}</span>}
          </div>
        </div>
        <nav className="sidebar-nav">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={close}
            >
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
