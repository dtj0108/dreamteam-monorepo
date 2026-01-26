-- Migration: Seed Stripe IDs for existing plans

-- Workspace plans
UPDATE plans SET
  stripe_price_id = 'price_1SosVyRrvDhLsywajOp8zWXe'
WHERE slug = 'monthly';

UPDATE plans SET
  stripe_price_id = NULL  -- No annual price configured yet
WHERE slug = 'annual';

-- Agent tiers
UPDATE plans SET
  stripe_price_id = 'price_1SosYFRrvDhLsywapHvC7iU0'
WHERE slug = 'startup';

UPDATE plans SET
  stripe_price_id = 'price_1SosYZRrvDhLsywaGPqxU9ke'
WHERE slug = 'teams';

UPDATE plans SET
  stripe_price_id = 'price_1SosYyRrvDhLsywaMNS7ZgB0'
WHERE slug = 'enterprise';
