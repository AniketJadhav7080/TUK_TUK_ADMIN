import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ROLES } from '../permissions'
import { api } from '../services/api'
import { LoadingState, ErrorState, EmptyState } from '../components/SkeletonLoader'

export default function DiamondAllocation() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const role = user?.role
  const isOwner = role === ROLES.OWNER
  const isSuperAdmin = role === ROLES.SUPER_ADMIN
  const isSeller = role === ROLES.DIAMOND_STOCK

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)

  const [allocateCountry, setAllocateCountry] = useState('')
  const [allocateAmount, setAllocateAmount] = useState('')
  const [allocateNote, setAllocateNote] = useState('')
  const [superAdmins, setSuperAdmins] = useState([])
  const [selectedSuperAdmin, setSelectedSuperAdmin] = useState('')

  const [sellers, setSellers] = useState([])
  const [distributeSeller, setDistributeSeller] = useState('')
  const [distributeAmount, setDistributeAmount] = useState('')
  const [distributeNote, setDistributeNote] = useState('')

  const [lookupId, setLookupId] = useState('')
  const [userLookup, setUserLookup] = useState(null)
  const [rechargeForm, setRechargeForm] = useState({ diamonds: '', amount: '', note: '' })
  const [rechargeLoading, setRechargeLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        if (isOwner) {
          const [s, adminsData] = await Promise.all([
            api.getOwnerDiamondSummary().catch(() => null),
            api.listAdmins().catch(() => []),
          ])
          if (!cancelled) {
            if (s) setSummary(s)
            const list = Array.isArray(adminsData) ? adminsData : (adminsData?.content || [])
            setSuperAdmins(list.filter((a) => a.role === 'SUPER_ADMIN' || a.role === 'super_admin'))
          }
        }

        if (isSuperAdmin) {
          const [s, adminsData] = await Promise.all([
            api.getSuperAdminStockSummary().catch(() => null),
            api.listAdmins().catch(() => []),
          ])
          if (!cancelled) {
            if (s) setSummary(s)
            const list = Array.isArray(adminsData) ? adminsData : (adminsData?.content || [])
            const myCountry = user?.country
            setSellers(list.filter((a) => {
              const isDiamond = a.role === ROLES.DIAMOND_STOCK || a.role === 'diamond_stock' || a.role === 'DIAMOND_STOCK_MANAGER' || a.role === 'diamond_stock_manager'
              if (!myCountry) return isDiamond
              return isDiamond && a.country === myCountry
            }))
          }
        }

        if (isSeller) {
          const s = await api.getManagerDiamondSummary().catch(() => null)
          if (!cancelled && s) setSummary(s)
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

  const handleAllocate = async (e) => {
    e.preventDefault()
    const amount = Number(allocateAmount)
    if (!selectedSuperAdmin || !Number.isFinite(amount) || amount <= 0) {
      addToast('Enter a valid diamond amount', 'error')
      return
    }
    try {
      await api.ownerAllocateDiamond({
        targetAdminId: selectedSuperAdmin,
        country: allocateCountry || undefined,
        amount,
        note: allocateNote || 'Stock allocation',
      })
      setSummary((prev) => prev ? {
        ...prev,
        totalAdminsCredited: (prev.totalAdminsCredited || 0) + 1,
        totalDiamondsCredited: (prev.totalDiamondsCredited || prev.allocated || 0) + amount,
      } : prev)
      setAllocateAmount('')
      setAllocateNote('')
      addToast(`Credited ${amount.toLocaleString()} diamonds`, 'success')
    } catch (e) {
      addToast('Allocation failed: ' + (e.message || 'Server error'), 'error')
    }
  }

  const handleDistribute = async (e) => {
    e.preventDefault()
    const amount = Number(distributeAmount)
    if (!distributeSeller || !Number.isFinite(amount) || amount <= 0) {
      addToast('Enter a valid diamond amount', 'error')
      return
    }
    try {
      await api.superAdminDistribute({ targetManagerId: distributeSeller, amount, note: distributeNote || 'Stock transfer' })
      setSummary((prev) => prev ? {
        ...prev,
        distributedDiamonds: (prev.distributedDiamonds || prev.distributed || 0) + amount,
        remainingDiamonds: Math.max(0, (prev.remainingDiamonds || prev.remaining || 0) - amount),
      } : prev)
      setDistributeSeller('')
      setDistributeAmount('')
      setDistributeNote('')
      addToast(`Distributed ${amount.toLocaleString()} diamonds to manager`, 'success')
    } catch (e) {
      addToast('Distribution failed: ' + (e.message || 'Server error'), 'error')
    }
  }

  const handleLookup = async () => {
    const id = lookupId.trim()
    if (!id) {
      addToast('Enter a user ID to look up', 'error')
      return
    }
    setUserLookup(null)
    try {
      const data = await api.getManagerUser(id)
      if (!data) setUserLookup({ error: 'User not found' })
      else setUserLookup(data)
    } catch (err) {
      setUserLookup({ error: err?.message || 'User not found' })
    }
  }

  const handleRecharge = async (e) => {
    e.preventDefault()
    if (!userLookup?.id) return
    const diamonds = Number(rechargeForm.diamonds)
    const amount = Number(rechargeForm.amount) || 0
    if (!Number.isFinite(diamonds) || diamonds <= 0) {
      addToast('Enter a valid diamond amount', 'error')
      return
    }
    if (amount < 0) {
      addToast('Amount cannot be negative', 'error')
      return
    }
    setRechargeLoading(true)
    try {
      await api.managerWalletRecharge({
        userId: userLookup.id,
        diamonds,
        amountInRupees: amount,
        note: rechargeForm.note || 'Cash recharge',
      })
      setRechargeForm({ diamonds: '', amount: '', note: '' })
      setUserLookup(null)
      setLookupId('')
      addToast(`Recharged ${diamonds.toLocaleString()} diamonds to user`, 'success')
    } catch (e) {
      addToast('Recharge failed: ' + (e.message || 'Server error'), 'error')
    } finally {
      setRechargeLoading(false)
    }
  }

  if (loading) return <div className="page-container"><LoadingState /></div>
  if (error) return <div className="page-container"><ErrorState message={error} onRetry={() => window.location.reload()} /></div>

  return (
    <div className="page-container">
      {isOwner && (
        <>
          <div className="stats-grid">
            <div className="stats-card"><div className="label">Total Admins Credited</div><div className="value" style={{ color: 'var(--primary)' }}>{summary?.totalAdminsCredited || 0}</div></div>
            <div className="stats-card"><div className="label">Total Diamonds Credited</div><div className="value" style={{ color: 'var(--success)' }}>{(summary?.totalDiamondsCredited || 0).toLocaleString()}</div></div>
          </div>
          <div className="card">
            <div className="card-header">Credit Diamonds to Super Admin</div>
            <div className="card-body">
              <form onSubmit={handleAllocate} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 250 }}>
                  <label>Super Admin</label>
                  <select value={selectedSuperAdmin} onChange={(e) => {
                    const sa = superAdmins.find((a) => String(a.id) === e.target.value)
                    setSelectedSuperAdmin(e.target.value)
                    setAllocateCountry(sa?.country || '')
                  }} required
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                    <option value="">Select Super Admin...</option>
                    {superAdmins.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} — {a.country || 'No country'}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                  <label>Diamonds</label>
                  <input type="number" min="1" step="1" value={allocateAmount} onChange={(e) => setAllocateAmount(e.target.value)} required placeholder="Amount" />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                  <label>Note</label>
                  <input value={allocateNote} onChange={(e) => setAllocateNote(e.target.value)} placeholder="e.g. Initial stock" />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginBottom: 4 }}>+ Credit</button>
              </form>
            </div>
          </div>
        </>
      )}

      {isSuperAdmin && (
        <>
          <div className="stats-grid">
            <div className="stats-card"><div className="label">Received from Owner</div><div className="value" style={{ color: 'var(--primary)' }}>{(summary?.receivedDiamonds || summary?.received || 0).toLocaleString()}</div></div>
            <div className="stats-card"><div className="label">Distributed to Managers</div><div className="value">{(summary?.distributedDiamonds || summary?.distributed || 0).toLocaleString()}</div></div>
            <div className="stats-card"><div className="label">Remaining</div><div className="value" style={{ color: 'var(--success)' }}>{(summary?.remainingDiamonds || summary?.remaining || 0).toLocaleString()}</div></div>
          </div>
          <div className="card">
            <div className="card-header">Distribute to Diamond Stock Manager ({user?.country || 'your country'})</div>
            <div className="card-body">
              <form onSubmit={handleDistribute} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                  <label>Diamond Stock Manager</label>
                  <select value={distributeSeller} onChange={(e) => setDistributeSeller(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }}>
                    <option value="">Select Manager...</option>
                    {sellers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} (ID: {m.id}) {m.country ? `— ${m.country}` : ''}</option>
                    ))}
                  </select>
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-light)' }}>
                    Or enter ID manually: <input type="number" value={distributeSeller} onChange={(e) => setDistributeSeller(e.target.value)} placeholder="Manager ID..." style={{ width: 120, padding: '4px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 4 }} />
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                  <label>Diamonds</label>
                  <input type="number" min="1" step="1" value={distributeAmount} onChange={(e) => setDistributeAmount(e.target.value)} required placeholder="Amount" />
                </div>
                <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                  <label>Note</label>
                  <input value={distributeNote} onChange={(e) => setDistributeNote(e.target.value)} placeholder="e.g. Stock for Delhi agent" />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginBottom: 4 }}>+ Distribute</button>
              </form>
            </div>
          </div>
        </>
      )}

      {isSeller && (
        <>
          <div className="stats-grid">
            <div className="stats-card"><div className="label">Received from Super Admin</div><div className="value" style={{ color: 'var(--primary)' }}>{(summary?.receivedFromSuperAdminDiamonds || summary?.received || 0).toLocaleString()}</div></div>
            <div className="stats-card"><div className="label">Recharged to Users</div><div className="value">{(summary?.rechargedDiamonds || summary?.recharged || 0).toLocaleString()}</div></div>
            <div className="stats-card"><div className="label">Available Stock</div><div className="value" style={{ color: 'var(--success)' }}>{(summary?.availableStock || summary?.remaining || 0).toLocaleString()}</div></div>
            <div className="stats-card"><div className="label">Users Recharged</div><div className="value">{(summary?.rechargedUsersCount || 0).toLocaleString()}</div></div>
          </div>
          <div className="card">
            <div className="card-header">Recharge End User</div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Enter User ID..." style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14 }} />
                <button className="btn btn-primary" onClick={handleLookup}>Lookup</button>
              </div>
              {userLookup && !userLookup.error && (
                <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13 }}>
                  Found: <strong>{userLookup.name || userLookup.username}</strong> (ID: {userLookup.id})
                </div>
              )}
              {userLookup?.error && (
                <div style={{ background: '#fef2f2', padding: 12, borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 13, color: 'var(--danger)' }}>User not found</div>
              )}
              {userLookup && !userLookup.error && (
                <form onSubmit={handleRecharge}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div className="form-group"><label>Diamonds</label><input type="number" min="1" step="1" value={rechargeForm.diamonds} onChange={(e) => setRechargeForm({ ...rechargeForm, diamonds: e.target.value })} required /></div>
                    <div className="form-group"><label>Amount (₹)</label><input type="number" min="0" step="0.01" value={rechargeForm.amount} onChange={(e) => setRechargeForm({ ...rechargeForm, amount: e.target.value })} /></div>
                    <div className="form-group"><label>Note</label><input value={rechargeForm.note} onChange={(e) => setRechargeForm({ ...rechargeForm, note: e.target.value })} placeholder="Optional" /></div>
                  </div>
                  <button type="submit" className="btn btn-success" style={{ marginTop: 12 }} disabled={rechargeLoading}>
                    {rechargeLoading ? 'Recharging...' : 'Recharge Wallet'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      )}

      {!isOwner && !isSuperAdmin && !isSeller && (
        <EmptyState icon="🔒" message="Your role does not have access to this panel." />
      )}
    </div>
  )
}
