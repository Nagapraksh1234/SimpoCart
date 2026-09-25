import type { LoginPayload, SignupPayload, AuthResponse, StaffUser } from '../types/auth'

// Base URL of your Express API. Set VITE_API_BASE_URL in your .env file.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

async function handleResponse(res: Response): Promise<AuthResponse> {
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || 'Something went wrong. Please try again.')
  }
  return data
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(res)
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handleResponse(res)
}

export function saveSession(auth: AuthResponse) {
  localStorage.setItem('simpocart_token', auth.token)
  localStorage.setItem('simpocart_user', JSON.stringify(auth.user))
}

export function getToken(): string | null {
  return localStorage.getItem('simpocart_token')
}

export function getCurrentUser(): StaffUser | null {
  const raw = localStorage.getItem('simpocart_user')
  return raw ? JSON.parse(raw) : null
}

export function logout() {
  localStorage.removeItem('simpocart_token')
  localStorage.removeItem('simpocart_user')
}

// NOTE: this covers staff login/signup only. The client website's own
// system should authenticate separately via a server-issued API key sent
// as a header (e.g. X-Api-Key) on its order-intake requests — not through
// this login form. That gets verified in Express middleware, not here.