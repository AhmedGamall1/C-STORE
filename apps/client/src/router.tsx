import { createBrowserRouter } from 'react-router'

import { CustomerLayout } from '@/components/layout/CustomerLayout'
import { AccountLayout } from '@/components/account/AccountLayout'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AdminRoute } from '@/components/auth/AdminRoute'

import HomePage from '@/pages/customer/HomePage'
import ShopPage from '@/pages/customer/ShopPage'
import ProductDetailPage from '@/pages/customer/ProductDetailPage'
import CartPage from '@/pages/customer/CartPage'
import CheckoutPage from '@/pages/customer/CheckoutPage'
import OrderConfirmationPage from '@/pages/customer/OrderConfirmationPage'
import PaymentResultPage from '@/pages/customer/PaymentResultPage'
import LoginPage from '@/pages/customer/LoginPage'
import RegisterPage from '@/pages/customer/RegisterPage'
import VerifyEmailPage from '@/pages/customer/VerifyEmailPage'
import ForgotPasswordPage from '@/pages/customer/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/customer/ResetPasswordPage'

import ProfilePage from '@/pages/customer/account/ProfilePage'
import OrdersPage from '@/pages/customer/account/OrdersPage'
import OrderDetailPage from '@/pages/customer/account/OrderDetailPage'
import AddressesPage from '@/pages/customer/account/AddressesPage'

import DashboardPage from '@/pages/admin/DashboardPage'
import AdminProductsPage from '@/pages/admin/products/AdminProductsPage'
import ProductFormPage from '@/pages/admin/products/ProductFormPage'
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage'
import AdminOrdersPage from '@/pages/admin/orders/AdminOrdersPage'
import AdminOrderDetailPage from '@/pages/admin/orders/AdminOrderDetailPage'

import NotFoundPage from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  // Public auth routes (full-bleed, no layout)
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // Customer storefront — public
  {
    element: <CustomerLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'shop', element: <ShopPage /> },
      { path: 'shop/:category', element: <ShopPage /> },
      { path: 'product/:slug', element: <ProductDetailPage /> },
      { path: 'cart', element: <CartPage /> },
      // Guests can check out — order ownership is enforced server-side.
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'order/success/:id', element: <OrderConfirmationPage /> },
      // Paymob sends card customers here (via /api/paymob/return) after paying.
      { path: 'payment/result/:id', element: <PaymentResultPage /> },

      // Auth-required under the same customer layout
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'account',
            element: <AccountLayout />,
            children: [
              { index: true, element: <ProfilePage /> },
              { path: 'orders', element: <OrdersPage /> },
              { path: 'orders/:id', element: <OrderDetailPage /> },
              { path: 'addresses', element: <AddressesPage /> },
            ],
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // Admin — requires ADMIN role
  {
    element: <AdminRoute />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'products', element: <AdminProductsPage /> },
          { path: 'products/new', element: <ProductFormPage /> },
          { path: 'products/:id', element: <ProductFormPage /> },
          { path: 'categories', element: <AdminCategoriesPage /> },
          { path: 'orders', element: <AdminOrdersPage /> },
          { path: 'orders/:id', element: <AdminOrderDetailPage /> },
        ],
      },
    ],
  },
])
