-- ============================================================================
-- Beeyond Vault — seed_remodel_items.sql
--
-- Starter catalog for the Remodel Estimator (see migration.sql for the
-- remodel_items/_estimates/_rooms/_room_items tables and why they're kept
-- separate from `items` and `price_references`).
--
-- Every row cites a real, named source — same discipline as
-- seed_price_references.sql. Two items from the original research pass
-- were dropped entirely rather than seeded with a guess: kitchen wall
-- cabinets (no source found separate from base-cabinet pricing) and
-- kitchen sink+faucet installation (no marketplace-grade source found at
-- all). A few other rows cite a real source but a lower-confidence one
-- (HomeWyse, Inch Calculator, NerdWallet, a 2024-dated page, or a
-- secondhand citation of another site's data) — those are flagged plainly
-- in their own `notes` field rather than presented with false confidence.
--
-- Roofing is included below, but as a category it's generally
-- lower-confidence than general/kitchen/bathroom: most figures came from
-- search-result snippets of real, named pages (Angi, Fixr, HomeGuide,
-- This Old House, named contractors) rather than a directly-verified
-- fetch, since several roofing-industry sites were unreachable from this
-- environment. One item — ice & water shield membrane — had no trustworthy
-- branded source at all and was dropped rather than guessed, same as
-- kitchen wall cabinets and sink+faucet installation above.
--
-- Run supabase/migration.sql first (adds the remodel_* tables).
-- ============================================================================

insert into public.remodel_items
  (category, description, unit, price_low, price_high, source_name, source_url, last_verified_date, notes)
values

-- ---------------------------------------------------------------------------
-- GENERAL (applies to any room)
-- ---------------------------------------------------------------------------

('general', 'Paint walls, 2 coats', 'SF', 2.00, 6.00,
  'Angi', 'https://www.angi.com/articles/how-much-does-it-cost-paint-room.htm', '2026-11-14',
  'Materials + labor, 2 coats.'),

('general', 'Paint ceiling, 2 coats', 'SF', 0.50, 5.00,
  'Angi', 'https://www.angi.com/articles/paint-ceiling-cost.htm', '2026-11-14',
  null),

('general', 'Drywall installation, new', 'SF', 1.50, 3.00,
  'Angi', 'https://www.angi.com/articles/what-cost-install-drywall.htm', '2026-11-14',
  'Same figure already used on Vault''s Pricing Reference page.'),

('general', 'Drywall repair/patch', 'job', 295.00, 924.00,
  'HomeAdvisor', 'https://www.homeadvisor.com/cost/walls-and-ceilings/repair-drywall', '2026-11-14',
  'Typical single repair job, not per-SF — small jobs often carry a $125-200 minimum trip fee on top.'),

('general', 'Wall texture, knockdown or orange peel', 'SF', 1.25, 2.50,
  'Angi', 'https://www.angi.com/articles/orange-peel-vs-knockdown-paint-textures.htm', '2026-11-14',
  null),

('general', 'Baseboard/trim installation', 'LF', 6.00, 9.00,
  'Angi', 'https://angi.com/articles/how-much-does-installing-trim-cost.htm', '2026-11-14',
  null),

('general', 'Crown molding installation', 'LF', 14.00, 22.00,
  'HomeWyse', 'https://www.homewyse.com/services/cost_to_install_crown_molding.html', '2026-11-14',
  'No current dated Angi/HomeAdvisor page found — best available estimate, not a marketplace-confirmed figure.'),

('general', 'Interior door replacement, incl. hardware', 'EA', 150.00, 2550.00,
  'Angi', 'https://angi.com/articles/how-much-does-it-cost-install-interior-door.htm', '2026-11-14',
  'National average around $791; wide range reflects hollow-core vs. solid-wood/French doors.'),

('general', 'Flooring, luxury vinyl plank', 'SF', 3.00, 10.00,
  'Angi', 'https://angi.com/articles/how-much-does-installing-vinyl-or-linoleum-flooring-cost.htm', '2026-11-14',
  'Sourced from a 2024-dated Angi page — re-verify against a current page before relying on this heavily.'),

('general', 'Flooring, ceramic/porcelain tile', 'SF', 5.00, 17.00,
  'Angi', 'https://match.angi.com/cost/flooring/install-ceramic-or-porcelain-tile', '2026-11-14',
  null),

('general', 'Flooring, engineered hardwood', 'SF', 7.00, 20.00,
  'BuildDirect (citing Angi)', 'https://www.builddirect.com/blogs/expert-advice-on-flooring/how-much-does-new-flooring-cost', '2026-11-14',
  'Secondhand citation of Angi data, not independently confirmed on Angi''s own page.'),

('general', 'Flooring, carpet', 'SF', 3.50, 11.00,
  'Angi', 'https://match.angi.com/cost/flooring/install-carpeting', '2026-11-14',
  null),

('general', 'Interior door/trim painting, 2 coats', 'EA', 100.00, 350.00,
  'Angi', 'https://www.angi.com/articles/paint-trim-cost.htm', '2026-11-14',
  'Per door, including frame/casing. Trim-only (no door) runs roughly $1-4/LF instead.'),

('general', 'Insulation, batt (R-13 to R-30)', 'SF', 0.60, 1.40,
  'HomeAdvisor', 'https://homeadvisor.com/cost/insulation/install-insulation', '2026-11-14',
  'R-13/R-15 walls run toward the low end, R-30 attic toward the high end. No current Angi page found to cross-check.'),

-- ---------------------------------------------------------------------------
-- KITCHEN
-- ---------------------------------------------------------------------------

('kitchen', 'Base cabinets, installed', 'LF', 100.00, 1200.00,
  'HomeLight', 'https://homelight.com/blog/cost-of-kitchen-cabinets-installed/', '2026-11-14',
  'Wide range reflects stock ($100-300/LF) through semi-custom ($150-900/LF) to full custom ($500-1,200+/LF) — pick the tier that matches the job before quoting.'),

('kitchen', 'Cabinet refacing', 'LF', 150.00, 450.00,
  'Angi', 'https://www.angi.com/articles/how-much-does-cabinet-refacing-cost.htm', '2026-11-14',
  'National average project cost around $7,229 ($4,233-10,224). Material drives price: thermofoil $80-125/LF, wood veneer $100-250/LF, solid wood $200-500/LF.'),

('kitchen', 'Countertop, granite, installed', 'SF', 40.00, 100.00,
  'Fixr', 'https://fixr.com/costs/install-granite-countertop', '2026-11-14',
  'Modular granite runs cheaper, $25-40/SF.'),

('kitchen', 'Countertop, quartz, installed', 'SF', 50.00, 150.00,
  'Fixr', 'https://fixr.com/costs/install-quartz-countertop', '2026-11-14',
  null),

('kitchen', 'Countertop, laminate, installed', 'SF', 15.00, 60.00,
  'Fixr', 'https://www.fixr.com/costs/install-laminate-countertop', '2026-11-14',
  'A separate HomeWyse figure runs higher, $42-64/SF — worth a couple of real quotes before relying on either.'),

('kitchen', 'Tile backsplash, installed', 'SF', 15.00, 40.00,
  'Angi', 'https://www.angi.com/articles/how-much-does-kitchen-backsplash-cost.htm', '2026-11-14',
  'Varies sharply by material — porcelain toward the low end, natural stone/marble toward the high end or above.'),

('kitchen', 'Dishwasher installation, labor only', 'EA', 150.00, 300.00,
  'HomeAdvisor', 'https://www.homeadvisor.com/cost/kitchens/install-dishwasher', '2026-11-14',
  'Labor only — appliance is typically owner-supplied.'),

('kitchen', 'Range/cooktop installation, labor only', 'EA', 70.00, 155.00,
  'HomeAdvisor', 'https://homeadvisor.com/cost/kitchens/install-an-appliance', '2026-11-14',
  'Labor only — appliance is typically owner-supplied.'),

('kitchen', 'Range hood/vent installation', 'EA', 650.00, 2500.00,
  'Angi', 'https://www.angi.com/articles/how-much-should-it-cost-install-range-hood-my-kitchen-running-air-ducts.htm', '2026-11-14',
  'An older HomeAdvisor page cites a lower $400-1,550 range — Angi''s newer figure used here.'),

('kitchen', 'Garbage disposal installation, incl. hookup', 'EA', 200.00, 625.00,
  'HomeAdvisor', 'https://www.homeadvisor.com/cost/kitchens/install-a-garbage-disposal', '2026-11-14',
  'An older Angi figure cites a lower $150-950 range — HomeAdvisor''s newer figure used here.'),

('kitchen', 'Kitchen island, per project', 'job', 4800.00, 10000.00,
  'Angi (via NerdWallet)', 'https://www.nerdwallet.com/home-ownership/home-improvement/learn/kitchen-island-costs-and-ways-to-save', '2026-11-14',
  'Average around $4,800; custom builds run $10,000+. Secondhand citation of Angi data.'),

-- ---------------------------------------------------------------------------
-- BATHROOM
-- ---------------------------------------------------------------------------

('bathroom', 'Vanity installation, incl. sink', 'EA', 200.00, 1000.00,
  'Angi', 'https://angi.com/articles/how-much-should-bathroom-vanity-install-labor-cost.htm', '2026-11-14',
  'This is labor only — total installed cost including the vanity unit itself averages closer to $1,500.'),

('bathroom', 'Toilet installation/replacement', 'EA', 250.00, 800.00,
  'Fixr', 'https://www.fixr.com/costs/toilet-installation', '2026-11-14',
  'Average around $450. Labor-only (customer-supplied toilet) runs $150-440.'),

('bathroom', 'Tub replacement, standard alcove', 'EA', 1500.00, 5000.00,
  'Inch Calculator', 'https://www.inchcalculator.com/cost-to-install-bathtub/', '2026-11-14',
  'No Angi/HomeAdvisor marketplace figure found — this is a non-marketplace source, treat as a rough placeholder and get real quotes.'),

('bathroom', 'Walk-in shower conversion (tub-to-shower)', 'job', 3500.00, 12000.00,
  'This Old House', 'https://www.thisoldhouse.com/bathrooms/tub-to-shower-conversion-cost', '2026-11-14',
  'Typical mid-range project around $6,500.'),

('bathroom', 'Shower pan replacement', 'EA', 900.00, 2300.00,
  'Angi', 'https://angi.com/articles/shower-pan-replacement-cost.htm', '2026-11-14',
  'Average around $1,620; ranges from a small basic pan ($530) to a large custom one ($4,600).'),

('bathroom', 'Bathroom floor tile, installed', 'SF', 5.00, 15.00,
  'Angi', 'https://angi.com/articles/tile-installation-cost.htm', '2026-11-14',
  'General tile-installation figure — premium stone runs $15-30/SF instead.'),

('bathroom', 'Shower wall tile (surround), installed', 'SF', 10.00, 30.00,
  'Angi / This Old House', 'https://angi.com/articles/cost-to-tile-a-shower.htm', '2026-11-14',
  'Average around $17.30/SF. A full shower-tile project typically runs $1,800-5,000 total.'),

('bathroom', 'Exhaust fan installation', 'EA', 183.00, 444.00,
  'Thumbtack', 'https://www.thumbtack.com/p/bathroom-fan-installation-cost', '2026-11-14',
  'Simple like-for-like replacement. No HomeAdvisor/Angi figure found to cross-check.'),

('bathroom', 'Mirror installation', 'EA', 150.00, 500.00,
  'Angi', 'https://www.angi.com/articles/mirror-installation-cost.htm', '2026-11-14',
  null),

('bathroom', 'Window replacement, standard size', 'EA', 500.00, 800.00,
  'Angi / Fixr', 'https://www.angi.com/articles/what-affects-cost-replacement-windows.htm', '2026-11-14',
  'Angi''s national average is around $750/window; a separate Fixr survey puts it lower, around $517/window.'),

('bathroom', 'Exterior door replacement, incl. hardware', 'EA', 500.00, 2000.00,
  'NerdWallet', 'https://www.nerdwallet.com/article/mortgages/door-replacement-cost', '2026-11-14',
  'No reliable current marketplace (Angi/HomeAdvisor) page found for full replacement — a weaker, non-marketplace source. Treat as a rough placeholder.');

-- ---------------------------------------------------------------------------
-- ROOFING
-- ---------------------------------------------------------------------------

('roofing', 'Tear-off and disposal of existing roof', 'SQ', 50.00, 150.00,
  'Fixr', 'https://www.fixr.com/costs/mansard-roof', '2026-11-14',
  'Lower-confidence — figure came from a search-result snippet, not a directly-verified page, and looks like a generalized figure reused across several Fixr roofing pages.'),

('roofing', 'Shingle roof replacement, architectural/dimensional', 'SQ', 400.00, 1800.00,
  'Fixr', 'https://www.fixr.com/costs/install-roof-shingles', '2026-11-14',
  'Typical full project around $14,500. Full tear-off-and-replace, materials + labor.'),

('roofing', 'Shingle roof replacement, 3-tab', 'SQ', 300.00, 500.00,
  'Fixr', 'https://www.fixr.com/articles/asphalt-shingles-everything-you-need-to-know', '2026-11-14',
  'Full roof total typically $8,000-12,000 per a named contractor (Bill Ragan Roofing).'),

('roofing', 'Metal roof replacement, standing seam', 'SQ', 800.00, 3900.00,
  'This Old House', 'https://www.thisoldhouse.com/roofing/standing-seam-metal-roof-cost', '2026-11-14',
  'Wide range reflects material — steel/aluminum toward the low end, copper/zinc toward the high end. Pick the tier that matches the job.'),

('roofing', 'Tile roof replacement', 'SQ', 1120.00, 1850.00,
  'Roof Observations', 'https://roofobservations.com/tile-roof-cost-guide/', '2026-11-14',
  'Basic concrete tile toward the low end, premium clay toward the high end. Cross-checks reasonably against This Old House''s whole-project figure of $8,200-24,650.'),

('roofing', 'Flat/TPO roof replacement', 'SQ', 400.00, 1400.00,
  'Fixr', 'https://www.fixr.com/costs/flat-roof-installation', '2026-11-14',
  'Range depends on membrane mil thickness and insulation.'),

('roofing', 'Synthetic underlayment', 'SQ', 18.00, 60.00,
  'Angi', 'https://angi.com/articles/roof-underlayment-for-asphalt-shingles.htm', '2026-11-14',
  'Materials only — add installation labor on top.'),

('roofing', 'Drip edge installation', 'LF', 5.00, 9.00,
  'Angi / HomeGuide', 'https://angi.com/articles/whats-cost-drip-edge-install-roof.htm', '2026-11-14',
  'Retrofit onto an existing roof. New-construction installation (bare decking, no tear-off) runs cheaper, around $1-3/LF.'),

('roofing', 'Ridge vent installation', 'job', 300.00, 650.00,
  'Angi', 'https://angi.com/articles/ridge-vent-cost.htm', '2026-11-14',
  'Typical all-in total, not a clean per-LF rate — sources disagree sharply on the per-LF breakdown, so a job-level figure was used instead.'),

('roofing', 'Roof flashing repair (chimney/wall/valley)', 'job', 200.00, 600.00,
  'Angi', 'https://www.angi.com/articles/what-causing-leak-your-chimney.htm', '2026-11-14',
  'Per-project repair figure. Per-linear-foot material pricing was found too inconsistent across sources (some claim 5-10x this) to use confidently — flagged out rather than included.'),

('roofing', 'Pipe boot/jack replacement', 'EA', 250.00, 580.00,
  'Angi / Baker Roofing', 'https://angi.com/articles/how-much-should-it-cost-replace-roof-vent-boots.htm', '2026-11-14',
  'A named contractor (Baker Roofing) quotes a flat $250/each; Angi''s state-level figures (FL-CA) run higher, $410-580 — range covers both.'),

('roofing', 'Roof decking replacement', 'sheet (4x8)', 75.00, 160.00,
  'HomeGuide', 'https://homeguide.com/costs/cost-to-replace-roof-decking', '2026-11-14',
  'Per sheet, materials + labor.'),

('roofing', 'Gutter replacement, seamless aluminum', 'LF', 9.00, 13.00,
  'Angi', 'https://www.angi.com/articles/aluminum-gutter-cost.htm', '2026-11-14',
  'Other materials vary more widely ($3-29/LF per This Old House) — this figure is for standard seamless aluminum specifically.'),

('roofing', 'Roofing permit', 'job', 250.00, 500.00,
  'HomeAdvisor', 'https://www.homeadvisor.com/cost/architects-and-engineers/get-a-building-permit', '2026-11-14',
  'Varies heavily by jurisdiction — local examples found range from $80 to $690. Treat this as a rough placeholder and confirm with the local permitting office.');

-- ============================================================================
-- Second pass — electrical, plumbing, doors_windows, stairs_railings,
-- closets_storage, hvac, exterior, water_mitigation.
--
-- Added per Frank's request for a far more complete catalog ("most complete
-- software out there"), plus a real Xactimate estimate he sent as a sample
-- of what line items a water-mitigation/mold job needs — NOTE: that
-- document's own prices and exact line-item wording were NOT used anywhere
-- below; they're Xactimate's own proprietary price-list data. Only the
-- general categories of work it showed (containment, drying equipment,
-- antimicrobial treatment, wet-material removal, etc.) informed which real,
-- independently-sourced items to research for water_mitigation.
--
-- Same sourcing discipline as the first pass: every row cites a real named
-- source. Two items were dropped entirely for lack of a credible source
-- (antimicrobial treatment application, emergency service call-out fee —
-- both only turned up unattributed/anonymous "cost guide" figures). Several
-- other rows below cite a real source but flag real cross-source
-- disagreement or a single-source/non-marketplace citation in their own
-- `notes` field — treat those as directional, not precise.
-- ============================================================================

insert into public.remodel_items
  (category, description, unit, price_low, price_high, source_name, source_url, last_verified_date, notes)
values

-- ---------------------------------------------------------------------------
-- ELECTRICAL
-- ---------------------------------------------------------------------------

('electrical', 'Electrical outlet replacement', 'EA', 130.00, 300.00,
  'Angi', 'https://www.angi.com/articles/how-much-does-it-cost-install-outlet.htm', '2026-11-15',
  'Average around $200/outlet. A separate Angi "repair" page gives a lower $50-350 range (avg $130) — used the install-specific figure since this line is for a replacement/install job.'),

('electrical', 'Light switch replacement', 'EA', 100.00, 203.00,
  'HomeAdvisor', 'https://www.homeadvisor.com/cost/electrical/install-a-switch/', '2026-11-15',
  'Page dated 2025, slightly stale. Dimmer/3-way switches run higher, roughly $80-250 installed.'),

('electrical', 'GFCI outlet installation', 'EA', 130.00, 300.00,
  'Angi', 'https://angi.com/articles/how-much-should-it-cost-electrician-replace-combination-gfci-switch-and-receptacle.htm', '2026-11-15',
  'Average around $210. Outdoor/weatherproof installs needing new wiring run much higher, $150-1,400.'),

('electrical', 'Light fixture installation, existing wiring/box', 'EA', 70.00, 250.00,
  'Angi', 'https://www.angi.com/articles/how-much-does-it-cost-install-lighting-fixture.htm', '2026-11-15',
  'Labor-focused range assuming an existing fixture location. A new fixture location/wiring runs much higher, $158-1,021.'),

('electrical', 'Ceiling fan installation, existing fan-rated box', 'EA', 146.00, 351.00,
  'Thumbtack', 'https://www.thumbtack.com/p/ceiling-fan-install-cost', '2026-11-15',
  'Could not find a current-dated Angi/HomeAdvisor page with this breakdown. If a new electrical box or wiring is needed, cost rises to $400-2,000.'),

('electrical', 'Recessed/can lighting installation', 'EA', 125.00, 300.00,
  'Fixr', 'https://fixr.com/costs/recessed-lighting-installation', '2026-11-15',
  'Page dated January 2025. Lower ($100-175/light) in new construction with open joists, higher ($250-450/light) for retrofit into a finished ceiling.'),

('electrical', 'Electrical panel upgrade, 100A to 200A', 'job', 1800.00, 4500.00,
  'Fixr', 'https://www.fixr.com/costs/install-electrical-circuit-panel-upgrade', '2026-11-15',
  'A separate, non-200A-specific Angi article gives a lower $1,200-2,000 for a straightforward panel swap. Expect the top of this range or higher if the meter base or service drop also needs work.'),

('electrical', 'New dedicated circuit/outlet run', 'EA', 650.00, 1120.00,
  'Angi', 'https://angi.com/articles/cost-to-install-dedicated-circuit.htm', '2026-11-15',
  'A basic outlet added to an existing circuit (no new breaker) is cheaper, closer to $150-350.'),

('electrical', 'Whole-house rewiring', 'SF', 6.00, 10.00,
  'Angi', 'https://match.angi.com/cost/electrical/rewire-house', '2026-11-15',
  'Budget toward the higher end if walls need to be opened. An older Angi article gives a conflicting, lower $2-4/SF — this more recent page was used as primary.'),

-- ---------------------------------------------------------------------------
-- PLUMBING
-- ---------------------------------------------------------------------------

('plumbing', 'Water heater installation, tank-style', 'EA', 600.00, 2500.00,
  'NerdWallet', 'https://www.nerdwallet.com/article/mortgages/water-heater-cost', '2026-11-15',
  'Full installed cost for a standard tank replacement. Costs rise if venting, code upgrades, or permit work are required.'),

('plumbing', 'Water heater installation, tankless', 'EA', 1406.00, 3902.00,
  'Angi', 'https://www.angi.com/articles/how-much-does-tankless-water-heater-cost.htm', '2026-11-15',
  'Gas/propane units generally cost more than electric; gas-line work can add up to roughly $1,000.'),

('plumbing', 'Toilet supply line / shutoff valve replacement', 'EA', 50.00, 200.00,
  'HomeAdvisor', 'https://www.homeadvisor.com/cost/plumbing/repair-a-toilet', '2026-11-15',
  'HomeAdvisor''s own pages are slightly inconsistent on this figure — merged two of its cited ranges into one here.'),

('plumbing', 'Sink installation, labor only', 'EA', 200.00, 650.00,
  'HomeGuide', 'https://www.homeguide.com/costs/sink-installation-cost', '2026-11-15',
  'If new supply/drain plumbing is also needed (not just a swap), expect $450-1,800 instead.'),

('plumbing', 'Faucet installation, labor only', 'EA', 150.00, 400.00,
  'Fixr', 'https://fixr.com/costs/kitchen-faucet-installation', '2026-11-15',
  'Page dated January 2025. Assumes existing plumbing hookup. Thumbtack cites a lower $115-250 for a simple swap — use the top of this range for complex/touchless faucets.'),

('plumbing', 'Repiping a house, whole-house', 'job', 1500.00, 15000.00,
  'Angi', 'https://www.angi.com/articles/cost-to-repipe-a-house.htm', '2026-11-15',
  'Deliberately broad range — typical cost is around $7,500. PEX (cheaper) vs. copper (pricier) is the main driver of where a job lands.'),

('plumbing', 'Sump pump installation', 'EA', 500.00, 4000.00,
  'This Old House', 'https://www.thisoldhouse.com/plumbing/sump-pump-cost', '2026-11-15',
  'Average around $1,400. A separate Angi page gives a narrower $1,200-2,500 — consistent with, but tighter than, this range.'),

('plumbing', 'Water softener / filtration system installation', 'EA', 1129.00, 3540.00,
  'HomeAdvisor', 'https://www.homeadvisor.com/cost/environmental-safety/install-a-water-treatment-and-purification-system', '2026-11-15',
  'Average around $2,273 for a whole-home system. Angi''s figure for basic softeners alone is much wider ($200-6,000) — a plain softener-only job can be cheaper than a full filtration system.'),

-- ---------------------------------------------------------------------------
-- DOORS & WINDOWS
-- ---------------------------------------------------------------------------

('doors_windows', 'Sliding glass patio door replacement', 'EA', 400.00, 3500.00,
  'NerdWallet', 'https://www.nerdwallet.com/article/mortgages/cost-to-replace-sliding-glass-door', '2026-11-15',
  'Angi''s own patio-door guide gives a wider $700-6,500 covering all patio door styles, not just sliding.'),

('doors_windows', 'Garage door replacement, single-car standard', 'EA', 500.00, 2500.00,
  'Angi', 'https://www.angi.com/articles/cost-garage-door-installation.htm', '2026-11-15',
  'Figure is from an archived 2023 snapshot of this page — more recent secondhand citations suggest the average may now run higher, roughly $844-3,498. A double-car door costs noticeably more.'),

('doors_windows', 'Storm door installation', 'EA', 257.00, 769.00,
  'Thumbtack', 'https://www.thumbtack.com/p/storm-door-installation-cost', '2026-11-15',
  'Page reported updated June 2026. Angi and Fixr give somewhat lower/older figures ($180-830).'),

('doors_windows', 'French doors / double door installation, per set', 'EA', 400.00, 4000.00,
  'Angi', 'https://angi.com/articles/average-cost-of-french-doors.htm', '2026-11-15',
  'For a double in-swing set. Other sources show a much wider spread up to $9,500 for interior load-bearing-wall installs — treat the high end cautiously.'),

('doors_windows', 'Window replacement, bay window', 'EA', 972.00, 5672.00,
  'Fixr', 'https://www.fixr.com/costs/bay-window-installation', '2026-11-15',
  'Updated August 2025. A distinct, larger/premium window type from the standard-size window already in this catalog. Angi''s figures for the same item range more widely, $900-7,100.'),

('doors_windows', 'Window screen replacement', 'EA', 147.00, 514.00,
  'Angi', 'https://www.angi.com/articles/how-much-window-screen-cost.htm', '2026-11-15',
  'HomeAdvisor (Angi-owned) corroborates with a near-identical range.'),

('doors_windows', 'Closet/bifold/sliding closet door installation', 'EA', 100.00, 300.00,
  'Angi', 'https://www.angi.com/articles/cost-to-install-closet-door.htm', '2026-11-15',
  'Standard low-cost bifold door. HomeGuide cites a broader $250-2,500 for sliding/mirrored/premium styles. Distinct from the regular interior door already in the "general" category.'),

-- ---------------------------------------------------------------------------
-- STAIRS & RAILINGS
-- ---------------------------------------------------------------------------

('stairs_railings', 'Stair tread and riser replacement', 'EA', 100.00, 220.00,
  'Angi', 'https://www.angi.com/articles/hardwood-stairs-cost.htm', '2026-11-15',
  'Per step, from Angi''s per-species table (oak/maple). The same Angi page elsewhere states a conflicting lower figure — flagging that internal inconsistency.'),

('stairs_railings', 'Stair railing/handrail installation', 'LF', 40.00, 120.00,
  'Angi', 'https://angi.com/articles/approximately-how-much-should-it-cost-install-stair-railing-has-5-stairs-railing-needed.htm', '2026-11-15',
  'Approximates installed wood through wrought iron. Premium glass/custom railing can run $100-600/LF, well above this range.'),

('stairs_railings', 'Stair baluster/spindle replacement', 'EA', 10.00, 50.00,
  'HomeGuide', 'https://homeguide.com/articles/baluster-vs-banister', '2026-11-15',
  'For wrought iron/steel balusters; wood runs lower ($3-30 each). A separate contractor listing cites a much higher $150-500 that looks like a fuller repair job, not a straight swap — weaker confidence, from a glossary page rather than a dedicated cost calculator.'),

('stairs_railings', 'Carpet runner installation on stairs', 'EA', 15.00, 55.00,
  'HomeGuide', 'https://homeguide.com/costs/cost-to-carpet-stairs', '2026-11-15',
  'Weakest-sourced item in this batch — this is general full-width stair-carpeting cost per step, not a runner-specific figure (none found from a marketplace source). Lower-authority sites suggest real runner jobs (partial-width, exposed wood sides, edge-binding) run notably higher, $40-100/step — treat this range as a floor.'),

('stairs_railings', 'Deck/porch railing installation', 'LF', 20.00, 60.00,
  'HomeGuide', 'https://homeguide.com/costs/deck-or-porch-railing-cost', '2026-11-15',
  'For standard wood or vinyl railing. Metal/composite runs $25-250/LF and cable/glass $60-600/LF — worth pricing separately for a premium material.'),

-- ---------------------------------------------------------------------------
-- CLOSETS & STORAGE
-- ---------------------------------------------------------------------------

('closets_storage', 'Closet wire/basic shelving installation', 'LF', 50.00, 150.00,
  'Angi', 'https://www.angi.com/articles/closet-organizer-cost.htm', '2026-11-15',
  'Covers the basic wire/economy tier. The same article separately cites $150-1,000 for a whole-closet DIY-installable prefab kit.'),

('closets_storage', 'Custom closet organizer system installation, mid-range (MDF)', 'LF', 140.00, 240.00,
  'Angi', 'https://www.angi.com/articles/how-much-do-custom-closets-cost.htm', '2026-11-15',
  'Angi breaks out material tiers per linear foot: laminate (budget) $125-150, MDF (mid-range) $140-240, cedar $200-500. Other sources cite a notably different range ($70-450+) — real cross-source variance on this item.'),

('closets_storage', 'Pantry shelving installation', 'job', 400.00, 750.00,
  'HomeAdvisor', 'https://www.homeadvisor.com/cost/storage-and-organization/build-pantry', '2026-11-15',
  'Melamine or maple/birch plywood shelving, materials + labor, for a reach-in pantry — not a full custom pantry build-out.'),

('closets_storage', 'Garage shelving/storage system installation', 'job', 505.00, 2152.00,
  'HomeAdvisor', 'https://www.homeadvisor.com/cost/garages/organize-a-garage', '2026-11-15',
  'National average around $1,325 for a full garage organization job. Fixr cites a much higher $2,500-5,000 for full cabinet+shelving+flooring systems — treat the high end here as scope-dependent.'),

-- ---------------------------------------------------------------------------
-- HVAC
-- ---------------------------------------------------------------------------

('hvac', 'Central air conditioning replacement, 2.5-3 ton', 'EA', 5800.00, 14400.00,
  'Fixr', 'https://www.fixr.com/costs/central-air-conditioner-installation', '2026-11-15',
  'National average $8,750 per Fixr, modeled on a 3-ton 16 SEER split system with new ductwork. This runs notably higher than other 2025 guides, which cluster around $4,500-10,000 — treat this as the upper-bound estimate.'),

('hvac', 'Furnace replacement, gas', 'EA', 3800.00, 10000.00,
  'Angi', 'https://match.angi.com/cost/heating-and-cooling/gas-furnace-prices', '2026-11-15',
  'Gas-specific figure. A broader all-fuel-type HomeAdvisor average is lower since it mixes in cheaper electric units.'),

('hvac', 'Ductwork installation/repair', 'LF', 10.00, 25.00,
  'Angi', 'https://www.angi.com/articles/ductwork-installation-cost.htm', '2026-11-15',
  'For like-for-like replacement. A retrofit with no existing ductwork runs well above this range, roughly $30-50/LF.'),

('hvac', 'Mini-split / ductless AC installation, per zone', 'EA', 2500.00, 6000.00,
  'HomeGuide', 'https://homeguide.com/costs/ductless-mini-split-ac-cost', '2026-11-15',
  'Unusually wide disagreement across sources for this item (other Angi pages give conflicting $1,500 flat vs. $1,300-9,100) — expect real variance by brand/BTU/mount type.'),

('hvac', 'Smart thermostat installation', 'EA', 200.00, 500.00,
  'HomeAdvisor', 'https://www.homeadvisor.com/cost/heating-and-cooling/smart-thermostat-installation', '2026-11-15',
  'Good cross-source agreement — Fixr independently corroborates the same range.'),

('hvac', 'HVAC system tune-up/service visit', 'visit', 75.00, 200.00,
  'HomeAdvisor', 'https://www.homeadvisor.com/cost/heating-and-cooling/service-maintain-ac-unit', '2026-11-15',
  'Source page last updated April 2024 — older than preferred, though other sources corroborate a similar range.'),

-- ---------------------------------------------------------------------------
-- EXTERIOR
-- ---------------------------------------------------------------------------

('exterior', 'Stucco repair/patch', 'SF', 8.00, 50.00,
  'This Old House', 'https://www.thisoldhouse.com/siding/stucco-repair-cost', '2026-11-15',
  'Wide range reflects small patches (low end) vs. extensive repair (high end).'),

('exterior', 'Stucco application, new (3-coat, standard)', 'SF', 7.00, 9.00,
  'Angi', 'https://angi.com/articles/how-much-does-it-cost-install-stucco-siding.htm', '2026-11-15',
  'Corroborated by HomeAdvisor with the same range.'),

('exterior', 'Vinyl siding installation', 'SF', 3.00, 12.00,
  'Angi', 'https://angi.com/articles/how-much-does-it-cost-install-vinyl-siding.htm', '2026-11-15',
  'This Old House gives a narrower installation-labor-only figure ($2.15-5.25/SF) as a different scope (excludes material cost).'),

('exterior', 'Fiber cement siding installation (HardiePlank-type)', 'SF', 7.00, 18.00,
  'Angi', 'https://angi.com/articles/how-much-does-it-cost-replace-vinyl-fiber-cement-siding.htm', '2026-11-15',
  'Midpoint around $12.50/SF. An older Angi article and Fixr give a lower $5-14/SF.'),

('exterior', 'Exterior painting, whole house', 'SF', 1.50, 4.00,
  'Angi', 'https://www.angi.com/articles/cost-paint-house-exterior.htm', '2026-11-15',
  'Includes priming; cut roughly in half if priming isn''t needed. Multi-story homes add about 50% per additional story.'),

('exterior', 'Pressure washing / soft washing, whole house', 'job', 161.00, 948.00,
  'Thumbtack', 'https://thumbtack.com/p/power-washing-prices', '2026-11-15',
  'Average $318. A separate Thumbtack Q&A page gives a lower average (~$250) — some internal inconsistency across Thumbtack''s own pages.'),

('exterior', 'Wood deck installation, new', 'SF', 30.00, 60.00,
  'Angi', 'https://angi.com/articles/how-much-does-it-cost-build-deck.htm', '2026-11-15',
  'Source page explicitly labeled 2024 data. High end reserved for second-story builds or premium wood. Does not include stairs (add roughly $1,000-2,000/flight).'),

('exterior', 'Deck repair/resurfacing', 'job', 866.00, 3583.00,
  'Angi', 'https://www.angi.com/articles/how-much-does-it-cost-repair-deck.htm', '2026-11-15',
  'For structural/board replacement. A separate, lighter-scope resurfacing-only job (sanding + stain, no structural work) runs much lower, roughly $500-1,400.'),

('exterior', 'Wood privacy fence installation, 6 ft', 'LF', 25.00, 50.00,
  'Angi', 'https://www.angi.com/articles/how-much-does-privacy-fence-cost.htm', '2026-11-15',
  'Fixr gives a lower, narrower $17-37/LF — some cross-source disagreement.'),

('exterior', 'Vinyl fence installation', 'LF', 15.00, 40.00,
  'Angi', 'https://www.angi.com/articles/vinyl-fence-cost.htm', '2026-11-15',
  'For a 6 ft fence; taller fences cost more per linear foot. Fixr corroborates with the same range.'),

('exterior', 'Aluminum fence installation', 'LF', 25.00, 75.00,
  'HomeAdvisor', 'https://homeadvisor.com/cost/fencing/install-an-aluminum-or-steel-fence', '2026-11-15',
  'Treat as a reasonable outer band rather than a tight estimate — other sources suggest simple aluminum runs toward the low end and ornamental toward the high end.'),

('exterior', 'Concrete driveway installation, new', 'SF', 8.00, 20.00,
  'Angi', 'https://angi.com/articles/how-much-does-concrete-driveway-cost.htm', '2026-11-15',
  'Labor is roughly half of total cost. Corroborated by a separate national-average figure near $8/SF.'),

('exterior', 'Concrete patio installation, new', 'SF', 4.00, 30.00,
  'Angi', 'https://angi.com/articles/concrete-patio-cost.htm', '2026-11-15',
  'Low end is plain broom/trowel finish; high end covers stamped/decorative finishes.'),

('exterior', 'Concrete repair/resurfacing', 'SF', 3.00, 9.00,
  'Angi', 'https://www.angi.com/articles/concrete-resurfacing-cost.htm', '2026-11-15',
  'Basic single-stain resurfacing runs toward the low end; extensive damage repair before resurfacing toward the high end. Decorative overlays cost more, up to $20-25/SF.'),

('exterior', 'Screen enclosure / pool cage, full rescreen', 'SF', 7.00, 9.00,
  'Angi', 'https://angi.com/articles/pool-screen-enclosure-repair-cost.htm', '2026-11-15',
  'Source page explicitly labeled 2024 data, the oldest in this batch. Florida-specific average on the same page runs around $1,125/job vs. a national average near $927.'),

('exterior', 'Hurricane impact window installation, HVHZ South Florida', 'EA', 950.00, 1500.00,
  'Republic Window & Door', 'https://republicwindow.com/blog/impact-windows-cost-south-florida/', '2026-11-15',
  'A named contractor''s own pricing page rather than an independent marketplace — no Angi/Fixr/HomeAdvisor figure was found for this specific HVHZ (Miami-Dade/Broward code) item. Treat with more caution than marketplace-sourced rows. A non-HVHZ Florida figure from another source runs $800-1,800/window.'),

('exterior', 'Hurricane shutters installation, accordion/aluminum', 'EA', 220.00, 520.00,
  'Angi', 'https://www.angi.com/articles/how-much-hurricane-shutters-cost.htm', '2026-11-15',
  'Per standard ~7 SF window. Fixr''s national average runs notably higher — real cross-source disagreement on this item.'),

-- ---------------------------------------------------------------------------
-- WATER MITIGATION / MOLD
-- ---------------------------------------------------------------------------

('water_mitigation', 'Emergency water extraction from floors/affected areas', 'SF', 3.75, 6.50,
  'Fixr', 'https://www.fixr.com/costs/water-damage-restoration', '2026-11-15',
  'Updated January 2025. Fixr breaks this out by contamination class: clean water $3.75-4.25/SF, gray water $4.10-6.50/SF, black water $7.00-7.50/SF. Corroborated by a separate Angi range of $3-7.50/SF overall.'),

('water_mitigation', 'Dehumidifier rental (per day)', 'day', 65.00, 105.00,
  'ServiceMaster Restore', 'https://www.servicemasterrestore.com/recovery-services/residential/water-damage/water-damage-restoration-equipment-rental', '2026-11-15',
  'A real published rate from a named restoration company for a-la-carte rental; rates vary by franchise/branch and this applies to standalone rentals, not bundled full-loss jobs.'),

('water_mitigation', 'Air mover rental (per day)', 'day', 30.00, 45.00,
  'ServiceMaster Restore', 'https://www.servicemasterrestore.com/recovery-services/residential/water-damage/water-damage-restoration-equipment-rental', '2026-11-15',
  'Same source/caveats as the dehumidifier rental line above.'),

('water_mitigation', 'Air scrubber / negative-air machine rental (per day)', 'day', 50.00, 110.00,
  'TheDryAir (equipment vendor)', 'https://thedryair.com/blogs/news/air-scrubber-cost', '2026-11-15',
  'Weaker source — no marketplace or restoration-franchise page gave a specific rate for this equipment; this is a named equipment vendor''s own blog, cross-checked loosely against a secondhand aggregator. Lower confidence than other rows in this category.'),

('water_mitigation', 'Containment barrier / plastic sheeting setup', 'job', 300.00, 800.00,
  'HVAC Base', 'https://www.hvacbase.org/mold-remediation-cost', '2026-11-15',
  'Weakest-sourced item in this batch — a single non-marketplace cost-guide site, not a marketplace or named contractor. No marketplace source prices containment as a standalone line; consider folding into the mold-remediation per-SF rate instead if this feels too uncertain to quote on its own.'),

('water_mitigation', 'Mold remediation (removal + treatment)', 'SF', 10.00, 25.00,
  'Angi', 'https://www.angi.com/articles/can-you-sell-house-mold-it.htm', '2026-11-15',
  'High confidence — corroborated independently across Angi, This Old House, and Fixr, all 2025-dated, all in the same $10-25/SF to $10-30/SF range. Smaller jobs run toward the high end due to minimum-charge effects.'),

('water_mitigation', 'Wet drywall removal and disposal', 'SF', 1.50, 3.00,
  'Fixr', 'https://www.fixr.com/costs/repair-drywall', '2026-11-15',
  'Moderate confidence — figure reached through secondary citations of this Fixr page rather than a direct read. Distinct from the normal drywall tear-out already in the "general" category; this is specifically water-damaged material removal with disposal.'),

('water_mitigation', 'Wet insulation removal and disposal', 'SF', 1.25, 2.50,
  'Angi', 'https://www.angi.com/articles/attic-insulation-removal-cost/il/chicago', '2026-11-15',
  'From Angi''s city-level pages, which explicitly note wet/contaminated material adds $0.50-1.50/SF over a dry-removal baseline — that wet-adjusted range is used here.'),

('water_mitigation', 'Debris/demolition haul-away, per truck load', 'load', 225.00, 450.00,
  'Angi', 'https://www.angi.com/articles/how-much-does-junk-removal-cost.htm', '2026-11-15',
  'Covers haul-away labor/truck only — landfill tipping fees are separate and vary by county (a real Florida example: Highlands County charges $55/ton for construction debris with a $35 minimum, per its FY2025-26 fee schedule).'),

('water_mitigation', 'Odor control / deodorization treatment, per room', 'job', 200.00, 1200.00,
  'Angi', 'https://www.angi.com/articles/how-much-does-fire-damage-restoration-cost.htm', '2026-11-15',
  'Sourced from Angi''s fire/smoke-damage article rather than a water-damage-specific one — the same equipment (ozone, hydroxyl, thermal fogging) is used for musty/mold odors, but flagging this as cross-category sourcing.'),

('water_mitigation', 'Moisture mapping / psychrometric monitoring, per visit', 'visit', 150.00, 500.00,
  'PickComfort (reporting on Stanley Steemer Restore pricing)', 'https://www.pickcomfort.com/restore-stanley-steemer-cost-typical-pricing-water-damage/', '2026-11-15',
  'Weaker source — a third-party site describing a named restoration brand''s typical pricing, not that brand''s own published rate card. No marketplace coverage found for this specific line item.'),

('water_mitigation', 'Content pack-out and storage, per month', 'month', 150.00, 500.00,
  'Swivl', 'https://swivl.tech/cost-guide/packout-contents-restoration', '2026-11-15',
  'Weaker source — a single non-marketplace contents-restoration cost-guide site with somewhat inconsistent figures across its own pages; used its most-repeated flat monthly band.');

-- ============================================================================
-- End of seed file.
-- ============================================================================
