import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

export default function Clans() {
  const [clans, setClans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [showManage, setShowManage] = useState(null)
  const [form, setForm] = useState({ name: '', tag: '', description: '', maxMembers: 50, icon: '' })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const data = await api.getClans()
        if (!cancelled) setClans(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filtered = clans.filter((c) => {
    const match = (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.tag || '').toLowerCase().includes(search.toLowerCase())
    if (tab === 'all') return match
    return match && c.status === tab
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const created = await api.createClan(form)
      setClans((prev) => [{ ...created, members: created.members || 0, status: 'active' }, ...prev])
      setShowCreate(false)
      setForm({ name: '', tag: '', description: '', maxMembers: 50, icon: '' })
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.deleteClan(id)
      setClans((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      setError(e.message)
    }
    setShowManage(null)
  }

  if (loading) return <Loading text="Loading clans..." />

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Clans</div><div className="value">{clans.length}</div></div>
        <div className="stats-card"><div className="label">Active</div><div className="value" style={{ color: 'var(--success)' }}>{clans.filter((c) => c.status === 'active').length}</div></div>
        <div className="stats-card"><div className="label">Total Members</div><div className="value">{clans.reduce((s, c) => s + (c.members || c.memberCount || 0), 0)}</div></div>
        <div className="stats-card"><div className="label">Avg Members</div><div className="value">{clans.length > 0 ? Math.round(clans.reduce((s, c) => s + (c.members || c.memberCount || 0), 0) / clans.length) : 0}</div></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'active', 'inactive'].map((t) => (
              <button key={t} className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Create Clan</button>
        </div>
        <div className="card-body">
          <div className="search-bar">
            <input placeholder="Search clans by name or tag..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No clans found (API not implemented yet)</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filtered.map((c) => (
                <div key={c.id} className="card" style={{ border: `1px solid ${c.status === 'active' ? 'var(--success)' : 'var(--border)'}`, margin: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: c.color || 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff' }}>
                      {c.icon || c.name?.charAt(0) || '#'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)' }}>Tag: {c.tag || 'N/A'} · {c.members || c.memberCount || 0}/{c.maxMembers || 50} members</div>
                    </div>
                    <span className={`badge ${c.status}`}>{c.status}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-light)', margin: '0 0 12px', minHeight: 20 }}>{c.description || 'No description'}</p>
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowManage(c)}>Manage</button>
                    <button className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <Modal title="Create Clan" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div className="form-group"><label>Clan Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Tag (2-4 chars)</label><input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} maxLength={4} required /></div>
            <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Max Members</label><input type="number" value={form.maxMembers} onChange={(e) => setForm({ ...form, maxMembers: parseInt(e.target.value) || 50 })} /></div>
              <div className="form-group"><label>Icon (emoji)</label><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create</button>
            </div>
          </form>
        </Modal>
      )}

      {showManage && (
        <Modal title={`Manage: ${showManage.name}`} onClose={() => setShowManage(null)}>
          <div style={{ marginBottom: 16 }}>
            <div className="detail-grid">
              <div className="detail-item"><div className="detail-label">Tag</div><div className="detail-value">{showManage.tag}</div></div>
              <div className="detail-item"><div className="detail-label">Members</div><div className="detail-value">{showManage.members || showManage.memberCount || 0}/{showManage.maxMembers || 50}</div></div>
              <div className="detail-item"><div className="detail-label">Status</div><div className="detail-value"><span className={`badge ${showManage.status}`}>{showManage.status}</span></div></div>
              <div className="detail-item"><div className="detail-label">Created</div><div className="detail-value">{showManage.createdAt ? new Date(showManage.createdAt).toLocaleDateString() : 'N/A'}</div></div>
            </div>
          </div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Members</h4>
          {(!showManage.membersList || showManage.membersList.length === 0) ? (
            <p style={{ textAlign: 'center', padding: 16, color: 'var(--text-light)', fontSize: 13 }}>No members (API returns empty data)</p>
          ) : (
            <div className="table-wrapper" style={{ marginBottom: 16 }}>
              <table>
                <thead>
                  <tr><th>User</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {showManage.membersList?.map((m) => (
                    <tr key={m.id}>
                      <td>{m.name || m.username}</td>
                      <td><span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>{m.role || 'member'}</span></td>
                      <td>{m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => api.removeClanMember(showManage.id, m.id).then(() => setShowManage({ ...showManage, membersList: showManage.membersList.filter((x) => x.id !== m.id) })).catch(() => {})}>
                          Kick
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={() => setShowManage(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
