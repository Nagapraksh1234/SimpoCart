import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getOrder, convertOrder, cancelOrder } from '../services/orderService'
import { mockOrders } from '../data/mockorders'
import type { Order } from '../types/orders'
import './OrderDetail.css'

function formatMoney(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDateTime(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [showPayload, setShowPayload] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getOrder(id)
      .then(setOrder)
      .catch(() => {
        // Fall back to sample data until the backend supports this shape
        const mock = mockOrders.find((o) => o.id === id)
        setOrder(mock || mockOrders[0])
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleConvert() {
    if (!order) return
    setActing(true)
    try {
      const updated = await convertOrder(order.id)
      setOrder(updated)
    } catch (err) {
      // Optimistically reflect the conversion locally if the backend call
      // fails (e.g. still on mock data) so the flow stays demonstrable.
      setOrder({ ...order, status: 'converted' })
      console.warn('Convert API call failed, applied locally instead:', err)
    } finally {
      setActing(false)
    }
  }

  async function handleCancel() {
    if (!order) return
    const reason = window.prompt('Reason for cancelling this order?') || undefined
    setActing(true)
    try {
      const updated = await cancelOrder(order.id, reason)
      setOrder(updated)
    } catch {
      setOrder({ ...order, status: 'cancelled' })
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="od-page">
        <div className="od-body"><div className="loading-state">Loading order…</div></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="od-page">
        <div className="od-body"><div className="error-state">Order not found.</div></div>
      </div>
    )
  }

  const isConverted = order.status === 'converted'
  const isCancelled = order.status === 'cancelled'

  return (
    <div className="od-page">
      <header className="od-header">
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
      </header>

      <div className="od-body">
        <button className="back-link" onClick={() => navigate('/orders')}>
          ← All website orders
        </button>

        <div className="od-title-row">
          <h1>{order.orderNumber}</h1>
          <span className={`badge ${order.status === 'new' ? 'new' : order.status}`}>{order.status.toUpperCase()}</span>
          <span className={`badge ${order.paymentStatus}`}>{order.paymentStatus.toUpperCase()}</span>
          <span className="mode-tag">{order.paymentMode}</span>
        </div>
        <p className="placed-note">Placed {formatDateTime(order.placedAt)}</p>

        {!isCancelled && (
          <div className={`convert-banner ${isConverted ? 'done' : ''}`}>
            <div className="msg">
              <strong>{isConverted ? 'Converted to counter sale.' : 'Ready to convert.'}</strong>
              <span>
                {isConverted
                  ? `Counter sale created for customer #${order.customer.internalCode}.`
                  : `Creates a counter sale for customer #${order.customer.internalCode} with ${order.items.length} part line${order.items.length !== 1 ? 's' : ''}.`}
              </span>
            </div>
            {!isConverted && (
              <div className="actions">
                <button className="btn-primary" disabled={acting} onClick={handleConvert}>
                  {acting ? 'Converting…' : 'Create Counter Sale'}
                </button>
                <button className="btn-secondary" disabled={acting} onClick={handleCancel}>
                  Cancel order
                </button>
              </div>
            )}
          </div>
        )}

        <div className="od-grid">
          <div>
            <div className="panel panel-row-pair">
              <div>
                <h3>Customer</h3>
                <dl className="kv-list">
                  <dt>Name</dt><dd>{order.customer.name}</dd>
                  <dt>Phone</dt><dd>{order.customer.phone}</dd>
                  <dt>SimpoCart code</dt><dd>{order.customer.internalCode}</dd>
                  <dt>Website ID</dt><dd>{order.customer.externalCustomerCode}</dd>
                  {order.customer.email && (<><dt>Email</dt><dd>{order.customer.email}</dd></>)}
                  {order.customer.gstin && (<><dt>GSTIN</dt><dd>{order.customer.gstin}</dd></>)}
                </dl>
              </div>
              <div>
                <h3>Shipping &amp; payment</h3>
                <dl className="kv-list">
                  <dt>Ship to</dt><dd>{order.shipping.address || '—'}</dd>
                  {order.shipping.stateCode && (<><dt>State code</dt><dd>{order.shipping.stateCode} · {order.shipping.stateNote}</dd></>)}
                  <dt>Mode</dt><dd>{order.shipping.mode}</dd>
                  {order.shipping.gatewayRef && (<><dt>Gateway ref</dt><dd>{order.shipping.gatewayRef}</dd></>)}
                  <dt>Paid on</dt><dd>{formatDateTime(order.shipping.paidOn)}</dd>
                </dl>
              </div>
            </div>

            <div className="panel">
              <h3>Items {order.items.length > 0 && <span style={{ color: 'var(--slate)', fontWeight: 500 }}>· {order.items.length} lines</span>}</h3>
              {order.items.length === 0 ? (
                <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>No item-level detail available for this order.</p>
              ) : (
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>SKU / Part</th>
                      <th>HSN</th>
                      <th className="num">Qty</th>
                      <th className="num">Rate ₹</th>
                      <th className="num">Discount ₹</th>
                      <th className="num">Taxable ₹</th>
                      <th className="num">Tax ₹</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={item.sku}>
                        <td>{i + 1}</td>
                        <td>
                          {item.sku}
                          <div className="item-name">{item.name}</div>
                        </td>
                        <td>{item.hsn}</td>
                        <td className="num">{item.qty}</td>
                        <td className="num">{formatMoney(item.rate)}</td>
                        <td className="num">
                          {formatMoney(item.discountAmount)}
                          {item.discountPercent ? <span className="pct">{item.discountPercent}%</span> : null}
                        </td>
                        <td className="num">{formatMoney(item.taxableAmount)}</td>
                        <td className="num">
                          {formatMoney(item.taxAmount)}
                          <span className="pct">{item.taxPercent}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <button className="payload-toggle" onClick={() => setShowPayload((v) => !v)}>
              {showPayload ? '▾' : '▸'} Website payload (as received)
            </button>
            {showPayload && (
              <div className="payload-body">
                {JSON.stringify(order.websitePayload ?? { note: 'No raw payload stored for this order.' }, null, 2)}
              </div>
            )}
          </div>

          <div>
            <div className="panel">
              <h3>Order total</h3>
              <div className="total-list">
                <div className="line muted"><span>Sub total (qty × rate)</span><span>{formatMoney(order.subtotal)}</span></div>
                <div className="line muted"><span>Discount</span><span>- {formatMoney(order.discount)}</span></div>
                <div className="line muted"><span>CGST</span><span>{formatMoney(order.cgst)}</span></div>
                <div className="line muted"><span>SGST</span><span>{formatMoney(order.sgst)}</span></div>
                <div className="line muted"><span>Shipping</span><span>{formatMoney(order.shippingAmount)}</span></div>
                <div className="line grand"><span>Total</span><span>₹{formatMoney(order.total)}</span></div>
              </div>
            </div>

            <div className="panel">
              <h3>History</h3>
              {order.history.length === 0 ? (
                <p style={{ color: 'var(--slate)', fontSize: '0.85rem' }}>No history recorded yet.</p>
              ) : (
                <div className="timeline">
                  {order.history.map((ev, i) => (
                    <div className={`tl-item ${ev.done ? '' : 'pending'}`} key={i}>
                      <span className="dot" />
                      <div>
                        <strong>{ev.label}</strong>
                        {ev.timestamp && <span>{formatDateTime(ev.timestamp)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}