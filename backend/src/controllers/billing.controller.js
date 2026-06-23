import Stripe from 'stripe';
import { env } from '../config/env.js';
import { AppError, ForbiddenError, NotFoundError } from '../errors/AppError.js';
import { PLAN_LIMITS } from '../services/AuthService.js';

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

    let nextBillingDate    = tenant.trial_ends_at;
    let cancelAtPeriodEnd  = false;
    let amount   = PLAN_AMOUNT[tenant.plan]?.amount ?? null;
    const currency = PLAN_AMOUNT[tenant.plan]?.currency ?? 'DOP';

    if (stripe && tenant.stripe_subscription_id) {
      try {
        const sub   = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
        nextBillingDate   = new Date(sub.current_period_end * 1000);
        cancelAtPeriodEnd = sub.cancel_at_period_end ?? false;
        const price = sub.items?.data?.[0]?.price;
        if (price?.unit_amount != null) amount = price.unit_amount / 100;
      } catch { /* use DB fallback */ }
    }

    res.json({
      plan:               tenant.plan,
      billing_status:     tenant.billing_status,
      billing_exempt:     !!tenant.billing_exempt,
      trial_ends_at:      tenant.trial_ends_at,
      next_billing_date:  nextBillingDate,
      cancel_at_period_end: cancelAtPeriodEnd,
      amount, currency,
      has_payment_method: !!tenant.stripe_subscription_id,
    });
  },

  createCheckoutSession: async (req, res) => {
    if (!stripe) throw new AppError('Stripe no está configurado en el servidor', 503);
    const tenantId = req.user.tenant_id;
    if (!tenantId) throw new NotFoundError('Sin tenant asociado');

    const tenant = await tenantRepo.findByIdRaw(tenantId);
    if (!tenant) throw new NotFoundError('Tenant no encontrado');
    if (tenant.billing_exempt) throw new ForbiddenError('Esta empresa está exenta de facturación');

    // Use the plan the user explicitly chose, falling back to their current plan
    const chosenPlan = req.body?.plan || tenant.plan;
    const priceId = PRICE_BY_PLAN[chosenPlan];
    if (!priceId) throw new AppError('Este plan no requiere pago o no está configurado en Stripe', 422);

    let customerId = tenant.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: req.user.email, name: tenant.name, metadata: { tenant_id: tenantId } });
      customerId = customer.id;
      await tenantRepo.updateFields(tenantId, { stripe_customer_id: customerId });
    }

    // Only add trial when the tenant has never subscribed before
    const addTrial = !tenant.stripe_subscription_id && tenant.billing_status === 'trialing'
      && tenant.trial_ends_at && new Date(tenant.trial_ends_at) > new Date();

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        ...(addTrial && {
          subscription_data: { trial_period_days: env.stripe.trialDays, metadata: { tenant_id: tenantId } },
        }),
        ...(!addTrial && {
          subscription_data: { metadata: { tenant_id: tenantId } },
        }),
        success_url: `${env.frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${env.frontendUrl}/billing/cancelled`,
        metadata: { tenant_id: tenantId, plan: chosenPlan },
      });
    } catch (stripeErr) {
      const msg = stripeErr.raw?.message || stripeErr.message || 'Error al crear la sesión de pago';
      throw new AppError(msg, 402);
    }

    res.json({ url: session.url });
  },

  cancelSubscription: async (req, res) => {
    if (!stripe) throw new AppError('Stripe no está configurado en el servidor', 503);
    const tenantId = req.user.tenant_id;
    const tenant = await tenantRepo.findByIdRaw(tenantId);
    if (!tenant) throw new NotFoundError('Tenant no encontrado');
    if (!tenant.stripe_subscription_id) throw new AppError('No tienes una suscripción activa para cancelar', 400);

    let sub;
    try {
      sub = await stripe.subscriptions.update(tenant.stripe_subscription_id, { cancel_at_period_end: true });
    } catch (stripeErr) {
      const msg = stripeErr.raw?.message || stripeErr.message || 'Error al cancelar la suscripción';
      throw new AppError(msg, 402);
    }

    const activeUntil     = new Date(sub.current_period_end * 1000);
    const dataDeletedAfter = new Date(activeUntil.getTime() + 15 * 24 * 60 * 60 * 1000);
    res.json({ ok: true, active_until: activeUntil, data_deleted_after: dataDeletedAfter });
  },

  reactivateSubscription: async (req, res) => {
    if (!stripe) throw new AppError('Stripe no está configurado en el servidor', 503);
    const tenantId = req.user.tenant_id;
    const tenant = await tenantRepo.findByIdRaw(tenantId);
    if (!tenant) throw new NotFoundError('Tenant no encontrado');
    if (!tenant.stripe_subscription_id) throw new AppError('No tienes una suscripción para reactivar', 400);

    try {
      await stripe.subscriptions.update(tenant.stripe_subscription_id, { cancel_at_period_end: false });
    } catch (stripeErr) {
      const msg = stripeErr.raw?.message || stripeErr.message || 'Error al reactivar la suscripción';
      throw new AppError(msg, 402);
    }
    res.json({ ok: true });
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
        const tid  = session.metadata?.tenant_id;
        const plan = session.metadata?.plan;
        if (tid) {
          const fields = { stripe_subscription_id: session.subscription, billing_status: 'active' };
          if (plan && PLAN_LIMITS[plan]) {
            fields.plan             = plan;
            fields.max_records      = PLAN_LIMITS[plan].max_records;
            fields.max_users        = PLAN_LIMITS[plan].max_users;
            fields.max_sucursales   = PLAN_LIMITS[plan].max_sucursales;
          }
          await tenantRepo.updateFields(tid, fields);
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
        if (invoice?.customer) {
          await tenantRepo.rawExecute(
            'UPDATE tenants SET billing_status = ? WHERE stripe_customer_id = ?',
            ['past_due', invoice.customer]
          );
        }
        break;
      }
    }
    res.json({ received: true });
  },
});
