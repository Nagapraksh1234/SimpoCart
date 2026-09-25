export interface StaffUser {
  id: string
  name: string
  email: string
  role: 'staff' | 'admin'
}

export interface LoginPayload {
  email: string
  password: string
}

export interface SignupPayload {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: StaffUser
}