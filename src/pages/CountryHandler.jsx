import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import { api } from '../services/api'
import Loading from '../components/Loading'

const codeToFlag = (code) => {
  if (!code || code.length !== 2) return null
  try {
    return String.fromCodePoint(...[...code.toUpperCase()].map((ch) => 127397 + ch.charCodeAt(0)))
  } catch { return null }
}
// Backend flagEmoji may be corrupted ('??') on some servers — fall back to deriving from countryCode
const cleanFlag = (c) => {
  const raw = c.flagEmoji || c.flag || ''
  if (raw && !raw.includes('?') && raw.length >= 2) return raw
  return codeToFlag(c.countryCode || c.code) || '🌍'
}

const toArray = (data, ...keys) => {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  for (const k of ['content', 'data', ...keys]) {
    if (Array.isArray(data[k])) return data[k]
  }
  return []
}

const mapCountryStats = (c) => ({
  countryCode: c.countryCode || c.code || c.country || 'Unknown',
  country: c.countryName || c.country || c.name || c.code || 'Unknown',
  flag: cleanFlag(c),
  users: c.usersCount ?? c.users ?? c.totalUsers ?? 0,
  activeUsers: c.activeUsers ?? c.active_users ?? 0,
  hosts: c.hostsCount ?? c.hosts ?? c.activeHosts ?? 0,
  rooms: c.roomsCount ?? c.rooms ?? c.totalRooms ?? 0,
  activeRooms: c.activeRooms ?? 0,
  closedRooms: c.closedRooms ?? 0,
  revenue: (c.revenueUsd ?? c.revenue) != null ? `₹${Number(c.revenueUsd ?? c.revenue).toLocaleString()}` : '₹0',
  revenueRaw: Number(c.revenueUsd ?? c.revenue ?? 0) || 0,
  reports: c.reportsCount ?? c.reports ?? c.pendingReports ?? 0,
  status: c.active === false ? 'inactive' : c.active === true ? 'active' : (c.status || 'active'),
})

export default function CountryHandler() {
  const [countries, setCountries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState('stats')
  const [hosts, setHosts] = useState([])
  const [rooms, setRooms] = useState([])
  const [support, setSupport] = useState([])
  const [revenue, setRevenue] = useState(null)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function fetchCountries() {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getCountriesStats()
        if (cancelled) return
        const list = toArray(data, 'countries')
        const mapped = list.map(mapCountryStats)
        setCountries(mapped)
        // The list endpoint has no activeUsers — enrich each row from detail stats
        const enriched = await Promise.all(mapped.map(async (m) => {
          try {
            const d = await api.getCountryStats(m.countryCode)
            if (d && !Array.isArray(d)) {
              const dm = mapCountryStats(d)
              return { ...m, activeUsers: dm.activeUsers ?? m.activeUsers, activeRooms: dm.activeRooms ?? m.activeRooms }
            }
          } catch { /* detail enrichment optional — keep list values */ }
          return m
        }))
        if (!cancelled) setCountries(enriched)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch countries:', err)
          setError(err.message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchCountries()
    return () => { cancelled = true }
  }, [])

  const handleViewCountry = async (c) => {
    setSelectedCountry(c)
    setDetailTab('stats')
    setHosts([])
    setRooms([])
    setSupport([])
    setRevenue(null)
    try {
      setDetailLoading(true)
      const code = c.countryCode || c.country
      const detail = await api.getCountryStats(code)
      if (detail && !Array.isArray(detail)) {
        setSelectedCountry({ ...c, ...mapCountryStats(detail) })
      }
    } catch (err) {
      console.error('Failed to fetch country detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const fetchDetailData = async (tab) => {
    if (!selectedCountry) return
    const code = selectedCountry.countryCode || selectedCountry.country
    setDetailTab(tab)
    setDetailError('')
    if (tab === 'stats') return
    setDetailLoading(true)
    try {
      if (tab === 'hosts') {
        const data = await api.getCountryHosts(code, { status: '', page: 0, size: 20 })
        setHosts(toArray(data, 'hosts'))
      } else if (tab === 'rooms') {
        const data = await api.getCountryRooms(code)
        setRooms(toArray(data, 'rooms'))
      } else if (tab === 'support') {
        const data = await api.getCountrySupport(code)
        setSupport(toArray(data, 'reports', 'tickets'))
      } else if (tab === 'revenue') {
        const data = await api.getCountryRevenue(code)
        setRevenue(data)
      }
    } catch (err) {
      setDetailError(err?.message || `Failed to load ${tab}`)
    } finally {
      setDetailLoading(false)
    }
  }

  const filtered = countries.filter((c) => c.country.toLowerCase().includes(search.toLowerCase()) || (c.countryCode || '').toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Loading text="Loading country data..." />
  return (
    <div>
      {error && <div className="error-banner" style={{ background: '#fff5f5', color: '#e53e3e', padding: '8px 16px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13 }}>Failed to load country data: {error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Countries</div><div className="value">{countries.length}</div></div>
        <div className="stats-card"><div className="label">Total Users</div><div className="value">{countries.reduce((s, c) => s + c.users, 0).toLocaleString()}</div></div>
        <div className="stats-card"><div className="label">Active Users</div><div className="value">{countries.reduce((s, c) => s + c.activeUsers, 0).toLocaleString()}</div></div>
        <div className="stats-card"><div className="label">Total Revenue</div><div className="value">₹{countries.reduce((s, c) => s + (c.revenueRaw || 0), 0).toLocaleString()}</div></div>
      </div>

      <div className="card">
        <div className="card-header">Country Dashboard</div>
        <div className="card-body">
          <div className="search-bar">
            <input placeholder="Search country..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Country</th><th>Users</th><th>Active</th><th>Hosts</th><th>Rooms</th><th>Revenue</th><th>Reports</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.countryCode || c.country}>
                    <td style={{ fontWeight: 500 }}>{c.flag} {c.country} <span style={{ fontSize: 11, color: 'var(--text-light)', marginLeft: 4 }}>{c.countryCode !== 'Unknown' ? c.countryCode : ''}</span></td>
                    <td>{c.users.toLocaleString()}</td>
                    <td>{c.activeUsers.toLocaleString()}</td>
                    <td>{c.hosts}</td>
                    <td>{c.rooms} <span style={{ fontSize: 11, color: 'var(--text-light)' }}>{c.activeRooms ? `(${c.activeRooms} live)` : ''}</span></td>
                    <td style={{ fontWeight: 600 }}>{c.revenue}</td>
                    <td>{c.reports}</td>
                    <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                    <td><button className="btn btn-primary btn-sm" onClick={() => handleViewCountry(c)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedCountry && (
        <Modal title={`${selectedCountry.flag} ${selectedCountry.country}`} onClose={() => setSelectedCountry(null)}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['stats', 'hosts', 'rooms', 'support', 'revenue'].map((t) => (
              <button key={t} className={`btn btn-sm ${detailTab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => fetchDetailData(t)}>
                {t === 'stats' ? 'Overview' : t === 'hosts' ? 'Hosts' : t === 'rooms' ? 'Rooms' : t === 'support' ? 'Support' : 'Revenue'}
              </button>
            ))}
          </div>
          {detailLoading && <Loading />}
          {!detailLoading && detailError && <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, background: '#fee2e2', color: '#991b1b', marginBottom: 12 }}>{detailError}</div>}
          {!detailLoading && detailTab === 'stats' && (
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">Total Users</div><div className="detail-value">{selectedCountry.users.toLocaleString()}</div></div>
              <div className="detail-item"><div className="detail-label">Active Users</div><div className="detail-value">{selectedCountry.activeUsers.toLocaleString()}</div></div>
              <div className="detail-item"><div className="detail-label">Active Hosts</div><div className="detail-value">{selectedCountry.hosts}</div></div>
              <div className="detail-item"><div className="detail-label">Active Rooms</div><div className="detail-value">{selectedCountry.activeRooms ?? selectedCountry.rooms}</div></div>
              <div className="detail-item"><div className="detail-label">Revenue</div><div className="detail-value">{selectedCountry.revenue}</div></div>
              <div className="detail-item"><div className="detail-label">Pending Reports</div><div className="detail-value">{selectedCountry.reports}</div></div>
            </div>
          )}
          {!detailLoading && detailTab === 'hosts' && (
            <div>
              {hosts.length === 0 ? <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-light)' }}>No hosts found</p> : (
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Name</th><th>Status</th></tr></thead>
                    <tbody>{hosts.map((h, i) => (
                      <tr key={i}><td style={{ fontWeight: 500 }}>{h.name || h.hostName || 'Host'}</td><td><span className={`badge ${h.status === 'ACTIVE' || h.status === 'active' ? 'active' : 'pending'}`}>{h.status || 'active'}</span></td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {!detailLoading && detailTab === 'rooms' && (
            <div>
              {rooms.length === 0 ? <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-light)' }}>No active rooms</p> : (
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>Room</th><th>Participants</th></tr></thead>
                    <tbody>{rooms.map((r, i) => (
                      <tr key={i}><td style={{ fontWeight: 500 }}>{r.name || r.roomName || 'Room'}</td><td>{r.participants || r.userCount || 0}</td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {!detailLoading && detailTab === 'support' && (
            <div>
              {support.length === 0 ? <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-light)' }}>No support tickets</p> : (
                <div className="table-wrapper">
                  <table>
                    <thead><tr><th>User</th><th>Issue</th><th>Status</th></tr></thead>
                    <tbody>{support.map((s, i) => (
                      <tr key={i}><td>{s.user || s.userName || 'User'}</td><td>{s.subject || s.issue || s.description || '-'}</td><td><span className={`badge ${s.status === 'RESOLVED' || s.status === 'resolved' ? 'active' : 'reported'}`}>{s.status || 'pending'}</span></td></tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {!detailLoading && detailTab === 'revenue' && (
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">Total Revenue</div><div className="detail-value" style={{ fontSize: 28, color: 'var(--success)' }}>₹{Number(revenue?.totalRevenue ?? revenue?.revenue ?? revenue?.amount ?? revenue ?? 0).toLocaleString()}</div></div>
              <div className="detail-item"><div className="detail-label">Currency</div><div className="detail-value">INR</div></div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
