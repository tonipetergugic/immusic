-- Add mid/side and stereo width columns to track_ai_private_metrics
alter table public.track_ai_private_metrics
add column if not exists mid_rms_dbfs double precision,
add column if not exists side_rms_dbfs double precision,
add column if not exists mid_side_energy_ratio double precision,
add column if not exists stereo_width_index double precision;
