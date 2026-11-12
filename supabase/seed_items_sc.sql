-- ============================================================================
-- Beeyond Vault — seed_items_sc.sql (South Carolina)
--
-- DRAFT DATA FOR FRANKIE'S REVIEW — more so than the original Florida set.
-- Confirmed before writing this: South Carolina adopted the 2024 IRC (as
-- modified) as the 2024 SC Residential Code, and South Carolina's own Code
-- of Regulations (Title 23, Chapter 8, Article 12) adopts IRC provisions
-- section-by-section — e.g. "S.C. Code Regs. §8-1228 — IRC R905.2.8.5 Drip
-- Edge" (verified directly). That confirms the base IRC section numbers
-- below are real, adopted South Carolina law, not a guess.
--
-- What is NOT independently verified per item: the exact §8-12xx regulation
-- number for every section (only §8-1228/R905.2.8.5 and §8-1202/R301.2.1
-- were individually checked), whether the 2024 modification cycle changed
-- any of these specific subsections, and every dollar range (carried over
-- from the Florida set's structure as a starting point only — South
-- Carolina retail/labor pricing has not been researched and WILL differ).
-- Run supabase/migration.sql first (adds items.state). Every row below is
-- state = 'SC'. Do not point customers at this state in the app until
-- these citations and prices are actually checked against the adopted SC
-- Residential Code text and real SC market pricing.
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
  'Required by the South Carolina Residential Code at every eave and rake. Estimates frequently include tear-off and shingles but skip drip edge entirely, or price it as an afterthought.',
  'RFG DRIP', '2024 SC Residential Code R905.2.8.5 (S.C. Code Regs. §8-1228, confirmed)', 3.50, 5.50, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Ice barrier / underlayment', 'Self-adhered ice barrier membrane where required, synthetic underlayment elsewhere.',
  'Required underlayment/ice-barrier assembly per the Residential Code''s roof covering chapter. South Carolina has no HVHZ-style sealed-deck tier the way Florida does — do not cite Florida''s sealed-deck requirement here. Often bundled into a generic "felt" line at a fraction of the real cost, or left off entirely.',
  'RFG UNDL', '2024 SC Residential Code R905.1.2', 55.00, 85.00, 'SQ', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Starter strip shingles', 'Factory starter strip at eaves and rakes.',
  'Manufacturer installation instructions, referenced by the Residential Code, call for starter strip, not cut shingles turned upside down. Commonly omitted as a separate line.',
  'RFG STARC', 'Manufacturer install specs referenced by 2024 SC Residential Code R905.2.2', 30.00, 45.00, 'SQ', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Ridge cap / hip and ridge shingles', 'High-profile or standard ridge cap shingles at all hips and ridges.',
  'Ridge cap is a distinct material and labor line from field shingles, rated separately for wind uplift. Frequently underpriced or folded into the field shingle quantity.',
  'RFG RIDGC', '2024 SC Residential Code R905.2.8; manufacturer wind-rating install specs', 6.50, 9.50, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Ice & water shield at valleys', 'Self-adhered membrane at all roof valleys.',
  'Required at valleys as part of the water-resistant roof assembly. Frequently priced as generic underlayment instead of the correct ice & water product.',
  'RFG IWS', '2024 SC Residential Code R905.1.2', 2.50, 4.00, 'SF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Ice & water shield at penetrations and eaves', 'Self-adhered membrane at penetrations and eave edges.',
  'Required around pipe boots, skylights, and other penetrations, and at eaves in designated wind-borne debris regions. Commonly left off the estimate.',
  'RFG IWSE', '2024 SC Residential Code R905.2.8.5', 2.50, 4.00, 'SF', 'Coastal wind-borne debris counties — verify current county list against the SC Building Codes Council''s wind map, not a secondary source'),

('SC', 'roofing', 'Valley metal (open valley)', 'Formed metal valley flashing.',
  'Required where an open-valley detail is used. Estimates sometimes assume a closed-cut valley and skip metal entirely, or under-measure the linear footage.',
  'RFG VALLEY', '2024 SC Residential Code R905.2.8.2', 7.00, 11.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Pipe jacks / boots', 'New lead or rubber pipe boot at each roof penetration.',
  'Every plumbing vent penetration needs its own boot. Adjuster estimates frequently under-count penetrations relative to what''s actually on the roof.',
  'RFG PIPEJ', 'Manufacturer install specs; 2024 SC Residential Code R905.2.8.3', 65.00, 95.00, 'EA', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Step flashing', 'New step flashing at sidewalls.',
  'Required anywhere a roof plane meets a vertical wall. Often assumed "reusable" on the estimate when it should be replaced with the roof.',
  'RFG FLASHS', '2024 SC Residential Code R905.2.8.3', 9.00, 14.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Counter flashing', 'New counter flashing over step or base flashing.',
  'Works with step flashing to complete a watertight wall transition. Frequently omitted as a separate line from step flashing.',
  'RFG FLASHC', '2024 SC Residential Code R905.2.8.3', 10.00, 16.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Chimney flashing (saddle / cricket)', 'New flashing and cricket at chimney.',
  'A chimney wider than 30 inches requires a cricket by code, and flashing should be replaced with the roof, not re-used. Frequently missing entirely.',
  'RFG CHIM', '2024 SC Residential Code R903.2.2', 350.00, 650.00, 'EA', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Wall flashing (headwall / sidewall)', 'New flashing where roof meets a vertical wall not covered by step flashing.',
  'Headwall conditions need continuous flashing tied into the wall covering. Commonly underscoped relative to the linear footage actually present.',
  'RFG FLASHW', '2024 SC Residential Code R905.2.8.3', 9.00, 15.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Turtle vents / off-ridge vents', 'Low-profile static roof vents.',
  'Attic ventilation is required by code and existing vents must be replaced, not reused, when the roof is replaced. Often left off when a ridge vent is added elsewhere, even though both may be needed.',
  'RFG VENTT', '2024 SC Residential Code R806', 65.00, 95.00, 'EA', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Ridge vent', 'Continuous ridge vent system.',
  'Required ventilation component under the Residential Code''s ventilation chapter when used as the primary exhaust vent. Frequently priced as a single flat fee regardless of actual ridge length.',
  'RFG RIDGEV', '2024 SC Residential Code R806.2', 7.00, 11.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Roof decking replacement', 'Remove and replace deteriorated or damaged roof decking.',
  'Decking found to be delaminated, rotted, or otherwise non-nailable during tear-off must be replaced. Estimates often include a token allowance far below the sheet count actually needed.',
  'RFG DECK', '2024 SC Residential Code R905.2.8.5 (nailable deck requirement)', 75.00, 110.00, 'sheet (4x8)', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Re-nailing decking to current code', 'Additional fastening of existing decking to current nailing pattern.',
  'Where existing decking does not meet the current nailing schedule, it must be brought up to code before re-roofing. This labor line is routinely missing from adjuster estimates.',
  'RFG RENAIL', '2024 SC Residential Code R905.1.1; current nailing schedule', 35.00, 55.00, 'SQ', 'Placeholder pricing carried from the Florida set — verify against actual SC retail rates'),

('SC', 'roofing', 'Roofing permit fee', 'Municipal building permit for the re-roof.',
  'A permit is required for every re-roof under the Residential Code''s permitting chapter. The fee is a real, billable cost and is often left off or underestimated relative to the actual municipality''s fee schedule.',
  'RFG PERMIT', '2024 SC Residential Code R105 (permits)', 150.00, 500.00, 'job', 'Fee varies by municipality — this range is a placeholder, not researched against any specific SC jurisdiction'),

-- ---------------------------------------------------------------------------
-- CODE UPGRADES (South Carolina — distinct from Florida's HVHZ/Miami-Dade
-- items, which have no South Carolina equivalent and must never be reused)
-- ---------------------------------------------------------------------------
('SC', 'code_upgrades', 'Wind-borne debris opening protection', 'Impact-rated or shuttered glazing for windows and doors in a designated wind-borne debris region.',
  'Properties in South Carolina''s wind-borne debris regions (generally within 1 mile of the coast where basic wind speed meets the threshold) must protect exterior glazing per the Residential Code''s wind design criteria. A non-coastal estimate template will miss this entirely.',
  'CU WBD', '2024 SC Residential Code R301.2.1.2 (confirmed section meaning)', 400.00, 1200.00, 'opening', 'Coastal wind-borne debris counties only — verify the current county/zone list against the SC Building Codes Council''s own wind maps, not a secondary source; conflicting county lists were found in research and none were authoritative'),

('SC', 'code_upgrades', 'FORTIFIED Roof / SC Safe Home mitigation upgrade', 'Additional cost to meet IBHS FORTIFIED Roof or SC Safe Home program requirements (sealed roof deck, enhanced edge/fastening, qualifying roof-to-wall connectors).',
  'South Carolina''s Safe Home program (created by the Omnibus Coastal Property Insurance Reform Act of 2007, S.C. Code §38-75-485) and the IBHS FORTIFIED Roof standard both exceed base code and can unlock state mitigation grant funding through the SC Department of Insurance. This is a real, citable upgrade path that has no Florida equivalent — do not confuse it with Florida''s HVHZ items.',
  'CU FORT', 'S.C. Code §38-75-485; SC Safe Home program (SC Dept. of Insurance) — code-plus program, not a base code requirement', 1500.00, 4000.00, 'job', 'Owner-occupied single-family coastal properties only, per current DOI program guidelines — grant amounts and eligibility change; verify directly with doi.sc.gov before citing a dollar figure');

-- ============================================================================
-- End of South Carolina seed data. 17 items loaded, all state = 'SC'.
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
-- 1. Have Frankie (or a SC-licensed contractor/engineer) verify every
--    code_citation above against the actual adopted 2024 SC Residential
--    Code text and the Building Codes Council's modification index.
-- 2. Research real South Carolina retail/labor pricing — none of the
--    dollar ranges above have been independently researched for SC.
-- 3. Confirm the current wind-borne debris county list directly from the
--    SC Building Codes Council, not a secondary source.
-- 4. Only then add 'SC' to vault/src/lib/states.js's SUPPORTED_STATES.
-- ============================================================================
