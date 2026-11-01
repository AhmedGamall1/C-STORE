import prisma from '../config/database.js'

const LOW_STOCK_MAX = 10

export const getDashboardData = () =>
  prisma.$transaction([
    prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { total: true },
    }),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        guestName: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.productSize.findMany({
      where: {
        isActive: true,
        stock: { lte: LOW_STOCK_MAX },
        color: { isActive: true, product: { isActive: true } },
      },
      orderBy: { stock: 'asc' },
      take: 5,
      select: {
        id: true,
        size: true,
        stock: true,
        color: {
          select: {
            name: true,
            imageUrl: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ])
