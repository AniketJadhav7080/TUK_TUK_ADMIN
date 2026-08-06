export function Skeleton({ className = '', style = {} }) {
  return <div className={`skeleton ${className}`} style={style} />
}

export function SkeletonText({ lines = 3, short = false }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`skeleton-text ${short && i === lines - 1 ? 'short' : ''}`} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return <Skeleton className="skeleton-card" />
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="card">
      <div className="card-header"><Skeleton className="skeleton-text xshort" /></div>
      <div className="card-body">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="skeleton-row" />
        ))}
      </div>
    </div>
  )
}

export function LoadingState({ height = 300 }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height }}>
      <div className="spinner" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )
}

export function EmptyState({ message = 'No data found', icon = '📭' }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <p style={{ color: 'var(--text-light)', fontSize: 15 }}>{message}</p>
    </div>
  )
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
      <p style={{ color: 'var(--text-light)', fontSize: 15, marginBottom: 16 }}>{message}</p>
      {onRetry && <button className="btn btn-primary" onClick={onRetry}>Retry</button>}
    </div>
  )
}
