-- ============================================================================
-- Beeyond Vault — seed_price_references.sql
--
-- Starter rows for the price_references table (see migration.sql for why
-- this is a separate table from `items`, not merged into it).
--
-- Every row here is traceable to a real, named source checked on the date
-- given. This is NOT the same thing as a licensed Xactimate/Symbility price
-- list — these are independent market reference ranges, clearly labeled as
-- such, and nothing here should ever be presented to a customer as an
-- official estimating-platform price.
--
-- What's deliberately NOT here: every "local South Florida contractor"
-- source from an earlier research pass (Water and Fire Contracting
-- Services, C.E.R.T. Restoration, UCMOLD, J. Perry & Sons, Goliath Roofing
-- of Florida, Storm Recovery Alliance) turned out to be unverifiable —
-- none of those businesses or domains could be found anywhere on the web,
-- and every one of their claimed URLs failed to resolve at all. Treat that
-- as a standing lesson: AI-drafted "published pricing" from specific named
-- businesses needs independent confirmation before it goes anywhere near
-- this table, not just a plausible-looking source name.
--
-- Run supabase/migration.sql first (adds the price_references table).
-- ============================================================================

insert into public.price_references
  (category, description, unit, price_low, price_high, region_note, state, source_name, source_url, last_verified_date, notes)
values

('mold', 'Mold remediation, contaminated area', 'SF', 10.00, 25.00, 'South Florida', 'FL',
  'AdvantaClean (Fort Lauderdale)', 'https://www.advantaclean.com/ft-lauderdale-fl/about-us/blog/mold-remediation-cost-south-florida/',
  '2026-11-13', 'Most single-room residential jobs fall between $1,500 and $6,000 total. Priced by contaminated square footage, not total home size.'),

('mold', 'Post-remediation clearance verification', 'job', 300.00, 500.00, 'South Florida', 'FL',
  'AdvantaClean (Fort Lauderdale)', 'https://www.advantaclean.com/ft-lauderdale-fl/about-us/blog/mold-remediation-cost-south-florida/',
  '2026-11-13', 'Separate third-party clearance testing fee, billed on top of the remediation cost itself.'),

('interior', 'Drywall installation (materials + labor)', 'SF', 1.50, 3.00, 'Florida (statewide)', 'FL',
  'Angi 2026 cost guide', 'https://www.angi.com/articles/what-cost-install-drywall.htm',
  '2026-11-13', 'National benchmark figure applied by Angi to Florida; labor alone runs $1.00-$2.10/SF of that range. Small patch jobs typically cost more per square foot than this due to minimum-charge pricing — do not apply this range to jobs under roughly 100 SF.'),

('water_mitigation', 'Water damage restoration, typical residential job', 'job', 1200.00, 5000.00, 'Palm Beach County', 'FL',
  'PuroClean Plantation', 'https://www.puroclean.com/plantation-fl-puroclean-plantation/blog/cost-of-water-damage-cleanup-in-palm-beach',
  '2026-11-13', 'Whole-job range, not a per-unit rate — covers a typical clean-water loss. Black-water/Category 3 losses can run 2-3x higher per this same source.'),

('water_mitigation', 'Water damage restoration, typical residential job', 'job', 1382.00, 6350.00, 'National (no Florida-specific figure found)', null,
  'HomeAdvisor, as cited by PuroClean Pompano Beach', 'https://www.puroclean.com/pompano-beach-fl/blog/how-much-does-professional-water-damage-restoration-typically-cost/',
  '2026-11-13', 'This is a national average, not South Florida-specific — kept separate from the Palm Beach row above rather than blended with it. Useful only as a rough sanity-check range until a real Florida-specific figure is found.');

-- Run this file once. Re-running it will insert duplicate rows (no unique
-- constraint to catch a re-run) — same as seed_items.sql's own convention.

-- ============================================================================
-- End of seed file.
-- ============================================================================
