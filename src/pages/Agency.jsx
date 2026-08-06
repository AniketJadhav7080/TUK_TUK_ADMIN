import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function Agency() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [agencies, setAgencies] = useState([])
  const [commissionsData, setCommissionsData] = useState([])
  const [salariesData, setSalariesData] = useState(null)
  const [performanceData, setPerformanceData] = useState(null)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('agencies')
  const [showRecruit, setShowRecruit] = useState(false)
  const [recruitForm, setRecruitForm] = useState({ hostName: '', hostEmail: '', commission: '15' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [ags, coms, sals] = await Promise.all([
          api.getAgencies(),
          api.getCommissions(),
          api.getSalaries(),
        ])
        if (cancelled) return
        setAgencies(ags)
        setCommissionsData(coms)
        setSalariesData(sals)
        const perf = await api.getAgencyPerformance().catch(() => null)
        if (perf) setPerformanceData(perf)
      } catch {
        if (cancelled) return
        setError('Failed to load data from server.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleRecruit = async (e) => {
    e.preventDefault()
    try {
      await api.recruitHost({ hostName: recruitForm.hostName, hostEmail: recruitForm.hostEmail, commission: recruitForm.commission })
    } catch {
      // silently fall back
    }
    setShowRecruit(false)
    setRecruitForm({ hostName: '', hostEmail: '', commission: '15' })
  }

  const filtered = agencies.filter((a) => (a.name || '').toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Loading />

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Agencies</div><div className="value">{agencies.length}</div></div>
        <div className="stats-card"><div className="label">Total Hosts</div><div className="value">{agencies.reduce((s, a) => s + a.hosts, 0)}</div></div>
        <div className="stats-card"><div className="label">Active Hosts</div><div className="value">{agencies.reduce((s, a) => s + a.activeHosts, 0)}</div></div>
        <div className="stats-card"><div className="label">Total Commission</div><div className="value">₹{agencies.reduce((s, a) => s + parseInt(a.commission.replace(/[$₹]/g, '').replace(',', '')), 0).toLocaleString()}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['agencies', 'commissions', 'salaries', 'performance', 'recruit'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t === 'agencies' ? 'Agencies' : t === 'commissions' ? 'Commissions' : t === 'salaries' ? 'Salary Reports' : t === 'performance' ? 'Performance' : 'Recruit Host'}
          </button>
        ))}
      </div>

      {tab === 'agencies' && (
        <div className="card">
          <div className="card-header">All Agencies</div>
          <div className="card-body">
            <div className="search-bar">
              <input placeholder="Search agencies..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Name</th><th>Manager</th><th>Hosts</th><th>Active</th><th>Earnings</th><th>Commission</th><th>Salary Paid</th><th>Rating</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500 }}>{a.name}</td>
                      <td>{a.manager}</td>
                      <td>{a.hosts}</td>
                      <td>{a.activeHosts}</td>
                      <td>{a.totalEarnings}</td>
                      <td>{a.commission}</td>
                      <td>{a.salaryPaid}</td>
                      <td>⭐ {a.rating}</td>
                      <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'commissions' && (
        <div className="card">
          <div className="card-header">Commission Reports</div>
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Host</th><th>Agency</th><th>Commission %</th><th>Host Earned</th><th>Agency Share</th><th>Paid</th></tr>
                </thead>
                <tbody>
                  {commissionsData.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{c.host}</td>
                      <td>{c.agency}</td>
                      <td>{c.commission}</td>
                      <td>{c.earned}</td>
                      <td>{c.agencyShare}</td>
                      <td><span className={`badge ${c.paid === 'Yes' ? 'active' : 'pending'}`}>{c.paid}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'salaries' && (
        <div className="card">
          <div className="card-header">Salary Reports</div>
          <div className="card-body">
            {!salariesData ? <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No salary data available</p> : (
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Total Salary Budget</div>
                <div className="detail-value" style={{ fontSize: 24 }}>{salariesData.totalBudget ?? 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Paid This Month</div>
                <div className="detail-value" style={{ fontSize: 24, color: 'var(--success)' }}>{salariesData.paidThisMonth ?? 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Pending</div>
                <div className="detail-value" style={{ fontSize: 24, color: 'var(--warning)' }}>{salariesData.pending ?? 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Next Payment Date</div>
                <div className="detail-value">{salariesData.nextPayment ?? 'N/A'}</div>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="card">
          <div className="card-header">Agency Performance Tracking</div>
          <div className="card-body">
            {!performanceData ? (
              <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No performance data (API not implemented yet)</p>
            ) : (
              <div>
                <div className="detail-grid" style={{ marginBottom: 24 }}>
                  <div className="detail-item"><div className="detail-label">Total Revenue</div><div className="detail-value" style={{ fontSize: 24 }}>{performanceData.totalRevenue || '₹0'}</div></div>
                  <div className="detail-item"><div className="detail-label">Growth Rate</div><div className="detail-value" style={{ fontSize: 24, color: 'var(--success)' }}>{performanceData.growth || '0%'}</div></div>
                  <div className="detail-item"><div className="detail-label">Active Hosts</div><div className="detail-value" style={{ fontSize: 24 }}>{performanceData.activeHosts || 0}</div></div>
                  <div className="detail-item"><div className="detail-label">Ranking</div><div className="detail-value" style={{ fontSize: 24, color: 'var(--primary)' }}>#{performanceData.ranking || 'N/A'}</div></div>
                </div>
                {performanceData.metrics && (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr><th>Metric</th><th>Value</th><th>Change</th></tr>
                      </thead>
                      <tbody>
                        {(performanceData.metrics || []).map((m, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{m.label || m.name}</td>
                            <td>{m.value}</td>
                            <td style={{ color: (m.change || '').startsWith('+') ? 'var(--success)' : (m.change || '').startsWith('-') ? 'var(--danger)' : 'inherit' }}>{m.change || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'recruit' && (
        <div className="card">
          <div className="card-header">Host Recruitment</div>
          <div className="card-body">
            <form onSubmit={handleRecruit}>
              <div className="detail-grid">
                <div className="form-group"><label>Host Name</label><input value={recruitForm.hostName} onChange={(e) => setRecruitForm({ ...recruitForm, hostName: e.target.value })} required /></div>
                <div className="form-group"><label>Host Email</label><input type="email" value={recruitForm.hostEmail} onChange={(e) => setRecruitForm({ ...recruitForm, hostEmail: e.target.value })} required /></div>
                <div className="form-group"><label>Commission (%)</label><input type="number" value={recruitForm.commission} onChange={(e) => setRecruitForm({ ...recruitForm, commission: e.target.value })} required /></div>
              </div>
              <div style={{ marginTop: 16 }}>
                <button type="submit" className="btn btn-primary">Send Invitation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
