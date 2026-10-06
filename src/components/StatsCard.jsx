export default function StatsCard({ label, value, change, changeType }) {
  return (
    <div className="stats-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {change && (
        <div className={`change ${changeType || 'up'}`}>
          {changeType === 'down' ? '↓' : '↑'} {change}
        </div>
      )}
    </div>
  )
}