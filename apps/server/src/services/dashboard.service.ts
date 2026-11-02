import * as dashboardRepo from '../repositories/dashboard.repository.js'
import { maskName } from '../utils/mask.js'

export const getDashboardStats = async (revealPersonal: boolean) => {
  const [
    revenue,
    totalOrders,
    pendingOrders,
    activeProducts,
    customers,
    recentOrders,
    lowStock,
  ] = await dashboardRepo.getDashboardData()

  return {
    kpis: {
      revenue: Number(revenue._sum.total ?? 0),
      totalOrders,
      pendingOrders,
      activeProducts,
      customers,
    },
    recentOrders: recentOrders.map(({ user, guestName, ...order }) => {
      const customerName = user
        ? `${user.firstName} ${user.lastName}`
        : guestName
      return {
        ...order,
        customerName: revealPersonal ? customerName : maskName(customerName),
      }
    }),
    lowStock: lowStock.map((s) => ({
      id: s.id,
      productId: s.color.product.id,
      productName: s.color.product.name,
      colorName: s.color.name,
      size: s.size,
      stock: s.stock,
      imageUrl: s.color.imageUrl,
    })),
  }
}
