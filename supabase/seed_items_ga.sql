-- ============================================================================
-- Beeyond Vault — seed_items_ga.sql (Georgia)
--
-- DRAFT DATA FOR FRANKIE'S REVIEW — same caveats as seed_items_sc.sql.
-- Confirmed before writing this: Georgia's Department of Community Affairs
-- adopted the 2024 IRC and 2024 IBC (with Georgia amendments) as the
-- mandatory State Minimum Standard Code under O.C.G.A. §8-2-23, effective
-- January 1, 2026 — every local jurisdiction must enforce it (a local
-- government may add its own amendments on top, but cannot go below the
-- state minimum). This is the SAME base code edition as Florida and South
-- Carolina, which is why the section numbers below follow the same
-- pattern proven for South Carolina.
--
-- What is NOT verified: whether Georgia's own state amendments changed
-- any of these specific roofing subsections (DCA publishes a Georgia
-- amendments document separately from the base IRC — not read here),
-- whether Georgia has any coastal wind-borne debris region comparable to
-- Florida/South Carolina's (not researched — do not assume one exists;
-- no such item is included below for that reason), and every dollar
-- range (carried over from the Florida set's structure, NOT researched
-- for Georgia pricing).
-- ============================================================================

insert into public.items
  (state, category, title, description, why_owed, xactimate_code, code_citation, low_amount, high_amount, unit, region_note)
values

-- ---------------------------------------------------------------------------
-- ROOFING (as with South Carolina, every Florida roofing item with no FBC
-- citation — steep/high charges, every detach & reset line, tarping, debris
-- haul-off — is already state-agnostic and applies to Georgia automatically.)
-- ---------------------------------------------------------------------------
('GA', 'roofing', 'Drip edge', 'Metal drip edge at all eaves and rakes.',
  'Required by the Georgia State Minimum Standard Code at every eave and rake. Estimates frequently include tear-off and shingles but skip drip edge entirely, or price it as an afterthought.',
  'RFG DRIP', '2024 IRC R905.2.8.5, with Georgia amendments (Georgia State Minimum Standard Code)', 3.50, 5.50, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Ice barrier / underlayment', 'Self-adhered ice barrier membrane where required, synthetic underlayment elsewhere.',
  'Required underlayment/ice-barrier assembly per the code''s roof covering chapter. Georgia has no HVHZ-style sealed-deck tier the way Florida does — do not cite Florida''s sealed-deck requirement here. Often bundled into a generic "felt" line at a fraction of the real cost, or left off entirely.',
  'RFG UNDL', '2024 IRC R905.1.2, with Georgia amendments', 55.00, 85.00, 'SQ', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Starter strip shingles', 'Factory starter strip at eaves and rakes.',
  'Manufacturer installation instructions, referenced by the code, call for starter strip, not cut shingles turned upside down. Commonly omitted as a separate line.',
  'RFG STARC', 'Manufacturer install specs referenced by 2024 IRC R905.2.2, with Georgia amendments', 30.00, 45.00, 'SQ', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Ridge cap / hip and ridge shingles', 'High-profile or standard ridge cap shingles at all hips and ridges.',
  'Ridge cap is a distinct material and labor line from field shingles, rated separately for wind uplift. Frequently underpriced or folded into the field shingle quantity.',
  'RFG RIDGC', '2024 IRC R905.2.8, with Georgia amendments; manufacturer wind-rating install specs', 6.50, 9.50, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Ice & water shield at valleys', 'Self-adhered membrane at all roof valleys.',
  'Required at valleys as part of the water-resistant roof assembly. Frequently priced as generic underlayment instead of the correct ice & water product.',
  'RFG IWS', '2024 IRC R905.1.2, with Georgia amendments', 2.50, 4.00, 'SF', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Ice & water shield at penetrations and eaves', 'Self-adhered membrane at penetrations and eave edges.',
  'Required around pipe boots, skylights, and other penetrations. Commonly left off the estimate.',
  'RFG IWSE', '2024 IRC R905.2.8.5, with Georgia amendments', 2.50, 4.00, 'SF', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Valley metal (open valley)', 'Formed metal valley flashing.',
  'Required where an open-valley detail is used. Estimates sometimes assume a closed-cut valley and skip metal entirely, or under-measure the linear footage.',
  'RFG VALLEY', '2024 IRC R905.2.8.2, with Georgia amendments', 7.00, 11.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Pipe jacks / boots', 'New lead or rubber pipe boot at each roof penetration.',
  'Every plumbing vent penetration needs its own boot. Adjuster estimates frequently under-count penetrations relative to what''s actually on the roof.',
  'RFG PIPEJ', 'Manufacturer install specs; 2024 IRC R905.2.8.3, with Georgia amendments', 65.00, 95.00, 'EA', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Step flashing', 'New step flashing at sidewalls.',
  'Required anywhere a roof plane meets a vertical wall. Often assumed "reusable" on the estimate when it should be replaced with the roof.',
  'RFG FLASHS', '2024 IRC R905.2.8.3, with Georgia amendments', 9.00, 14.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Counter flashing', 'New counter flashing over step or base flashing.',
  'Works with step flashing to complete a watertight wall transition. Frequently omitted as a separate line from step flashing.',
  'RFG FLASHC', '2024 IRC R905.2.8.3, with Georgia amendments', 10.00, 16.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Chimney flashing (saddle / cricket)', 'New flashing and cricket at chimney.',
  'A chimney wider than 30 inches requires a cricket by code, and flashing should be replaced with the roof, not re-used. Frequently missing entirely.',
  'RFG CHIM', '2024 IRC R903.2.2, with Georgia amendments', 350.00, 650.00, 'EA', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Wall flashing (headwall / sidewall)', 'New flashing where roof meets a vertical wall not covered by step flashing.',
  'Headwall conditions need continuous flashing tied into the wall covering. Commonly underscoped relative to the linear footage actually present.',
  'RFG FLASHW', '2024 IRC R905.2.8.3, with Georgia amendments', 9.00, 15.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Turtle vents / off-ridge vents', 'Low-profile static roof vents.',
  'Attic ventilation is required by code and existing vents must be replaced, not reused, when the roof is replaced. Often left off when a ridge vent is added elsewhere, even though both may be needed.',
  'RFG VENTT', '2024 IRC R806, with Georgia amendments', 65.00, 95.00, 'EA', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Ridge vent', 'Continuous ridge vent system.',
  'Required ventilation component under the code''s ventilation chapter when used as the primary exhaust vent. Frequently priced as a single flat fee regardless of actual ridge length.',
  'RFG RIDGEV', '2024 IRC R806.2, with Georgia amendments', 7.00, 11.00, 'LF', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Roof decking replacement', 'Remove and replace deteriorated or damaged roof decking.',
  'Decking found to be delaminated, rotted, or otherwise non-nailable during tear-off must be replaced. Estimates often include a token allowance far below the sheet count actually needed.',
  'RFG DECK', '2024 IRC R905.2.8.5, with Georgia amendments (nailable deck requirement)', 75.00, 110.00, 'sheet (4x8)', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Re-nailing decking to current code', 'Additional fastening of existing decking to current nailing pattern.',
  'Where existing decking does not meet the current nailing schedule, it must be brought up to code before re-roofing. This labor line is routinely missing from adjuster estimates.',
  'RFG RENAIL', '2024 IRC R905.1.1, with Georgia amendments; current nailing schedule', 35.00, 55.00, 'SQ', 'Placeholder pricing carried from the Florida set — verify against actual Georgia retail rates'),

('GA', 'roofing', 'Roofing permit fee', 'Municipal building permit for the re-roof.',
  'A permit is required for every re-roof under the code''s permitting chapter. The fee is a real, billable cost and is often left off or underestimated relative to the actual municipality''s fee schedule.',
  'RFG PERMIT', '2024 IRC R105 (permits), with Georgia amendments', 150.00, 500.00, 'job', 'Fee varies by municipality — this range is a placeholder, not researched against any specific GA jurisdiction');

-- ============================================================================
-- End of Georgia seed data. 17 items loaded, all state = 'GA'.
--
-- Deliberately NOT included: a Code-Upgrades/wind-borne-debris item like
-- Florida's HVHZ or South Carolina's wind-borne debris region item.
-- Whether Georgia's coastal counties (Savannah/Chatham County area) have a
-- comparable wind-borne debris region under the 2024 IRC with Georgia
-- amendments was not researched — do not add one without checking DCA's
-- own Georgia amendments document first.
--
-- NEXT STEPS, same as South Carolina: verify every citation and price
-- against the actual adopted code text and Georgia amendments, then add
-- 'GA' to vault/src/lib/states.js's SUPPORTED_STATES.
-- ============================================================================
