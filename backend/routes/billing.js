import { Router } from 'express';
import Stripe from 'stripe';
import { getDB } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const PRICE_BY_PLAN = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro:     process.env.STRIPE_PRICE_PRO,
};

const PLAN_AMOUNT = {
  starter:    { amount: 3000, currency: 'DOP' },
  pro:        { amount: 5500, currency: 'DOP' },
  enterprise: { amount: null, currency: 'DOP' },
};

// GET /api/billing/info — plan, billing status and next charge date for the current tenant
router.get('/info', authenticate, asyncHandler(async (req, res) => {
  const tenantId = req.user.tenant_id;
  if (!tenantId) return res.status(404).json({ error: 'Sin tenant asociado' });

  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM tenants WHERE id = ?', [tenantId]);
  const tenant = rows[0];
  if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' });

  let nextBillingDate = tenant.trial_ends_at;
  let amount   = PLAN_AMOUNT[tenant.plan]?.amount ?? null;
  const currency = PLAN_AMOUNT[tenant.plan]?.currency ?? 'DOP';

  if (stripe && tenant.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
      nextBillingDate = new Date(sub.current_period_end * 1000);
      const price = sub.items?.data?.[0]?.price;
      if (price?.unit_amount != null) amount = price.unit_amount / 100;
    } catch {
      // fall back to DB values if Stripe lookup fails
    }
  }

  res.json({
    plan:            tenant.plan,
    billing_status:  tenant.billing_status,
    billing_exempt:  !!tenant.billing_exempt,
    trial_ends_at:   tenant.trial_ends_at,
    next_billing_date: nextBillingDate,
    amount,
    currency,
    has_payment_method: !!tenant.stripe_subscription_id,
  });
}));

// POST /api/billing/create-checkout-session — start a Stripe subscription with trial for the current tenant
router.post('/create-checkout-session', authenticate, asyncHandler(async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe no está configurado en el servidor' });

  const tenantId = req.user.tenant_id;
  if (!tenantId) return res.status(404).json({ error: 'Sin tenant asociado' });

  const db = getDB();
  const [rows] = await db.execute('SELECT * FROM tenants WHERE id = ?', [tenantId]);
  const tenant = rows[0];
  if (!tenant) return res.status(404).json({ error: 'Tenant no encontrado' });

  if (tenant.billing_exempt) return res.status(400).json({ error: 'Esta empresa está exenta de facturación' });

  const priceId = PRICE_BY_PLAN[tenant.plan];
  if (!priceId) return res.status(400).json({ error: 'Este plan no requiere pago o no está configurado en Stripe' });

  let customerId = tenant.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user.email,
      name:  tenant.name,
      metadata: { tenant_id: tenantId },
    });
    customerId = customer.id;
    await db.execute('UPDATE tenants SET stripe_customer_id = ? WHERE id = ?', [customerId, tenantId]);
  }

  const trialDays = Number(process.env.STRIPE_TRIAL_DAYS || 14);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: trialDays,
      metadata: { tenant_id: tenantId },
    },
    success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.FRONTEND_URL}/billing/cancelled`,
    metadata: { tenant_id: tenantId },
  });

  res.json({ url: session.url });
}));

// POST /api/billing/webhook — Stripe sends subscription/payment lifecycle events here
router.post('/webhook', asyncHandler(async (req, res) => {
  if (!stripe) return res.status(503).end();

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook signature inválida: ${err.message}` });
  }

  const db = getDB();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const tenantId = session.metadata?.tenant_id;
      if (tenantId) {
        await db.execute(
          'UPDATE tenants SET stripe_subscription_id = ?, billing_status = ? WHERE id = ?',
          [session.subscription, 'trialing', tenantId]
        );
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const tenantId = sub.metadata?.tenant_id;
      if (tenantId) {
        await db.execute('UPDATE tenants SET billing_status = ? WHERE id = ?', [sub.status, tenantId]);
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      await db.execute(
        'UPDATE tenants SET billing_status = ? WHERE stripe_customer_id = ?',
        ['past_due', invoice.customer]
      );
      break;
    }
  }

  res.json({ received: true });
}));

export default router;
