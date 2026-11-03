// Shared API response/domain types. Decimal money fields arrive as strings
// (Prisma serializes Decimal to string over JSON).

export type Role = 'ADMIN' | 'CUSTOMER'
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED'
export type PaymentMethod = 'COD' | 'PAYMOB'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: Role
  isActive: boolean
  emailVerified: boolean
  createdAt: string
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  isActive: boolean
  _count?: { products: number }
}

export interface ProductSize {
  id: string
  size: string
  stock: number
  sku: string | null
  price: string | null
  isActive: boolean
  colorId: string
}

export interface ProductColor {
  id: string
  name: string
  hex: string | null
  imageUrl: string
  images: string[]
  isActive: boolean
  productId: string
  sizes?: ProductSize[]
}

export interface Review {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  user?: { id: string; firstName: string; lastName: string }
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  price: string
  comparePrice: string | null
  sku: string | null
  imageUrl: string
  isActive: boolean
  categoryId: string
  category?: Pick<Category, 'id' | 'name' | 'slug'>
  colors?: ProductColor[]
  reviews?: Review[]
  _count?: { reviews: number }
}

export interface Address {
  id: string
  userId: string
  street: string
  city: string
  governorate: string
  isDefault: boolean
}

export interface OrderItem {
  id: string
  orderId: string
  productSizeId: string | null
  quantity: number
  price: string
  size: string
  colorName: string
  colorHex: string | null
  productSize?: {
    id: string
    color: {
      imageUrl: string
      product: { id: string; name: string; slug: string }
    }
  } | null
}

export interface Order {
  id: string
  orderNumber: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  subtotal: string
  shippingCost: string
  total: string
  notes: string | null
  createdAt: string
  items: OrderItem[]
  address?: Address | null
  guestName?: string | null
  guestEmail?: string | null
  guestPhone?: string | null
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'phone'>
}

// Public bulk variant lookup, used to render the guest cart.
export interface BulkVariant {
  id: string
  size: string
  stock: number
  isActive: boolean
  price: number
  productId: string
  productName: string
  productSlug: string
  colorId: string
  colorName: string
  colorImage: string
}

// Raw cart shape returned by the server cart endpoints.
export interface ServerCartItem {
  id: string
  productSizeId: string
  quantity: number
  unitPrice: number | string
  subtotal: number | string
  productSize: {
    size: string
    stock: number
    isActive: boolean
    color: {
      id: string
      name: string
      imageUrl: string
      isActive: boolean
      product: { id: string; name: string; slug: string; isActive: boolean }
    }
  }
}

export interface ServerCart {
  id?: string
  items: ServerCartItem[]
  total: number | string
  totalItems: number | string
}

// Normalized cart line the UI consumes (server + guest carts flatten to this).
export interface CartLine {
  id: string
  productSizeId: string
  quantity: number
  size: string
  stock: number
  isActive: boolean
  unitPrice: number
  subtotal: number
  product: { id: string; name: string; slug: string }
  color: { id: string; name: string; imageUrl: string }
  imageUrl: string
}

export interface Cart {
  id?: string
  items: CartLine[]
  total: number
  totalItems: number
}

export type ShippingRates = Record<string, number>

// Generic list params passed straight through to the query string.
export type ListParams = Record<string, string | number | boolean | undefined>
