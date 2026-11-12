-- ============================================================================
-- Beeyond Vault — seed_items_tx.sql (Texas)
--
-- DRAFT DATA FOR FRANKIE'S REVIEW — Texas works differently from every
-- other state in the Vault and that difference matters a lot here.
--
-- Texas has NO statewide building code — code adoption is left to
-- individual cities/counties. BUT: effective April 1, 2026, the Texas
-- Department of Insurance (TDI) adopted the 2024 IBC and 2024 IRC as the
-- minimum construction standard for wind/hail hazard insurance eligibility
-- through the Texas Windstorm Insurance Association (TWIA) — and this
-- ONLY applies inside TDI's "designated catastrophe area": the 14 first-
-- tier coastal counties, plus part of Harris County east of Highway 146
-- (the exact Harris County boundary was described inconsistently across
-- sources found — verify directly against TDI's own catastrophe-area map
-- before relying on it). Outside that area, there is still no state code
-- at all, and this content does not apply.
--
-- This means every item below:
-- 1. Uses the SAME 2024 IRC base section numbers as the Florida/South
--    Carolina/Georgia items (same edition, same reasoning as those files).
-- 2. Is framed as a TWIA/windstorm-insurance construction requirement,
--    not a general "Texas building code" the way Florida's FBC is — this
--    is a meaningfully different legal hook and should be worded that way
--    in any letter this generates.
-- 3. Only applies to a property inside the designated catastrophe area —
--    this is NOT a statewide item set the way Florida's or Georgia's is.
--
-- Also confirmed and genuinely solid: TDI requires roof covering products
-- in the catastrophe area to pass UL 997 (wind resistance) or be tested
-- to ASTM D 3161 with a minimum 110 mph wind-resistance rating, classified
-- 1 through 4 (4 being most wind-resistant) — a real, citable, Texas-
-- specific product standard with no Florida or South Carolina equivalent.
-- What is NOT verified: the exact current county list, whether TDI's own
-- adopted-codes bulletin modified any specific roofing subsection, and
-- every dollar range (carried over from the Florida set's structure, NOT
-- researched for Texas pricing).
-- ============================================================================

insert into public.items
  (state, category, title, description, why_owed, xactimate_code, code_citation, low_amount, high_amount, unit, region_note)
values

-- ---------------------------------------------------------------------------
-- ROOFING (catastrophe area only — see header. Every Florida roofing item
-- with no FBC citation is already state-agnostic and applies to Texas
-- claims everywhere, catastrophe area or not.)
-- ---------------------------------------------------------------------------
('TX', 'roofing', 'Drip edge', 'Metal drip edge at all eaves and rakes.',
  'Required by the 2024 IRC as adopted by TDI for windstorm construction in the designated catastrophe area. Estimates frequently include tear-off and shingles but skip drip edge entirely, or price it as an afterthought.',
  'RFG DRIP', '2024 IRC R905.2.8.5, as adopted by TDI (28 Tex. Admin. Code, windstorm program)', 3.50, 5.50, 'LF', 'TDI designated catastrophe area only — verify current county list directly against TDI''s windstorm map, not a secondary source'),

('TX', 'roofing', 'Roof covering — UL 997 / ASTM D3161 wind rating documentation', 'Documenting and specifying a roof covering product rated to TDI''s windstorm wind-resistance standard.',
  'Roof coverings in the designated catastrophe area must pass UL 997 or be tested to ASTM D 3161 at 110 mph or higher wind resistance (TDI product classes 1-4). A product substituted without this rating can fail windstorm certification — specifying and documenting the correct class is real, billable scoping work, not assumed.',
  'RFG TXWIND', 'TDI windstorm program — UL 997 / ASTM D3161, 110 mph minimum (28 Tex. Admin. Code)', 250.00, 600.00, 'job', 'TDI designated catastrophe area only — this is a Texas-specific product-certification requirement with no Florida/South Carolina equivalent'),

('TX', 'roofing', 'Ice barrier / underlayment', 'Self-adhered ice barrier membrane where required, synthetic underlayment elsewhere.',
  'Required underlayment assembly per the 2024 IRC as adopted by TDI. Often bundled into a generic "felt" line at a fraction of the real cost, or left off entirely.',
  'RFG UNDL', '2024 IRC R905.1.2, as adopted by TDI', 55.00, 85.00, 'SQ', 'TDI designated catastrophe area only — placeholder pricing carried from the Florida set, not researched for Texas'),

('TX', 'roofing', 'Starter strip shingles', 'Factory starter strip at eaves and rakes.',
  'Manufacturer installation instructions, referenced by the adopted code, call for starter strip, not cut shingles turned upside down. Commonly omitted as a separate line.',
  'RFG STARC', 'Manufacturer install specs referenced by 2024 IRC R905.2.2, as adopted by TDI', 30.00, 45.00, 'SQ', 'TDI designated catastrophe area only — placeholder pricing carried from the Florida set, not researched for Texas'),

('TX', 'roofing', 'Ridge cap / hip and ridge shingles', 'High-profile or standard ridge cap shingles at all hips and ridges.',
  'Ridge cap is a distinct material and labor line from field shingles, rated separately for wind uplift. Frequently underpriced or folded into the field shingle quantity.',
  'RFG RIDGC', '2024 IRC R905.2.8, as adopted by TDI; manufacturer wind-rating install specs', 6.50, 9.50, 'LF', 'TDI designated catastrophe area only — placeholder pricing carried from the Florida set, not researched for Texas'),

('TX', 'roofing', 'Pipe jacks / boots', 'New lead or rubber pipe boot at each roof penetration.',
  'Every plumbing vent penetration needs its own boot. Adjuster estimates frequently under-count penetrations relative to what''s actually on the roof.',
  'RFG PIPEJ', 'Manufacturer install specs; 2024 IRC R905.2.8.3, as adopted by TDI', 65.00, 95.00, 'EA', 'TDI designated catastrophe area only — placeholder pricing carried from the Florida set, not researched for Texas'),

('TX', 'roofing', 'Step flashing', 'New step flashing at sidewalls.',
  'Required anywhere a roof plane meets a vertical wall. Often assumed "reusable" on the estimate when it should be replaced with the roof.',
  'RFG FLASHS', '2024 IRC R905.2.8.3, as adopted by TDI', 9.00, 14.00, 'LF', 'TDI designated catastrophe area only — placeholder pricing carried from the Florida set, not researched for Texas'),

('TX', 'roofing', 'Counter flashing', 'New counter flashing over step or base flashing.',
  'Works with step flashing to complete a watertight wall transition. Frequently omitted as a separate line from step flashing.',
  'RFG FLASHC', '2024 IRC R905.2.8.3, as adopted by TDI', 10.00, 16.00, 'LF', 'TDI designated catastrophe area only — placeholder pricing carried from the Florida set, not researched for Texas'),

('TX', 'roofing', 'Chimney flashing (saddle / cricket)', 'New flashing and cricket at chimney.',
  'A chimney wider than 30 inches requires a cricket by code, and flashing should be replaced with the roof, not re-used. Frequently missing entirely.',
  'RFG CHIM', '2024 IRC R903.2.2, as adopted by TDI', 350.00, 650.00, 'EA', 'TDI designated catastrophe area only — placeholder pricing carried from the Florida set, not researched for Texas'),

('TX', 'roofing', 'Roof decking replacement', 'Remove and replace deteriorated or damaged roof decking.',
  'Decking found to be delaminated, rotted, or otherwise non-nailable during tear-off must be replaced. Estimates often include a token allowance far below the sheet count actually needed.',
  'RFG DECK', '2024 IRC R905.2.8.5, as adopted by TDI (nailable deck requirement)', 75.00, 110.00, 'sheet (4x8)', 'TDI designated catastrophe area only — placeholder pricing carried from the Florida set, not researched for Texas'),

('TX', 'roofing', 'Re-nailing decking to current code', 'Additional fastening of existing decking to current nailing pattern.',
  'Where existing decking does not meet the current nailing schedule, it must be brought up to code before re-roofing. This labor line is routinely missing from adjuster estimates.',
  'RFG RENAIL', '2024 IRC R905.1.1, as adopted by TDI; current nailing schedule', 35.00, 55.00, 'SQ', 'TDI designated catastrophe area only — placeholder pricing carried from the Florida set, not researched for Texas'),

('TX', 'roofing', 'Windstorm Certificate of Compliance (WPI-8) documentation', 'Preparing and filing the inspection/certification paperwork required for TWIA windstorm eligibility.',
  'New roofs, re-roofs, and roof repairs in the designated catastrophe area must be inspected and certified before the property is eligible for TWIA wind/hail coverage. This certification labor is real, billable scoping work that a non-coastal estimate template will miss entirely.',
  'RFG WPI8', 'TDI windstorm inspection program (28 Tex. Admin. Code, Ch. 5, Subch. G)', 150.00, 350.00, 'job', 'TDI designated catastrophe area only — verify current form name/number and fee directly with TDI, not a secondary source');

-- ============================================================================
-- End of Texas seed data. 12 items loaded, all state = 'TX'.
--
-- Deliberately NOT a full copy of the South Carolina/Georgia roofing set —
-- left out items (ventilation/ridge vent, wall flashing, permit fee) where
-- I had lower confidence TDI's windstorm program covers them the same way
-- a general building code would, rather than guess. Add them only after
-- confirming against TDI's own adopted-codes bulletin.
--
-- NEXT STEPS, same as South Carolina/Georgia: verify every citation and
-- price, confirm the exact catastrophe-area county list, then add 'TX' to
-- vault/src/lib/states.js's SUPPORTED_STATES. Given Texas's scope is
-- narrower (catastrophe-area coastal counties, not the whole state), also
-- decide whether the app should warn a user who picks Texas but isn't in
-- that area — not built yet, worth deciding before this goes live.
-- ============================================================================
