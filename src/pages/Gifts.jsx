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
  const [showAddAnim, setShowAddAnim] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [tab, setTab] = useState('catalog')
  const [transactions, setTransactions] = useState([])
  const [txLoading, setTxLoading] = useState(false)
  const [txSearch, setTxSearch] = useState('')
  const [txGiftFilter, setTxGiftFilter] = useState('')
  const [txDateFilter, setTxDateFilter] = useState('all')
  const [txPage, setTxPage] = useState(0)
  const TX_PAGE_SIZE = 20
  const [txError, setTxError] = useState('')
  const [form, setForm] = useState({ code: '', name: '', icon: '', animationUrl: '', coins: '', category: 'gift' })
  const [giftCounts, setGiftCounts] = useState(null)
  const [mostSent, setMostSent] = useState(null)

  const API_ORIGIN = 'https://api.tuktuk.live'
  const resolveUrl = (u) => {
    if (!u) return ''
    if (u.startsWith('http') || u.startsWith('data:')) return u
    if (u.startsWith('/')) return `${API_ORIGIN}${u}`
    return u
  }

  const fetchGifts = async () => {
    setLoading(true)
    setError('')
    try {
      const [data, counts, top] = await Promise.all([
        api.getGifts(),
        api.getGiftCounts().catch(() => null),
        api.getMostSentGift().catch(() => null),
      ])
      const list = Array.isArray(data) ? data : (data?.content || data?.data || [])
      setGifts(list.map((g) => {
        const isActive = g.active !== false && (g.status ? g.status === 'active' : true)
        const iconUrl = g.iconUrl || g.icon || g.imageUrl || g.giftIconUrl || g.giftImage || ''
        const totalSent = g.totalSent ?? g.sentCount ?? 0
        return { ...g, icon: iconUrl, imageUrl: iconUrl, iconUrl, totalSent, coins: g.coins ?? g.price ?? 0, price: g.price ?? g.coins ?? 0, active: isActive, status: isActive ? 'active' : 'inactive' }
      }))
      if (counts) setGiftCounts(counts)
      if (top) setMostSent(top)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchGifts()
  }, [])

  const openAdd = () => {
    setForm({ code: '', name: '', icon: '', animationUrl: '', coins: '', category: 'gift' })
    setShowAddAnim(false)
    setShowAdd(true)
  }

  const openAddAnim = () => {
    setForm({ code: '', name: '', icon: '', animationUrl: '', coins: '', category: 'pk' })
    setShowAdd(false)
    setShowAddAnim(true)
  }

  const openEdit = (g) => {
    setForm({ code: g.code || '', name: g.name, icon: g.iconUrl || g.icon || g.imageUrl || g.giftIconUrl || g.giftImage || '', animationUrl: g.animationUrl || '', coins: String(g.coins ?? g.price ?? ''), category: g.category || 'gift' })
    setEditModal(g)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const diamonds = parseInt(form.coins) || 0
    const category = form.category?.trim() || 'gift'
    const iconVal = form.icon?.trim() || null
    const animVal = form.animationUrl?.trim() || null
    const codeVal = form.code?.trim()
    if (!codeVal) {
      setError('Code is required (e.g. rose-100)')
      return
    }
    if (editModal) {
      // Backend contract: {code, name, iconUrl, animationUrl, price, category, active}
      const data = { code: codeVal, name: form.name, iconUrl: iconVal, animationUrl: animVal, icon: iconVal, imageUrl: iconVal, price: diamonds, coins: diamonds, category, active: editModal.active !== false }
      try {
        await api.updateGift(editModal.id, data)
      } catch (apiErr) {
        setError(apiErr.message || 'Failed to update gift')
      }
      setEditModal(null)
      await fetchGifts()
    } else if (showAddAnim) {
      // Add Animation: same API, no iconUrl
      if (!animVal) {
        setError('Animation URL is required')
        return
      }
      const data = { code: codeVal, name: form.name, animationUrl: animVal, price: diamonds, coins: diamonds, category, active: true }
      try {
        await api.createAnimation(data)
      } catch (apiErr) {
        setError(apiErr.message || 'Failed to create animation')
      }
      setShowAddAnim(false)
      await fetchGifts()
    } else {
      // Add Gift: same API, no animationUrl
      if (!iconVal) {
        setError('Icon URL is required')
        return
      }
      const data = { code: codeVal, name: form.name, iconUrl: iconVal, icon: iconVal, imageUrl: iconVal, price: diamonds, coins: diamonds, category, active: true }
      try {
        await api.createGift(data)
      } catch (apiErr) {
        setError(apiErr.message || 'Failed to create gift')
      }
      setShowAdd(false)
      await fetchGifts()
    }
  }

  const toggleStatus = async (id) => {
    const gift = gifts.find((g) => g.id === id)
    if (!gift) return
    const isActive = gift.active !== false && gift.status !== 'inactive'
    const newActive = !isActive
    try {
      await api.patchGift(id, { active: newActive })
    } catch (apiErr) {
    }
    setGifts((prev) => prev.map((g) => g.id === id ? { ...g, active: newActive, status: newActive ? 'active' : 'inactive' } : g))
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this gift?')) return
    try {
      await api.deleteGift(id)
    } catch (apiErr) {
    }
    setGifts((prev) => prev.filter((g) => g.id !== id))
  }

  const loadTransactions = async () => {
    setTxLoading(true)
    setTxError('')
    try {
      const data = await api.getGiftTransactions()
      const list = Array.isArray(data) ? data : (data?.content || data?.transactions || data?.data || [])
      setTransactions(list)
    } catch (e) {
      setTransactions([])
      setTxError(e.message || 'Failed to load sent gifts')
    } finally {
      setTxLoading(false)
    }
  }

  const filtered = gifts.filter((g) => {
    const q = search.toLowerCase()
    return g.name?.toLowerCase().includes(q) || g.code?.toLowerCase().includes(q)
  })

  if (loading) return <Loading text="Loading gifts..." />
  if (error && gifts.length === 0) {
    return <div className="card"><div className="card-body"><p style={{ textAlign: 'center', color: 'var(--danger)', padding: 24 }}>Failed to load data: {error}</p></div></div>
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stats-card"><div className="label">Total Gifts</div><div className="value">{giftCounts ? ((giftCounts.activeGifts ?? 0) + (giftCounts.inactiveGifts ?? 0)) : gifts.length}</div></div>
        <div className="stats-card"><div className="label">Active Gifts</div><div className="value">{giftCounts?.activeGifts ?? gifts.filter((g) => g.status === 'active').length}</div></div>
        <div className="stats-card"><div className="label">Most Sent</div><div className="value" style={{ fontSize: 18 }}>{mostSent?.giftName || (gifts.length > 0 ? gifts.reduce((a, b) => (a.totalSent || 0) > (b.totalSent || 0) ? a : b).name : 'N/A')}</div></div>
        <div className="stats-card"><div className="label">Total Sent</div><div className="value">{(giftCounts?.totalGiftsSent ?? gifts.reduce((s, g) => s + (g.totalSent || 0), 0)).toLocaleString()}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className={`btn btn-sm ${tab === 'catalog' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('catalog')}>Gift Catalog</button>
        <button className={`btn btn-sm ${tab === 'sent' ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setTab('sent'); loadTransactions() }}>Sent Gifts</button>
      </div>

      {tab === 'catalog' && (
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Gift Catalog</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Gift</button>
            <button className="btn btn-primary btn-sm" onClick={openAddAnim}>+ Add Animation</button>
          </div>
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
                    <th>Code</th>
                    <th>Name</th>
                    <th>Diamonds</th>
                    <th>Category</th>
                  <th>Status</th>
                  <th>Total Sent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g) => {
                  const rawIcon = g.iconUrl || g.imageUrl || g.icon || ''
                  const src = resolveUrl(rawIcon)
                  const isImg = src && (src.startsWith('http') || rawIcon.startsWith('/'))
                  return (
                  <tr key={g.id}>
                    <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{isImg ? <img src={src} alt={g.name} style={{ width: 32, height: 32, objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none' }} /> : <span style={{ fontSize: 24 }}>{rawIcon || '-'}</span>}{g.animationUrl ? <a href={resolveUrl(g.animationUrl)} target="_blank" rel="noreferrer" title={g.animationUrl} style={{ fontSize: 14 }}>🎬</a> : null}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{g.code || '-'}</td>
                    <td style={{ fontWeight: 500 }}>{g.name}</td>
                    <td style={{ fontWeight: 600 }}>💎{(g.coins ?? g.price ?? 0).toLocaleString()}</td>
                    <td><span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>{g.category}</span></td>
                    <td><span className={`badge ${g.status}`}>{g.status}</span></td>
                    <td>{(g.totalSent || 0).toLocaleString()}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(g)}>Edit</button>
                        <button className={`btn btn-sm ${g.status === 'active' ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleStatus(g.id)}>
                          {g.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(g.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {tab === 'sent' && (
      <div className="card">
        <div className="card-header">Sent Gifts (who sent what to whom)</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <div className="search-bar" style={{ flex: '1 1 200px', margin: 0 }}>
              <input placeholder="Search sender / receiver / room..." value={txSearch} onChange={(e) => { setTxSearch(e.target.value); setTxPage(0) }} />
            </div>
            <select value={txGiftFilter} onChange={(e) => { setTxGiftFilter(e.target.value); setTxPage(0) }} style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
              <option value="">All Gifts</option>
              {gifts.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
            <select value={txDateFilter} onChange={(e) => { setTxDateFilter(e.target.value); setTxPage(0) }} style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
            </select>
          </div>
          {txLoading ? <p style={{ textAlign: 'center', color: 'var(--text-light)', padding: 20 }}>Loading...</p> : (() => {
            const q = txSearch.toLowerCase()
            const now = new Date()
            const filteredTx = transactions.filter((t) => {
              const sender = String(t.senderName || t.sender || t.fromUser || '').toLowerCase()
              const receiver = String(t.receiverName || t.receiver || t.toUser || t.host || '').toLowerCase()
              const room = String(t.roomName || t.room || '').toLowerCase()
              const giftName = String(t.giftName || t.gift || '')
              if (q && !(sender.includes(q) || receiver.includes(q) || room.includes(q))) return false
              if (txGiftFilter && giftName !== txGiftFilter) return false
              if (txDateFilter !== 'all') {
                const d = t.createdAt ? new Date(t.createdAt) : (t.date ? new Date(t.date) : null)
                if (!d) return false
                const diffDays = (now - d) / (1000 * 60 * 60 * 24)
                if (txDateFilter === 'today' && diffDays > 1) return false
                if (txDateFilter === '7days' && diffDays > 7) return false
              }
              return true
            })
            const totalDiamonds = filteredTx.reduce((s, t) => s + (Number(t.diamonds ?? t.giftPrice ?? t.coins ?? t.price ?? 0) || 0), 0)
            const pageCount = Math.max(1, Math.ceil(filteredTx.length / TX_PAGE_SIZE))
            const pageTx = filteredTx.slice(txPage * TX_PAGE_SIZE, txPage * TX_PAGE_SIZE + TX_PAGE_SIZE)
            if (transactions.length === 0) {
              return (
                <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: 24 }}>
                  <p style={{ marginBottom: 8 }}>No sent gifts yet</p>
                  {txError && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>Error: {txError}</p>}
                  <p style={{ fontSize: 12 }}>Waiting for backend: <code>GET /gifts/room-history</code> should return <code>[&#123;senderName, giftName, giftIconUrl, giftAnimationUrl, giftPrice, receiverName, roomName, createdAt&#125;]</code></p>
                </div>
              )
            }
            return (
              <>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, fontSize: 13 }}>
                  <span><strong>{filteredTx.length}</strong> sends</span>
                  <span>💎 <strong>{totalDiamonds.toLocaleString()}</strong> diamonds</span>
                  <span style={{ marginLeft: 'auto' }}>Page {txPage + 1} / {pageCount}</span>
                </div>
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr><th>Sender</th><th>Gift</th><th>Diamonds</th><th>Receiver</th><th>Room</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {pageTx.map((t, i) => (
                        <tr key={t.id || i}>
                          <td style={{ fontWeight: 500 }}>{t.senderName || t.sender || t.fromUser || '-'}</td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {(t.giftIconUrl || t.giftImage || t.imageUrl || String(t.giftIcon || '').startsWith('http')) && <img src={t.giftIconUrl || t.giftImage || t.imageUrl || t.giftIcon} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />}
                              {t.giftName || t.gift || '-'}
                              {t.giftAnimationUrl && <a href={t.giftAnimationUrl} target="_blank" rel="noreferrer" title="Play animation" style={{ fontSize: 12 }}>🎬</a>}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>💎{Number(t.giftPrice ?? t.diamonds ?? t.coins ?? t.price ?? 0).toLocaleString()}</td>
                          <td>{t.receiverName || t.receiver || t.toUser || t.host || '-'}</td>
                          <td>{t.roomName || t.room || '-'}</td>
                          <td style={{ fontSize: 12 }}>{t.createdAt ? new Date(t.createdAt).toLocaleString() : (t.date || '-')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pageCount > 1 && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
                    <button className="btn btn-outline btn-sm" disabled={txPage === 0} onClick={() => setTxPage((p) => Math.max(0, p - 1))}>Prev</button>
                    <button className="btn btn-outline btn-sm" disabled={txPage + 1 >= pageCount} onClick={() => setTxPage((p) => p + 1)}>Next</button>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      </div>
      )}

      {showAdd && (
        <Modal title="Add New Gift" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group"><label>Code * (e.g. rose-100)</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="rose-100" /></div>
            <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Rose" /></div>
            <div className="form-group"><label>Icon URL * (/uploads/... or https://...)</label><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} required placeholder="/uploads/gifts/rose.png or https://..." /></div>
            <div className="form-group"><label>Price (diamonds)</label><input type="number" value={form.coins} onChange={(e) => setForm({ ...form, coins: e.target.value })} required /></div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                {['gift', 'Basic', 'Flowers', 'Cute', 'Royal', 'Luxury', 'Premium'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add Gift</button>
            </div>
          </form>
        </Modal>
      )}

      {showAddAnim && (
        <Modal title="Add New Animation" onClose={() => setShowAddAnim(false)}>
          <form onSubmit={handleSave}>
            <div className="form-group"><label>Code * (e.g. rose-anim-100)</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="rose-anim-100" /></div>
            <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Rose Animation" /></div>
            <div className="form-group"><label>Animation URL * (/uploads/... or https://...)</label><input value={form.animationUrl} onChange={(e) => setForm({ ...form, animationUrl: e.target.value })} required placeholder="/uploads/gifts/rose.mp4 or https://..." /></div>
            <div className="form-group"><label>Price (diamonds)</label><input type="number" value={form.coins} onChange={(e) => setForm({ ...form, coins: e.target.value })} required /></div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                {['pk', 'Basic', 'Flowers', 'Cute', 'Royal', 'Luxury', 'Premium'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setShowAddAnim(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add Animation</button>
            </div>
          </form>
        </Modal>
      )}

      {editModal && (
        <Modal title="Edit Gift" onClose={() => setEditModal(null)}>
          <form onSubmit={handleSave}>
            <div className="form-group"><label>Code * (e.g. rose-100)</label><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="rose-100" /></div>
            <div className="form-group"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Rose" /></div>
            <div className="form-group"><label>Icon URL (/uploads/... or https://...)</label><input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="/uploads/gifts/rose.png or https://..." /></div>
            <div className="form-group"><label>Animation URL (/uploads/... or https://...)</label><input value={form.animationUrl} onChange={(e) => setForm({ ...form, animationUrl: e.target.value })} placeholder="/uploads/gifts/rose.mp4 or https://..." /></div>
            <div className="form-group"><label>Price (diamonds)</label><input type="number" value={form.coins} onChange={(e) => setForm({ ...form, coins: e.target.value })} required /></div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                {['gift', 'pk', 'Basic', 'Flowers', 'Cute', 'Royal', 'Luxury', 'Premium'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setEditModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
