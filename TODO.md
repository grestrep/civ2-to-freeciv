# Civ2 to Freeciv Converter TODO

This file tracks remaining features, validation work, and known fidelity gaps for the reusable Civ2 to Freeciv conversion workflow.

## High Priority

### MGE Unit Veterancy

- Current concern: at least one MGE WW79 unit appears incorrectly marked veteran in Freeciv.
- Example: Soviet Armor at Civ2 tile `94,22` is not veteran in Civ2 but became veteran in Freeciv.
- Need a known positive veteran MGE example or a controlled save diff before changing the decoder.
- Avoid blindly changing Classic/CiC veterancy logic while investigating MGE.

### Transported Units

- Basic transport assignment exists, but needs stronger validation.
- Check ruleset transport capacity before assigning cargo.
- Check whether the carrier/transport can carry the specific cargo class.
- Test non-air transported units, sea transports, carriers, and stacked mixed units.
- Add clearer transport assignment reporting.

### Fortify, Fortified, and Sleep Orders

- Civ2 distinguishes `Fortify` order from `Fortified` state.
- Freeciv may not have a perfect one-to-one representation for both states.
- Keep version-specific decoding documented.
- Validate Classic/CiC and MGE separately with controlled before/after saves.

### MGE Support Polish

- MGE support is usable, but still needs wider scenario validation.
- Re-check units, diplomacy, production, food stock, and city improvements across more MGE maps.
- Keep sentinel/dead/disbanded unit handling gated by extracted unit layout.

### Research Bulbs / Science Progress

- Current builder maps extracted `researchProgress` into Freeciv bulbs.
- Known discrepancy: WW2 Hitler showed Civ2 UI research progress `299`, while extracted data did not clearly match that display.
- Need to identify the exact Civ2 field used by the UI for accumulated research toward the current tech.

### Diplomacy Edge Cases

- Current decoder handles contact, treaties, embassy, last contact, and attitude/love.
- Continue cross-checking Classic/CiC and MGE because diplomacy bytes can have subtle version-specific behavior.
- Keep testing no-contact scenarios, embassy flags, cease-fire/peace/war/alliance, and attitude values.

## Medium Priority

### Shared Converter Packaging

- The workflow is mostly data-driven, but scenario projects still use wrapper files and copied config patterns.
- Goal: make one reusable converter package where each scenario needs only config and mapping files.
- Consider adding a single documented command flow for extract/build/validate.

### Ruleset Generalization

- Current workflow mostly targets Freeciv `civ2civ3`.
- Supporting `civ2`, `classic`, or custom rulesets requires reading target ruleset data dynamically.
- Areas to generalize:
  - units
  - buildings/improvements
  - technologies
  - governments
  - extras
  - fallback production choices

### Barbarian Behavior

- Barbarian cities, units, treasury, tax/science/luxury rates, and research are now mapped.
- Still validate Freeciv-specific barbarian behavior:
  - diplomacy
  - visibility
  - AI behavior
  - teams
  - special barbarian engine rules

### City Production and Food Stock in MGE

- Classic production shield stock is mapped.
- MGE city box layout has been partially validated, but full support is parked.
- Need more MGE examples for food stock, shield stock, and current production.

### Validation Reports

- Reports are much better now, but can still improve.
- Add or expand explicit sections for:
  - barbarian mapping summary
  - transport assignments
  - veterancy uncertainty
  - per-player extracted-vs-built counts
  - city production fallbacks
  - diplomacy oddities
  - visibility summary

## Lower Priority / Parked

### Huts / Villages

- Hut/village mapping is parked.
- Need to determine whether Civ2 stores huts as:
  - terrain specials
  - extra flags
  - map-generated state
  - another field

### City Worked Tiles / Citizen Allocation

- Current city labor placement is simplified.
- Exact Civ2 worked-tile state would improve fidelity, especially city output and specialists.
- Need to decode per-city worked tiles or reconstruct them reliably.

### Grassland Shield Bonus Fidelity

- Non-grassland resources are mapped.
- Grassland shield resources are currently simulated because exact Civ2 storage/generation was not identified.
- Current algorithm should remain configurable and easy to disable.

