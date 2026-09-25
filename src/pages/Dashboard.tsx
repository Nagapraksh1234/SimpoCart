import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../services/authService'
import { listOrders, convertOrder } from '../services/orderService'
import type { Order, OrderStatus } from '../types/orders'
import './Dashboard.css'

type TabFilter = 'all' | OrderStatus

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'All orders' },
  { key: 'pending_review', label: 'Pending review' },
  { key: 'converted', label: 'Converted' },
  { key: 'rejected', label: 'Rejected' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabFilter>('all')
  const [actingId, setActingId] = useState<string | null>(null)

  async function fetchOrders() {
    setLoading(true)
    setError('')
    try {
      const data = await listOrders()
      setOrders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    // Refresh every 30s so new orders pushed in by the client website show up
    // without a manual reload.
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'pending_review')
    const converted = orders.filter((o) => o.status === 'converted')
    const convertedValue = converted.reduce((sum, o) => sum + o.total, 0)
    return {
      total: orders.length,
      pending: pending.length,
      converted: converted.length,
      convertedValue,
    }
  }, [orders])

  const visibleOrders = tab === 'all' ? orders : orders.filter((o) => o.status === tab)

  async function handleConvert(id: string) {
    setActingId(id)
    try {
      const updated = await convertOrder(id)
      setOrders((prev) => prev.map((o) => (o._id === id ? updated : o)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not convert this order.')
    } finally {
      setActingId(null)
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt('Reason for rejecting this order?') || 'Not specified'
    setActingId(id)
    try {
      const updated = await rejectOrder(id, reason)
      setOrders((prev) => prev.map((o) => (o._id === id ? updated : o)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reject this order.')
    } finally {
      setActingId(null)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const customerName = (order: Order) =>
    typeof order.customerId === 'object' ? order.customerId.name : order.externalCustomerCode

  return (
    <div className="dash">
      <header className="dash-header">
        <div className="brand">
          <div className="mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
              <circle cx="7.5" cy="18" r="1.6" />
              <circle cx="17.5" cy="18" r="1.6" />
            </svg>
          </div>
          SimpoCart
        </div>
        <div className="user-row">
          {user && <span><strong>{user.name}</strong> · {user.role}</span>}
          <button className="btn-logout" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="dash-body">
        <h1 className="dash-title">Orders</h1>
        <p className="dash-subtitle">Review orders coming in from the client website and convert them to counter sales.</p>

        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">Total orders</div>
            <div className="value">{stats.total}</div>
          </div>
          <div className="stat-card accent">
            <div className="label">Pending review</div>
            <div className="value">{stats.pending}</div>
          </div>
          <div className="stat-card green">
            <div className="label">Converted</div>
            <div className="value">{stats.converted}</div>
          </div>
          <div className="stat-card">
            <div className="label">Converted value</div>
            <div className="value">₹{stats.convertedValue.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="tab-row">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab-btn ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="order-table">
          <div className="order-row head">
            <span>Order</span>
            <span>Customer</span>
            <span>Total</span>
            <span>Status</span>
            <span>Placed</span>
            <span></span>
          </div>

          {loading && <div className="loading-state">Loading orders…</div>}
          {!loading && error && <div className="error-state">{error}</div>}
          {!loading && !error && visibleOrders.length === 0 && (
            <div className="empty-state">No orders here yet.</div>
          )}

          {!loading && !error && visibleOrders.map((order) => (
            <div className="order-row" key={order._id}>
              <span className="num">{order.orderNumber}</span>
              <span>
                {customerName(order)}
                <div className="sub">{order.externalCustomerCode}</div>
              </span>
              <span>₹{order.total.toLocaleString('en-IN')}</span>
              <span>
                <span className={`status-badge ${order.status}`}>
                  {order.status.replace('_', ' ')}
                </span>
              </span>
              <span className="sub">{new Date(order.createdAt).toLocaleDateString('en-IN')}</span>
              <span className="row-actions">
                {order.status === 'pending_review' && (
                  <>
                    <button
                      className="btn-mini convert"
                      disabled={actingId === order._id}
                      onClick={() => handleConvert(order._id)}
                    >
                      Convert
                    </button>
                    <button
                      className="btn-mini reject"
                      disabled={actingId === order._id}
                      onClick={() => handleReject(order._id)}
                    >
                      Reject
                    </button>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}