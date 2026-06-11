# Civ2 to Freeciv Converter

Shared converter scripts for Civ2 `.SCN` / `.SAV` files.

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
