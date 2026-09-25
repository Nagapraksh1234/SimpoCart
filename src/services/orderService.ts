import { getToken } from './authService'
import type { Order, OrderStatus } from '../types/orders'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

async function authedFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || 'Request failed. Please try again.')
  }
  return data
}

export interface OrderListParams {
  status?: OrderStatus
  from?: string
  to?: string
  q?: string
  paymentMode?: string
}

export function listOrders(params: OrderListParams = {}): Promise<Order[]> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  const qs = query.toString()
  return authedFetch(`/orders${qs ? `?${qs}` : ''}`)
}

export function getOrder(id: string): Promise<Order> {
  return authedFetch(`/orders/${id}`)
}

export function convertOrder(id: string): Promise<Order> {
  return authedFetch(`/orders/${id}/convert`, { method: 'PATCH' })
}

export function cancelOrder(id: string, reason?: string): Promise<Order> {
  return authedFetch(`/orders/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  })
}