import { useState, useEffect } from 'react'
import Loading from '../components/Loading'
import { api } from '../services/api'
export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    api.getSettings()
      .then((data) => { if (data) setSettings(data) })
      .catch(() => { setError('Failed to load settings from server.') })
      .finally(() => setLoading(false))
  }, [])
  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }
  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      await api.updateSettings(settings)
      setMessage('Settings saved successfully!')
    } catch {
      setMessage('Failed to save settings.')
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }
  if (loading) return <Loading />
  if (!settings) {
    return (
      <div>
        {error && <div style={{ marginBottom: 16, padding: 10, borderRadius: 'var(--radius)', background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>{error}</div>}
        <Loading />
      </div>
    )
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
            <div style={{ marginTop: 16, padding: 10, borderRadius: 'var(--radius)', background: message.includes('success') ? '#d1fae5' : '#fee2e2', color: message.includes('success') ? '#065f46' : '#991b1b', fontSize: 13 }}>
              {message}
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
