ALTER TABLE public.app_settings
  ADD COLUMN company_profile text NOT NULL DEFAULT '',
  ADD COLUMN delivery_information text NOT NULL DEFAULT '',
  ADD COLUMN returns_refunds_policy text NOT NULL DEFAULT '',
  ADD COLUMN privacy_policy text NOT NULL DEFAULT '',
  ADD COLUMN terms_conditions text NOT NULL DEFAULT '',
  ADD COLUMN facebook_url text NOT NULL DEFAULT '',
  ADD COLUMN telegram_url text NOT NULL DEFAULT '';