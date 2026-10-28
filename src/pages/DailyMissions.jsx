import { useState, useEffect } from 'react'
import { api } from '../services/api'
import Loading from '../components/Loading'
import Modal from '../components/Modal'

const PERIODS = ['MONTHLY', 'QUARTERLY', 'YEARLY']

export default function DailyMissions() {
  const [missions, setMissions] = useState([])
  const [countries, setCountries] = useState([])
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ missionName: '', description: '', period: 'MONTHLY', goal: '', countryCode: '' })

  const normalize = (list) => (Array.isArray(list) ? list : []).map((m) => ({
    id: m.id,
    name: m.missionName || m.name,
    description: m.description,
    period: m.period || m.type || 'MONTHLY',
    goal: m.goal ?? m.requirement ?? 0,
    countryCode: m.countryCode ?? null,
    status: m.active === false ? 'inactive' : (m.status || 'active'),
    isNotify: m.isNotify ?? m.notified ?? false,
  }))

  const loadMissions = async () => {
    try {
      setLoading(true)
      setError('')
      const mData = await api.getMissions()
      const arr = Array.isArray(mData) ? mData : (mData?.content || [])
      setMissions(normalize(arr))
    } catch (e) {
      setError(e?.message || 'Failed to load missions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const [mData, cData, aData] = await Promise.allSettled([
          api.getMissions(),
          api.getMissionCounts(),
          api.getAdmins().catch(() => api.listAdmins()),
        ])
        if (cancelled) return
        const failures = []
        if (mData.status === 'fulfilled') {
          const arr = Array.isArray(mData.value) ? mData.value : (mData.value?.content || [])
          setMissions(normalize(arr))
        } else failures.push(mData.reason?.message || 'missions')
        if (cData.status === 'fulfilled' && cData.value) setCounts(cData.value)
        if (aData.status === 'fulfilled') {
          const list = Array.isArray(aData.value) ? aData.value : (aData.value?.admins || aData.value?.content || [])
          const codes = [...new Set(list.filter((a) => String(a.role).toLowerCase().includes('super')).map((a) => a.country || a.countryCode).filter(Boolean))]
          setCountries(codes)
        }
        if (failures.length) setError(`Failed to load: ${failures.join(', ')}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const openCreate = () => {
    setForm({ missionName: '', description: '', period: 'MONTHLY', goal: '', countryCode: '' })
    setShowModal({ type: 'create' })
  }

  const openEdit = (m) => {
    setForm({ missionName: m.name, description: m.description || '', period: m.period || 'MONTHLY', goal: String(m.goal ?? ''), countryCode: m.countryCode || '' })
    setShowModal({ type: 'edit', mission: m })
  }

  const payload = () => {
    const goalNum = Number(form.goal)
    return {
      missionName: form.missionName,
      description: form.description,
      period: form.period,
      goal: form.goal !== '' && Number.isFinite(goalNum) ? goalNum : form.goal,
      countryCode: form.countryCode || null,
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (showModal.type === 'edit') {
        await api.updateMission(showModal.mission.id, payload())
        setMissions((prev) => prev.map((m) => m.id === showModal.mission.id ? { ...m, name: form.missionName, description: form.description, period: form.period, goal: payload().goal, countryCode: form.countryCode || null } : m))
      } else {
        const created = await api.createMission(payload())
        if (created && created.id != null) {
          setMissions((prev) => [normalize([created])[0], ...prev])
        } else {
          // Backend didn't return the new row — re-read the list instead of inventing an id.
          await loadMissions()
        }
      }
      setShowModal(null)
    } catch (err) {
      setError(err?.message || 'Failed to save mission')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (m) => {
    if (!window.confirm(`Delete mission "${m.name}"?`)) return
    setError('')
    try {
      await api.deleteMission(m.id)
      setMissions((prev) => prev.filter((x) => x.id !== m.id))
    } catch (e) { setError(e?.message || 'Failed to delete mission') }
  }

  const toggleStatus = async (m) => {
    const active = m.status !== 'active'
    setError('')
    try {
      await api.toggleMissionStatus(m.id, active)
      setMissions((prev) => prev.map((x) => x.id === m.id ? { ...x, status: active ? 'active' : 'inactive' } : x))
    } catch (e) { setError(e?.message || 'Failed to update mission status') }
  }

  const handleNotify = async (m) => {
    setError('')
    try {
      const res = await api.notifyMission(m.id)
      const notified = res?.isNotify ?? true
      setMissions((prev) => prev.map((x) => x.id === m.id ? { ...x, isNotify: notified } : x))
    } catch (e) { setError(e?.message || 'Failed to notify mission') }
  }

  if (loading) return <Loading text="Loading missions..." />

  const countFor = (p) => counts ? (counts[p.toLowerCase()] ?? counts[p] ?? 0) : missions.filter((m) => m.period === p).length

  return (
    <div>
      {error && <div className="alert alert-warning" style={{ marginBottom: 12 }}>{error}</div>}
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Missions</div><div className="value">{counts?.all ?? counts?.total ?? missions.length}</div></div>
        <div className="stats-card"><div className="label">Monthly</div><div className="value">{countFor('MONTHLY')}</div></div>
        <div className="stats-card"><div className="label">Quarterly</div><div className="value">{countFor('QUARTERLY')}</div></div>
        <div className="stats-card"><div className="label">Yearly</div><div className="value">{countFor('YEARLY')}</div></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Missions for Super Admins</span>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Mission</button>
        </div>
        <div className="card-body">
          {missions.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-light)' }}>No missions configured</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {missions.map((m) => (
                <div key={m.id} className="card" style={{ margin: 0, minWidth: 0, overflow: 'hidden', padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal', lineHeight: 1.4 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', textTransform: 'capitalize', overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'normal' }}>{m.period?.toLowerCase()} · For: {m.countryCode || 'All Super Admins'}</div>
                    </div>
                    <span className={`badge ${m.status || 'active'}`} style={{ flexShrink: 0 }}>{m.status || 'active'}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-light)', margin: '0 0 8px', minHeight: 20 }}>{m.description || 'No description'}</p>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>Goal: {typeof m.goal === 'object' ? JSON.stringify(m.goal) : String(m.goal ?? 'N/A')}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-success btn-sm" onClick={() => handleNotify(m)} title={m.isNotify ? 'Already notified — click to notify again' : 'Notify all super admins'}>{m.isNotify ? 'Renotify' : 'Notify'}</button>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}>Edit</button>
                    <button className={`btn btn-sm ${m.status === 'active' ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleStatus(m)}>{m.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                    <button className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(m)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <Modal title={showModal.type === 'create' ? 'Add Mission' : `Edit: ${showModal.mission.name}`} onClose={() => setShowModal(null)}>
          <form onSubmit={handleSave}>
            <div className="form-group"><label>Mission Name</label><input value={form.missionName} onChange={(e) => setForm({ ...form, missionName: e.target.value })} required /></div>
            <div className="form-group"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Period</label>
                <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                  {PERIODS.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Goal</label><input type="text" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="e.g., Complete 500 activities" /></div>
            </div>
            <div className="form-group"><label>Country (Super Admin)</label>
              <select value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                <option value="">All Super Admins</option>
                {countries.map((c) => <option key={c} value={c}>Super Admin ({c})</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowModal(null)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : showModal.type === 'create' ? 'Add Mission' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
