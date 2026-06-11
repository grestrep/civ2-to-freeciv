# Civ2 to Freeciv Converter

Node.js scripts to convert a Civilization 2 .SCN or .SAV file to Freeciv 3.2+ format. It has been tested to output Freeciv saves for the "civ2civ3" and "classic" rulesets but other rulesets are possible as well.
It supports decoding Civ2 Classic, Conflicts in Civilization (CiC), Fantastic Worlds (FW), and Multiplayer Gold Edition (MGE) .SCN or .SAV files.

At a high level the workflow is as follows:

1) extract.js: This script decodes a Civ2 SCN/SAV file into JSON human-readable files.
2) build.js: This script takes as input the files from Extract.js and outputs a playable Freeciv save file. For this to work, you have to provide a "Conversion Config" file to map certain Civ2 elements over to Freeciv representations. More documentation on this below.

You can find a sample converted scenario (Civ2 WW2 scenario) with all relevant files required for conversion inside the "sample" folder that you can use as a starting point. It contains also extract and build bat files that you can use for your workflow.

## Workflow

Run extraction from a scenario folder:

```bat
node D:\freeciv\projects\civ2-freeciv-converter\extract.js --extract-config extract-config.json
```

Run build from a scenario folder:

```bat
node D:\freeciv\projects\civ2-freeciv-converter\build.js --build-config build-config.json
```

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

Government maps are keyed by the Civ2 government name from `rules.txt`, for example
`"Communism": "Communism"`. The builder still accepts older raw-byte keys such as
`"3": "Communism"` for existing scenarios, but name keys are the preferred format.

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
