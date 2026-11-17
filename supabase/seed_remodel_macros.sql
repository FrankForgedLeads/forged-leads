-- ============================================================================
-- Beeyond Vault — seed_remodel_macros.sql
--
-- Starter macros for the Remodel Estimator — our own one-click line-item
-- bundles (see migration.sql for why these exist and how quantity_mode
-- works). Run supabase/migration.sql first (adds the remodel_macros/
-- remodel_macro_items tables), and run supabase/seed_remodel_items.sql
-- before this — every item referenced below must already exist in
-- remodel_items or its join will silently add zero rows for that macro.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Bathroom Remodel (Full)
-- ----------------------------------------------------------------------------
with m as (
  insert into public.remodel_macros (name, description, sort_order)
  values ('Bathroom Remodel (Full)', 'Full bathroom gut: vanity, toilet, tub, tile, fixtures, and paint.', 1)
  returning id
)
insert into public.remodel_macro_items (macro_id, remodel_item_id, quantity_mode, fixed_quantity, sort_order)
select m.id, ri.id, v.quantity_mode, v.fixed_quantity, v.sort_order
from m, (values
  ('cabinetry_countertops', 'Vanity installation, incl. sink', 'fixed', 1.00, 1),
  ('plumbing_fixtures', 'Toilet installation/replacement', 'fixed', 1.00, 2),
  ('plumbing_fixtures', 'Tub replacement, standard alcove', 'fixed', 1.00, 3),
  ('tile_stone', 'Bathroom floor tile, installed', 'floor_sf', 50.00, 4),
  ('tile_stone', 'Shower wall tile (surround), installed', 'fixed', 40.00, 5),
  ('electrical', 'Exhaust fan installation', 'fixed', 1.00, 6),
  ('hardware_accessories', 'Mirror installation', 'fixed', 1.00, 7),
  ('hardware_accessories', 'Towel bar or towel ring installation', 'fixed', 1.00, 8),
  ('hardware_accessories', 'Toilet paper holder installation', 'fixed', 1.00, 9),
  ('paint', 'Paint walls, 2 coats', 'wall_sf', 280.00, 10),
  ('paint', 'Paint ceiling, 2 coats', 'ceiling_sf', 50.00, 11),
  ('paint', 'Paint baseboard only, 2 coats (standalone baseboard painting, not bundled into a per-door price)', 'perimeter_lf', 28.00, 12)
) as v(category, description, quantity_mode, fixed_quantity, sort_order)
join public.remodel_items ri on ri.category = v.category and ri.description = v.description;

-- ----------------------------------------------------------------------------
-- Kitchen Remodel (Full)
-- ----------------------------------------------------------------------------
with m as (
  insert into public.remodel_macros (name, description, sort_order)
  values ('Kitchen Remodel (Full)', 'Full kitchen gut: cabinets, countertop, backsplash, appliance hookups, flooring, and paint.', 2)
  returning id
)
insert into public.remodel_macro_items (macro_id, remodel_item_id, quantity_mode, fixed_quantity, sort_order)
select m.id, ri.id, v.quantity_mode, v.fixed_quantity, v.sort_order
from m, (values
  ('cabinetry_countertops', 'Base cabinets, installed', 'fixed', 15.00, 1),
  ('cabinetry_countertops', 'Upper/wall cabinet installation', 'fixed', 12.00, 2),
  ('cabinetry_countertops', 'Countertop, quartz, installed', 'fixed', 35.00, 3),
  ('tile_stone', 'Tile backsplash, installed', 'fixed', 30.00, 4),
  ('appliances_fixtures', 'Dishwasher installation, labor only', 'fixed', 1.00, 5),
  ('appliances_fixtures', 'Range/cooktop installation, labor only', 'fixed', 1.00, 6),
  ('appliances_fixtures', 'Range hood/vent installation', 'fixed', 1.00, 7),
  ('plumbing_fixtures', 'Sink installation, labor only', 'fixed', 1.00, 8),
  ('plumbing_fixtures', 'Faucet installation, labor only', 'fixed', 1.00, 9),
  ('paint', 'Paint walls, 2 coats', 'wall_sf', 320.00, 10),
  ('paint', 'Paint ceiling, 2 coats', 'ceiling_sf', 150.00, 11),
  ('flooring', 'Flooring, luxury vinyl plank', 'floor_sf', 150.00, 12)
) as v(category, description, quantity_mode, fixed_quantity, sort_order)
join public.remodel_items ri on ri.category = v.category and ri.description = v.description;

-- ----------------------------------------------------------------------------
-- Standard Room Paint Refresh
-- ----------------------------------------------------------------------------
with m as (
  insert into public.remodel_macros (name, description, sort_order)
  values ('Standard Room Paint Refresh', 'Walls, ceiling, and baseboard — the three line items almost every room''s paint job needs.', 3)
  returning id
)
insert into public.remodel_macro_items (macro_id, remodel_item_id, quantity_mode, fixed_quantity, sort_order)
select m.id, ri.id, v.quantity_mode, v.fixed_quantity, v.sort_order
from m, (values
  ('paint', 'Paint walls, 2 coats', 'wall_sf', 280.00, 1),
  ('paint', 'Paint ceiling, 2 coats', 'ceiling_sf', 120.00, 2),
  ('paint', 'Paint baseboard only, 2 coats (standalone baseboard painting, not bundled into a per-door price)', 'perimeter_lf', 44.00, 3)
) as v(category, description, quantity_mode, fixed_quantity, sort_order)
join public.remodel_items ri on ri.category = v.category and ri.description = v.description;

-- ----------------------------------------------------------------------------
-- Bedroom Refresh
-- ----------------------------------------------------------------------------
with m as (
  insert into public.remodel_macros (name, description, sort_order)
  values ('Bedroom Refresh', 'Paint, carpet, and closet shelving — a standard bedroom turnover.', 4)
  returning id
)
insert into public.remodel_macro_items (macro_id, remodel_item_id, quantity_mode, fixed_quantity, sort_order)
select m.id, ri.id, v.quantity_mode, v.fixed_quantity, v.sort_order
from m, (values
  ('paint', 'Paint walls, 2 coats', 'wall_sf', 280.00, 1),
  ('paint', 'Paint ceiling, 2 coats', 'ceiling_sf', 120.00, 2),
  ('paint', 'Paint baseboard only, 2 coats (standalone baseboard painting, not bundled into a per-door price)', 'perimeter_lf', 44.00, 3),
  ('flooring', 'Flooring, carpet', 'floor_sf', 120.00, 4),
  ('closets_storage', 'Closet wire/basic shelving installation', 'fixed', 6.00, 5)
) as v(category, description, quantity_mode, fixed_quantity, sort_order)
join public.remodel_items ri on ri.category = v.category and ri.description = v.description;

-- ----------------------------------------------------------------------------
-- Hurricane Roof Replacement
-- ----------------------------------------------------------------------------
with m as (
  insert into public.remodel_macros (name, description, sort_order)
  values ('Hurricane Roof Replacement', 'Full roof tear-off and architectural shingle replacement with standard components.', 5)
  returning id
)
insert into public.remodel_macro_items (macro_id, remodel_item_id, quantity_mode, fixed_quantity, sort_order)
select m.id, ri.id, v.quantity_mode, v.fixed_quantity, v.sort_order
from m, (values
  ('roofing', 'Tear-off and disposal of existing roof', 'fixed', 20.00, 1),
  ('roofing', 'Shingle roof replacement, architectural/dimensional', 'fixed', 20.00, 2),
  ('roofing', 'Synthetic underlayment', 'fixed', 20.00, 3),
  ('roofing', 'Drip edge installation', 'fixed', 150.00, 4),
  ('roofing', 'Ridge vent installation', 'fixed', 1.00, 5),
  ('roofing', 'Starter course shingle installation (first row of shingles along the roof eave, priced as a distinct roofing step)', 'fixed', 150.00, 6),
  ('roofing', 'Roofing permit', 'fixed', 1.00, 7)
) as v(category, description, quantity_mode, fixed_quantity, sort_order)
join public.remodel_items ri on ri.category = v.category and ri.description = v.description;

-- ----------------------------------------------------------------------------
-- Water Damage Dry-Out
-- ----------------------------------------------------------------------------
with m as (
  insert into public.remodel_macros (name, description, sort_order)
  values ('Water Damage Dry-Out', 'Emergency extraction and drying equipment for a standard water-loss room.', 6)
  returning id
)
insert into public.remodel_macro_items (macro_id, remodel_item_id, quantity_mode, fixed_quantity, sort_order)
select m.id, ri.id, v.quantity_mode, v.fixed_quantity, v.sort_order
from m, (values
  ('water_mitigation', 'Emergency water extraction from floors/affected areas', 'floor_sf', 120.00, 1),
  ('water_mitigation', 'Air mover rental (per day)', 'fixed', 3.00, 2),
  ('water_mitigation', 'Dehumidifier rental (per day)', 'fixed', 3.00, 3),
  ('water_mitigation', 'Containment barrier / plastic sheeting setup', 'fixed', 1.00, 4),
  ('water_mitigation', 'Wet drywall removal and disposal', 'wall_sf', 280.00, 5),
  ('water_mitigation', 'Wet insulation removal and disposal', 'fixed', 100.00, 6),
  ('water_mitigation', 'Moisture mapping / psychrometric monitoring, per visit', 'fixed', 3.00, 7)
) as v(category, description, quantity_mode, fixed_quantity, sort_order)
join public.remodel_items ri on ri.category = v.category and ri.description = v.description;

-- ----------------------------------------------------------------------------
-- Fire & Smoke Restoration (per room)
-- ----------------------------------------------------------------------------
with m as (
  insert into public.remodel_macros (name, description, sort_order)
  values ('Fire & Smoke Restoration (per room)', 'Clean-only restoration pass for a room with smoke/soot damage, before repainting.', 7)
  returning id
)
insert into public.remodel_macro_items (macro_id, remodel_item_id, quantity_mode, fixed_quantity, sort_order)
select m.id, ri.id, v.quantity_mode, v.fixed_quantity, v.sort_order
from m, (values
  ('fire_smoke_restoration', 'Professional dry-sponge/chemical wipe-down cleaning of smoke- and soot-affected walls and ceilings to remove residue, prior to repainting (does not include repainting)', 'wall_sf', 280.00, 1),
  ('fire_smoke_restoration', 'Professional cleaning and anti-odor deodorizing treatment of carpet after smoke damage (base extraction cleaning plus deodorizer application)', 'floor_sf', 120.00, 2),
  ('fire_smoke_restoration', 'Professional cleaning of a ceiling fan or light fixture assembly after smoke damage (disassembly, wipe-down of blades/housing, reassembly)', 'fixed', 1.00, 3),
  ('fire_smoke_restoration', 'Professional dry cleaning of window blinds after smoke damage (removed, cleaned off-site, reinstalled)', 'fixed', 1.00, 4),
  ('fire_smoke_restoration', 'Application of odor-sealing/anti-microbial sealant coating to smoke-damaged walls and ceilings (one coat) to lock in residual odor before repainting, distinct from standard primer', 'wall_sf', 280.00, 5),
  ('fire_smoke_restoration', 'Ozone generator or thermal fogging deodorization treatment for smoke odor, charged as a flat service per room/floor', 'fixed', 1.00, 6)
) as v(category, description, quantity_mode, fixed_quantity, sort_order)
join public.remodel_items ri on ri.category = v.category and ri.description = v.description;

-- ============================================================================
-- End of seed file.
-- ============================================================================
