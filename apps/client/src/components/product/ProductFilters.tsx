import { useState } from 'react'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function ProductFilters({
  categories = [],
  // { counts: { [slug]: n }, total } for the current price/search filters
  counts,
  activeCategory = '',
  minPrice = '',
  maxPrice = '',
  onFilterChange,
}) {
  // Price inputs are local state until user clicks "Apply"
  // (we don't want to fire an API call on every keystroke)
  const [localMin, setLocalMin] = useState(minPrice)
  const [localMax, setLocalMax] = useState(maxPrice)

  const handleCategoryClick = (slug) => {
    // 'all' means no category filter → clear it
    onFilterChange('category', slug === 'all' ? '' : slug)
  }

  const handlePriceApply = () => {
    onFilterChange('minPrice', localMin)
    onFilterChange('maxPrice', localMax)
  }

  return (
    <aside className="space-y-6 text-sm">
      <Section title="Category">
        <ul className="space-y-1.5">
          {[{ slug: 'all', name: 'All products' }, ...categories].map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                onClick={() => handleCategoryClick(c.slug)}
                className={
                  'flex w-full items-center justify-between rounded-sm px-2 py-1 text-left transition-colors hover:bg-secondary ' +
                  (activeCategory === c.slug ||
                  (!activeCategory && c.slug === 'all')
                    ? 'font-semibold'
                    : 'text-muted-foreground')
                }
              >
                {c.name}
                {counts ? (
                  <span className="text-xs tabular opacity-60">
                    {c.slug === 'all' ? counts.total : (counts.counts[c.slug] ?? 0)}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Separator />

      <Section title="Price (EGP)">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            min="0"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            placeholder="Max"
            min="0"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={handlePriceApply}
        >
          Apply
        </Button>
      </Section>
    </aside>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]">
        {title}
      </h4>
      {children}
    </div>
  )
}
