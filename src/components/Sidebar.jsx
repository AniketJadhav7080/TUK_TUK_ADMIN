import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import { hasPermission, PERMISSIONS, ROLES } from '../permissions'

const roleLabels = {
  [ROLES.OWNER]: 'Owner',
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.MODERATOR]: 'Moderator',
  [ROLES.SUPPORT]: 'Support',
  [ROLES.COUNTRY_HANDLER]: 'Country Handler',
  [ROLES.DIAMOND_STOCK]: 'Diamond Stock',
  [ROLES.AGENCY]: 'Agency',
  [ROLES.HOST]: 'Host',
}

const roleColors = {
  owner: '#ff6b35',
  super_admin: '#8b5cf6',
  moderator: '#0a7ea4',
  support: '#27ae60',
  country_handler: '#e67e22',
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
  { to: '/agency', label: 'Agency', perm: PERMISSIONS.MANAGE_AGENCY },
  { to: '/country', label: 'Country', perm: PERMISSIONS.VIEW_COUNTRY_DASHBOARD },
  { to: '/allocation-history', label: 'Allocation History', perm: PERMISSIONS.VIEW_DIAMOND_DASHBOARD },
  { to: '/host-panel', label: 'Host Panel', perm: PERMISSIONS.VIEW_HOST_DASHBOARD },
  { to: '/live', label: 'Live Monitor', perm: PERMISSIONS.LIVE_MONITORING },
  { to: '/security', label: 'Security', perm: PERMISSIONS.VIEW_SECURITY },
  { to: '/events', label: 'Events', perm: PERMISSIONS.MANAGE_EVENTS },
  { to: '/payments', label: 'Payments', perm: PERMISSIONS.MANAGE_PAYMENTS },
  { to: '/vip', label: 'VIP Membership', perm: PERMISSIONS.MANAGE_VIP },
  { to: '/clans', label: 'Clans', perm: PERMISSIONS.MANAGE_CLANS },
  { to: '/nearby', label: 'Nearby Rooms', perm: PERMISSIONS.NEARBY_ROOMS },
  { to: '/dating', label: 'Dating', perm: PERMISSIONS.DATING_SYSTEM },
  { to: '/ai-moderation', label: 'AI Moderation', perm: PERMISSIONS.AI_MODERATION },
  { to: '/missions', label: 'Daily Missions', perm: PERMISSIONS.MANAGE_MISSIONS },
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

  useEffect(() => {
    const saved = localStorage.getItem('profile_pic_' + user?.id)
    if (saved) setProfilePic(saved)
  }, [user?.id])

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={close} />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/tuk-tuk_logo.png" className="sidebar-logo-img" alt="TukTuk" />
          <span className="logo-text">TukTuk</span>
        </div>
          <div className="sidebar-user">
            {profilePic ? <img src={profilePic} alt="" className="sidebar-avatar-img" /> : <div className="sidebar-avatar" style={{ background: roleColors[user?.role] || 'var(--primary)' }}>{user?.name?.charAt(0) || 'A'}</div>}
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
