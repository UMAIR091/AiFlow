import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })

// Service role client — bypasses RLS so we can update any user's subscription
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const getMetadata = (obj: { metadata?: Record<string, string> }) => obj.metadata ?? {}

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession
      const userId = getMetadata(session).user_id
      const plan = getMetadata(session).plan
      if (userId && plan) {
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          plan,
          status: 'active',
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = getMetadata(sub).user_id
      if (userId) {
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          plan: getMetadata(sub).plan || 'pro',
          status: sub.status === 'active' ? 'active' : 'inactive',
          stripe_subscription_id: sub.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const userId = getMetadata(sub).user_id
      if (userId) {
        await supabase.from('subscriptions')
          .update({ status: 'inactive', plan: 'free', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
