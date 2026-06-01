-- Migration: add apns_env to device_tokens
-- Run in Supabase SQL editor.
--
-- 'sandbox'    = development/debug builds (expo run:ios, dev EAS builds)
--               requires api.sandbox.push.apple.com
-- 'production' = release builds (preview/production EAS builds, TestFlight, App Store)
--               requires api.push.apple.com
--
-- Existing tokens are assumed production (most likely registered from a release build).

ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS apns_env text NOT NULL DEFAULT 'production';
