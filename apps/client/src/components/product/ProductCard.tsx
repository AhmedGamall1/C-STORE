import { Link, useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatEGP } from '@/lib/utils'

export function ProductCard({ product, color, className }) {
  const navigate = useNavigate()

  const soldOut = product.stock === 0
  const onSale =
    product.comparePrice && Number(product.comparePrice) > Number(product.price)
  const discountPct = onSale
    ? Math.round(
        ((Number(product.comparePrice) - Number(product.price)) /
          Number(product.comparePrice)) *
          100
      )
    : 0

  // When a specific color is passed (Shop All shows one card per color), use
  // that color's image and append its name; otherwise fall back to the product
  // cover. The link carries ?color=<id> so the detail page opens focused on it.
  const cover = color ? color.imageUrl : product.imageUrl
  const title = color
    ? `${product.name} ${color.name.toUpperCase()}`
    : product.name
  const linkTo = color
    ? `/product/${product.slug}?color=${color.id}`
    : `/product/${product.slug}`

  // No quick-add: the cart needs a specific size/color, so send shoppers to
  // the detail page where they can pick a variant.
  const handleQuickAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(linkTo)
  }

  return (
    <article className={cn('group relative flex flex-col', className)}>
      <Link
        to={linkTo}
        className="relative block overflow-hidden rounded-md bg-secondary"
        aria-label={title}
      >
        <img
          src={cover}
          alt={title}
          loading="lazy"
          className="aspect-product w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />

        {/* tag badge */}
        <div className="absolute left-3 top-3 flex flex-col gap-1">
          {product.tag ? (
            <Badge
              variant={
                product.tag === 'Sold Out'
                  ? 'secondary'
                  : product.tag === 'Low Stock'
                    ? 'warning'
                    : product.tag === 'New'
                      ? 'accent'
                      : 'default'
              }
            >
              {product.tag}
            </Badge>
          ) : null}
          {onSale && !soldOut ? (
            <Badge variant="destructive">-{discountPct}%</Badge>
          ) : null}
        </div>

        {/* Add to cart overlay */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
          <Button
            className="w-full"
            disabled={soldOut}
            onClick={handleQuickAdd}
          >
            {soldOut ? 'Sold Out' : 'View options'}
          </Button>
        </div>
      </Link>

      <div className="mt-3 flex flex-1 flex-col gap-1 px-0.5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {product.category.name}
        </p>
        <Link
          to={linkTo}
          className="line-clamp-2 text-sm font-medium hover:underline"
        >
          {title}
        </Link>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-sm font-semibold tabular">
            {formatEGP(product.price)}
          </span>
          {onSale ? (
            <span className="text-xs text-muted-foreground line-through tabular">
              {formatEGP(product.comparePrice)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}
