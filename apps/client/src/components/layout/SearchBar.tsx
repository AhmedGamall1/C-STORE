import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Loader2, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { getProducts } from '@/api/products'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatEGP } from '@/lib/utils'

const MIN_CHARS = 2
const SUGGESTION_LIMIT = 5

export function SearchBar({ onClose }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [term, setTerm] = useState(searchParams.get('search') ?? '')

  const query = useDebouncedValue(term.trim(), 300)
  const enabled = query.length >= MIN_CHARS

  const { data, isFetching } = useQuery({
    queryKey: ['products', 'suggestions', query],
    queryFn: () => getProducts({ search: query, limit: SUGGESTION_LIMIT }),
    enabled,
    staleTime: 30_000,
  })

  const suggestions = enabled ? (data?.products ?? []) : []
  // Stale results from the previous term would flash wrong products.
  const showingCurrent = enabled && query === term.trim()

  const submit = (e) => {
    e.preventDefault()
    const value = term.trim()
    if (!value) return
    navigate(`/shop?search=${encodeURIComponent(value)}`)
    onClose()
  }

  return (
    <form
      onSubmit={submit}
      className="relative mx-auto max-w-2xl"
      role="search"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        autoFocus
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        placeholder="Search products..."
        aria-label="Search products"
        className="pl-10 pr-10"
      />
      {isFetching ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : null}

      {showingCurrent && !isFetching ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-md border bg-background shadow-lg">
          {suggestions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No products found for “{query}”.
            </p>
          ) : (
            <>
              <ul>
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/product/${p.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary"
                    >
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-12 w-10 shrink-0 rounded-sm object-cover"
                      />
                      <span className="flex-1 truncate text-sm font-medium">
                        {p.name}
                      </span>
                      <span className="text-sm tabular">
                        {formatEGP(p.price)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="submit"
                className="block w-full border-t px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                See all results for “{query}”
              </button>
            </>
          )}
        </div>
      ) : null}
    </form>
  )
}
