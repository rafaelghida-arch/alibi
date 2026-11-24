-- Bucket público para as ilustrações geradas por IA
insert into storage.buckets (id, name, public)
values ('case-images', 'case-images', true)
on conflict (id) do nothing;
