-- Account deletion (App Store / Play requirement) cascades from auth.users to all
-- client data. Owner decision 2026-11-22: keep payment records for the business
-- reports, with the link to the deleted person removed.
alter table public.client_payments alter column client_id drop not null;
alter table public.client_payments drop constraint client_payments_client_id_fkey;
alter table public.client_payments
  add constraint client_payments_client_id_fkey
  foreign key (client_id) references public.users(id) on delete set null;
