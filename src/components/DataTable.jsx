import { useState, useMemo } from 'react'

export default function DataTable({ columns, data, loading, emptyMessage = 'No data found', pageSize = 20 }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    if (!data) return []
    const arr = [...data]
    if (sortKey) {
      arr.sort((a, b) => {
        const aVal = a[sortKey] ?? ''
        const bVal = b[sortKey] ?? ''
        const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return arr
  }, [data, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil((sorted?.length || 0) / pageSize))
  const paged = sorted?.slice(page * pageSize, (page + 1) * pageSize) || []

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-body" style={{ padding: 40, textAlign: 'center' }}>
          <div className="spinner" style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        </div>
      </div>
    )
  }

  if (!paged.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
        <p style={{ color: 'var(--text-light)' }}>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ cursor: col.sortable !== false ? 'pointer' : 'default', userSelect: 'none', ...col.headerStyle }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  {col.label}
                  {col.sortable !== false && sortKey === col.key && (
                    <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={row.id || row._id || i}>
                {columns.map((col) => (
                  <td key={col.key} style={col.cellStyle}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > pageSize && (
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="pagination-info">{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  )
}
