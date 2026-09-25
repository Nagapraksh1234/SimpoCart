import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../services/authService'
import { listOrders } from '../services/orderService'
import { mockOrders } from '../data/mockorders'
import type { Order, OrderStatus } from '../types/orders'
import './OrdersList.css'

type TabFilter = 'all' | OrderStatus

function formatDateInput(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatMoney(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function OrdersList() {
  const navigate = useNavigate()
  const user = getCurrentUser()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [usingMock, setUsingMock] = useState(false)

  const [from, setFrom] = useState(formatDateInput(new Date(Date.now() - 30 * 86400000)))
  const [to, setTo] = useState(formatDateInput(new Date()))
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [tab, setTab] = useState<TabFilter>('all')

  async function fetchOrders() {
    setLoading(true)
    setError('')
    try {
      const data = await listOrders({ from, to })
      setOrders(data)
      setUsingMock(false)
    } catch (err) {
      // Backend doesn't support this shape yet (or isn't reachable) —
      // fall back to sample data so the screen is still demonstrable.
      setOrders(mockOrders)
      setUsingMock(true)
      setError(err instanceof Error ? err.message : 'Could not reach the orders API.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = useMemo(() => {
    const newOrders = orders.filter((o) => o.status === 'new')
    const converted = orders.filter((o) => o.status === 'converted')
    const errors = orders.filter((o) => o.status === 'error')
    const paymentPending = orders.filter((o) => o.paymentStatus === 'pending')
    return {
      newToConvert: newOrders.length,
      valueWaiting: newOrders.reduce((sum, o) => sum + o.total, 0),
      converted: converted.length,
      errors: errors.length,
      paymentPending: paymentPending.length,
    }
  }, [orders])

  const filtered = useMemo(() => {
    let list = orders
    if (tab !== 'all') list = list.filter((o) => o.status === tab)
    if (paymentFilter !== 'all') list = list.filter((o) => o.paymentMode === paymentFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.phone.includes(q) ||
        o.customer.externalCustomerCode.toLowerCase().includes(q)
      )
    }
    return list
  }, [orders, tab, paymentFilter, search])

  const counts = useMemo(() => ({
    all: orders.length,
    new: orders.filter((o) => o.status === 'new').length,
    converted: orders.filter((o) => o.status === 'converted').length,
    error: orders.filter((o) => o.status === 'error').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }), [orders])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="ol-page">
      <header className="ol-header">
        <div className="brand">
          <div className="mark">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
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

      <div className="ol-body">
        {usingMock && (
          <div className="error-state" style={{ padding: '0 0 12px', textAlign: 'left' }}>
            Showing sample data — could not reach the orders API ({error}).
          </div>
        )}

        <div className="stat-strip">
          <div className="stat-cell blue">
            <div className="label">NEW — TO CONVERT</div>
            <div className="value">{stats.newToConvert}</div>
          </div>
          <div className="stat-cell">
            <div className="label">VALUE WAITING (₹)</div>
            <div className="value">{formatMoney(stats.valueWaiting)}</div>
          </div>
          <div className="stat-cell">
            <div className="label">CONVERTED</div>
            <div className="value">{stats.converted}</div>
          </div>
          <div className="stat-cell red">
            <div className="label">ERRORS</div>
            <div className="value">{stats.errors}</div>
          </div>
          <div className="stat-cell amber">
            <div className="label">PAYMENT PENDING</div>
            <div className="value">{stats.paymentPending}</div>
          </div>
        </div>

        <div className="filter-bar">
          <div className="date-field">
            From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="date-field">
            To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn-show" onClick={fetchOrders}>Show</button>

          <input
            className="search-input"
            placeholder="Search order no, customer, phone, website customer id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select className="select-field" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="all">All payments</option>
            <option value="ONLINE">Online</option>
            <option value="CARD">Card</option>
            <option value="UPI">UPI</option>
            <option value="COD">COD</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
          </select>

          <div className="chip-row">
            <button className={`chip-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All {counts.all}</button>
            <button className={`chip-btn ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>New {counts.new}</button>
            <button className={`chip-btn ${tab === 'converted' ? 'active' : ''}`} onClick={() => setTab('converted')}>Converted {counts.converted}</button>
            <button className={`chip-btn ${tab === 'error' ? 'active' : ''}`} onClick={() => setTab('error')}>Error {counts.error}</button>
            <button className={`chip-btn ${tab === 'cancelled' ? 'active' : ''}`} onClick={() => setTab('cancelled')}>Cancelled {counts.cancelled}</button>
          </div>
        </div>

        <div className="orders-table">
          <div className="o-row head">
            <span>Order</span>
            <span>Customer</span>
            <span>Items</span>
            <span>Total ₹</span>
            <span>Payment</span>
            <span>Status</span>
            <span>Counter sale</span>
          </div>

          {loading && <div className="loading-state">Loading orders…</div>}
          {!loading && filtered.length === 0 && <div className="empty-state">No orders match these filters.</div>}

          {!loading && filtered.map((order) => (
            <div className="o-row" key={order.id}>
              <span>
                <span className="order-num">{order.orderNumber}</span>
                <div className="sub">{formatDateTime(order.placedAt)}</div>
              </span>
              <span>
                {order.customer.name}
                <div className="sub">{order.customer.phone} · #{order.customer.internalCode}</div>
              </span>
              <span>
                {order.items.length > 0 ? `${order.items.length} line${order.items.length > 1 ? 's' : ''}` : '—'}
                {order.items.length > 0 && (
                  <div className="sub">{order.items.reduce((s, i) => s + i.qty, 0)} qty</div>
                )}
              </span>
              <span className="order-num">{formatMoney(order.total)}</span>
              <span>
                <span className={`pay-badge ${order.paymentStatus}`}>{order.paymentStatus.toUpperCase()}</span>
                <span className="mode-chip">{order.paymentMode}</span>
              </span>
              <span>
                <span className={`status-pill ${order.status}`}>{order.status.toUpperCase()}</span>
              </span>
              <span>
                {order.status === 'new' ? (
                  <button className="btn-convert" onClick={() => navigate(`/orders/${order.id}`)}>
                    Review &amp; convert
                  </button>
                ) : (
                  <button className="btn-convert" style={{ opacity: 0.5 }} onClick={() => navigate(`/orders/${order.id}`)}>
                    View
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}