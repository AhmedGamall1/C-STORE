import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../../src/app.js'
import { loggedInUser } from '../../helpers/auth.js'
import { createCategory } from '../../factories/product.factory.js'

describe('GET /api/categories (public)', () => {
  it('returns an empty array when no categories exist', async () => {
    const res = await request(app).get('/api/categories')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('success')
    expect(res.body.data.categories).toEqual([])
  })

  it('excludes inactive categories', async () => {
    await createCategory({ name: 'Visible', isActive: true })
    await createCategory({ name: 'Hidden', isActive: false })

    const res = await request(app).get('/api/categories')

    expect(res.body.data.categories).toHaveLength(1)
    expect(res.body.data.categories[0].name).toBe('Visible')
  })

  it('orders categories by name ascending', async () => {
    await createCategory({ name: 'Charlie' })
    await createCategory({ name: 'Alpha' })
    await createCategory({ name: 'Bravo' })

    const res = await request(app).get('/api/categories')

    expect(res.body.data.categories.map((c) => c.name)).toEqual([
      'Alpha',
      'Bravo',
      'Charlie',
    ])
  })

  it('includes _count.products for each category', async () => {
    await createCategory({ name: 'Alpha' })

    const res = await request(app).get('/api/categories')

    expect(res.body.data.categories[0]._count).toMatchObject({ products: 0 })
  })
})

describe('GET /api/categories/admin', () => {
  it('is public for the read-only admin demo', async () => {
    const res = await request(app).get('/api/categories/admin')
    expect(res.status).toBe(200)
  })

  it('is readable by customers for the read-only admin demo', async () => {
    const { cookie } = await loggedInUser({ role: 'CUSTOMER' })
    const res = await request(app)
      .get('/api/categories/admin')
      .set('Cookie', cookie)
    expect(res.status).toBe(200)
  })

  it('returns active and inactive categories for admin', async () => {
    const { cookie } = await loggedInUser({ role: 'ADMIN' })
    await createCategory({ name: 'Visible', isActive: true })
    await createCategory({ name: 'Hidden', isActive: false })

    const res = await request(app)
      .get('/api/categories/admin')
      .set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.categories).toHaveLength(2)
  })
})
