import * as dashboardRepo from '../repositories/dashboard.repository.js'

export const getDashboardStats = async () => {
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
    recentOrders: recentOrders.map(({ user, guestName, ...order }) => ({
      ...order,
      customerName: user ? `${user.firstName} ${user.lastName}` : guestName,
    })),
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
