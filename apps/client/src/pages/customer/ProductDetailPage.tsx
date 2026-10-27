import { useParams, useSearchParams, Link } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Minus,
  Plus,
  ShoppingBag,
  Loader2,
  Package,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductGallery } from '@/components/product/ProductGallery'
import { SizePicker } from '@/components/product/SizePicker'
import { ColorPicker } from '@/components/product/ColorPicker'
import { ProductGrid } from '@/components/product/ProductGrid'
import { Reviews } from '@/components/product/Reviews'
import { StarRating } from '@/components/product/StarRating'
import { SectionHeader } from '@/components/common/SectionHeader'
import { useProduct, useProducts } from '@/hooks/useProducts'
import { formatEGP } from '@/lib/utils'
import { useAddToCart } from '@/hooks/useCart'
import { useNeedsVerification } from '@/hooks/useVerification'
import { VerifyEmailNotice } from '@/components/auth/VerifyEmailNotice'
import { ErrorView } from '@/components/common/ErrorView'

function avgRating(reviews = []) {
  if (reviews.length === 0) return 0
  return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
}

function totalStock(color) {
  return (color?.sizes ?? []).reduce((sum, s) => sum + (s.stock ?? 0), 0)
}

export default function ProductDetailPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const colorParam = searchParams.get('color')
  const addToCart = useAddToCart()
  const needsVerification = useNeedsVerification()
  const [quantity, setQuantity] = useState(1)
  const [selectedColorId, setSelectedColorId] = useState(null)
  const [selectedSizeId, setSelectedSizeId] = useState(null)
  const {
    data: product,
    isLoading,
    isError,
    error,
    refetch,
  } = useProduct(slug)

  // Default to the first color on first load / when product changes.
  // Prefer a color passed in the URL (?color=<id>) when it belongs to this product
  // — that's how a color card on Shop All opens straight to its variant.
  useEffect(() => {
    if (product?.colors?.length) {
      setSelectedColorId((prev) => {
        if (prev && product.colors.some((c) => c.id === prev)) return prev
        const fromUrl =
          colorParam && product.colors.find((c) => c.id === colorParam)
        return fromUrl ? fromUrl.id : product.colors[0].id
      })
    }
  }, [product, colorParam])

  // Reset size + quantity whenever color changes
  useEffect(() => {
    setSelectedSizeId(null)
    setQuantity(1)
  }, [selectedColorId])

  const { data: relatedData } = useProducts(
    product ? { category: product.category.slug, limit: 5 } : {}
  )
  const related = (relatedData?.products ?? [])
    .filter((p) => p.id !== product?.id)
    .slice(0, 4)

  const selectedColor = useMemo(
    () =>
      product?.colors?.find((c) => c.id === selectedColorId) ??
      product?.colors?.[0] ??
      null,
    [product, selectedColorId]
  )

  const selectedSize = useMemo(
    () => selectedColor?.sizes?.find((s) => s.id === selectedSizeId) ?? null,
    [selectedColor, selectedSizeId]
  )

  // Gallery = selected color cover + its extra images, de-duplicated.
  // Falls back to the product cover only if the color has no imagery at all.
  const galleryImages = useMemo(() => {
    const list = [
      selectedColor?.imageUrl,
      ...(selectedColor?.images ?? []),
    ].filter(Boolean)
    const unique = Array.from(new Set(list))
    if (unique.length) return unique
    return product?.imageUrl ? [product.imageUrl] : []
  }, [selectedColor, product?.imageUrl])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError || !product) {
    return (
      <ErrorView
        error={error}
        onRetry={() => refetch()}
        homeHref="/shop"
        homeLabel="Back to shop"
        fallback={{
          title: 'Product not found',
          body: 'This product may have been removed or does not exist.',
          cta: 'home',
        }}
      />
    )
  }

  const rating = avgRating(product.reviews)
  const reviewCount = product._count?.reviews ?? product.reviews?.length ?? 0

  const onSale =
    product.comparePrice && Number(product.comparePrice) > Number(product.price)

  const colorStock = totalStock(selectedColor)
  const productStock = (product.colors ?? []).reduce(
    (sum, c) => sum + totalStock(c),
    0
  )
  const soldOut = productStock === 0
  const colorSoldOut = colorStock === 0

  const maxQty = selectedSize?.stock ?? colorStock
  const dec = () => setQuantity((q) => Math.max(1, q - 1))
  const inc = () => setQuantity((q) => Math.min(maxQty || 1, q + 1))

  const canAddToCart =
    !soldOut && !colorSoldOut && Boolean(selectedSize) && selectedSize.stock > 0

  const handleAddToCart = () => {
    if (!selectedSize || needsVerification) return
    addToCart.mutate({
      productSizeId: selectedSize.id,
      quantity,
      stock: selectedSize.stock,
    })
  }

  const tag = soldOut
    ? 'Sold Out'
    : productStock < 10
      ? 'Low Stock'
      : null

  return (
    <>
      <div className="container-page py-8">
        {/* Breadcrumb */}
        <nav className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link to="/shop" className="hover:text-foreground">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <Link
            to={`/shop?category=${product.category.slug}`}
            className="hover:text-foreground"
          >
            {product.category.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        {/* Main grid */}
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          {/* Gallery — keyed by color so internal state resets on color change */}
          <ProductGallery
            key={selectedColor?.id ?? 'cover'}
            images={galleryImages}
            alt={`${product.name}${selectedColor ? ` — ${selectedColor.name}` : ''}`}
          />

          {/* Info */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {product.category.name}
                </span>
                {tag ? <Badge variant="outline">{tag}</Badge> : null}
                {product.sku ? (
                  <span className="text-xs text-muted-foreground">
                    SKU: {product.sku}
                  </span>
                ) : null}
              </div>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                {product.name}
                {selectedColor ? ` ${selectedColor.name.toUpperCase()}` : ''}
              </h1>
              {reviewCount > 0 && (
                <div className="flex items-center gap-3">
                  <StarRating value={rating} size={14} />
                  <span className="text-sm text-muted-foreground">
                    {rating.toFixed(1)} · {reviewCount} review
                    {reviewCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold tabular">
                {formatEGP(product.price)}
              </span>
              {onSale ? (
                <span className="text-muted-foreground line-through tabular">
                  {formatEGP(product.comparePrice)}
                </span>
              ) : null}
              {onSale ? (
                <Badge variant="destructive">
                  Save{' '}
                  {formatEGP(
                    Number(product.comparePrice) - Number(product.price)
                  )}
                </Badge>
              ) : null}
            </div>

            {product.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            <Separator />

            {/* Color */}
            {product.colors?.length > 0 && (
              <ColorPicker
                colors={product.colors}
                value={selectedColor?.id}
                onChange={setSelectedColorId}
              />
            )}

            {/* Size */}
            {selectedColor?.sizes?.length > 0 ? (
              <SizePicker
                sizes={selectedColor.sizes}
                value={selectedSizeId}
                onChange={setSelectedSizeId}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                No sizes available for this color.
              </p>
            )}

            {/* Quantity + Add to cart */}
            <div className="flex items-stretch gap-3">
              <div className="inline-flex items-center rounded-md border">
                <button
                  type="button"
                  className="grid h-12 w-10 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label="Decrease quantity"
                  onClick={dec}
                  disabled={quantity <= 1 || !canAddToCart}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[3ch] px-2 text-center text-sm tabular">
                  {quantity}
                </span>
                <button
                  type="button"
                  className="grid h-12 w-10 place-items-center text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label="Increase quantity"
                  onClick={inc}
                  disabled={!canAddToCart || quantity >= maxQty}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                size="xl"
                className="flex-1"
                disabled={
                  !canAddToCart || addToCart.isPending || needsVerification
                }
                onClick={handleAddToCart}
              >
                {addToCart.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ShoppingBag className="h-4 w-4" />
                    {soldOut
                      ? 'Sold Out'
                      : colorSoldOut
                        ? 'Color unavailable'
                        : !selectedSize
                          ? 'Select a size'
                          : 'Add to Cart'}
                  </>
                )}
              </Button>
            </div>

            {needsVerification ? (
              <VerifyEmailNotice message="Please verify your email to add items to your cart." />
            ) : null}

            {/* Stock indicator for currently selected variant */}
            {selectedSize && selectedSize.stock > 0 && selectedSize.stock < 10 ? (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Only {selectedSize.stock} left in {selectedColor.name} / {selectedSize.size}
              </p>
            ) : null}

            {/* Variant availability matrix */}
            {product.colors?.length > 0 && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
                  <Package className="h-3.5 w-3.5" />
                  Availability
                </div>
                <ul className="mt-3 space-y-2 text-sm">
                  {product.colors.map((c) => {
                    const stock = totalStock(c)
                    return (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-4 w-4 rounded-full border"
                            style={{ backgroundColor: c.hex || '#ddd' }}
                            aria-hidden
                          />
                          <span className="font-medium">{c.name}</span>
                        </span>
                        <span className="flex flex-wrap justify-end gap-1">
                          {(c.sizes ?? []).length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          ) : (
                            c.sizes.map((s) => (
                              <span
                                key={s.id}
                                title={
                                  s.stock === 0
                                    ? 'Out of stock'
                                    : `${s.stock} in stock`
                                }
                                className={
                                  s.stock === 0
                                    ? 'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground line-through'
                                    : s.stock < 5
                                      ? 'rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800'
                                      : 'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase'
                                }
                              >
                                {s.size}
                                {s.stock > 0 && s.stock < 5 ? ` · ${s.stock}` : ''}
                              </span>
                            ))
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Total stock: {productStock} across {product.colors.length}{' '}
                  color{product.colors.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Perks */}
            <ul className="space-y-2 rounded-lg border p-4 text-sm">
              <Perk
                icon={Truck}
                title="Free Cairo & Giza shipping"
                desc="On orders over 2,000 EGP"
              />
              <Perk
                icon={RotateCcw}
                title="14-day returns"
                desc="No questions asked"
              />
              <Perk
                icon={ShieldCheck}
                title="Secure checkout"
                desc="Paymob encrypted payments or COD"
              />
            </ul>
          </div>
        </div>

        {/* Details tabs */}
        <div className="mt-20">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="sizing">Sizing</TabsTrigger>
              <TabsTrigger value="shipping">Shipping</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviewCount})</TabsTrigger>
            </TabsList>
            <TabsContent
              value="details"
              className="mt-6 max-w-3xl text-sm leading-relaxed text-muted-foreground"
            >
              <ul className="space-y-2">
                <li>• 100% heavyweight combed cotton (280 gsm)</li>
                <li>• Pre-washed for minimal shrinkage</li>
                <li>• Ribbed collar with reinforced stitching</li>
                <li>• Boxy street fit — true to size</li>
                <li>• Cut and sewn in Cairo, Egypt</li>
              </ul>
            </TabsContent>
            <TabsContent
              value="sizing"
              className="mt-6 max-w-3xl text-sm text-muted-foreground"
            >
              Model is 183cm / 78kg and wears size M. For a relaxed fit, size
              up.
            </TabsContent>
            <TabsContent
              value="shipping"
              className="mt-6 max-w-3xl text-sm text-muted-foreground"
            >
              Ships within 1–2 business days. Cairo & Giza arrive in 2–3 days;
              other governorates 3–6 days. Cash on delivery available
              everywhere.
            </TabsContent>
            <TabsContent value="reviews" className="mt-8">
              <Reviews
                reviews={product.reviews ?? []}
                rating={rating}
                total={reviewCount}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-20">
            <SectionHeader
              eyebrow="You might also like"
              title="More in this drop"
              linkLabel="See all"
              linkTo={`/shop?category=${product.category.slug}`}
            />
            <ProductGrid products={related} className="mt-10" />
          </section>
        )}
      </div>
    </>
  )
}

function Perk({ icon: Icon, title, desc }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </li>
  )
}
