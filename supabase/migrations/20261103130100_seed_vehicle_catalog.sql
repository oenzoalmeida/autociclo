-- Catálogo inicial de referência: marcas, modelos e versões de veículos.
-- Só nomes, slugs e ordem de exibição. Sem IDs, datas ou dados de usuários:
-- os IDs são gerados na hora do INSERT.
--
-- Semântica (ON CONFLICT DO NOTHING):
-- * Linha cuja chave única já existe (marca: name; modelo: marca+name;
--   versão: modelo+name) é mantida como está. Ajustes locais de slug ou
--   ordem NÃO são sobrescritos.
-- * Linha ausente é criada. Isso NÃO prova que o catálogo existente seja
--   equivalente a este: nomes diferentes ficam lado a lado e linhas extras
--   não são removidas. Para conferir um banco real, compare por consulta.
-- A estrutura vem de 20261103130000_codify_vehicle_catalog_and_checks.sql.

insert into public.vehicle_brands (name, slug, sort_order) values
  ('Chevrolet', 'chevrolet', 10),
  ('Volkswagen', 'volkswagen', 20),
  ('Fiat', 'fiat', 30),
  ('Toyota', 'toyota', 40),
  ('Honda', 'honda', 50),
  ('Hyundai', 'hyundai', 60),
  ('Renault', 'renault', 70),
  ('Nissan', 'nissan', 80),
  ('Jeep', 'jeep', 90),
  ('Ford', 'ford', 100),
  ('Peugeot', 'peugeot', 110),
  ('Citroën', 'citroen', 120),
  ('BMW', 'bmw', 130),
  ('Mercedes-Benz', 'mercedes-benz', 140),
  ('Audi', 'audi', 150),
  ('Volvo', 'volvo', 160),
  ('Mitsubishi', 'mitsubishi', 170),
  ('Kia', 'kia', 180),
  ('Caoa Chery', 'caoa-chery', 190),
  ('BYD', 'byd', 200),
  ('GWM', 'gwm', 210),
  ('RAM', 'ram', 220)
on conflict (name) do nothing;

insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, v.model, v.so from (values
  ('Chevrolet', 'Onix', 10),
  ('Chevrolet', 'Onix Plus', 20),
  ('Chevrolet', 'Tracker', 30),
  ('Chevrolet', 'S10', 40),
  ('Chevrolet', 'Montana', 50),
  ('Volkswagen', 'Polo', 10),
  ('Volkswagen', 'Virtus', 20),
  ('Volkswagen', 'T-Cross', 30),
  ('Volkswagen', 'Nivus', 40),
  ('Volkswagen', 'Taos', 50),
  ('Toyota', 'Corolla', 10),
  ('Toyota', 'Yaris', 20),
  ('Toyota', 'Corolla Cross', 30),
  ('Toyota', 'Hilux', 40),
  ('Toyota', 'SW4', 50)
) as v(brand, model, so) join public.vehicle_brands b on b.name = v.brand
on conflict (brand_id, name) do nothing;

insert into public.vehicle_versions (model_id, name, sort_order)
select m.id, v.version, v.so from (values
  ('Toyota', 'Corolla', 'GLi', 10),
  ('Toyota', 'Corolla', 'XEi', 20),
  ('Toyota', 'Corolla', 'Altis', 30),
  ('Toyota', 'Corolla', 'GR-S', 40)
) as v(brand, model, version, so)
join public.vehicle_brands b on b.name = v.brand
join public.vehicle_models m on m.brand_id = b.id and m.name = v.model
on conflict (model_id, name) do nothing;
