import { api } from '@/lib/api'
import type { OrderStatus, PaymentStatus } from '@/types/api'

export interface DashboardStats {
  kpis: {
    revenue: number
    totalOrders: number
    pendingOrders: number
    activeProducts: number
    customers: number
  }
  recentOrders: {
    id: string
    orderNumber: number
    status: OrderStatus
    paymentStatus: PaymentStatus
    total: string
    createdAt: string
    customerName: string | null
  }[]
  lowStock: {
    id: string
    productId: string
    productName: string
    colorName: string
    size: string
    stock: number
    imageUrl: string
  }[]
}

// GET /api/dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get<{ data: DashboardStats }>('/dashboard')
  return res.data
}
