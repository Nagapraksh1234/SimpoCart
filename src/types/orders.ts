export type PaymentMode = 'ONLINE' | 'CARD' | 'UPI' | 'COD' | 'BANK_TRANSFER'
export type PaymentStatus = 'paid' | 'pending'
export type OrderStatus = 'new' | 'converted' | 'error' | 'cancelled'

export interface OrderItem {
  sku: string
  name: string
  hsn: string
  qty: number
  rate: number
  discountPercent?: number
  discountAmount: number
  taxableAmount: number
  taxPercent: number
  taxAmount: number
}

export interface OrderCustomer {
  name: string
  phone: string
  email?: string
  gstin?: string
  internalCode: string // our own customer code (was "GetAFix code" in the reference)
  externalCustomerCode: string // the client website's customer id ("Website ID")
}

export interface OrderShipping {
  address: string
  stateCode: string
  stateNote: string // e.g. "Same state (CGST + SGST)"
  mode: PaymentMode
  gatewayRef?: string
  paidOn?: string
}

export interface HistoryEvent {
  label: string
  timestamp: string
  done: boolean
}

export interface Order {
  id: string
  orderNumber: string
  placedAt: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMode: PaymentMode

  customer: OrderCustomer
  shipping: OrderShipping
  items: OrderItem[]

  subtotal: number
  discount: number
  cgst: number
  sgst: number
  shippingAmount: number
  total: number

  history: HistoryEvent[]
  websitePayload?: Record<string, unknown>
}

export interface OrderListStats {
  newToConvert: number
  valueWaiting: number
  converted: number
  errors: number
  paymentPending: number
}