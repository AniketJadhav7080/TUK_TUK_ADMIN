import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import StatsCard from '../components/StatsCard'
import { ErrorState, LoadingState } from '../components/SkeletonLoader'
import { api } from '../services/api'

const deviceData = [
  { name: 'Android', value: 68 },
  { name: 'iOS', value: 28 },
  { name: 'Web', value: 4 },
]
const COLORS = ['#0a7ea4', '#27ae60', '#f39c12']

export default function Dashboard() {
  const [stats, setStats] = useState([])
  const [revenue, setRevenue] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
        const [dashboardRes, statsRes, chartsRes] = await Promise.all([
          api.getDashboard().catch(() => null),
          api.getDashboardStats().catch(() => null),
          api.getDashboardCharts().catch(() => null)
        ])
        const merged = { ...(dashboardRes || {}), ...(statsRes || {}) }
        const data = Object.keys(merged).length ? merged : (dashboardRes || statsRes)
        if (data) {
          if (data.stats) {
            setStats(data.stats)
          } else if (data.totalUsers !== undefined || data.totalRooms !== undefined) {
            setStats([
              { label: 'Total Users', value: data.totalUsers?.toLocaleString() || '0', change: '+12%', type: 'up' },
              { label: 'Active Users', value: data.activeUsers?.toLocaleString() || '0', change: '+8%', type: 'up' },
              { label: 'Total Countries', value: data.totalCountries || '0', change: '0', type: 'neutral' },
              { label: 'Total Revenue', value: `₹${(data.totalRevenueUsd || data.totalRevenue || 0).toLocaleString()}`, change: '+15%', type: 'up' },
            ])
            setRevenue([
              { label: 'Active Hosts', value: data.activeHosts?.toLocaleString() || '0', change: '+5%', type: 'up' },
              { label: 'Total Rooms', value: data.totalRooms?.toLocaleString() || '0', change: '', type: 'neutral' },
              { label: 'Active Rooms', value: (data.activeRooms ?? data.liveRooms ?? 0).toLocaleString(), change: '+3%', type: 'up' },
              { label: 'Closed Rooms', value: data.closedRooms?.toLocaleString() || '0', change: '', type: 'neutral' },
              { label: 'Pending Reports', value: data.pendingReports || '0', change: '-2%', type: 'down' },
            ])
          }
          if (data.revenue) setRevenue(data.revenue)
        }
        if (chartsRes?.chartData) setChartData(chartsRes.chartData)
        else if (chartsRes && Array.isArray(chartsRes)) setChartData(chartsRes)
        else setChartData([
          { name: 'Mon', users: 400, rooms: 240 },
          { name: 'Tue', users: 300, rooms: 220 },
          { name: 'Wed', users: 600, rooms: 280 },
          { name: 'Thu', users: 800, rooms: 350 },
          { name: 'Fri', users: 500, rooms: 310 },
          { name: 'Sat', users: 900, rooms: 380 },
          { name: 'Sun', users: 700, rooms: 340 },
        ])
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

  useEffect(() => { fetchData() }, [])
  const retry = () => fetchData()

  if (loading) return <div className="stats-grid">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="stats-card"><div className="skeleton skeleton-text xshort" style={{ marginBottom: 8 }} /><div className="skeleton skeleton-text short" style={{ height: 28 }} /></div>)}</div>
  if (error) return <ErrorState message={error} onRetry={retry} />

  return (
    <div>
      <div className="stats-grid">
        {stats.map((s, i) => (
          <StatsCard key={i} label={s.label} value={s.value} change={s.change} changeType={s.type} />
        ))}
      </div>

      <div className="stats-grid">
        {revenue.map((s, i) => (
          <StatsCard key={i} label={s.label} value={s.value} change={s.change} changeType={s.type} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        <div className="card">
          <div className="card-header">New Users (Last 7 Days)</div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="users" fill="#0a7ea4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Device Distribution</div>
          <div className="card-body" style={{ display: 'flex', justifyContent: 'center' }}>
            <div>
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={deviceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {deviceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="card">
          <div className="card-header">Active Rooms (Last 7 Days)</div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="rooms" stroke="#27ae60" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
