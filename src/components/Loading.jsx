export default function Loading({ text = 'Loading...', style = {} }) {
  return (
    <div className="card" style={{ padding: 40, textAlign: 'center', ...style }}>
      <div className="spinner" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
      <p style={{ color: 'var(--text-light)', fontSize: 14 }}>{text}</p>
    </div>
  )
}
