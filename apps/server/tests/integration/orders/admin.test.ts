import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../../src/app.js'
import prisma from '../../../src/config/database.js'
import { loggedInUser } from '../../helpers/auth.js'
import { createVariant } from '../../factories/product.factory.js'
import { createAddress } from '../../factories/address.factory.js'

const placeOrder = async (cookie, addressId, productSizeId, qty = 1) => {
  const res = await request(app)
    .post('/api/orders')
    .set('Cookie', cookie)
    .send({ addressId, items: [{ productSizeId, quantity: qty }] })
  return res.body.data.order
}

const seedOrder = async () => {
  const { user, cookie } = await loggedInUser()
  const addr = await createAddress(user.id)
  const v = await createVariant({ stock: 5 })
  const order = await placeOrder(cookie, addr.id, v.size.id)
  return { order, user, variantId: v.size.id, customerCookie: cookie }
}

const expectMasked = (order, user) => {
  expect(order.user.email).not.toBe(user.email)
  expect(order.user.email).toContain('***@')
  expect(order.user.firstName).toBe(`${user.firstName[0]}***`)
  expect(order.address.street).toBe('***')
}

describe('GET /api/orders/admin', () => {
  it('is public but hides personal data without auth', async () => {
    const { user } = await seedOrder()
    const res = await request(app).get('/api/orders/admin')

    expect(res.status).toBe(200)
    expectMasked(res.body.data.orders[0], user)
  })

  it('hides personal data from customers', async () => {
    const { user } = await seedOrder()
    const { cookie } = await loggedInUser({ role: 'CUSTOMER' })
    const res = await request(app)
      .get('/api/orders/admin')
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expectMasked(res.body.data.orders[0], user)
  })

  it('shows personal data to admins', async () => {
    const { user } = await seedOrder()
    const { cookie } = await loggedInUser({ role: 'ADMIN' })
    const res = await request(app)
      .get('/api/orders/admin')
      .set('Cookie', cookie)

    expect(res.body.data.orders[0].user.email).toBe(user.email)
  })

  it('does not search by personal data without admin', async () => {
    const { user } = await seedOrder()
    const res = await request(app).get(
      `/api/orders/admin?q=${encodeURIComponent(user.email)}`
    )

    expect(res.status).toBe(200)
    expect(res.body.data.orders).toHaveLength(0)
  })

  it('returns all orders with pagination shape for admin', async () => {
    await seedOrder()
    await seedOrder()
    const { cookie } = await loggedInUser({ role: 'ADMIN' })

    const res = await request(app)
      .get('/api/orders/admin')
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.orders).toHaveLength(2)
    expect(res.body.data.pagination).toMatchObject({
      total: 2,
      page: 1,
      limit: 20,
    })
  })

  it('filters by status', async () => {
    const a = await seedOrder()
    await seedOrder()
    await prisma.order.update({
      where: { id: a.order.id },
      data: { status: 'CONFIRMED' },
    })

    const { cookie } = await loggedInUser({ role: 'ADMIN' })
    const res = await request(app)
      .get('/api/orders/admin?status=CONFIRMED')
      .set('Cookie', cookie)

    expect(res.body.data.orders).toHaveLength(1)
    expect(res.body.data.orders[0].id).toBe(a.order.id)
  })
})

describe('GET /api/orders/admin/:id', () => {
  it('hides personal data from non-admins', async () => {
    const { order, user } = await seedOrder()
    const { cookie } = await loggedInUser({ role: 'CUSTOMER' })
    const res = await request(app)
      .get(`/api/orders/admin/${order.id}`)
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expectMasked(res.body.data.order, user)
  })

  it('returns 404 when the id does not exist', async () => {
    const { cookie } = await loggedInUser({ role: 'ADMIN' })
    const res = await request(app)
      .get('/api/orders/admin/00000000-0000-0000-0000-000000000000')
      .set('Cookie', cookie)
    expect(res.status).toBe(404)
  })

  it('returns the order detail for any user (admin scope)', async () => {
    const { order } = await seedOrder()
    const { cookie } = await loggedInUser({ role: 'ADMIN' })

    const res = await request(app)
      .get(`/api/orders/admin/${order.id}`)
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.order.id).toBe(order.id)
  })
})

describe('PATCH /api/orders/:id/status (admin only)', () => {
  it('returns 403 for non-admin users', async () => {
    const { order } = await seedOrder()
    const { cookie } = await loggedInUser({ role: 'CUSTOMER' })

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'CONFIRMED' })

    expect(res.status).toBe(403)
  })

  // ---------- valid transitions ----------
  it('allows PENDING → CONFIRMED and clears reservedUntil', async () => {
    const { order } = await seedOrder()
    await prisma.order.update({
      where: { id: order.id },
      data: { reservedUntil: new Date() },
    })
    const { cookie } = await loggedInUser({ role: 'ADMIN' })

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'CONFIRMED' })

    expect(res.status).toBe(200)
    expect(res.body.data.order.status).toBe('CONFIRMED')
    expect(res.body.data.order.reservedUntil).toBeNull()
  })

  it('marks COD orders PAID when transitioning to DELIVERED', async () => {
    const { order } = await seedOrder()
    // Walk through the state machine: PENDING → CONFIRMED → PROCESSING → SHIPPED
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'SHIPPED', paymentStatus: 'UNPAID' },
    })
    const { cookie } = await loggedInUser({ role: 'ADMIN' })

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'DELIVERED' })

    expect(res.body.data.order.status).toBe('DELIVERED')
    expect(res.body.data.order.paymentStatus).toBe('PAID')
  })

  it('restores stock when admin cancels an order', async () => {
    const { order, variantId } = await seedOrder()
    const before = await prisma.productSize.findUnique({
      where: { id: variantId },
    })
    const { cookie } = await loggedInUser({ role: 'ADMIN' })

    await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'CANCELLED' })

    const after = await prisma.productSize.findUnique({
      where: { id: variantId },
    })
    expect(after.stock).toBe(before.stock + 1)
  })

  // ---------- invalid transitions ----------
  it('rejects PENDING → SHIPPED (skips intermediate states)', async () => {
    const { order } = await seedOrder()
    const { cookie } = await loggedInUser({ role: 'ADMIN' })

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'SHIPPED' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/cannot transition/i)
  })

  it('rejects any transition out of DELIVERED (terminal state)', async () => {
    const { order } = await seedOrder()
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'DELIVERED' },
    })
    const { cookie } = await loggedInUser({ role: 'ADMIN' })

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set('Cookie', cookie)
      .send({ status: 'PROCESSING' })

    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown order id', async () => {
    const { cookie } = await loggedInUser({ role: 'ADMIN' })

    const res = await request(app)
      .patch('/api/orders/00000000-0000-0000-0000-000000000000/status')
      .set('Cookie', cookie)
      .send({ status: 'CONFIRMED' })

    expect(res.status).toBe(404)
  })
})
