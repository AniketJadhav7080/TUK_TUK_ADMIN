import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function AchievementBadges() {
  const badgeOptions = ['ADMIN', 'NEW_STAR', 'OFFICIAL', 'OWNER', 'SUPPORT', 'VERIFIED', 'COIN_SELLER']
  const frameOptions = ['TUKTUK_OWNER1', 'TUKTUK_SUPPORT', 'TUKTUK_ASIANOWNER', 'TUKTUK_ARABIANOWNER']
  const [badges, setBadges] = useState([])
  const [frames, setFrames] = useState(frameOptions.map((f) => ({ id: f, name: f })))
  const [fetchedAdmin, setFetchedAdmin] = useState(null)
  const [adminDeco, setAdminDeco] = useState(null)
  const [fetchError, setFetchError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(null)
  const [form, setForm] = useState({ adminId: '', badge: '', frame: '' })

  const [counts, setCounts] = useState({ badges: 0, frames: 0 })
  const [holders, setHolders] = useState([])
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [badgeCount, frameCount, aData] = await Promise.all([
          api.getBadgesCount().catch(() => null),
          api.getFramesCount().catch(() => null),
          api.getAdmins().catch(() => api.listAdmins().catch(() => [])),
        ])
        if (cancelled) return
        setBadges([])
        setCounts({
          badges: badgeCount?.count ?? badgeCount?.total ?? 0,
          frames: frameCount?.count ?? frameCount?.total ?? 0,
        })
        const list = Array.isArray(aData) ? aData : (aData.admins || aData.content || [])
        const withDeco = await Promise.all((list || []).map(async (a) => {
          try {
            const d = await api.getAdminDecorations(a.id)
            return { ...a, badgeUrl: d?.badgeUrl || null, frameUrl: d?.frameUrl || null, badge: d?.badge || d?.badgeName || null, frame: d?.frame || d?.frameName || null }
          } catch { return { ...a, badgeUrl: null, frameUrl: null, badge: null, frame: null } }
        }))
        if (!cancelled) setHolders(withDeco.filter((h) => h.badgeUrl || h.frameUrl || h.badge || h.frame))
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
    setForm({ adminId: '', badge: '', frame: '' }); setFetchedAdmin(null); setAdminDeco(null); setFetchError('')
    setShowModal({ type: 'create' })
  }

  const openEdit = (b) => {
    setForm({ adminId: '', badge: b.id, frame: '' }); setFetchedAdmin(null)
    setShowModal({ type: 'edit', badge: b })
  }

  const handleFetchAdmin = async () => {
    setFetchError('')
    setFetchedAdmin(null)
    setAdminDeco(null)
    if (!form.adminId.trim()) { setFetchError('Enter Admin ID'); return }
    try {
      const all = await api.getAdmins().catch(() => api.listAdmins().catch(() => []))
      const list = Array.isArray(all) ? all : (all.admins || all.content || [])
      const found = list.find((a) => String(a.id) === String(form.adminId.trim()) || String(a.adminId) === String(form.adminId.trim()))
      if (found) {
        setFetchedAdmin(found)
        try {
          const deco = await api.getAdminDecorations(found.id)
          setAdminDeco(deco)
        } catch {}
      }
      else setFetchError('Admin not found')
    } catch (e) { setFetchError(e.message || 'Failed to fetch') }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!fetchedAdmin) { setError('Please fetch a valid Admin ID first'); return }
    if (!form.badge && !form.frame) { setError('Please select a badge or frame'); return }
    try {
      if (form.badge) await api.giveAdminBadge(fetchedAdmin.id, form.badge)
      if (form.frame) await api.giveAdminFrame(fetchedAdmin.id, form.frame)
      try {
        const deco = await api.getAdminDecorations(fetchedAdmin.id)
        setHolders((prev) => {
          const row = { ...fetchedAdmin, badgeUrl: deco?.badgeUrl || null, frameUrl: deco?.frameUrl || null, badge: deco?.badge || form.badge, frame: deco?.frame || form.frame }
          const exists = prev.some((h) => String(h.id) === String(fetchedAdmin.id))
          return exists ? prev.map((h) => String(h.id) === String(fetchedAdmin.id) ? row : h) : [...prev, row]
        })
      } catch {}
      setError('')
      setShowModal(null)
      setForm({ adminId: '', badge: '', frame: '' }); setFetchedAdmin(null); setAdminDeco(null)
    } catch (e) { setError(e.message) }
  }

  const handleDelete = async (id) => {
    try {
      await api.deleteBadge(id)
      setBadges((prev) => prev.filter((b) => b.id !== id))
    } catch (e) { setError(e.message) }
  }

  const toggleBadge = async (b) => {
    const newStatus = b.status === 'active' ? 'inactive' : 'active'
    try {
      await api.updateBadge(b.id, { ...b, status: newStatus })
      setBadges((prev) => prev.map((x) => x.id === b.id ? { ...x, status: newStatus } : x))
    } catch {}
  }

  if (loading) return <Loading text="Loading badges..." />

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Badges</div><div className="value">{counts.badges}</div></div>
        <div className="stats-card"><div className="label">Active</div><div className="value" style={{ color: 'var(--success)' }}>{badges.filter((b) => b.status === 'active').length}</div></div>
        <div className="stats-card"><div className="label">Total Frames</div><div className="value">{counts.frames}</div></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Admins with Badges / Frames</span>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Give Badge</button>
        </div>
        <div className="card-body">
          {holders.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No admin has a badge or frame yet — use + Give Badge</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Name</th><th>Role</th><th>Badge</th><th>Frame</th></tr></thead>
                <tbody>
                  {holders.map((h) => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 500 }}>{h.name || h.email}</td>
                      <td><span className="role-badge" style={{ background: '#6b7280' }}>{h.role}</span></td>
                      <td>{h.badgeUrl ? <img src={h.badgeUrl} alt={h.badge || 'badge'} title={h.badge || ''} style={{ width: 36, height: 36, objectFit: 'contain' }} /> : (h.badge || '—')}</td>
                      <td>{h.frameUrl ? <img src={h.frameUrl} alt={h.frame || 'frame'} title={h.frame || ''} style={{ width: 36, height: 36, objectFit: 'contain' }} /> : (h.frame || '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {badges.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {badges.map((b) => (
                <div key={b.id} className="card" style={{ margin: 0, textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: b.color || 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', margin: '0 auto 12px' }}>
                    {b.icon || '\u{1F3C6}'}
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>{b.name}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-light)', margin: '0 0 8px', minHeight: 20 }}>{b.description || 'No description'}</p>
                  <div style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 8 }}>
                    <span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>{b.category}</span>
                    {' '}
                    <span className={`badge ${b.status || 'active'}`}>{b.status || 'active'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                    Earned by <strong>{(b.earned || b.earnedCount || 0).toLocaleString()}</strong> users
                    {b.requirement ? ` · Req: ${b.requirement}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12, justifyContent: 'center' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(b)}>Edit</button>
                    <button className={`btn btn-sm ${(b.status || 'active') === 'active' ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleBadge(b)}>
                      {(b.status || 'active') === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(b.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal title="Give Badge / Frame" onClose={() => setShowModal(null)}>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Admin ID</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={form.adminId} onChange={(e) => setForm({ ...form, adminId: e.target.value })} placeholder="Enter Admin ID" required style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }} />
                <button type="button" className="btn btn-outline" onClick={handleFetchAdmin}>Fetch</button>
              </div>
              {fetchedAdmin && <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>Found: {fetchedAdmin.name || fetchedAdmin.email} — {fetchedAdmin.role}</div>}
              {fetchError && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{fetchError}</div>}
              {adminDeco && (adminDeco.badgeUrl || adminDeco.frameUrl) && (
                <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                  {adminDeco.badgeUrl && <div style={{ textAlign: 'center' }}><img src={adminDeco.badgeUrl} alt="badge" style={{ width: 48, height: 48, objectFit: 'contain' }} /><div style={{ fontSize: 11, color: 'var(--text-light)' }}>Current badge</div></div>}
                  {adminDeco.frameUrl && <div style={{ textAlign: 'center' }}><img src={adminDeco.frameUrl} alt="frame" style={{ width: 48, height: 48, objectFit: 'contain' }} /><div style={{ fontSize: 11, color: 'var(--text-light)' }}>Current frame</div></div>}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Badge</label>
              <select value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                <option value="">Select badge (optional)</option>
                {badgeOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Frame</label>
              <select value={form.frame} onChange={(e) => setForm({ ...form, frame: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                <option value="">Select frame (optional)</option>
                {frames.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Give</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
