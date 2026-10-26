import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Check, Clock, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/providers/AuthProvider'
import { usePaymentStatus } from '@/hooks/useOrders'

// Stop asking after this; the webhook can still settle the order later.
const MAX_WAIT_MS = 20_000

// Paymob sends the customer here (via /api/paymob/return) after paying.
// The page never trusts the URL: it asks the server until the webhook settles.
export default function PaymentResultPage() {
  const { id } = useParams()
  const { isAuthenticated } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), MAX_WAIT_MS)
    return () => clearTimeout(timer)
  }, [])

  const { data: order, isError } = usePaymentStatus(id, !timedOut)

  if (isError) {
    return (
      <Result
        icon={<X className="h-8 w-8" />}
        title="Order not found"
        text="We couldn't find this order. If your card was charged, please contact us."
      />
    )
  }

  if (order?.paymentStatus === 'PAID') {
    return (
      <Result
        icon={<Check className="h-8 w-8" />}
        title="Payment successful!"
        text={`Thank you! Order #${order.orderNumber} is confirmed.`}
      >
        {isAuthenticated ? (
          <Button asChild>
            <Link to={`/account/orders/${order.id}`}>View order</Link>
          </Button>
        ) : null}
      </Result>
    )
  }

  if (order?.status === 'CANCELLED') {
    return (
      <Result
        icon={<X className="h-8 w-8" />}
        title="Payment failed"
        text="Your card was not charged and the order was cancelled. Please add the items to your cart and try again."
      />
    )
  }

  if (timedOut) {
    return (
      <Result
        icon={<Clock className="h-8 w-8" />}
        title="Still confirming your payment"
        text="This is taking longer than usual. Refresh this page in a minute to see the result."
      />
    )
  }

  return (
    <Result
      icon={<Loader2 className="h-8 w-8 animate-spin" />}
      title="Confirming your payment…"
      text="This usually takes a few seconds. Please don't close this page."
    />
  )
}

function Result({
  icon,
  title,
  text,
  children,
}: {
  icon: ReactNode
  title: string
  text: string
  children?: ReactNode
}) {
  return (
    <div className="container-page max-w-2xl py-14 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent text-accent-foreground">
        {icon}
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-muted-foreground">{text}</p>
      <div className="mt-8 flex justify-center gap-3">
        {children}
        <Button asChild variant="outline">
          <Link to="/shop">Keep shopping</Link>
        </Button>
      </div>
    </div>
  )
}
