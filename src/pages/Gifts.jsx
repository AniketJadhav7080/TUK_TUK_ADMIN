import { useState, useEffect } from 'react'
import Modal from '../components/Modal'
import { api } from '../services/api'
import Loading from '../components/Loading'



export default function Gifts() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [gifts, setGifts] = useState([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [form, setForm] = useState({ name: '', icon: '', price: '', coins: '', category: 'Basic' })

  const fetchGifts = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getGifts()
      if (Array.isArray(data)) setGifts(data)
      else if (data?.content) setGifts(data.content)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchGifts()
  }, [])

  const openAdd = () => {
    setForm({ name: '', icon: '', price: '', coins: '', category: 'Basic' })
    setShowAdd(true)
  }

  const openEdit = (g) => {
    setForm({ name: g.name, icon: g.icon, price: String(g.price), coins: String(g.coins), category: g.category })
    setEditModal(g)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const data = { name: form.name, icon: form.icon, price: parseInt(form.price), coins: parseInt(form.coins), category: form.category }
    if (editModal) {
      try {
        await api.updateGift(editModal.id, data)
        setGifts((prev) => prev.map((g) => g.id === editModal.id ? { ...g, ...data } : g))
      } catch (apiErr) {
      }
      setEditModal(null)
    } else {
      try {
        const created = await api.createGift(data)
        if (created?.id) {
          setGifts((prev) => [{ ...created, totalSent: created.totalSent || 0 }, ...prev])
        }
      } catch (apiErr) {
      }
      setShowAdd(false)
    }
  }

  const toggleStatus = async (id) => {
    const gift = gifts.find((g) => g.id === id)
    if (!gift) return
    const newStatus = gift.status === 'active' ? 'inactive' : 'active'
    try {
      await api.updateGift(id, { ...gift, status: newStatus })
    } catch (apiErr) {
    }
    setGifts((prev) => prev.map((g) => g.id === id ? { ...g, status: newStatus } : g))
  }

  const filtered = gifts.filter((g) => g.name?.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Loading text="Loading gifts..." />
  if (error && gifts.length === 0) {
    return <div className="card"><div className="card-body"><p style={{ textAlign: 'center', color: 'var(--danger)', padding: 24 }}>Failed to load data: {error}</p></div></div>
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Gifts</div><div className="value">{gifts.length}</div></div>
        <div className="stats-card"><div className="label">Active Gifts</div><div className="value">{gifts.filter((g) => g.status === 'active').length}</div></div>
        <div className="stats-card"><div className="label">Most Sent</div><div className="value" style={{ fontSize: 18 }}>{gifts.length > 0 ? gifts.reduce((a, b) => (a.totalSent || 0) > (b.totalSent || 0) ? a : b).name : 'N/A'}</div></div>
        <div className="stats-card"><div className="label">Total Sent</div><div className="value">{gifts.reduce((s, g) => s + (g.totalSent || 0), 0).toLocaleString()}</div></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Gift Catalog</span>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Gift</button>
        </div>
        <div className="card-body">
          <div className="search-bar">
            <input placeholder="Search gifts..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Icon</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Coins</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Total Sent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => (
                  <tr key={g.id}>
                    <td style={{ fontSize: 24 }}>{g.icon}</td>
                    <td style={{ fontWeight: 500 }}>{g.name}</td>
                    <td>₹{g.price}</td>
                    <td>{(g.coins ?? 0).toLocaleString()}</td>
                    <td><span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>{g.category}</span></td>
                    <td><span className={`badge ${g.status}`}>{g.status}</span></td>
                    <td>{(g.totalSent || 0).toLocaleString()}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(g)}>Edit</button>
                        <button className={`btn btn-sm ${g.status === 'active' ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleStatus(g.id)}>
                          {g.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {(showAdd || editModal) && (
        <Modal title={editModal ? 'Edit Gift' : 'Add New Gift'} onClose={() => { setShowAdd(false); setEditModal(null) }}>
          <form onSubmit={handleSave}>
            <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label>Icon (emoji)</label><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label>Price (₹)</label><input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></div>
              <div className="form-group"><label>Coins</label><input type="number" value={form.coins} onChange={(e) => setForm({ ...form, coins: e.target.value })} required /></div>
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                {['Basic', 'Flowers', 'Cute', 'Royal', 'Luxury', 'Premium'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => { setShowAdd(false); setEditModal(null) }}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editModal ? 'Save Changes' : 'Add Gift'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
