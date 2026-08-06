import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function VIPMembership() {
  const [plans, setPlans] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('plans')
  const [showModal, setShowModal] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', coins: '', features: '', color: '#f39c12', duration: '30' })

  const monthlyRevenue = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((s, sub) => s + parseFloat(sub.revenue?.replace(/[$₹]/g, '') || '0'), 0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [plansData, subsData] = await Promise.all([
          api.getVipPlans().catch(() => []),
          api.getUsers('?vip=true').catch(() => []),
        ])
        if (cancelled) return
        if (Array.isArray(plansData)) {
          setPlans(plansData.map((p) => ({
            ...p,
            features: typeof p.features === 'string' ? p.features.split(',').map((f) => f.trim()) : (p.features || []),
            subscribers: p.subscribers || 0,
            status: p.status || 'active',
          })))
        }
        if (subsData && Array.isArray(subsData)) {
          setSubscriptions(subsData.map((u) => ({
            user: u.name || u.username || u.email || 'Unknown',
            plan: u.vipPlan || u.vipTier || 'Basic',
            startDate: u.vipStartDate || u.createdAt || 'Unknown',
            expiryDate: u.vipExpiryDate || 'Unknown',
            status: u.vipStatus || u.status || 'active',
            autoRenew: u.autoRenew ?? true,
            revenue: u.vipRevenue ? `₹${u.vipRevenue}` : '₹0.00',
          })))
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const openCreate = () => {
    setForm({ name: '', price: '', coins: '', features: '', color: '#f39c12', duration: '30' })
    setShowModal({ type: 'create' })
  }

  const openEdit = (p) => {
    setForm({ name: p.name, price: p.price, coins: String(p.coins || ''), features: p.features.join(', '), color: p.color || '#f39c12', duration: String(p.duration || '30') })
    setShowModal({ type: 'edit', plan: p })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const data = {
      name: form.name, price: form.price, coins: parseInt(form.coins) || 0,
      features: form.features.split(',').map((f) => f.trim()), color: form.color,
      duration: parseInt(form.duration) || 30,
    }
    if (showModal.type === 'edit') {
      try {
        await api.updateVipPlan(showModal.plan.id, data)
        setPlans((prev) => prev.map((p) => p.id === showModal.plan.id ? { ...p, ...data } : p))
      } catch {}
    } else {
      try {
        const created = await api.createVipPlan(data)
        if (created?.id) setPlans((prev) => [{ ...created, features: created.features || data.features, status: 'active', subscribers: 0 }, ...prev])
      } catch {}
    }
    setShowModal(null)
  }

  const handleDelete = async (id) => {
    try {
      await api.deleteVipPlan(id)
      setPlans((prev) => prev.filter((p) => p.id !== id))
    } catch {}
  }

  const togglePlan = async (p) => {
    const newStatus = p.status === 'active' ? 'inactive' : 'active'
    try {
      await api.updateVipPlan(p.id, { ...p, status: newStatus, features: p.features.join(', ') })
      setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, status: newStatus } : x))
    } catch {}
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
        <div className="stats-card"><div className="label">Total Plans</div><div className="value">{plans.length}</div></div>
        <div className="stats-card"><div className="label">Active Subscribers</div><div className="value">{subscriptions.filter((s) => s.status === 'active').length.toLocaleString()}</div></div>
        <div className="stats-card"><div className="label">Monthly Revenue</div><div className="value" style={{ color: 'var(--success)' }}>₹{monthlyRevenue.toFixed(2)}</div></div>
        <div className="stats-card"><div className="label">Expiring This Month</div><div className="value" style={{ color: 'var(--warning)' }}>{subscriptions.filter((s) => s.expiryDate !== 'Unknown').length}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['plans', 'subscriptions'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
            {t === 'plans' ? 'VIP Plans' : 'Subscribers'}
          </button>
        ))}
      </div>

      {tab === 'plans' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Plan</button>
          </div>
          {plans.length === 0 && <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No VIP plans configured. Click "+ Add Plan" to create one.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
          {plans.map((p) => (
            <div key={p.id} style={{ border: `2px solid ${p.color}`, borderRadius: 12, padding: 20, background: p.status === 'active' ? '#fff' : '#f9fafb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ color: p.color, margin: 0 }}>{p.name}</h3>
                <span className={`badge ${p.status}`}>{p.status}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{p.price}</div>
              <div style={{ fontSize: 13, color: 'var(--text-light)', marginBottom: 16 }}>
                {(p.coins || 0).toLocaleString()} coins/mo · {(p.subscribers || 0).toLocaleString()} subs · {p.duration || 30}d
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {(p.features || []).map((f, i) => (
                  <div key={i} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--success)' }}>&#10003;</span> {f}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Edit</button>
                <button className={`btn btn-sm ${p.status === 'active' ? 'btn-warning' : 'btn-success'}`} onClick={() => togglePlan(p)}>
                  {p.status === 'active' ? 'Disable' : 'Enable'}
                </button>
                <button className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="card">
          <div className="card-header">Active & Expired Subscriptions</div>
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>User</th><th>Plan</th><th>Start Date</th><th>Expiry</th><th>Status</th><th>Auto-Renew</th><th>Revenue</th></tr>
                </thead>
                <tbody>
                  {subscriptions.map((s, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{s.user}</td>
                      <td><span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>{s.plan}</span></td>
                      <td>{s.startDate}</td>
                      <td>{s.expiryDate}</td>
                      <td><span className={`badge ${s.status}`}>{s.status}</span></td>
                      <td>{s.autoRenew ? <span style={{ color: 'var(--success)' }}>&#10003;</span> : <span style={{ color: 'var(--text-light)' }}>&#10007;</span>}</td>
                      <td style={{ fontWeight: 600 }}>{s.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title={showModal.type === 'create' ? 'Add VIP Plan' : `Edit ${showModal.plan.name}`} onClose={() => setShowModal(null)}>
          <form onSubmit={handleSave}>
            <div className="form-group"><label>Plan Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Price</label><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required placeholder="₹9.99/mo" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Coins per Month</label><input type="number" value={form.coins} onChange={(e) => setForm({ ...form, coins: e.target.value })} required /></div>
              <div className="form-group"><label>Duration (days)</label><input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Features (comma separated)</label><input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} required /></div>
            <div className="form-group"><label>Color</label><input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{showModal.type === 'create' ? 'Add Plan' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
