import dotenv from 'dotenv';
dotenv.config();

const REQUIRED = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[config] Variable de entorno faltante: ${key}`);
    process.exit(1);
  }
}

export const env = {
  port:            Number(process.env.PORT) || 3001,
  frontendUrl:     process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl:      process.env.BACKEND_URL  || `http://localhost:${process.env.PORT || 3001}`,
  jwtSecret:       process.env.JWT_SECRET,
  jwtExpiry:       process.env.JWT_EXPIRY || '7d',
  db: {
    host:          process.env.DB_HOST,
    port:          Number(process.env.DB_PORT) || 3306,
    user:          process.env.DB_USER,
    password:      process.env.DB_PASSWORD,
    name:          process.env.DB_NAME,
  },
  openrouter: {
    apiKey:        process.env.OPENROUTER_API_KEY || '',
    model:         process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  },
  gemini: {
    apiKey:        process.env.GEMINI_API_KEY || '',
    model:         process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite',
  },
  stripe: {
    secretKey:     process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    priceStarter:  process.env.STRIPE_PRICE_STARTER || '',
    pricePro:      process.env.STRIPE_PRICE_PRO || '',
    trialDays:     Number(process.env.STRIPE_TRIAL_DAYS) || 14,
  },
};
