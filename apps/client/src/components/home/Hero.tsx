import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="container-page grid gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24 lg:py-28">
        {/* Copy */}
        <div className="flex flex-col justify-center">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-foreground/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            New Collection · 2026
          </span>

          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Quality you
            <br />
            <span className="relative inline-block">
              can feel.
              <span className="absolute -bottom-1 left-0 h-1 w-full rounded-full bg-accent" />
            </span>
          </h1>

          <p className="mt-6 max-w-md text-base text-muted-foreground sm:text-lg">
            Carefully made clothing, delivered to your door anywhere in Egypt.
            Pay by card or cash on delivery.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="xl">
              <Link to="/shop">
                Shop Collection <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Trust — true promises only */}
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>Ships across Egypt</span>
            <span>Cash on delivery</span>
            <span>Pay by card</span>
          </div>
        </div>

        {/* Image — fixed brand asset */}
        <div className="relative">
          <Link
            to="/shop"
            className="block overflow-hidden rounded-lg bg-secondary"
          >
            <img
              src="/HERO.webp"
              alt="Black overshirt with off-white tailored trousers"
              fetchPriority="high"
              className="aspect-4/5 w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </Link>
        </div>
      </div>
    </section>
  )
}
