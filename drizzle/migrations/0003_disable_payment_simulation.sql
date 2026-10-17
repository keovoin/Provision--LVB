REVOKE ALL ON FUNCTION public.simulate_khqr_payment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.simulate_khqr_payment(uuid) TO service_role;
COMMENT ON FUNCTION public.simulate_khqr_payment(uuid) IS 'DEPRECATED: production payments use verified provider callbacks and status checks.';