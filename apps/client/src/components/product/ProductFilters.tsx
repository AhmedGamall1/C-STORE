import { useState } from 'react'
import { Check } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// URL keeps multi-select filters as "A,B"; toggle one value in or out.
const toggleInList = (csv, value) => {
  const list = csv ? csv.split(',') : []
  const next = list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value]
  return next.join(',')
}

export function ProductFilters({
  categories = [],
  // { counts, total, sizes, colors } for the current filters (from /facets)
  facets,
  activeCategory = '',
  minPrice = '',
  maxPrice = '',
  sizes = '',
  colors = '',
  inStock = false,
  onFilterChange,
}) {
  const selectedSizes = sizes ? sizes.split(',') : []
  const selectedColors = colors ? colors.split(',') : []

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
                {facets ? (
                  <span className="text-xs tabular opacity-60">
                    {c.slug === 'all'
                      ? facets.total
                      : (facets.counts[c.slug] ?? 0)}
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

      {facets?.sizes.length ? (
        <>
          <Separator />
          <Section title="Size">
            <div className="flex flex-wrap gap-2">
              {facets.sizes.map((size) => {
                const active = selectedSizes.includes(size)
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onFilterChange('sizes', toggleInList(sizes, size))
                    }
                    className={cn(
                      'min-w-10 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      active
                        ? 'border-foreground bg-foreground text-background'
                        : 'hover:border-foreground'
                    )}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
          </Section>
        </>
      ) : null}

      {facets?.colors.length ? (
        <>
          <Separator />
          <Section title="Color">
            <ul className="space-y-1.5">
              {facets.colors.map((color) => {
                const active = selectedColors.includes(color.name)
                return (
                  <li key={color.name}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        onFilterChange('colors', toggleInList(colors, color.name))
                      }
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-sm px-2 py-1 text-left capitalize transition-colors hover:bg-secondary',
                        active ? 'font-semibold' : 'text-muted-foreground'
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                          active && 'ring-2 ring-foreground ring-offset-1'
                        )}
                        style={{ backgroundColor: color.hex ?? undefined }}
                      />
                      {color.name.toLowerCase()}
                    </button>
                  </li>
                )
              })}
            </ul>
          </Section>
        </>
      ) : null}

      <Separator />

      <Section title="Availability">
        <button
          type="button"
          role="checkbox"
          aria-checked={inStock}
          onClick={() => onFilterChange('inStock', inStock ? '' : '1')}
          className="flex items-center gap-2.5 px-2 py-1 text-left"
        >
          <span
            className={cn(
              'grid h-4 w-4 place-items-center rounded-sm border',
              inStock && 'border-foreground bg-foreground text-background'
            )}
          >
            {inStock ? <Check className="h-3 w-3" /> : null}
          </span>
          In stock only
        </button>
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
