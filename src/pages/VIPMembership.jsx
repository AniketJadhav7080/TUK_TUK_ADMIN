import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const defaultTiers = [
  { level: 1, xp: 1000 }, { level: 2, xp: 1500 }, { level: 3, xp: 2500 }, { level: 4, xp: 4000 },
  { level: 5, xp: 6000 }, { level: 6, xp: 10000 }, { level: 7, xp: 25000 }, { level: 8, xp: 50000 },
]

export default function VIPMembership() {
  const [tiers, setTiers] = useState(defaultTiers)
  const [vipUsers, setVipUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('tiers')
  const [showModal, setShowModal] = useState(null)
  const [form, setForm] = useState({ level: '', xp: '' })

  const normalizeTier = (t, idx) => ({
    _raw: t,
    level: t.level ?? t.tier ?? t.vipLevel ?? idx + 1,
    xp: t.xp ?? t.xpThreshold ?? t.requiredXp ?? t.minXp ?? t.threshold ?? 0,
    profileFrame: t.profileFrame || t.profile_frame || '',
    entryFrame: t.entryFrame || t.entry_frame || '',
    chatFrame: t.chatFrame || t.chat_frame || '',
    logo: t.logo || t.logoUrl || '',
  })
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [cfg, users] = await Promise.all([
          api.getVipConfig().catch(() => null),
          api.getVipInfo().catch(() => api.getUsers('?vip=true').catch(() => [])),
        ])
        if (cancelled) return
        if (cfg) {
          let raw = null
          if (Array.isArray(cfg)) raw = cfg
          else if (cfg.tiers) raw = cfg.tiers
          else if (cfg.config) raw = cfg.config
          else if (cfg.data) raw = cfg.data
          if (Array.isArray(raw) && raw.length) setTiers(raw.map(normalizeTier))
        }
        if (Array.isArray(users)) {
          setVipUsers(users.map((u) => ({
            user: u.userName || u.name || u.username || u.email || 'Unknown',
            level: u.level ?? u.vipLevel ?? u.vip_level ?? '-',
            xp: u.totalXp ?? u.total_xp ?? u.xp ?? 0,
            expiry: u.expiry ? new Date(u.expiry).toLocaleDateString() : (u.vipExpiry || u.expiresAt || '—'),
            status: u.status === true ? 'active' : u.status === false ? 'inactive' : (u.status || 'active'),
          })))
        }
      } catch {} finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const openEdit = (t) => {
    setForm({ level: String(t.level), xp: String(t.xp) })
    setShowModal({ tier: t })
  }

  const [saveError, setSaveError] = useState('')
  const handleSave = async (e) => {
    e.preventDefault()
    setSaveError('')
    const updated = tiers.map((t) => t.level === Number(form.level) ? { ...t, xp: Number(form.xp) } : t)
    // Backend uses vipLevel/xpThreshold keys — map back, preserving all original fields
    const payload = { tiers: updated.map((t) => ({ ...(t._raw || {}), vipLevel: t.level, xpThreshold: t.xp })) }
    try {
      await api.updateVipConfig(payload)
      setTiers(updated)
      setShowModal(null)
    } catch (err) {
      setSaveError(err.message || 'Failed to save VIP tier')
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Tiers</div><div className="value">8</div></div>
        <div className="stats-card"><div className="label">Active VIP Users</div><div className="value">{vipUsers.length.toLocaleString()}</div></div>
        <div className="stats-card"><div className="label">Highest XP</div><div className="value">{Math.max(...tiers.map((t) => Number(t.xp) || 0)).toLocaleString()} XP</div></div>
        <div className="stats-card"><div className="label">Validity</div><div className="value" style={{ fontSize: 20 }}>3 Months</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['tiers', 'users'].map((t) => (
          <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>{t === 'tiers' ? 'VIP Tiers (XP)' : 'VIP Users'}</button>
        ))}
      </div>

      {tab === 'tiers' && (
        <div className="card">
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead><tr><th>VIP Level</th><th>XP Required</th><th>Actions</th></tr></thead>
                <tbody>
                  {tiers.map((t) => (
                    <tr key={t.level}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>VIP {t.level}</td>
                      <td><span className="badge active">{(Number(t.xp) || 0).toLocaleString()} XP</span></td>
                      <td><button className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          <div className="card-header">VIP Users (by XP)</div>
          <div className="card-body">
            <div className="table-wrapper">
              <table>
                <thead><tr><th>User</th><th>Level</th><th>Total XP</th><th>Expiry</th><th>Status</th></tr></thead>
                <tbody>
                  {vipUsers.length === 0 ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-light)', padding: 20 }}>No VIP users yet</td></tr> : vipUsers.map((u, i) => (
                    <tr key={i}><td style={{ fontWeight: 500 }}>{u.user}</td><td><span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>VIP {u.level}</span></td><td>{Number(u.xp).toLocaleString()}</td><td>{u.expiry}</td><td><span className={`badge ${u.status}`}>{u.status}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title={`Edit VIP ${showModal.tier.level}`} onClose={() => setShowModal(null)}>
          <form onSubmit={handleSave}>
            <div className="form-group"><label>XP Required</label><input type="number" value={form.xp} onChange={(e) => setForm({ ...form, xp: e.target.value })} required /></div>
            {saveError && <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 13, background: '#fee2e2', color: '#991b1b', marginBottom: 12 }}>{saveError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
