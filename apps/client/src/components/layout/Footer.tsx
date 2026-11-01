import { Link } from 'react-router'
import { Facebook, Instagram, Mail, Twitter } from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useCategories } from '@/hooks/useCategories'

// Static groups. NOTE: these links are not wired to real pages yet.
const STATIC_GROUPS = [
  {
    title: 'Help',
    links: [
      { label: 'Shipping & Delivery', to: '/help/shipping' },
      { label: 'Returns & Exchanges', to: '/help/returns' },
      { label: 'Size Guide', to: '/help/sizes' },
      { label: 'Contact', to: '/help/contact' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Our Story', to: '/about' },
      { label: 'Stockists', to: '/stockists' },
      { label: 'Careers', to: '/careers' },
      { label: 'Admin dashboard (demo)', to: '/admin' },
    ],
  },
]

export function Footer() {
  const { data: categories = [] } = useCategories()

  // Shop links follow the real categories from the database.
  const shopGroup = {
    title: 'Shop',
    links: [
      { label: 'Shop all', to: '/shop' },
      ...categories.map((c) => ({
        label: c.name,
        to: `/shop?category=${c.slug}`,
      })),
      { label: 'New arrivals', to: '/shop?sort=newest' },
    ],
  }

  const linkGroups = [shopGroup, ...STATIC_GROUPS]

  return (
    <footer className="mt-24 border-t bg-background">
      <div className="container-page py-16">
        <div className="grid gap-12 md:grid-cols-[1.2fr_repeat(3,1fr)] lg:gap-16">
          {/* Brand + newsletter */}
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              Premium clothing for every day, delivered anywhere in Egypt. Pay
              by card or cash on delivery.
            </p>
            <form
              className="flex max-w-sm gap-2 pt-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <Input placeholder="Your email" type="email" required />
              <Button type="submit">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Subscribe</span>
              </Button>
            </form>
            <div className="flex gap-1 pt-2">
              <SocialIcon href="https://instagram.com" label="Instagram">
                <Instagram className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon href="https://facebook.com" label="Facebook">
                <Facebook className="h-4 w-4" />
              </SocialIcon>
              <SocialIcon href="https://twitter.com" label="Twitter">
                <Twitter className="h-4 w-4" />
              </SocialIcon>
            </div>
          </div>

          {/* Link groups */}
          {linkGroups.map((group) => (
            <div key={group.title}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em]">
                {group.title}
              </h4>
              <ul className="space-y-3 text-sm">
                {group.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col items-start gap-4 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} C-Store. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/legal/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link to="/legal/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link to="/legal/cookies" className="hover:text-foreground">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function SocialIcon({ href, children, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-full border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
    >
      {children}
    </a>
  )
}
