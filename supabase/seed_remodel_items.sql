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
-- End of seed file.
-- ============================================================================
