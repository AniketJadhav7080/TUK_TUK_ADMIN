import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import { api } from '../services/api'
import Loading from '../components/Loading'

const mapCountryStats = (c) => ({
  country: c.country || c.name || c.code || 'Unknown',
  flag: c.flag || '🌍',
  users: c.users ?? c.totalUsers ?? 0,
  activeUsers: c.activeUsers ?? c.active_users ?? 0,
  hosts: c.hosts ?? c.activeHosts ?? 0,
  rooms: c.rooms ?? c.activeRooms ?? 0,
  revenue: c.revenue ? `₹${Number(c.revenue).toLocaleString()}` : '₹0',
  reports: c.reports ?? c.pendingReports ?? 0,
  status: c.status || 'active',
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

  useEffect(() => {
    let cancelled = false
    async function fetchCountries() {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getCountriesStats()
        if (cancelled) return
        const mapped = (data.content || data.data || data || []).map(mapCountryStats)
        setCountries(mapped)
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
      const detail = await api.getCountryStats(c.country)
      if (detail) {
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
    setDetailTab(tab)
    setDetailLoading(true)
    try {
      if (tab === 'hosts') {
        const data = await api.getCountryHosts(selectedCountry.country, { status: '', page: 0, size: 20 })
        setHosts(data.content || data.data || data || [])
      } else if (tab === 'rooms') {
        const data = await api.getCountryRooms(selectedCountry.country)
        setRooms(data.content || data.data || data || [])
      } else if (tab === 'support') {
        const data = await api.getCountrySupport(selectedCountry.country)
        setSupport(data.content || data.data || data || [])
      } else if (tab === 'revenue') {
        const data = await api.getCountryRevenue(selectedCountry.country)
        setRevenue(data)
      }
    } catch (err) {
      console.error(`Failed to fetch ${tab}:`, err)
    } finally {
      setDetailLoading(false)
    }
  }

  const filtered = countries.filter((c) => c.country.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Loading text="Loading country data..." />
  return (
    <div>
      {error && <div className="error-banner" style={{ background: '#fff5f5', color: '#e53e3e', padding: '8px 16px', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13 }}>Failed to load country data: {error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Countries</div><div className="value">{countries.length}</div></div>
        <div className="stats-card"><div className="label">Total Users</div><div className="value">{countries.reduce((s, c) => s + c.users, 0).toLocaleString()}</div></div>
        <div className="stats-card"><div className="label">Active Users</div><div className="value">{countries.reduce((s, c) => s + c.activeUsers, 0).toLocaleString()}</div></div>
        <div className="stats-card"><div className="label">Total Revenue</div><div className="value">{countries.reduce((s, c) => s + parseInt(c.revenue.replace(/[$₹]/g, '').replace(',', '')), 0).toLocaleString()}</div></div>
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
                  <tr key={c.country}>
                    <td style={{ fontWeight: 500 }}>{c.flag} {c.country}</td>
                    <td>{c.users.toLocaleString()}</td>
                    <td>{c.activeUsers.toLocaleString()}</td>
                    <td>{c.hosts}</td>
                    <td>{c.rooms}</td>
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
          {!detailLoading && detailTab === 'stats' && (
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">Total Users</div><div className="detail-value">{selectedCountry.users.toLocaleString()}</div></div>
              <div className="detail-item"><div className="detail-label">Active Users</div><div className="detail-value">{selectedCountry.activeUsers.toLocaleString()}</div></div>
              <div className="detail-item"><div className="detail-label">Active Hosts</div><div className="detail-value">{selectedCountry.hosts}</div></div>
              <div className="detail-item"><div className="detail-label">Active Rooms</div><div className="detail-value">{selectedCountry.rooms}</div></div>
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
              <div className="detail-item"><div className="detail-label">Total Revenue</div><div className="detail-value" style={{ fontSize: 28, color: 'var(--success)' }}>₹{revenue ? Number(revenue.totalRevenue || revenue.revenue || revenue).toLocaleString() : '0'}</div></div>
              <div className="detail-item"><div className="detail-label">Currency</div><div className="detail-value">INR</div></div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
