-- ============================================================================
-- Beeyond Vault — seed_items.sql
--
-- DRAFT DATA FOR FRANKIE'S REVIEW. Every code_citation, xactimate_code, and
-- $ range below is a starting point, not verified. Nothing here should be
-- treated as final until you've gone through it line by line. Run AFTER
-- supabase/migration.sql.
--
-- 74 items across all 7 categories. Ranges are typical South Florida
-- (Miami-Dade / Broward / Palm Beach) retail pricing, current as drafted —
-- correct before launch.
-- ============================================================================

insert into public.items
  (category, title, description, why_owed, xactimate_code, code_citation, low_amount, high_amount, unit, region_note)
values

-- ---------------------------------------------------------------------------
-- ROOFING
-- ---------------------------------------------------------------------------
('roofing', 'Drip edge', 'Metal drip edge at all eaves and rakes.',
  'Required by code at every eave and rake. Estimates frequently include tear-off and shingles but skip drip edge entirely, or price it as an afterthought.',
  'RFG DRIP', 'FBC R905.2.8.5', 3.50, 5.50, 'LF', 'South Florida retail, aluminum drip edge'),

('roofing', 'Synthetic underlayment / secondary water barrier', 'Self-adhered or sealed-deck secondary water barrier system.',
  'Mandatory secondary water barrier per Florida Building Code, and required by the sealed-deck method in HVHZ counties. Often bundled into a generic "felt" line at a fraction of the real cost, or left off entirely.',
  'RFG UNDL', 'FBC R905.1.2; HVHZ sealed-deck requirements (Miami-Dade/Broward)', 55.00, 85.00, 'SQ', 'Self-adhered SBS underlayment, HVHZ counties'),

('roofing', 'Starter strip shingles', 'Factory starter strip at eaves and rakes.',
  'Manufacturer installation instructions and wind-rating requirements call for starter strip, not cut shingles turned upside down. Commonly omitted as a separate line.',
  'RFG STARC', 'Manufacturer install specs referenced by FBC R905.2.2', 30.00, 45.00, 'SQ', NULL),

('roofing', 'Ridge cap / hip and ridge shingles', 'High-profile or standard ridge cap shingles at all hips and ridges.',
  'Ridge cap is a distinct material and labor line from field shingles, rated separately for wind uplift. Frequently underpriced or folded into the field shingle quantity.',
  'RFG RIDGC', 'Manufacturer wind-rating install specs; FBC R905.2.8', 6.50, 9.50, 'LF', NULL),

('roofing', 'Steep charge (7/12 to 9/12 pitch)', 'Additional labor charge for steep-slope roof surfaces.',
  'Working a 7/12+ roof safely requires additional fall protection, staging, and time. The pitch is documented in the adjuster''s own measurements but the steep charge is frequently left off.',
  'RFG STEEP', 'Xactimate labor guidelines, steep charge tiers', 50.00, 85.00, 'SQ', 'Additional charge, not a standalone SQ price'),

('roofing', 'Steep charge (10/12 pitch and above)', 'Additional labor charge for very steep roof surfaces.',
  'Above 10/12, additional rigging, rope access, and reduced crew productivity apply. Often missing or under-tiered relative to the actual pitch.',
  'RFG STEEP2', 'Xactimate labor guidelines, steep charge tiers', 85.00, 130.00, 'SQ', 'Additional charge, not a standalone SQ price'),

('roofing', 'High charge (2 stories)', 'Additional labor charge for working at 2-story eave heights.',
  'Ladder setup, material staging, and safety requirements increase measurably above one story. The height is in the adjuster''s own sketch but the charge is frequently missing.',
  'RFG HIGH2', 'Xactimate labor guidelines, high charge tiers', 15.00, 30.00, 'SQ', 'Additional charge, not a standalone SQ price'),

('roofing', 'High charge (3 stories and above)', 'Additional labor charge for working at 3+ story eave heights.',
  'Higher elevations require additional rigging and reduce daily production further than the 2-story tier.',
  'RFG HIGH3', 'Xactimate labor guidelines, high charge tiers', 30.00, 50.00, 'SQ', 'Additional charge, not a standalone SQ price'),

('roofing', 'Ice & water shield at valleys', 'Self-adhered membrane at all roof valleys.',
  'Required at valleys as part of the water-resistant roof assembly. Frequently priced as generic underlayment instead of the correct ice & water product.',
  'RFG IWS', 'FBC R905.1.2', 2.50, 4.00, 'SF', NULL),

('roofing', 'Ice & water shield at penetrations and eaves', 'Self-adhered membrane at penetrations and eave edges.',
  'Required around pipe boots, skylights, and other penetrations, and at eaves in many wind-borne debris regions. Commonly left off the estimate.',
  'RFG IWSE', 'FBC R905.2.8.5', 2.50, 4.00, 'SF', NULL),

('roofing', 'Valley metal (open valley)', 'Formed metal valley flashing.',
  'Required where an open-valley detail is used. Estimates sometimes assume a closed-cut valley and skip metal entirely, or under-measure the linear footage.',
  'RFG VALLEY', 'FBC R905.2.8.2', 7.00, 11.00, 'LF', NULL),

('roofing', 'Pipe jacks / boots', 'New lead or rubber pipe boot at each roof penetration.',
  'Every plumbing vent penetration needs its own boot. Adjuster estimates frequently under-count penetrations relative to what''s actually on the roof.',
  'RFG PIPEJ', 'Manufacturer install specs; FBC R905.2.8.3', 65.00, 95.00, 'EA', NULL),

('roofing', 'Step flashing', 'New step flashing at sidewalls.',
  'Required anywhere a roof plane meets a vertical wall. Often assumed "reusable" on the estimate when it should be replaced with the roof.',
  'RFG FLASHS', 'FBC R905.2.8.3', 9.00, 14.00, 'LF', NULL),

('roofing', 'Counter flashing', 'New counter flashing over step or base flashing.',
  'Works with step flashing to complete a watertight wall transition. Frequently omitted as a separate line from step flashing.',
  'RFG FLASHC', 'FBC R905.2.8.3', 10.00, 16.00, 'LF', NULL),

('roofing', 'Chimney flashing (saddle / cricket)', 'New flashing and cricket at chimney.',
  'A chimney wider than 30 inches requires a cricket by code, and flashing should be replaced with the roof, not re-used. Frequently missing entirely.',
  'RFG CHIM', 'FBC R903.2.2', 350.00, 650.00, 'EA', NULL),

('roofing', 'Wall flashing (headwall / sidewall)', 'New flashing where roof meets a vertical wall not covered by step flashing.',
  'Headwall conditions need continuous flashing tied into the wall covering. Commonly underscoped relative to the linear footage actually present.',
  'RFG FLASHW', 'FBC R905.2.8.3', 9.00, 15.00, 'LF', NULL),

('roofing', 'Turtle vents / off-ridge vents', 'Low-profile static roof vents.',
  'Attic ventilation is required by code and existing vents must be replaced, not reused, when the roof is replaced. Often left off when a ridge vent is added elsewhere, even though both may be needed.',
  'RFG VENTT', 'FBC R806', 65.00, 95.00, 'EA', NULL),

('roofing', 'Ridge vent', 'Continuous ridge vent system.',
  'Required ventilation component under FBC R806 when used as the primary exhaust vent. Frequently priced as a single flat fee regardless of actual ridge length.',
  'RFG RIDGEV', 'FBC R806.2', 7.00, 11.00, 'LF', NULL),

('roofing', 'Roof decking replacement', 'Remove and replace deteriorated or damaged roof decking.',
  'Decking found to be delaminated, rotted, or otherwise non-nailable during tear-off must be replaced. Estimates often include a token allowance far below the sheet count actually needed.',
  'RFG DECK', 'FBC R905.2.8.5 (nailable deck requirement)', 75.00, 110.00, 'sheet (4x8)', NULL),

('roofing', 'Re-nailing decking to current code', 'Additional fastening of existing decking to current nailing pattern.',
  'Where existing decking does not meet the current nailing schedule, it must be brought up to code before re-roofing. This labor line is routinely missing from adjuster estimates.',
  'RFG RENAIL', 'FBC R905.1.1; 2020 nailing schedule update', 35.00, 55.00, 'SQ', NULL),

('roofing', 'Roofing permit fee', 'Municipal building permit for the re-roof.',
  'A permit is required for every re-roof in Florida. The fee is a real, billable cost and is often left off or underestimated relative to the actual municipality''s fee schedule.',
  'RFG PERMIT', 'Florida Building Code permitting requirement (FBC 105)', 250.00, 750.00, 'job', 'Varies significantly by municipality'),

('roofing', 'Debris haul-off / dumpster (roofing)', 'Roll-off dumpster and disposal for tear-off debris.',
  'Tear-off generates real disposal weight and cost. Frequently priced as a flat token amount well under actual local dumpster and tipping fees.',
  'RFG DEBRIS', NULL, 450.00, 950.00, 'job', NULL),

('roofing', 'Detach & reset — satellite dish', 'Remove and reinstall satellite dish to complete roofing work.',
  'Anything mounted to the roof has to come off before tear-off and go back on after. A common miss on estimates focused only on roofing materials.',
  'RFG D&R SAT', NULL, 75.00, 125.00, 'EA', NULL),

('roofing', 'Detach & reset — gutters', 'Remove and reinstall gutters to complete roofing work.',
  'Gutters at the eave line typically must be detached for proper drip edge and fascia work, then reset. Often missing as its own line.',
  'RFG D&R GUTT', NULL, 3.00, 5.00, 'LF', NULL),

('roofing', 'Detach & reset — solar panels', 'Remove and reinstall solar panel array to complete roofing work.',
  'Solar panels must be professionally detached and reset for the roof underneath to be replaced. This is a significant cost frequently missing or drastically underpriced.',
  'RFG D&R SOLAR', NULL, 150.00, 350.00, 'panel', 'Requires licensed solar installer in most cases'),

('roofing', 'Detach & reset — AC line sets', 'Remove and reinstall refrigerant line sets crossing the roof.',
  'Line sets routed across or penetrating the roof deck need to be detached and reset around roofing work. Commonly overlooked.',
  'RFG D&R ACLS', NULL, 95.00, 180.00, 'EA', NULL),

('roofing', 'Detach & reset — lightning rods', 'Remove and reinstall lightning protection system components.',
  'Lightning rod systems mounted to the roof must be detached and reset. Often missing entirely from the estimate.',
  'RFG D&R LTNG', NULL, 85.00, 150.00, 'EA', NULL),

('roofing', 'Tarping / emergency dry-in', 'Emergency tarp-over to prevent further water intrusion.',
  'When a roof is compromised, emergency dry-in is a legitimate, separately billable mitigation cost — not something absorbed into the eventual roof replacement price.',
  'RFG TARP', NULL, 2.50, 4.50, 'SF', 'Emergency service pricing'),

('roofing', 'Additional layer tear-off', 'Extra charge for removing a second layer of roofing material.',
  'A second layer of shingles or other roofing takes meaningfully more labor to remove than a single layer. Estimates sometimes price tear-off as if only one layer exists.',
  'RFG TEAR2', NULL, 45.00, 70.00, 'SQ', NULL),

-- ---------------------------------------------------------------------------
-- WATER MITIGATION
-- ---------------------------------------------------------------------------
('water_mitigation', 'Air mover, per day', 'Axial or centrifugal air mover rental, daily rate.',
  'Structural drying requires enough air movers, run for enough days, to actually dry the structure per IICRC S500. Estimates often price too few units or too few days.',
  'WTR AIRM', 'IICRC S500 structural drying standard', 35.00, 55.00, 'day/unit', NULL),

('water_mitigation', 'Low-grain refrigerant dehumidifier, per day', 'LGR dehumidifier rental, daily rate.',
  'An LGR dehumidifier is standard equipment for a proper drying chamber under IICRC S500 and is frequently missing or under-counted relative to the affected square footage.',
  'WTR LGR', 'IICRC S500 structural drying standard', 75.00, 120.00, 'day/unit', NULL),

('water_mitigation', 'Air scrubber / HEPA filtration, per day', 'HEPA air scrubber rental, daily rate.',
  'Required to control airborne particulates during drying and demolition, particularly with any contamination category above clean water.',
  'WTR SCRUB', 'IICRC S500 structural drying standard', 65.00, 95.00, 'day/unit', NULL),

('water_mitigation', 'Moisture mapping / psychrometric readings', 'Documented moisture readings and drying log across the affected area.',
  'IICRC S500 requires ongoing documentation of moisture content and drying progress. This documentation labor is a legitimate line item, not a freebie.',
  'WTR MOIST', 'IICRC S500 documentation requirements', 85.00, 150.00, 'visit', NULL),

('water_mitigation', 'Antimicrobial / EPA-registered application', 'Application of EPA-registered antimicrobial to affected structural surfaces.',
  'Standard practice on any water loss to inhibit microbial growth before rebuild. Frequently omitted or priced as a flat token fee regardless of area.',
  'WTR ANTI', 'IICRC S500', 0.35, 0.65, 'SF', NULL),

('water_mitigation', 'Content manipulation (move & block)', 'Moving and blocking furniture/contents to access affected areas.',
  'Real labor to safely move and store contents so mitigation and drying equipment can be placed. Often missing per-room.',
  'WTR CONT', NULL, 45.00, 75.00, 'room', NULL),

('water_mitigation', 'Floor protection', 'Ram board or poly floor protection through work areas.',
  'Protecting unaffected flooring during mitigation and repair work is standard practice and a legitimate cost.',
  'WTR FLRP', NULL, 0.45, 0.75, 'SF', NULL),

('water_mitigation', 'Containment / critical barriers', 'Poly sheeting containment to isolate the work area.',
  'Required to prevent cross-contamination and control the drying chamber, especially with any category 2/3 water.',
  'WTR CONTAIN', 'IICRC S500 / S520 containment practices', 1.75, 2.75, 'SF', NULL),

('water_mitigation', 'Water extraction', 'Standing water extraction from affected surfaces.',
  'The first and most basic mitigation step. Should be priced per the actual affected square footage, not folded into a flat "mitigation" allowance.',
  'WTR EXTR', 'IICRC S500', 3.50, 5.50, 'SF', NULL),

('water_mitigation', 'Monitoring visits', 'Daily drying-progress monitoring visit.',
  'IICRC S500 calls for daily monitoring until the structure reaches dry standard. Each visit is a legitimate, separately billable line.',
  'WTR MON', 'IICRC S500', 75.00, 125.00, 'visit', NULL),

('water_mitigation', 'PPE (personal protective equipment)', 'Tyvek suits, respirators, gloves for the mitigation crew.',
  'Required safety equipment for any water/mold-related mitigation job, and a real, consumable cost.',
  'WTR PPE', 'OSHA general PPE requirements', 45.00, 95.00, 'job', NULL),

-- ---------------------------------------------------------------------------
-- MOLD
-- ---------------------------------------------------------------------------
('mold', 'Mold assessment / protocol', 'Written mold assessment and remediation protocol.',
  'Florida requires mold assessment to be performed and documented by a licensed Mold Assessor, separate from the remediation contractor. This is a distinct, billable professional service.',
  'MOLD ASSESS', 'Fla. Stat. 468, Part XVI (Mold-Related Services)', 350.00, 650.00, 'visit', NULL),

('mold', 'Mold containment (negative pressure enclosure)', 'Full containment with negative air pressure for remediation area.',
  'Standard IICRC S520 practice to prevent cross-contamination during remediation. Frequently underscoped in size or omitted.',
  'MOLD CONTAIN', 'IICRC S520', 2.25, 3.50, 'SF', NULL),

('mold', 'HEPA vacuuming of affected surfaces', 'HEPA vacuum cleaning of surfaces within the remediation area.',
  'A required cleaning step under IICRC S520 before and after remediation, not a general cleaning task.',
  'MOLD HEPA', 'IICRC S520', 0.85, 1.35, 'SF', NULL),

('mold', 'Negative air machine, per day', 'Negative air machine rental with HEPA filtration, daily rate.',
  'Maintains negative pressure in the containment area throughout remediation, a core IICRC S520 requirement.',
  'MOLD NEGAIR', 'IICRC S520', 85.00, 130.00, 'day/unit', NULL),

('mold', 'Post-remediation verification (clearance testing)', 'Independent clearance testing/visual inspection after remediation.',
  'Florida-licensed Mold Assessors perform clearance testing before an area can be closed up. This is a separate, required professional service, not included in remediation labor.',
  'MOLD PRV', 'Fla. Stat. 468, Part XVI (Mold-Related Services)', 300.00, 500.00, 'visit', NULL),

-- ---------------------------------------------------------------------------
-- INTERIOR
-- ---------------------------------------------------------------------------
('interior', 'Drywall removal & replacement', 'Remove and replace water/wind-damaged drywall.',
  'Priced per the actual affected square footage — estimates sometimes cap drywall replacement at a flat room allowance well under real scope.',
  'DRY R&R', NULL, 2.25, 3.25, 'SF', NULL),

('interior', 'Texture match', 'Match existing wall/ceiling texture (knockdown, orange peel, etc.) at drywall repairs.',
  'New drywall patches need texture matched to the surrounding surface to be an acceptable repair, not just mudded flat.',
  'INT TEXT', NULL, 1.10, 1.75, 'SF', NULL),

('interior', 'Paint — walls (2 coats)', 'Prime and paint walls, two finish coats.',
  'A proper repaint is two coats over primer, not a single coat. Estimates sometimes price a single-coat allowance.',
  'INT PAINTW', NULL, 1.35, 1.95, 'SF', NULL),

('interior', 'Paint — ceiling', 'Prime and paint ceiling.',
  'Ceilings are frequently left off the paint scope even when adjacent wall or water damage requires ceiling repair and refinishing.',
  'INT PAINTC', NULL, 1.25, 1.85, 'SF', NULL),

('interior', 'Paint — trim and doors', 'Paint baseboard, casing, and door trim.',
  'Trim repaint is a distinct line item from wall paint and is commonly dropped from the estimate even when baseboard is being replaced.',
  'INT PAINTT', NULL, 2.50, 4.00, 'LF', NULL),

('interior', 'Primer (seal coat)', 'Stain- or odor-blocking primer prior to finish paint.',
  'Required on water-damaged surfaces to seal stains and odors before finish coats — skipping it means the stain bleeds through.',
  'INT PRIME', NULL, 0.55, 0.85, 'SF', NULL),

('interior', 'Mask and protect', 'Masking and protection of floors, cabinets, and fixtures during paint/repair work.',
  'Standard prep labor for any interior repaint or repair, and a legitimate line separate from the paint labor itself.',
  'INT MASK', NULL, 0.35, 0.55, 'SF', NULL),

('interior', 'Baseboard remove & replace', 'Remove and replace damaged baseboard.',
  'Water-damaged baseboard (especially MDF) needs full replacement, not just repaint, and should be priced per linear foot actually affected.',
  'INT BASE', NULL, 3.50, 5.50, 'LF', NULL),

('interior', 'Cabinet detach & reset', 'Detach and reset base or upper cabinets to allow flooring/wall work underneath.',
  'Cabinets often have to come off the wall for flooring or drywall work to be done correctly, then be reset and re-leveled. Commonly missing as its own line.',
  'INT CABDR', NULL, 45.00, 75.00, 'LF', NULL),

('interior', 'Flooring removal & replacement (LVP/laminate)', 'Remove and replace damaged resilient flooring.',
  'Water-damaged floating floors need full removal and replacement, priced per the actual affected area.',
  'INT FLR', NULL, 4.50, 7.50, 'SF', NULL),

('interior', 'Tile flooring remove & replace', 'Remove and replace damaged tile flooring, including thinset removal.',
  'Tile removal is materially more labor-intensive than resilient flooring and should be priced accordingly, not lumped in with LVP pricing.',
  'INT TILE', NULL, 8.00, 14.00, 'SF', NULL),

('interior', 'Floor underlayment / moisture barrier', 'New underlayment or moisture barrier beneath replacement flooring.',
  'Required beneath most replacement flooring systems, especially after a water loss, and is frequently left off as a separate line.',
  'INT UNDL', NULL, 0.85, 1.35, 'SF', NULL),

('interior', 'Insulation replacement', 'Remove and replace water-damaged batt insulation.',
  'Wet insulation loses R-value and can support microbial growth — it needs to be replaced, not dried in place. Often omitted from interior scopes.',
  'INT INSUL', NULL, 1.10, 1.75, 'SF', NULL),

-- ---------------------------------------------------------------------------
-- EXTERIOR
-- ---------------------------------------------------------------------------
('exterior', 'Fascia remove & replace', 'Remove and replace damaged fascia board.',
  'Fascia damaged during a roof loss (wind, water intrusion at the eave) needs full replacement, priced by the linear foot actually affected.',
  'EXT FASC', NULL, 6.00, 9.00, 'LF', NULL),

('exterior', 'Soffit remove & replace (vented)', 'Remove and replace vented soffit panels.',
  'Vented soffit is part of the required attic ventilation system, not just a cosmetic panel, and must be replaced to spec.',
  'EXT SOFF', 'FBC R806 (ventilation)', 6.50, 10.00, 'LF', NULL),

('exterior', 'Gutters remove & replace (seamless aluminum)', 'Remove and replace seamless aluminum gutters.',
  'Gutters damaged during the loss event or removed for roofing/fascia work often need full replacement, priced per linear foot.',
  'EXT GUTT', NULL, 7.00, 11.00, 'LF', NULL),

('exterior', 'Downspouts remove & replace', 'Remove and replace damaged downspouts.',
  'Frequently bundled loosely into a gutter allowance instead of priced on its own linear footage.',
  'EXT DOWN', NULL, 6.00, 9.00, 'LF', NULL),

('exterior', 'Screen enclosure repair / rescreen', 'Repair or rescreen damaged pool/patio screen enclosure panels.',
  'Wind-damaged screen panels are a common and legitimate exterior loss item, and panel replacement should reference Miami-Dade product approval where applicable.',
  'EXT SCRN', 'Miami-Dade NOA for screen enclosure components (where applicable)', 3.50, 6.00, 'SF', NULL),

('exterior', 'Stucco patch and texture match', 'Patch and texture-match damaged stucco.',
  'A proper stucco repair matches the existing texture and finish — a skim patch that doesn''t match is a substandard repair, not a like-kind-and-quality one.',
  'EXT STUCCO', NULL, 9.00, 14.00, 'SF', NULL),

('exterior', 'Exterior paint (body)', 'Prime and paint exterior wall surfaces.',
  'When stucco or siding repair affects a wall plane, the full plane typically needs to be repainted to avoid visible patching — not just the repaired section.',
  'EXT PAINT', NULL, 1.10, 1.65, 'SF', NULL),

-- ---------------------------------------------------------------------------
-- GENERAL CONDITIONS
-- ---------------------------------------------------------------------------
('general_conditions', 'Overhead & Profit (3+ trades)', 'General contractor overhead & profit when 3 or more trades are involved.',
  'Industry-standard practice (and Xactimate guidance) applies O&P when a loss requires coordinating 3 or more trades. Multi-trade losses routinely get priced without it.',
  'GC OP', 'Xactimate / industry-standard O&P guidelines', 10.00, 20.00, '% of RCV', 'Typically 10% overhead + 10% profit'),

('general_conditions', 'Supervision / project management', 'On-site supervision and project management labor.',
  'Coordinating multiple trades and daily oversight is real, billable labor on any job of meaningful size or complexity.',
  'GC SUPER', NULL, 75.00, 125.00, 'day', NULL),

('general_conditions', 'Temporary power', 'Temporary power hookup for equipment during mitigation/repair.',
  'Drying equipment and power tools need a power source, especially when the structure''s own power is compromised. A real, billable cost.',
  'GC TEMPPWR', NULL, 150.00, 350.00, 'job', NULL),

('general_conditions', 'Dumpster (general job)', 'Roll-off dumpster for non-roofing construction debris.',
  'General demo and construction debris disposal beyond the roofing tear-off dumpster, priced separately for interior/exterior scope.',
  'GC DUMP', NULL, 450.00, 850.00, 'job', NULL),

('general_conditions', 'Final cleaning', 'Construction-final cleaning of the work area before turnover.',
  'A finished job includes a real final clean, not just debris removal — commonly dropped from the estimate entirely.',
  'GC CLEAN', NULL, 0.20, 0.35, 'SF', NULL),

('general_conditions', 'Contents pack-out & storage', 'Pack out and offsite storage of contents during repairs.',
  'When repairs require a room or unit to be cleared and inaccessible, pack-out and storage is a legitimate, separately billable cost.',
  'GC PACKOUT', NULL, 350.00, 650.00, 'room', 'Per room, per month of storage'),

-- ---------------------------------------------------------------------------
-- CODE UPGRADES
-- ---------------------------------------------------------------------------
('code_upgrades', 'Ordinance & Law coverage upgrade', 'Cost to bring the damaged structure up to current code, beyond like-kind-and-quality repair.',
  'Current Florida Building Code often requires more than a like-kind repair (e.g., full roof system replacement instead of a partial). This gap is an Ordinance & Law cost, not a discretionary upgrade.',
  'CU ORDLAW', 'FBC 2020 (current edition); local ordinance', 10.00, 25.00, '% of RCV', 'Coverage and application vary by policy — verify Ordinance & Law limits'),

('code_upgrades', 'HVHZ compliance upgrade', 'Additional cost to meet High Velocity Hurricane Zone requirements.',
  'Properties in HVHZ counties (Miami-Dade, Broward) face stricter code requirements than the rest of the state — sealed deck, enhanced fastening, product approvals — that a non-HVHZ estimate template will miss.',
  'CU HVHZ', 'FBC Chapter 16A / R301.2.1.2 (HVHZ)', 500.00, 2500.00, 'job', 'Miami-Dade and Broward County only'),

('code_upgrades', 'Miami-Dade NOA product approval documentation', 'Sourcing and documenting Miami-Dade Notice of Acceptance (NOA) compliant products.',
  'HVHZ jurisdictions require installed products to carry a current Miami-Dade NOA or FL product approval. Specifying and documenting compliant products is real scoping work, and substitutions without it can fail inspection.',
  'CU NOA', 'Miami-Dade County Product Control; FBC Chapter 16A', 250.00, 750.00, 'job', 'Miami-Dade and Broward County (HVHZ)');

-- ============================================================================
-- End of seed data. 74 items loaded.
-- ============================================================================
