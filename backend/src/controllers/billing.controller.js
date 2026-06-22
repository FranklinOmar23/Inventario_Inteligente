import Stripe from 'stripe';
import { env } from '../config/env.js';
import { ForbiddenError, NotFoundError } from '../errors/AppError.js';

const stripe = env.stripe.secretKey ? new Stripe(env.stripe.secretKey) : null;

const PRICE_BY_PLAN = { starter: env.stripe.priceStarter, pro: env.stripe.pricePro };
const PLAN_AMOUNT   = {
  starter:    { amount: 3000, currency: 'DOP' },
  pro:        { amount: 5500, currency: 'DOP' },
  enterprise: { amount: null, currency: 'DOP' },
};

export const billingController = (tenantRepo) => ({
  info: async (req, res) => {
    const tenantId = req.user.tenant_id;
    if (!tenantId) throw new NotFoundError('Sin tenant asociado');

    const tenant = await tenantRepo.findByIdRaw(tenantId);
    if (!tenant) throw new NotFoundError('Tenant no encontrado');

    let nextBillingDate = tenant.trial_ends_at;
    let amount   = PLAN_AMOUNT[tenant.plan]?.amount ?? null;
    const currency = PLAN_AMOUNT[tenant.plan]?.currency ?? 'DOP';

    if (stripe && tenant.stripe_subscription_id) {
      try {
        const sub   = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
        nextBillingDate = new Date(sub.current_period_end * 1000);
        const price = sub.items?.data?.[0]?.price;
        if (price?.unit_amount != null) amount = price.unit_amount / 100;
      } catch { /* use DB fallback */ }
    }

    res.json({
      plan:             tenant.plan,
      billing_status:   tenant.billing_status,
      billing_exempt:   !!tenant.billing_exempt,
      trial_ends_at:    tenant.trial_ends_at,
      next_billing_date: nextBillingDate,
      amount, currency,
      has_payment_method: !!tenant.stripe_subscription_id,
    });
  },

  createCheckoutSession: async (req, res) => {
    if (!stripe) throw new Error('Stripe no está configurado en el servidor');
    const tenantId = req.user.tenant_id;
    if (!tenantId) throw new NotFoundError('Sin tenant asociado');

    const tenant = await tenantRepo.findByIdRaw(tenantId);
    if (!tenant) throw new NotFoundError('Tenant no encontrado');
    if (tenant.billing_exempt) throw new ForbiddenError('Esta empresa está exenta de facturación');

    const priceId = PRICE_BY_PLAN[tenant.plan];
    if (!priceId) throw new Error('Este plan no requiere pago o no está configurado en Stripe');

    let customerId = tenant.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: req.user.email, name: tenant.name, metadata: { tenant_id: tenantId } });
      customerId = customer.id;
      await tenantRepo.updateFields(tenantId, { stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: env.stripe.trialDays, metadata: { tenant_id: tenantId } },
      success_url: `${env.frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${env.frontendUrl}/billing/cancelled`,
      metadata: { tenant_id: tenantId },
    });

    res.json({ url: session.url });
  },

  webhook: async (req, res) => {
    if (!stripe) return res.status(503).end();
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], env.stripe.webhookSecret);
    } catch (err) {
      return res.status(400).json({ error: `Webhook signature inválida: ${err.message}` });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.metadata?.tenant_id) {
          await tenantRepo.updateFields(session.metadata.tenant_id, { stripe_subscription_id: session.subscription, billing_status: 'trialing' });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        if (sub.metadata?.tenant_id) {
          await tenantRepo.updateFields(sub.metadata.tenant_id, { billing_status: sub.status });
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await tenantRepo.rawExecute('UPDATE tenants SET billing_status = ? WHERE stripe_customer_id = ?', ['past_due', invoice.customer]);
        break;
      }
    }
    res.json({ received: true });
  },
});
