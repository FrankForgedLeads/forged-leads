-- ============================================================================
-- Beeyond Vault — seed_items_sc.sql (South Carolina)
--
-- DRAFT DATA FOR FRANKIE'S REVIEW — but significantly more verified than
-- the first pass at this file. Frankie tracked down and shared the actual
-- primary source: the SC Building Codes Council's own "2021 Modification
-- Index" PDF (llr.sc.gov/bcc), read directly, not a secondary summary.
--
-- IMPORTANT CORRECTION from the first draft: South Carolina's CURRENT code
-- is the 2021 IRC with South Carolina modifications, NOT 2024 — the 2024
-- edition doesn't take effect until January 1, 2027. A permit pulled before
-- that date stays under the 2021 code for inspection purposes (S.C. Code
-- §6-9-130). Every citation below is written against the 2021 edition,
-- which is what's actually enforced on a review run today.
--
-- Confirmed directly from the modification index (not secondary sources):
-- - R905.2.8.5 (Drip Edge) IS modified in South Carolina — the entire base
--   IRC paragraph is struck and replaced with: "A drip edge shall be
--   provided at eaves and rake edges of asphalt shingle roofs where
--   required by the manufacturer." This is NOT a blanket code mandate the
--   way Florida/Georgia/Texas treat it — it's conditional on what the
--   shingle manufacturer's own instructions say. The item below reflects
--   this corrected wording.
-- - None of R905.1.2 (ice barrier), R905.2.2, R905.2.8 (ridge cap),
--   R905.2.8.2 (valley), R905.2.8.3 (flashing), R903.2.2 (chimney), R806 /
--   R806.2 (ventilation) appear anywhere in the full 2021 modification
--   index (every IRC modification entry was checked, not just searched
--   for keywords) — meaning South Carolina has NOT modified these
--   sections, and the unmodified base 2021 IRC text applies as-is. This is
--   a real confirmation, not an assumption, for those items.
-- - R905.1.1 (nailing/underlayment-attachment schedule) is NOT modified in
--   the 2021 index either — but a local roofing company's published guide
--   (cited by Frankie) says the 2024 edition DOES add a South Carolina-
--   specific modification there for high-wind application tables. Since
--   2024 isn't in effect yet, the "re-nailing" item below is left citing
--   the unmodified 2021 base text; revisit this one specifically once 2024
--   takes effect in 2027.
--
-- Still NOT verified: every dollar range (carried over from the Florida
-- set's structure, not researched for SC pricing), the current wind-borne
-- debris county list, and the FORTIFIED/Safe Home program's current grant
-- figures.
--
-- Run supabase/migration.sql first (adds items.state). Every row below is
-- state = 'SC'. Do not point customers at this state in the app until
-- pricing is researched and the wind-borne-debris county list is confirmed
-- directly from the SC Building Codes Council's own wind maps.
-- ============================================================================

insert into public.items
  (state, category, title, description, why_owed, xactimate_code, code_citation, low_amount, high_amount, unit, region_note)
values

-- ---------------------------------------------------------------------------
-- ROOFING (South Carolina equivalents of the Florida-specific roofing items
-- — everything in the Florida set with no FBC/HVHZ citation, like steep/high
-- charges and detach & reset lines, is already state-agnostic and applies
-- to South Carolina claims automatically; it does not need a row here.)
-- ---------------------------------------------------------------------------
('SC', 'roofing', 'Drip edge', 'Metal drip edge at all eaves and rakes.',
  'South Carolina''s own modification to the base IRC ties this to the shingle manufacturer''s installation instructions, not a blanket code mandate — if the manufacturer''s specs call for drip edge (nearly all do), it must be included. Estimates frequently include tear-off and shingles but skip drip edge entirely, or price it as an afterthought.',
  'RFG DRIP', '2021 SC Residential Code R905.2.8.5, as modified (IRC 2021-40, confirmed directly against the SC Building Codes Council''s modification index — South Carolina struck the base IRC mandate and replaced it with a manufacturer-instructions standard)', 3.50, 5.50, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Ice barrier / underlayment', 'Self-adhered ice barrier membrane where required, synthetic underlayment elsewhere.',
  'Required underlayment/ice-barrier assembly per the Residential Code''s roof covering chapter — confirmed unmodified from the base 2021 IRC in South Carolina (not present in the SC modification index). South Carolina has no HVHZ-style sealed-deck tier the way Florida does — do not cite Florida''s sealed-deck requirement here. Often bundled into a generic "felt" line at a fraction of the real cost, or left off entirely.',
  'RFG UNDL', '2021 SC Residential Code R905.1.2 (unmodified base IRC text, confirmed)', 55.00, 85.00, 'SQ', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Starter strip shingles', 'Factory starter strip at eaves and rakes.',
  'Manufacturer installation instructions, referenced by the Residential Code, call for starter strip, not cut shingles turned upside down — confirmed unmodified from the base 2021 IRC in South Carolina. Commonly omitted as a separate line.',
  'RFG STARC', 'Manufacturer install specs referenced by 2021 SC Residential Code R905.2.2 (unmodified base IRC text, confirmed)', 30.00, 45.00, 'SQ', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Ridge cap / hip and ridge shingles', 'High-profile or standard ridge cap shingles at all hips and ridges.',
  'Ridge cap is a distinct material and labor line from field shingles, rated separately for wind uplift — confirmed unmodified from the base 2021 IRC in South Carolina. Frequently underpriced or folded into the field shingle quantity.',
  'RFG RIDGC', '2021 SC Residential Code R905.2.8 (unmodified base IRC text, confirmed); manufacturer wind-rating install specs', 6.50, 9.50, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Ice & water shield at valleys', 'Self-adhered membrane at all roof valleys.',
  'Required at valleys as part of the water-resistant roof assembly, under the same ice-barrier provision as general underlayment — confirmed unmodified in South Carolina. Frequently priced as generic underlayment instead of the correct ice & water product.',
  'RFG IWS', '2021 SC Residential Code R905.1.2 (unmodified base IRC text, confirmed)', 2.50, 4.00, 'SF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Ice & water shield at penetrations and eaves', 'Self-adhered membrane at penetrations and eave edges.',
  'Required around pipe boots, skylights, and other penetrations as part of the Residential Code''s ice-barrier/underlayment provision. Commonly left off the estimate.',
  'RFG IWSE', '2021 SC Residential Code R905.1.2 (unmodified base IRC text, confirmed) — NOT R905.2.8.5, which South Carolina rewrote to cover only drip edge', 2.50, 4.00, 'SF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Valley metal (open valley)', 'Formed metal valley flashing.',
  'Required where an open-valley detail is used — confirmed unmodified from the base 2021 IRC in South Carolina. Estimates sometimes assume a closed-cut valley and skip metal entirely, or under-measure the linear footage.',
  'RFG VALLEY', '2021 SC Residential Code R905.2.8.2 (unmodified base IRC text, confirmed)', 7.00, 11.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Pipe jacks / boots', 'New lead or rubber pipe boot at each roof penetration.',
  'Every plumbing vent penetration needs its own boot — confirmed unmodified from the base 2021 IRC in South Carolina. Adjuster estimates frequently under-count penetrations relative to what''s actually on the roof.',
  'RFG PIPEJ', 'Manufacturer install specs; 2021 SC Residential Code R905.2.8.3 (unmodified base IRC text, confirmed)', 65.00, 95.00, 'EA', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Step flashing', 'New step flashing at sidewalls.',
  'Required anywhere a roof plane meets a vertical wall — confirmed unmodified from the base 2021 IRC in South Carolina. Often assumed "reusable" on the estimate when it should be replaced with the roof.',
  'RFG FLASHS', '2021 SC Residential Code R905.2.8.3 (unmodified base IRC text, confirmed)', 9.00, 14.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Counter flashing', 'New counter flashing over step or base flashing.',
  'Works with step flashing to complete a watertight wall transition — confirmed unmodified from the base 2021 IRC in South Carolina. Frequently omitted as a separate line from step flashing.',
  'RFG FLASHC', '2021 SC Residential Code R905.2.8.3 (unmodified base IRC text, confirmed)', 10.00, 16.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Chimney flashing (saddle / cricket)', 'New flashing and cricket at chimney.',
  'A chimney wider than 30 inches requires a cricket by code, and flashing should be replaced with the roof, not re-used — confirmed unmodified from the base 2021 IRC in South Carolina. Frequently missing entirely.',
  'RFG CHIM', '2021 SC Residential Code R903.2.2 (unmodified base IRC text, confirmed)', 350.00, 650.00, 'EA', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Wall flashing (headwall / sidewall)', 'New flashing where roof meets a vertical wall not covered by step flashing.',
  'Headwall conditions need continuous flashing tied into the wall covering — confirmed unmodified from the base 2021 IRC in South Carolina. Commonly underscoped relative to the linear footage actually present.',
  'RFG FLASHW', '2021 SC Residential Code R905.2.8.3 (unmodified base IRC text, confirmed)', 9.00, 15.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Turtle vents / off-ridge vents', 'Low-profile static roof vents.',
  'Attic ventilation is required by code and existing vents must be replaced, not reused, when the roof is replaced — confirmed unmodified from the base 2021 IRC in South Carolina. Often left off when a ridge vent is added elsewhere, even though both may be needed.',
  'RFG VENTT', '2021 SC Residential Code R806 (unmodified base IRC text, confirmed)', 65.00, 95.00, 'EA', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Ridge vent', 'Continuous ridge vent system.',
  'Required ventilation component under the Residential Code''s ventilation chapter when used as the primary exhaust vent — confirmed unmodified from the base 2021 IRC in South Carolina. Frequently priced as a single flat fee regardless of actual ridge length.',
  'RFG RIDGEV', '2021 SC Residential Code R806.2 (unmodified base IRC text, confirmed)', 7.00, 11.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Roofing permit fee', 'Municipal building permit for the re-roof.',
  'A permit is required for every re-roof under the Residential Code''s permitting chapter. The fee is a real, billable cost and is often left off or underestimated relative to the actual municipality''s fee schedule.',
  'RFG PERMIT', '2021 SC Residential Code R105 (permits) — not individually checked against the modification index, treated as unmodified administrative chapter', 150.00, 500.00, 'job', 'Fee varies by municipality — this range is a placeholder, not researched against any specific SC jurisdiction'),

-- ---------------------------------------------------------------------------
-- CODE UPGRADES (South Carolina — distinct from Florida's HVHZ/Miami-Dade
-- items, which have no South Carolina equivalent and must never be reused)
-- ---------------------------------------------------------------------------
('SC', 'code_upgrades', 'Wind-borne debris opening protection', 'Impact-rated or shuttered glazing for windows and doors in a designated wind-borne debris region.',
  'Properties in South Carolina''s wind-borne debris regions (generally within 1 mile of the coast where basic wind speed meets the threshold) must protect exterior glazing per the Residential Code''s wind design criteria. A non-coastal estimate template will miss this entirely.',
  'CU WBD', '2021 SC Residential Code R301.2.1.2 (base section confirmed unmodified; R301.2.1 itself IS in the modification index as IRC 2021-04 "Wind Design Criteria" — the .2.1.2 opening-protection subsection specifically was not read in full, only the modification''s existence was confirmed from the index)', 400.00, 1200.00, 'opening', 'Coastal wind-borne debris counties only — verify the current county/zone list against the SC Building Codes Council''s own wind maps, not a secondary source; conflicting county lists were found in research and none were authoritative'),

('SC', 'code_upgrades', 'FORTIFIED Roof / SC Safe Home mitigation upgrade', 'Additional cost to meet IBHS FORTIFIED Roof or SC Safe Home program requirements (sealed roof deck, enhanced edge/fastening, qualifying roof-to-wall connectors).',
  'South Carolina''s Safe Home program (created by the Omnibus Coastal Property Insurance Reform Act of 2007, S.C. Code §38-75-485) and the IBHS FORTIFIED Roof standard both exceed base code and can unlock state mitigation grant funding through the SC Department of Insurance. This is a real, citable upgrade path that has no Florida equivalent — do not confuse it with Florida''s HVHZ items.',
  'CU FORT', 'S.C. Code §38-75-485; SC Safe Home program (SC Dept. of Insurance) — code-plus program, not a base code requirement', 1500.00, 4000.00, 'job', 'Owner-occupied single-family coastal properties only, per current DOI program guidelines — grant amounts and eligibility change; verify directly with doi.sc.gov before citing a dollar figure');

-- ============================================================================
-- End of South Carolina seed data. 16 items loaded, all state = 'SC'.
--
-- Changed from the first draft: removed "Roof decking replacement" — it
-- had cited R905.2.8.5 for a "nailable deck requirement," but that section
-- is now confirmed to cover ONLY drip edge in South Carolina (see above),
-- so that citation was wrong, not just unverified. Deck-replacement
-- requirements need a real citation researched separately (R905.1.1's
-- nailing schedule is the more likely home for this, but wasn't confirmed
-- in detail) before this item comes back. Also removed "Re-nailing decking
-- to current code" as its own item for the same reason — R905.1.1 is
-- confirmed unmodified in the CURRENT 2021 code, so there's no South
-- Carolina-specific "bring it up to code" angle to cite yet; the Cola City
-- Roofing guide's claim about a 2024-only modification there needs its own
-- check once that edition is closer to taking effect.
--
-- Everything else a South Carolina claim needs — Water Mitigation, Mold,
-- Interior, General Conditions, and the non-FBC Exterior/Roofing lines
-- (fascia, gutters, downspouts, stucco, exterior paint, steep/high charges,
-- every "detach & reset" line, tarping, debris haul-off) — already applies
-- automatically: those rows in seed_items.sql have state = NULL (universal)
-- after running supabase/migration.sql's backfill, precisely because they
-- cite IICRC standards or plain labor/material, never Florida Building Code.
--
-- NEXT STEPS before any real customer sees South Carolina as an option:
-- 1. Pricing: research real South Carolina retail/labor rates — none of
--    the dollar ranges above have been independently researched for SC.
-- 2. Confirm the current wind-borne debris county list directly from the
--    SC Building Codes Council's own wind maps (document #6/#7/#8 in the
--    sources Frankie found — llr.sc.gov/bcc/maps.aspx and the per-county
--    wind/seismic map PDFs).
-- 3. Confirm the FORTIFIED/Safe Home grant dollar figures directly with
--    doi.sc.gov.
-- 4. Only then add 'SC' to vault/src/lib/states.js's SUPPORTED_STATES.
-- ============================================================================
