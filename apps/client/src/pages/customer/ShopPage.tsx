import { useSearchParams, useParams } from 'react-router'
import { SlidersHorizontal, X, Loader2, PackageOpen } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductGrid } from '@/components/product/ProductGrid'
import { ProductFilters } from '@/components/product/ProductFilters'
import { Pagination } from '@/components/product/Pagination'
import { useCategoryCounts, useProducts } from '@/hooks/useProducts'
import { useCategories } from '@/hooks/useCategories'
import { ErrorView } from '@/components/common/ErrorView'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Alphabetical' },
]

// Map frontend sort value → backend params
const SORT_MAP = {
  newest: { sortBy: 'createdAt', order: 'desc' },
  'price-asc': { sortBy: 'price', order: 'asc' },
  'price-desc': { sortBy: 'price', order: 'desc' },
  name: { sortBy: 'name', order: 'asc' },
}

export default function ShopPage() {
  const { category: pathCategory } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  // Read every filter from URL (single source of truth)
  const category = pathCategory || searchParams.get('category') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'newest'
  const page = Number(searchParams.get('page')) || 1

  // Build the API params object
  const sortParams = SORT_MAP[sort] || SORT_MAP.newest
  const filters = {
    page,
    ...sortParams,
    ...(category && { category }),
    ...(minPrice && { minPrice }),
    ...(maxPrice && { maxPrice }),
    ...(search && { search }),
  }

  const { data, isLoading, isError, error, refetch } = useProducts(filters)
  const { data: categories = [] } = useCategories()

  const products = data?.products ?? []
  const pagination = data?.pagination ?? { page: 1, totalPages: 1 }

  // Helper: update a searchParam, reset page to 1 on filter change
  const setFilter = (key, value) => {
    setSearchParams(
      (prev) => {
        // eslint-disable-next-line no-undef
        const next = new URLSearchParams(prev)
        if (value) {
          next.set(key, value)
        } else {
          next.delete(key)
        }
        // Any filter change resets to page 1 (except page itself)
        if (key !== 'page') next.delete('page')
        return next
      },
      // Filters keep the shopper where they are; a new page starts at the top.
      { preventScrollReset: key !== 'page' }
    )
  }

  // Drop every filter (and the page) but keep the chosen sort order.
  const clearFilters = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams()
        if (prev.get('sort')) next.set('sort', prev.get('sort'))
        return next
      },
      { preventScrollReset: true }
    )
  }

  // Category counts follow the other filters (price, search), not the category.
  const countFilters = {
    ...(minPrice && { minPrice }),
    ...(maxPrice && { maxPrice }),
    ...(search && { search }),
  }
  const { data: categoryCounts } = useCategoryCounts(countFilters)

  // Find category name for the header
  const activeCategoryName = category
    ? categories.find((c) => c.slug === category)?.name
    : null

  return (
    <>
      {/* Page header */}
      <section className="border-b bg-secondary/30">
        <div className="container-page py-10">
          <nav className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>Home</span>
            <span className="mx-2">/</span>
            <span className="text-foreground">
              {activeCategoryName || 'Shop'}
            </span>
          </nav>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {activeCategoryName || 'Shop All'}
          </h1>
          {!isLoading && (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {pagination.total ?? products.length} piece
              {(pagination.total ?? products.length) !== 1 ? 's' : ''}. Shirts,
              jeans and sweaters built to wear through seasons.
            </p>
          )}
        </div>
      </section>

      <div className="container-page py-10">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          {/* Desktop filters */}
          <div className="hidden lg:block">
            <ProductFilters
              // Remount when the URL price changes, so the inputs reset too.
              key={`${minPrice}-${maxPrice}`}
              categories={categories}
              counts={categoryCounts}
              activeCategory={category}
              minPrice={minPrice}
              maxPrice={maxPrice}
              onFilterChange={setFilter}
            />
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Mobile filters */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <ProductFilters
                        key={`${minPrice}-${maxPrice}`}
                        categories={categories}
                        counts={categoryCounts}
                        activeCategory={category}
                        minPrice={minPrice}
                        maxPrice={maxPrice}
                        onFilterChange={setFilter}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                <ActiveFilters
                  category={activeCategoryName}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  search={search}
                  onRemove={setFilter}
                  onClearAll={clearFilters}
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="hidden text-xs uppercase tracking-wider text-muted-foreground sm:inline">
                  Sort by
                </span>
                <Select
                  value={sort}
                  onValueChange={(v) => setFilter('sort', v)}
                >
                  <SelectTrigger className="w-45">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Content states */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <ErrorView
                error={error}
                onRetry={() => refetch()}
                fallback={{
                  title: 'Could not load products',
                  body: 'Please try again in a moment.',
                  cta: 'retry',
                }}
              />
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <PackageOpen className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No products match your filters.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear all filters
                </Button>
              </div>
            ) : (
              <>
                <ProductGrid products={products} expandColors />
                <div className="pt-8">
                  <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onChange={(p) => setFilter('page', String(p))}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/** Shows active filter chips with remove buttons */
function ActiveFilters({
  category,
  minPrice,
  maxPrice,
  search,
  onRemove,
  onClearAll,
}) {
  const chips = []
  if (category) chips.push({ label: category, key: 'category' })
  if (minPrice) chips.push({ label: `Min: ${minPrice} EGP`, key: 'minPrice' })
  if (maxPrice) chips.push({ label: `Max: ${maxPrice} EGP`, key: 'maxPrice' })
  if (search) chips.push({ label: `"${search}"`, key: 'search' })

  if (chips.length === 0) return null

  return (
    <div className="hidden items-center gap-2 sm:flex">
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="outline"
          className="gap-1.5 normal-case tracking-normal font-medium"
        >
          {chip.label}
          <button
            aria-label={`Remove ${chip.label}`}
            onClick={() => onRemove(chip.key, '')}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <button
        className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        onClick={onClearAll}
      >
        Clear all
      </button>
    </div>
  )
}
