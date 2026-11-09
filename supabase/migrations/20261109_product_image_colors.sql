-- Which colour a product photo shows. Optional: untagged photos are general shots.
-- For single-colour products, the product page switches its gallery to the chosen colour's photos.
alter table public.product_images add column if not exists color_id text;

create index if not exists product_images_product_color_idx
  on public.product_images (product_id, color_id);
