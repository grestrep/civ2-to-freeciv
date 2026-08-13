# Civ2 to Freeciv Converter

Node.js scripts to convert a Civilization 2 .SCN or .SAV file to Freeciv 3.2+ format. It has been tested to output Freeciv saves for the "civ2civ3" and "classic" rulesets but other rulesets are possible as well.
It supports decoding Civ2 Classic, Conflicts in Civilization (CiC), Fantastic Worlds (FW), and Multiplayer Gold Edition (MGE) .SCN or .SAV files.

At a high level the workflow is as follows:

1) extract.js: This script decodes a Civ2 SCN/SAV file into JSON human-readable files.
2) build.js: This script takes as input the files from Extract.js and outputs a playable Freeciv save file. For this to work, you have to provide a "Conversion Config" file to map certain Civ2 elements over to Freeciv representations. More documentation on this below.

You can find samples of converted scenarios with all relevant files required for conversion inside the "samples" folder that you can use as a starting point. It contains also extract and build bat files that you can use for your workflow.

## Workflow

Run extraction from a scenario folder:

```bat
node D:\freeciv\projects\civ2-freeciv-converter\extract.js --extract-config extract-config.json
```

Run build from a scenario folder:

```bat
node D:\freeciv\projects\civ2-freeciv-converter\build.js --build-config build-config.json
```

You can temporarily override the conversion config from the command line:

```bat
node D:\freeciv\projects\civ2-freeciv-converter\build.js --build-config build-config.json --config alternate-conversion-config.json
```

`--config` only overrides the `conversionConfig` file. Other inputs still come
from `build-config.json`. The override path is resolved from the current working
directory, so run the command from the scenario folder or use an absolute path.

Each scenario folder owns its own config and mapping files:

```text
extract-config.json
build-config.json
conversion-config.json
*-unit-map.json
*-improvement-map.json
*-tech-map.json
*-government-map.json
extracted-civ2/
```

The extractor writes blank starter maps in `extracted-civ2/`:

```text
template-unit-map.json
template-improvement-map.json
template-tech-map.json
template-government-map.json
```

## New Scenario Checklist

Use this checklist when starting a new Civ2 scenario conversion:

1. Create a scenario folder.
2. Put the Civ2 `.SCN` or `.SAV` file in that folder.
3. Put the matching Civ2 `RULES.TXT` in that folder when the scenario has one.
4. Create `extract-config.json`.
5. Run `extract.js`.
6. Copy or rename the generated `template-*-map.json` files into scenario-specific mapping files.
7. Fill in the unit, improvement, tech, and government maps with target Freeciv names.
8. Create `conversion-config.json` with the player/faction setup.
9. Create `build-config.json` pointing to the extracted files, mapping files, conversion config, template, and ruleset files.
10. Run `build.js`.
11. Review the terminal output and validation/unmapped reports.
12. Load the generated `.sav.zst` in the Freeciv server.

The main relationship between files is:

```text
extract-config.json
  -> extract.js
  -> extracted-civ2/* and template-*-map.json

template-*-map.json
  -> copied/renamed and filled in manually
  -> unitMap / improvementMap / techMap / governmentMap

build-config.json
  -> points to extracted files, rulesets, template, maps, and conversionConfig
  -> build.js
  -> generated Freeciv .sav and .sav.zst

conversion-config.json
  -> controls players, diplomacy-adjacent player metadata, terrain overrides,
     feature transforms, resources, tech overrides, and city improvement overrides
```

## Extract Config

`extract-config.json` tells the extractor where the Civ2 scenario/save is and
where to write extracted data. It lives in the scenario folder and paths are
resolved relative to that file:

```json
{
  "input": "Havana.scn",
  "outputPrefix": "havana",
  "outputDir": "extracted-civ2",
  "rules": "Rules.txt"
}
```

Fields:

- `input`: required Civ2 `.SCN` or `.SAV` file.
- `rules`: optional Civ2 `RULES.TXT` file. Strongly recommended when available.
- `outputDir`: optional output folder. Defaults to `extracted-civ2`.
- `outputPrefix`: optional generated-file prefix. Defaults to the input filename without extension.

The `rules` file lets the extractor name Civ2 units, improvements, technologies,
governments, leaders, plurals, and adjectives. If `rules` is omitted, extraction
can still run, but generated mapping templates and faction metadata may be less
complete.

The extractor also reads the scenario's global Civ2 barbarian activity setting
from the common header. It is written as `header.barbarianActivity` in the JSON
reports and printed in the terminal. The supported values are `0` (Villages
Only), `1` (Roving Bands), `2` (Restless Tribes), and `3` (Raging Hordes).

The extractor writes files such as:

```text
<prefix>-map-and-cities.json
<prefix>-factions.json
<prefix>-diplomacy.json
<prefix>-technologies.json
<prefix>-units.json
<prefix>-cities.csv
<prefix>-units.csv
<prefix>-map-preview.txt
<prefix>-native-map-preview.txt
<prefix>-road-preview.txt
<prefix>-native-road-preview.txt
<prefix>-river-preview.txt
<prefix>-native-river-preview.txt
<prefix>-freeciv-map-fragment.sav
<prefix>-freeciv-native-map-fragment.sav
<prefix>-freeciv-city-fragment.sav
template-unit-map.json
template-improvement-map.json
template-tech-map.json
template-government-map.json
```

The `template-*-map.json` files are starter mapping files. They are not used
directly unless you point `build-config.json` at them. The usual workflow is to
copy or rename them to scenario-specific files such as `havana-unit-map.json`,
fill in the Freeciv target names, and reference those files from `build-config.json`.

- `template-unit-map.json`: maps Civ2 unit names from `RULES.TXT` to Freeciv unit names.
- `template-improvement-map.json`: maps Civ2 city improvement/wonder names to Freeciv building names.
- `template-tech-map.json`: maps Civ2 technology names to Freeciv advance names.
- `template-government-map.json`: maps Civ2 government names to Freeciv government names.

Each map value can be an empty string to intentionally skip that Civ2 item during
build. For units, an empty value means units of that Civ2 type are not written to
the Freeciv save. For improvements, techs, and governments, empty values mean
the corresponding item is not mapped.

Recommended extraction workflow:

1. Put `extract-config.json` in the scenario folder.
2. Set `input` to the Civ2 scenario/save file.
3. Set `rules` to the matching `RULES.TXT` if one exists.
4. Run `extract.js`.
5. Copy or rename the generated `template-*-map.json` files into scenario-specific map files.
6. Reference the extracted JSON and map files from `build-config.json`.

## Build Config

`build-config.json` tells the builder which extracted files, manual mapping
files, Freeciv ruleset files, and save template to use. It lives in the scenario
folder and paths are resolved relative to that file unless an absolute path is
provided.

A typical build config looks like this:

```json
{
  "mode": "freeciv21V3",
  "scenario": {
    "name": "Spanish-American War - Civ2",
    "authors": "Lucius Papirius Cursor",
    "description": "",
    "descriptionFile": "Havana.txt",
    "descriptionEncoding": "windows-1252"
  },
  "template": "D:/freeciv/projects/civ2-freeciv-converter/templates/freeciv-template-civ2civ3.sav",
  "freecivUnitsRuleset": "D:/freeciv/3.2.1/qt6/data/civ2civ3/units.ruleset",
  "freecivBuildingsRuleset": "D:/freeciv/3.2.1/qt6/data/civ2civ3/buildings.ruleset",
  "freecivTechsRuleset": "D:/freeciv/3.2.1/qt6/data/civ2civ3/techs.ruleset",
  "freecivTerrainRuleset": "D:/freeciv/3.2.1/qt6/data/civ2civ3/terrain.ruleset",
  "extracted": "extracted-civ2/havana-map-and-cities.json",
  "diplomacy": "extracted-civ2/havana-diplomacy.json",
  "technologies": "extracted-civ2/havana-technologies.json",
  "mapFragment": "extracted-civ2/havana-freeciv-map-fragment.sav",
  "conversionConfig": "havana-conversion-config.json",
  "unitMap": "havana-unit-map.json",
  "improvementMap": "havana-improvement-map.json",
  "techMap": "havana-tech-map.json",
  "governmentMap": "havana-government-map.json",
  "outputs": {
    "freeciv21V3": "havana-freeciv-playable-v3-freeciv21.sav"
  },
  "validationReport": "havana-validation-report.json",
  "unmappedUnitsReport": "extracted-civ2/havana-unmapped-units.json",
  "unmappedTechsReport": "extracted-civ2/havana-unmapped-techs.json",
  "unmappedImprovementsReport": "extracted-civ2/havana-unmapped-improvements.json",
  "unitHomecityReport": "extracted-civ2/havana-unit-homecity-issues.json"
}
```

Current builder mode:

- The builder currently writes the canonical `freeciv21V3` output.
- `outputs.freeciv21V3` must be present in `build-config.json`.
- The sample `"mode": "freeciv21V3"` field is informational/reserved for future use; the current builder does not switch modes from that field.

### Template

`template` is the Freeciv save used as the structural base for the generated
save. The builder replaces the map, players, cities, units, technologies, and
other sections inside this template.

The template also provides important Freeciv save vectors, such as:

- `extras_vector`: the order of tile extras and resources.
- `activities_vector`: the order of unit activity ids.
- player, city, unit, and map section structure.

Choose a template that matches the target Freeciv ruleset and save format. The
converter repository includes templates under `templates/`, for example:

```text
templates/freeciv-template-civ2.sav
templates/freeciv-template-civ2civ3.sav
templates/freeciv-template-classic.sav
```

### Freeciv Ruleset Files

The builder reads Freeciv ruleset files so it can write valid Freeciv rule names,
indexes, terrain identifiers, extras, resources, unit classes, and technology
vectors.

Required ruleset files:

- `freecivUnitsRuleset`: target `units.ruleset`.
- `freecivBuildingsRuleset`: target `buildings.ruleset`.
- `freecivTechsRuleset`: target `techs.ruleset`.
- `freecivTerrainRuleset`: target `terrain.ruleset`.

Optional ruleset file:

- `freecivGovernmentsRuleset`: target `governments.ruleset`. If omitted, the
  builder looks for `governments.ruleset` in the same directory as
  `freecivBuildingsRuleset`.

What each ruleset is used for:

- Units: unit names, `rule_name`, unit classes, hitpoints, movement, fuel, cargo, and transport capacity.
- Buildings: improvement/wonder names, `rule_name`, and improvement bit indexes.
- Techs: advance names, `rule_name`, and technology vector order.
- Terrain: terrain names, identifiers, classes, irrigation/mining behavior, and resources.
- Governments: government names and `rule_name`.

For a consistent build, these ruleset files should come from the same Freeciv
ruleset directory as the save template.

### Extracted Inputs

These files are generated by `extract.js` and then referenced by
`build-config.json`:

- `extracted`: usually `<prefix>-map-and-cities.json`. Contains extracted map, cities, factions, inferred layout, and feature data.
- `diplomacy`: usually `<prefix>-diplomacy.json`. Contains extracted diplomacy and attitude data.
- `technologies`: usually `<prefix>-technologies.json`. Contains extracted Civ2 technology ownership and research state.
- `mapFragment`: usually `<prefix>-freeciv-map-fragment.sav`. Contains extracted Freeciv-style terrain rows.

### Manual Config And Mapping Files

These files are filled in manually after extraction:

- `conversionConfig`: scenario-specific player setup and conversion overrides.
- `unitMap`: maps Civ2 unit names to Freeciv unit names.
- `improvementMap`: maps Civ2 improvements/wonders to Freeciv buildings.
- `techMap`: maps Civ2 technologies to Freeciv advances.
- `governmentMap`: maps Civ2 governments to Freeciv governments.

The extractor creates starter versions named `template-unit-map.json`,
`template-improvement-map.json`, `template-tech-map.json`, and
`template-government-map.json`. Copy or rename those templates into
scenario-specific files, fill in the Freeciv target names, and reference those
files from `build-config.json`.

### Outputs

`outputs.freeciv21V3` is the generated save path used by the current builder:

```json
{
  "outputs": {
    "freeciv21V3": "havana-freeciv-playable-v3-freeciv21.sav"
  }
}
```

The builder also writes a compressed `.sav.zst` next to the output save.

### Optional Reports

The builder can write diagnostic reports:

- `validationReport`: full build summary. Defaults to `<output>-validation-report.json` if omitted.
- `unmappedUnitsReport`: grouped unit mapping and placement issues.
- `unmappedTechsReport`: grouped technology mapping issues.
- `unmappedImprovementsReport`: grouped improvement mapping issues.
- `unitHomecityReport`: units whose Civ2 home city could not be assigned as a Freeciv home city.

These report paths are optional but recommended while developing a scenario
conversion.

### Scenario Metadata

Scenario metadata can be set in `build-config.json`. The builder writes these
values into the Freeciv `[scenario]` section, inserting missing fields when the
template does not already contain them:

```json
{
  "scenario": {
    "name": "WW2 - Civ2",
    "authors": "Port of the Civ2 scenario by Lucius Papirius Cursor",
    "description": "The date is June, 1940.\nGerman Panzers are poised to strike..."
  }
}
```

The older top-level `scenarioName`, `scenarioNames`, `scenarioAuthors`, and
`scenarioDescription` fields are also accepted for existing scenario configs.

Long scenario descriptions can be read from a separate text file:

```json
{
  "scenario": {
    "name": "Spanish-American War - Civ2",
    "authors": "Lucius Papirius Cursor",
    "description": "Fallback description if the file is missing.",
    "descriptionFile": "Havana.txt",
    "descriptionEncoding": "windows-1252"
  }
}
```

If `descriptionFile` is missing, invalid, or cannot be decoded with the
requested encoding, the builder falls back to `description`.

## Rulesets, Templates, And Versions

Choose the Freeciv target ruleset before filling in maps. The template and
ruleset files should match each other.

Common choices:

- `civ2civ3`: broad Freeciv ruleset with many modern technologies, units, extras, and resources.
- `civ2`: closer to the classic Civ2 ruleset, with a smaller nation/tech/unit set.
- `classic`: Freeciv classic ruleset.

For example, if using `civ2civ3`, use the `civ2civ3` ruleset files and a
`civ2civ3` save template:

```json
{
  "template": "D:/freeciv/projects/civ2-freeciv-converter/templates/freeciv-template-civ2civ3.sav",
  "freecivUnitsRuleset": "D:/freeciv/3.2.1/qt6/data/civ2civ3/units.ruleset",
  "freecivBuildingsRuleset": "D:/freeciv/3.2.1/qt6/data/civ2civ3/buildings.ruleset",
  "freecivTechsRuleset": "D:/freeciv/3.2.1/qt6/data/civ2civ3/techs.ruleset",
  "freecivTerrainRuleset": "D:/freeciv/3.2.1/qt6/data/civ2civ3/terrain.ruleset"
}
```

Supported Civ2 scenario/save versions currently include:

- `39`: Classic/CiC
- `40`: Fantastic Worlds
- `44`: MGE

Test of Time versions `49` and `50` have been analyzed, but are not normal
supported extraction targets yet.

The builder uses Freeciv21/native-width map geometry. In native-width mode, Civ2
x coordinates are converted with `Math.floor(civ2X / 2)` for Freeciv tile
coordinates. The extractor keeps Civ2 coordinates in reports where useful, so
debugging can refer back to the original Civ2 map.

## Conversion Config

`conversion-config.json` controls scenario-specific conversion behavior. The
build config points to it with:

```json
{
  "conversionConfig": "conversion-config.json"
}
```

A minimal conversion config looks like this:

```json
{
  "year": "1898",
  "players": [
    {
      "owner": 1,
      "name": "Sagasta",
      "gender": "male",
      "nation": "Spanish",
      "government": "Monarchy",
      "gold": "500",
      "style": "European",
      "color": [200, 0, 0]
    }
  ]
}
```

### Top-Level Fields

- `year`: optional string integer written to the Freeciv save year.
- `players`: required array mapping Civ2 owner ids to Freeciv players.
- `mapFeatureOverrides`: optionally skips Civ2 tile features during build.
- `mapFeatureTransforms`: optionally converts one Civ2 tile feature into another.
- `terrainOverrides`: optionally converts terrain types and can add extras to changed tiles.
- `resourceOverrides`: optionally removes resource bonuses from the map.
- `cityImprovementOverrides`: optionally adds or removes city improvements by city name.

### Players

Each `players` entry maps one Civ2 owner/faction to one Freeciv player:

```json
{
  "owner": 1,
  "name": "Sagasta",
  "gender": "male",
  "nation": "Spanish",
  "government": "Monarchy",
  "gold": "500",
  "style": "European",
  "color": [200, 0, 0],
  "barbarianType": "Land"
}
```

Fields:

- `owner`: required Civ2 owner id from extraction.
- `name`: optional Freeciv leader name. If empty, the extracted Civ2 leader is used.
- `gender`: optional `male` or `female`.
- `nation`: required Freeciv nation name. It must exist in the target ruleset.
- `government`: optional Freeciv government name. If empty, the builder maps the Civ2 government through the government map.
- `gold`: optional string integer. If empty, the extracted Civ2 gold is used.
- `style`: optional city style name. Defaults to `European`.
- `color`: required RGB array, for example `[200, 0, 0]`.
- `barbarianType`: optional for barbarian players. Defaults to `Land` when the player is barbarian.

Nation, government, style, unit, improvement, tech, terrain, extra, and resource
names are target-ruleset dependent. If the Freeciv server says a nation is
invalid, check that the `nation` value exists in the target ruleset's nations
file.

When filling mapping files and config values, prefer names from the target
Freeciv ruleset files. The builder accepts display names and, where supported by
the ruleset, `rule_name` values for units, improvements, technologies, and
governments. Terrain, extras, and resources are resolved from `terrain.ruleset`
and the template's `extras_vector`.

### Barbarians

Civ2 owner candidate `0` is the barbarian player. If the extracted scenario has
barbarian cities or units and `players` does not contain an entry with
`"owner": 0`, the builder adds a default barbarian player:

```json
{
  "owner": 0,
  "name": "Barbarians",
  "gender": "male",
  "nation": "Barbarian",
  "style": "European",
  "color": [80, 80, 80],
  "barbarianType": "Land"
}
```

To change only the barbarian style, provide the minimum override:

```json
{
  "owner": 0,
  "style": "European"
}
```

Any provided barbarian fields are merged over the defaults. `barbarianType`
defaults to `Land` when omitted or empty. Barbarian government is handled like
other players: if `government` is provided, that value is used; otherwise the
builder attempts to map the extracted Civ2 government through the government
map.

### Player Tech Overrides

`techOverrides` can be set inside a player entry:

```json
{
  "owner": 1,
  "name": "Sagasta",
  "nation": "Spanish",
  "color": [200, 0, 0],
  "techOverrides": {
    "add": ["Railroad", "Industrialization"],
    "remove": ["Theology"],
    "copyFromOwner": 2
  }
}
```

- `add`: Freeciv tech names to grant to this player.
- `remove`: Freeciv tech names to remove from this player.
- `copyFromOwner`: copies mapped techs from another Civ2 owner id after normal tech mapping. This behaves like a union; it does not remove techs the destination player already has.

### Map Feature Overrides

`mapFeatureOverrides` skips Civ2 features from being written as Freeciv extras:

```json
{
  "mapFeatureOverrides": {
    "skip": ["airbase", "pollution"]
  }
}
```

The older `skipCiv2Features` field is also accepted:

```json
{
  "mapFeatureOverrides": {
    "skipCiv2Features": ["airbase"]
  }
}
```

Common aliases include `river`, `irrigation`, `mine`, `farmland`, `road`,
`railroad`, `fortress`, `airbase`, `pollution`, `resource`, and `hut`.

### Map Feature Transforms

`mapFeatureTransforms` converts one Civ2 tile feature into another as the map is
built:

```json
{
  "mapFeatureTransforms": {
    "replace": {
      "airbase": "fortress",
      "road": "railroad"
    }
  }
}
```

This transforms Civ2 features coming from the scenario. It does not transform
arbitrary extras that already exist in the Freeciv template.

### Terrain Overrides

`terrainOverrides` converts one terrain type into another:

```json
{
  "terrainOverrides": {
    "replace": {
      "tundra": "plains",
      "glacier": "ocean"
    }
  }
}
```

Use an object value to convert terrain and add tile improvements/extras to the
tiles that were changed:

```json
{
  "terrainOverrides": {
    "replace": {
      "tundra": {
        "terrain": "grassland",
        "add": ["farmland", "road"]
      },
      "glacier": {
        "terrain": "hills",
        "add": ["mine"]
      }
    }
  }
}
```

Terrain names are resolved against the target `terrain.ruleset`. Common aliases
such as `grassland`, `plains`, `hills`, `mountains`, `ocean`, and `lake` are
accepted when the target ruleset supports them. `inaccessible` is supported as a
target terrain, but not as a source terrain.

The `add` list currently supports tile improvements/extras such as `irrigation`,
`farmland`, `mine`, `road`, `railroad`, `fort`, `fortress`, and `airbase` when
those extras exist in the target template/ruleset. It does not currently add
resource bonuses.

### Resource Overrides

`resourceOverrides` removes resource bonuses globally:

```json
{
  "resourceOverrides": {
    "remove": ["ivory", "resources"]
  }
}
```

Resource names are read from the target `terrain.ruleset` resource sections and
validated against the Freeciv template's `extras_vector`.

### City Improvement Overrides

`cityImprovementOverrides` manually adds or removes improvements from named
cities:

```json
{
  "cityImprovementOverrides": {
    "Rome": {
      "add": ["Palace", "Barracks"],
      "remove": ["Granary"]
    }
  }
}
```

Improvement names are resolved through the improvement map and target buildings
ruleset. Duplicate improvements are not added twice; the final city improvement
vector is a bitset.

### Empty Mapping Values

The unit, improvement, and tech map files can intentionally skip an item by
mapping it to an empty string:

```json
{
  "A. Regulars": ""
}
```

For units, the build terminal distinguishes grouped report entries from actual
unit instance counts:

```text
Unmapped unit report entries: 2
Units skipped by empty unit map entry: 1
Mapped units not placed on map: 0
```

## Mapping File Examples

The four mapping files are ordinary JSON objects whose keys are Civ2 names from
extraction and whose values are target Freeciv names.

### Unit Map

Simple string form:

```json
{
  "Riflemen": "Riflemen",
  "Mechanized Infantry": "Mech. Inf.",
  "Transport": "Transport"
}
```

Object form with unit activity and veterancy:

```json
{
  "Mechanized Infantry": {
    "unit": "Mech. Inf.",
    "activity": "sentry",
    "veteran": 2
  }
}
```

Supported activity aliases include:

```text
idle, none, sentry, sleep, sleeping, fortified, fortify, fortifying
```

`veteran` is currently an integer. For common `classic`/`civ2civ3` rulesets:

```text
0 = green
1 = veteran
2 = hardened
3 = elite
```

For the `civ2` ruleset, the normal global levels are:

```text
0 = green
1 = veteran
```

Empty string skips all units of that Civ2 type:

```json
{
  "A. Regulars": ""
}
```

### Improvement Map

```json
{
  "Barracks": "Barracks",
  "Granary": "Granary",
  "City Walls": "City Walls",
  "Colosseum": "Colosseum"
}
```

The builder resolves both Freeciv display names and `rule_name` values where the
target ruleset provides them.

### Tech Map

```json
{
  "Industrialization": "Industrialization",
  "Railroad": "Railroad",
  "Mobile Warfare": "Mobile Warfare"
}
```

Empty string intentionally skips the Civ2 technology:

```json
{
  "Future Tech.": ""
}
```

### Government Map

Government maps are keyed by the Civ2 government name from `rules.txt`, for example
`"Communism": "Communism"`. The builder still accepts older raw-byte keys such as
`"3": "Communism"` for existing scenarios, but name keys are the preferred format.

```json
{
  "Anarchy": "Anarchy",
  "Despotism": "Despotism",
  "Monarchy": "Monarchy",
  "Communism": "Communism",
  "Republic": "Republic",
  "Democracy": "Democracy"
}
```

## Build Terminal Output

The build terminal output is intended to show whether the conversion is healthy.
Important lines include:

- `Unmapped unit report entries`: number of grouped unit mapping/placement report entries. This is not a unit instance count.
- `Units skipped by empty unit map entry`: actual number of unit instances skipped because their unit map value was empty.
- `Mapped units not placed on map`: actual number of unit instances that mapped to a Freeciv unit but could not be written to the map.
- `Unmapped improvements`: number of grouped improvement mapping report entries.
- `Unmapped techs`: number of grouped technology mapping report entries.
- `playerN ...`: per-player city, unit, mapped-tech, and unmapped-tech summary.
- `Palace cities`: cities where each faction has a Palace.
- `Factions without Palace`: factions with no Palace in any city.

The validation report contains more detail than the terminal output and should
be checked whenever the server refuses to load a generated save.

### Reading The Validation Report

`validationReport` is the best place to debug a build without opening the save
by hand. Useful sections include:

- `totals`: generated map size, player/city/unit counts, grouped unmapped report counts, empty-map skipped unit instances, mapped-but-unplaced unit instances, production fallbacks, and home-city issue counts.
- `inputs`: resolved source files used by the build.
- `productionFallback`: whether fallback production used `Coinage` or `Settlers`.
- `extras`: template extras, Civ2 feature mappings, huts, resource-extra count, and missing feature mappings.
- `activities`: unit activity names and ids read from the template `activities_vector`.
- `unitClasses`: unit classes read from `units.ruleset`, including land/air classification.
- `terrainOverrides`: configured terrain replacements, applied replacements, added extras, and dynamic terrain identifier sets.
- `resourceOverrides`: resources found in `terrain.ruleset`, resources matched to `extras_vector`, removed resources, and applied removals.
- `cityImprovementOverrides`: configured city improvement edits, applied edits, unmatched city names, and duplicate city-name matches.
- `playerTechOverrides`: configured and applied per-player tech overrides.
- `players`: per-player owner, nation, city count, unit count, current research, and research progress.
- `unmapped`: grouped unit, improvement, and tech mapping issues.
- `unitHomecityIssues`: units whose Civ2 home city could not be assigned.
- `diplomacy` and `visibility`: diplomacy and map-knowledge summaries.

The grouped `unmapped` entries are useful for fixing map files. The instance
counts in `totals` are better for judging actual map impact.

## Testing Generated Saves

After build, the converter writes both an uncompressed `.sav` and compressed
`.sav.zst` next to the configured output path. Freeciv normally loads the
compressed file directly.

A practical smoke test is:

1. Run `build.js`.
2. Review the terminal output for unmapped entries, mapped-but-unplaced units, and factions without Palace.
3. Open the generated `.sav.zst` with the target Freeciv or Freeciv21 server.
4. Wait for the server to finish loading the save.
5. Check whether warnings are only cosmetic, such as invalid nations being substituted, or fatal, such as unknown buildings, missing city fields, invalid research, or savegame load failure.

If the server refuses to load the save, start with `validationReport`, then the
specific unmapped reports, then the affected mapping/config file.

## Common Warnings And Errors

### Invalid Nation

Example:

```text
Eduardo Santos had invalid nation; changing to Spanish.
```

Cause: the `nation` in `conversion-config.json` does not exist in the target
Freeciv ruleset. Fix the player `nation`, or use a ruleset that contains that
nation.

### Unknown Building, Unit, Or Technology

Example:

```text
unknown "Building" "Amphitheater"
```

Cause: a map file points to a Freeciv name that does not exist in the target
ruleset. Check the corresponding mapping file and the target ruleset. Some
rulesets use `rule_name` values that differ from display names.

### Invalid Researching Technology Or Technology Goal

Cause: a current research or goal value did not map to a valid target Freeciv
technology. Check `techMap`, `technologies`, and any `techOverrides`.

### Missing City Fields

Example:

```text
"player0.c0.x" entry doesn't exist.
```

Cause: the generated save says a player has cities, but the city table was not
written correctly. This usually indicates a template/save-structure mismatch or
a builder bug.

### Faction Has No Palace

The build terminal prints factions with no Palace. Freeciv can behave oddly for
players with no capital, especially for city workers and specialists. Add a
Palace through the improvement map or `cityImprovementOverrides` when the
scenario needs a capital.

### Horizontal Map Wrapping Looks Wrong

Check the generated save's `wrap` setting and the extractor's inferred map
shape. The builder writes `WRAPX` for horizontally wrapping Civ2 maps and an
empty wrap setting for non-wrapping maps.

## Known Limitations

- Test of Time versions `49` and `50` have been analyzed, but normal extraction/build support is not complete.
- The current builder output mode is fixed to `freeciv21V3`; the build config `mode` field does not select another output mode yet.
- Unit `veteran` overrides are numeric. They are validated as `0..3`, but veterancy levels are not yet fully dynamic per target ruleset/unit.
- `terrainOverrides.replace.add` can add tile improvements/extras to changed tiles, but it does not currently add resource bonuses.
- Resource removal is global by resource name; there is no per-tile resource override yet.
- The template and ruleset files must match. Mixing a `civ2` template with `civ2civ3` ruleset files can produce saves that look structurally valid but fail in the server.
- Freeciv nation availability depends on the target ruleset's nation files. A converted Civ2 faction may need to use a different Freeciv nation name.

## Generated Vs Manual Files

Generated files can be overwritten whenever you rerun extraction or build.
Manual files are the scenario-specific files you should edit and keep.

Usually generated by extraction:

```text
extracted-civ2/<prefix>-map-and-cities.json
extracted-civ2/<prefix>-factions.json
extracted-civ2/<prefix>-diplomacy.json
extracted-civ2/<prefix>-technologies.json
extracted-civ2/<prefix>-units.json
extracted-civ2/<prefix>-*.csv
extracted-civ2/<prefix>-*-preview.txt
extracted-civ2/<prefix>-freeciv-map-fragment.sav
extracted-civ2/<prefix>-freeciv-native-map-fragment.sav
extracted-civ2/<prefix>-freeciv-city-fragment.sav
extracted-civ2/template-*-map.json
```

Usually edited manually:

```text
extract-config.json
build-config.json
conversion-config.json
*-unit-map.json
*-improvement-map.json
*-tech-map.json
*-government-map.json
```

Usually generated by build:

```text
*.sav
*.sav.zst
*-validation-report.json
*-unmapped-units.json
*-unmapped-techs.json
*-unmapped-improvements.json
*-unit-homecity-issues.json
```

Diplomacy extraction includes directional Civ2 attitude values from each
`tribe_info` record. Civ2 stores attitude as `0` meaning most favorable and
`100` meaning hostile; values above `100` can appear and are reported as
`enraged`. The extractor also writes `civ2AttitudeName` using the Civ2 UI
labels. The builder maps attitude linearly to Freeciv AI love:

```text
freecivLove = 1000 - civ2Attitude * 20
```

So `0 -> 1000`, `50 -> 0`, and `100 -> -1000`.

## Decoding Notes

MGE v44 city records use a different layout from Classic/CiC v39. Current
evidence from the Croscres MGE saves and the Freeciv21 loader indicates:

```text
cityRecordSize = 88
name           = cityRecord + 32
x              = cityRecord + 0  (uint16)
y              = cityRecord + 2  (uint16)
owner          = cityRecord + 8
size           = cityRecord + 9
founder        = cityRecord + 10
foodbox        = cityRecord + 26
shieldbox      = cityRecord + 28
baseTrade      = cityRecord + 30
improvements   = cityRecord + 52, 5 bytes
production     = cityRecord + 57
```

MGE v44 unit records also differ from Classic/CiC v39. Current evidence from
`WWii_MGE.scn`, including an Axis veteran Riflemen at `(49,45)` with no home
city, indicates:

```text
unitRecordSize = 32
x              = unitRecord + 0  (uint16)
y              = unitRecord + 2  (uint16)
veteran flag   = unitRecord + 5, bit 0x20
type           = unitRecord + 6
owner          = unitRecord + 7
movesUsed      = unitRecord + 8
hpLost         = unitRecord + 10
workProgress   = unitRecord + 11
commodity      = unitRecord + 13
orders         = unitRecord + 15
homeCity       = unitRecord + 16, 0xff means no home city
gotoX          = unitRecord + 17 (uint16)
gotoY          = unitRecord + 19 (uint16)
```

MGE v44 city production shields can be decoded from the city record. In the
Croscres MGE test saves, La Rochelle showed 12 accumulated shields in the UI in
the first save and 15 in the second save. The matching signed 16-bit city-record
field was:

```text
28: 12 -> 15
```

So for MGE v44, current evidence indicates accumulated production shields are at
`cityRecord + 28`. Do not confuse this with the nearby `+26` field, which changed
`20 -> 24` in the same test but did not match the UI production progress.

Classic/CiC v39 city production shields are at `cityRecord + 44`. This was
confirmed against the WW2 scenario UI:

```text
44 Berlin     = 75
44 Warsaw     = 0
44 Kiel       = 25
44 Bucharest  = 25
44 Konigsberg = 50
```

The shared scripts intentionally require explicit config paths. This avoids hidden scenario-specific defaults.
