import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function HostPanel() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState([])
  const [transactions, setTransactions] = useState([])
  const [pkHistory, setPkHistory] = useState([])
  const [followers, setFollowers] = useState(null)
  const [giftRevenue, setGiftRevenue] = useState([])
  const [tab, setTab] = useState('dashboard')
  const [withdrawModal, setWithdrawModal] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'bank' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [earnings, pk, foll] = await Promise.all([
          api.getHostEarnings(),
          api.getHostPkBattles(),
          api.getHostFollowers(),
        ])
        if (cancelled) return
        if (earnings && earnings.stats) {
          setStats(earnings.stats)
          setTransactions(earnings.transactions || [])
        } else if (earnings) {
          setStats([
            { label: 'Total Earnings', value: `₹${earnings.totalEarnings || earnings.dailyEarnings || 0}` },
            { label: 'This Month', value: `₹${earnings.monthlyEarnings || 0}` },
            { label: 'Diamonds Earned', value: `${earnings.diamondsEarned || 0}` },
            { label: 'Followers', value: foll?.total || '0' },
            { label: 'PK Wins', value: '0' },
            { label: 'PK Losses', value: '0' },
          ])
        }
        if (Array.isArray(pk)) setPkHistory(pk)
        if (foll) setFollowers(typeof foll.total !== 'undefined' ? foll : null)
        const giftRev = await api.getHostGiftRevenue().catch(() => null)
        if (giftRev) setGiftRevenue(giftRev.breakdown || giftRev.gifts || [])
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

  const handleWithdraw = async (e) => {
    e.preventDefault()
    try {
      await api.withdrawHost({ amount: withdrawForm.amount, method: withdrawForm.method })
    } catch {
      // silently fall back
    }
    setWithdrawModal(false)
    setWithdrawForm({ amount: '', method: 'bank' })
  }

  if (loading) return <Loading />

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stats-card">
            <div className="label">{s.label}</div>
            <div className="value">{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['dashboard', 'gift_revenue', 'pk_history', 'followers'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t === 'dashboard' ? 'Earnings' : t === 'gift_revenue' ? 'Gift Revenue' : t === 'pk_history' ? 'PK Battles' : 'Followers'}
          </button>
        ))}
        <button className="btn btn-success btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setWithdrawModal(true)}>
          Request Withdrawal
        </button>
      </div>

      {tab === 'dashboard' && (
        <div className="card">
          <div className="card-header">Earnings History</div>
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Date</th><th>Type</th><th>Amount</th><th>Balance</th></tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-light)', padding: 24 }}>No earnings data yet (API returns empty/default data)</td></tr>
                  ) : (
                    transactions.map((t, i) => (
                      <tr key={i}>
                        <td>{t.date}</td>
                        <td>{t.type}</td>
                        <td style={{ fontWeight: 600, color: (t.amount || '').startsWith('+') ? 'var(--success)' : 'var(--danger)' }}>{t.amount}</td>
                        <td>{t.balance}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'gift_revenue' && (
        <div className="card">
          <div className="card-header">Gift Revenue Breakdown</div>
          <div className="card-body">
            {giftRevenue.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No gift revenue data (API not implemented yet)</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr><th>Gift</th><th>Count</th><th>Revenue</th></tr>
                  </thead>
                  <tbody>
                    {giftRevenue.map((g, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{g.gift || g.name || 'Gift'}</td>
                        <td>{(g.count || 0).toLocaleString()}</td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>₹{(g.revenue || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'pk_history' && (
        <div className="card">
          <div className="card-header">PK Battle History</div>
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Date</th><th>Opponent</th><th>Result</th><th>Score</th><th>Reward</th></tr>
                </thead>
                <tbody>
                  {pkHistory.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-light)', padding: 24 }}>No PK battles yet (API returns all zeros)</td></tr>
                  ) : (
                    pkHistory.map((p, i) => (
                      <tr key={i}>
                        <td>{p.date}</td>
                        <td style={{ fontWeight: 500 }}>{p.opponent}</td>
                        <td><span className={`badge ${p.result === 'Win' ? 'active' : 'banned'}`}>{p.result}</span></td>
                        <td>{p.score}</td>
                        <td>{p.reward}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'followers' && (
        <div className="card">
          <div className="card-header">Followers & Fans</div>
          <div className="card-body">
            {!followers ? <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No follower data available</p> : (
            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Total Followers</div>
                <div className="detail-value" style={{ fontSize: 28 }}>{followers.total ?? 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">New This Week</div>
                <div className="detail-value" style={{ fontSize: 28, color: 'var(--success)' }}>{followers.newThisWeek ?? 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Top Fans</div>
                <div className="detail-value">{followers.topFans ?? 'N/A'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Fan Coins Donated</div>
                <div className="detail-value">{followers.fanCoinsDonated ?? 'N/A'}</div>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {withdrawModal && (
        <Modal title="Withdrawal Request" onClose={() => setWithdrawModal(false)}>
          <form onSubmit={handleWithdraw}>
            <div className="form-group">
              <label>Amount (₹)</label>
              <input type="number" value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Withdrawal Method</label>
              <select value={withdrawForm.method} onChange={(e) => setWithdrawForm({ ...withdrawForm, method: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                <option value="bank">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="upi">UPI</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setWithdrawModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-success">Submit Request</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
