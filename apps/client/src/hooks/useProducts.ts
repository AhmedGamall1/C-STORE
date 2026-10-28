import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getProducts,
  getCategoryCounts,
  getAdminProducts,
  getAdminProduct,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  forceDeleteProduct,
  toggleProductActive,
} from '@/api/products'
import type { ListParams } from '@/types/api'

// Fetch paginated product list with filters
// (page, limit, category, minPrice, maxPrice, search, sortBy, order).
export function useProducts(filters: ListParams = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => getProducts(filters),
    placeholderData: (prev) => prev,
  })
}

// Shop sidebar: products per category under the current price/search filters.
export function useCategoryCounts(filters: ListParams = {}) {
  return useQuery({
    queryKey: ['products', 'category-counts', filters],
    queryFn: () => getCategoryCounts(filters),
    placeholderData: (prev) => prev,
  })
}

// Paginated product list for admin (includes inactive).
export function useAdminProducts(filters: ListParams = {}) {
  return useQuery({
    queryKey: ['products', 'admin', filters],
    queryFn: () => getAdminProducts(filters),
    placeholderData: (prev) => prev,
  })
}

// Single product by ID for admin editing.
export function useAdminProduct(id?: string) {
  return useQuery({
    queryKey: ['product', 'admin', id],
    queryFn: () => getAdminProduct(id!),
    enabled: Boolean(id),
  })
}

// Single product by slug (detail page).
export function useProduct(slug?: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProduct(slug!),
    enabled: Boolean(slug),
  })
}

function useProductMutation<V>(
  mutationFn: (vars: V) => Promise<unknown>,
  { successMsg }: { successMsg?: string } = {}
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['product'] })
      if (successMsg) toast.success(successMsg)
    },
  })
}

export function useCreateProduct() {
  return useProductMutation(createProduct, { successMsg: 'Product created' })
}

export function useUpdateProduct() {
  return useProductMutation(
    ({ id, ...data }: { id: string } & Parameters<typeof updateProduct>[1]) =>
      updateProduct(id, data),
    { successMsg: 'Product updated' }
  )
}

// Soft-delete a product (admin).
export function useDeleteProduct() {
  return useProductMutation(deleteProduct, { successMsg: 'Product deleted' })
}

// Force (hard) delete a product (admin).
export function useForceDeleteProduct() {
  return useProductMutation(forceDeleteProduct, {
    successMsg: 'Product permanently deleted',
  })
}

// Toggle product active status.
export function useToggleProductActive() {
  return useProductMutation(
    ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleProductActive(id, isActive),
    { successMsg: 'Product status updated' }
  )
}
