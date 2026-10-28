import { useState, useEffect } from 'react'
import Loading from '../components/Loading'
import { ErrorState } from '../components/SkeletonLoader'
import { api } from '../services/api'
export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const loadSettings = () => {
    setLoading(true)
    setError('')
    api.getSettings()
      .then((data) => {
        if (Array.isArray(data)) {
          // Some backends return [{key, value}] — fold it into an object.
          const obj = {}
          data.forEach((row) => {
            if (row && typeof row === 'object' && row.key != null) obj[row.key] = row.value
            else if (row && typeof row === 'object') Object.assign(obj, row)
          })
          data = obj
        }
        if (data && typeof data === 'object') {
          // Backend uses maxReportsBeforeAutoBan; accept both key variants
          setSettings({
            ...data,
            maxReportCountBeforeBan: data.maxReportCountBeforeBan ?? data.maxReportsBeforeAutoBan,
          })
        } else {
          setError('Settings were not returned by the server.')
        }
      })
      .catch((err) => { setError(err?.message || 'Failed to load settings from server.') })
      .finally(() => setLoading(false))
  }
  useEffect(() => { loadSettings() }, [])
  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }
  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      // Send both key variants so old and new backends accept it
      await api.updateSettings({
        appName: settings.appName,
        maxUsersPerRoom: settings.maxUsersPerRoom,
        minAgeRequirement: settings.minAgeRequirement,
        maxReportsBeforeAutoBan: settings.maxReportCountBeforeBan,
        banDurationDays: settings.banDurationDays,
        maintenanceMode: settings.maintenanceMode,
        requirePhoneVerification: settings.requirePhoneVerification,
        allowGuestAccess: settings.allowGuestAccess,
      })
      setMessage('success')
    } catch (err) {
      setMessage(err?.message || 'Failed to save settings.')
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 4000)
  }
  if (loading) return <Loading />
  if (!settings) {
    return <div style={{ padding: 24 }}><ErrorState message={error || 'Settings were not returned by the server.'} onRetry={loadSettings} /></div>
  }
  return (
    <div>
      <div className="card">
        <div className="card-header">App Settings</div>
        <div className="card-body">
          <div className="detail-grid">
            <div className="form-group">
              <label>App Name</label>
              <input value={settings.appName} onChange={(e) => handleChange('appName', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Max Users Per Room</label>
              <input type="number" value={settings.maxUsersPerRoom} onChange={(e) => handleChange('maxUsersPerRoom', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Min Age Requirement</label>
              <input type="number" value={settings.minAgeRequirement} onChange={(e) => handleChange('minAgeRequirement', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Max Reports Before Auto-Ban</label>
              <input type="number" value={settings.maxReportCountBeforeBan} onChange={(e) => handleChange('maxReportCountBeforeBan', Number(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Ban Duration (Days)</label>
              <input type="number" value={settings.banDurationDays} onChange={(e) => handleChange('banDurationDays', Number(e.target.value))} />
            </div>
          </div>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => handleChange('maintenanceMode', e.target.checked)} />
              Maintenance Mode (block all non-admin access)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.requirePhoneVerification} onChange={(e) => handleChange('requirePhoneVerification', e.target.checked)} />
              Require Phone Verification
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.allowGuestAccess} onChange={(e) => handleChange('allowGuestAccess', e.target.checked)} />
              Allow Guest Access (no sign-up)
            </label>
          </div>
          {message && (
            <div style={{ marginTop: 16, padding: 10, borderRadius: 'var(--radius)', background: message === 'success' ? '#d1fae5' : '#fee2e2', color: message === 'success' ? '#065f46' : '#991b1b', fontSize: 13 }}>
              {message === 'success' ? 'Settings saved successfully!' : message}
            </div>
          )}
          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
