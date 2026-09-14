-- ============================================================
-- FNP-42: consent storage on user_profile
-- Run in the Supabase SQL Editor BEFORE deploying a backend that
-- includes FNP-42. Production uses ddl-auto: none, so Hibernate will
-- not add these columns and queries on user_profile fail without them.
--
-- Safe to re-run. Existing rows stay NULL on purpose: those users have
-- never seen the notices, so they are asked on their next login.
-- ============================================================

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS privacy_notice_version varchar(20),
  ADD COLUMN IF NOT EXISTS privacy_accepted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS ai_consent_version     varchar(20),
  ADD COLUMN IF NOT EXISTS ai_consent_at          timestamptz;

-- Verify: should return four rows.
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profile'
  AND column_name IN ('privacy_notice_version', 'privacy_accepted_at', 'ai_consent_version', 'ai_consent_at')
ORDER BY column_name;
