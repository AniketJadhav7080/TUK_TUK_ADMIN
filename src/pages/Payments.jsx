import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function Payments() {
  const [tab, setTab] = useState('gateways')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'upi', fee: '', minAmount: '', maxAmount: '' })
  const [gateways, setGateways] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchGateways = () => {
    api.getPaymentGateways()
      .then((data) => { if (data) setGateways(data) })
      .catch(() => {})
  }

  const fetchTransactions = () => {
    api.getPaymentTransactions({})
      .then((data) => { if (data) setTransactions(data) })
      .catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      api.getPaymentGateways(),
      api.getPaymentTransactions({}),
    ])
      .then(([g, t]) => {
        if (Array.isArray(g)) setGateways(g)
        else if (g?.content) setGateways(g.content)
        if (Array.isArray(t)) setTransactions(t)
        else if (t?.content) setTransactions(t.content)
      })
      .catch(() => {
        setError('Failed to load payment data from server.')
      })
      .finally(() => setLoading(false))
  }, [])

  const totalRevenue = transactions
    .filter((t) => t.status === 'success' && t.type !== 'withdrawal')
    .reduce((s, t) => s + parseFloat(String(t.amount || '0').replace(/[$₹]/g, '')), 0)

  const handleAdd = (e) => {
    e.preventDefault()
    setShowAdd(false)
    setForm({ name: '', type: 'upi', fee: '', minAmount: '', maxAmount: '' })
  }

  const toggleStatus = async (id) => {
    const gateway = gateways.find((g) => g.id === id)
    if (!gateway) return
    try {
      await api.updatePaymentGateway(id, { ...gateway, status: gateway.status === 'active' ? 'inactive' : 'active' })
      fetchGateways()
    } catch {
      setError('Failed to update gateway status.')
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      {error && (
        <div style={{ marginBottom: 16, padding: 10, borderRadius: 'var(--radius)', background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>
          {error}
        </div>
      )}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Active Gateways</div><div className="value">{gateways.filter((m) => m.status === 'active').length}</div></div>
        <div className="stats-card"><div className="label">Today's Revenue</div><div className="value" style={{ color: 'var(--success)' }}>₹{totalRevenue.toFixed(2)}</div></div>
        <div className="stats-card"><div className="label">Monthly Revenue</div><div className="value">—</div></div>
        <div className="stats-card"><div className="label">Pending Withdrawals</div><div className="value" style={{ color: 'var(--warning)' }}>—</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['gateways', 'transactions'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t === 'gateways' ? 'Payment Gateways' : 'Transactions'}
          </button>
        ))}
      </div>

      {tab === 'gateways' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Payment Methods</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Gateway</button>
          </div>
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Gateway Name</th><th>Type</th><th>Fee</th><th>Min Amount</th><th>Max Amount</th><th>Transactions</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {gateways.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 500 }}>{m.name}</td>
                      <td><span className="badge" style={{ background: '#e0e7ff', color: '#3730a3', textTransform: 'uppercase' }}>{m.type}</span></td>
                      <td>{m.fee}</td>
                      <td>{m.minAmount}</td>
                      <td>{m.maxAmount}</td>
                      <td>{(m.transactions || 0).toLocaleString()}</td>
                      <td><span className={`badge ${m.status}`}>{m.status}</span></td>
                      <td>
                        <button className={`btn btn-sm ${m.status === 'active' ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleStatus(m.id)}>
                          {m.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="card">
          <div className="card-header">Transaction History</div>
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>User</th><th>Amount</th><th>Method</th><th>Type</th><th>Coins</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.user}</td>
                      <td style={{ fontWeight: 600 }}>{t.amount}</td>
                      <td>{t.method}</td>
                      <td><span className="badge reported" style={{ textTransform: 'capitalize' }}>{t.type.replace('_', ' ')}</span></td>
                      <td style={{ color: (t.coins ?? 0) > 0 ? 'var(--success)' : 'var(--danger)' }}>{(t.coins ?? 0) > 0 ? '+' : ''}{(t.coins ?? 0).toLocaleString()}</td>
                      <td><span className={`badge ${t.status === 'success' ? 'active' : t.status === 'pending' ? 'pending' : 'banned'}`}>{t.status}</span></td>
                      <td>{t.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Payment Gateway" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd}>
            <div className="form-group"><label>Gateway Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                <option value="upi">UPI</option>
                <option value="wallet">Wallet</option>
                <option value="gateway">Gateway</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Fee (%)</label><input value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} required /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Min Amount (₹)</label><input value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} required /></div>
              <div className="form-group"><label>Max Amount (₹)</label><input value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} required /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add Gateway</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
