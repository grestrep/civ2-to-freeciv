const fs = require("node:fs");
const path = require("node:path");

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

const extractConfigPath = path.resolve(
  process.cwd(),
  argValue("--extract-config") || "",
);
if (!argValue("--extract-config")) {
  throw new Error("Missing required --extract-config path");
}

function readJson(pathname) {
  return JSON.parse(fs.readFileSync(pathname, "utf8").replace(/^\uFEFF/, ""));
}

function resolveConfiguredPath(configDir, pathname, fieldName) {
  if (!pathname) throw new Error(`Missing ${fieldName} in ${extractConfigPath}`);
  return path.resolve(configDir, pathname);
}

function parseRulesImproveNames(rulesPath) {
  if (!rulesPath || !fs.existsSync(rulesPath)) return [];
  const lines = fs.readFileSync(rulesPath, "latin1").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toUpperCase() === "@IMPROVE");
  if (start === -1) return [];

  const names = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) continue;
    if (trimmed.startsWith("@")) break;
    const name = trimmed.split(",")[0]?.trim();
    if (name) names.push(name);
  }
  return names;
}

function parseRulesUnitTypes(rulesPath) {
  if (!rulesPath || !fs.existsSync(rulesPath)) return [];
  const lines = fs.readFileSync(rulesPath, "latin1").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toUpperCase() === "@UNITS");
  if (start === -1) return [];

  const units = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) continue;
    if (trimmed.startsWith("@")) break;

    const parts = trimmed.split(",").map((part) => part.trim());
    const name = parts[0];
    if (!name) continue;
    units.push({
      index: units.length,
      name,
      prerequisite: parts[1] || "",
      domain: Number.parseInt(parts[2], 10),
      moveRaw: parts[3] || "",
      range: Number.parseInt(parts[4], 10),
      attackRaw: parts[5] || "",
      defenseRaw: parts[6] || "",
      hitpointsRaw: parts[7] || "",
      firepowerRaw: parts[8] || "",
      cost: Number.parseInt(parts[9], 10),
      hold: Number.parseInt(parts[10], 10),
      role: Number.parseInt(parts[11], 10),
      obsoleteBy: parts[12] || "",
      flags: parts[13] || "",
      raw: trimmed,
    });
  }
  return units;
}

function parseRulesTechnologies(rulesPath) {
  if (!rulesPath || !fs.existsSync(rulesPath)) return [];
  const lines = fs.readFileSync(rulesPath, "latin1").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toUpperCase() === "@CIVILIZE");
  if (start === -1) return [];

  const technologies = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) continue;
    if (trimmed.startsWith("@")) break;

    const [definition, comment = ""] = trimmed.split(";", 2);
    const parts = definition.split(",").map((part) => part.trim());
    const name = parts[0];
    if (!name) continue;
    technologies.push({
      index: technologies.length,
      name,
      aiValue: Number.parseInt(parts[1], 10),
      modifier: Number.parseInt(parts[2], 10),
      prerequisite1: parts[3] || "",
      prerequisite2: parts[4] || "",
      epoch: Number.parseInt(parts[5], 10),
      category: Number.parseInt(parts[6], 10),
      abbreviation: comment.trim().split(/\s+/)[0] || "",
      raw: trimmed,
    });
  }
  return technologies;
}

function parseRulesGovernments(rulesPath) {
  const fallback = [
    "Anarchy",
    "Despotism",
    "Monarchy",
    "Communism",
    "Fundamentalism",
    "Republic",
    "Democracy",
  ];
  if (!rulesPath || !fs.existsSync(rulesPath)) {
    return fallback.map((name, index) => ({ index, name, maleTitle: "", femaleTitle: "", raw: "" }));
  }
  const lines = fs.readFileSync(rulesPath, "latin1").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toUpperCase() === "@GOVERNMENTS");
  if (start === -1) {
    return fallback.map((name, index) => ({ index, name, maleTitle: "", femaleTitle: "", raw: "" }));
  }

  const governments = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) continue;
    if (trimmed.startsWith("@")) break;

    const parts = trimmed.split(",").map((part) => part.trim());
    const name = parts[0];
    if (!name) continue;
    governments.push({
      index: governments.length,
      name,
      maleTitle: parts[1] || "",
      femaleTitle: parts[2] || "",
      raw: trimmed,
    });
  }

  return governments.length
    ? governments
    : fallback.map((name, index) => ({ index, name, maleTitle: "", femaleTitle: "", raw: "" }));
}

function parseRulesLeaders(rulesPath) {
  if (!rulesPath || !fs.existsSync(rulesPath)) return [];
  const lines = fs.readFileSync(rulesPath, "latin1").split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toUpperCase() === "@LEADERS");
  if (start === -1) return [];

  const leaders = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(";")) continue;
    if (trimmed.startsWith("@")) break;

    const definition = trimmed.split(";", 2)[0];
    const parts = definition.split(",").map((part) => part.trim());
    if (!parts[0]) continue;
    leaders.push({
      index: leaders.length,
      maleLeader: parts[0] || "",
      femaleLeader: parts[1] || "",
      femaleLeaderPreferred: Number.parseInt(parts[2], 10) === 1,
      color: Number.parseInt(parts[3], 10),
      style: Number.parseInt(parts[4], 10),
      plural: parts[5] || "",
      adjective: parts[6] || "",
      raw: trimmed,
    });
  }
  return leaders;
}

function decodeCityImprovements(improvementBytes, improvementNames) {
  const improvements = [];
  const bitCount = Math.min(improvementBytes.length * 8, improvementNames.length);
  for (let bit = 0; bit < bitCount; bit++) {
    const byte = improvementBytes[Math.floor(bit / 8)];
    const bitMask = 1 << (bit % 8);
    if ((byte & bitMask) !== 0) {
      improvements.push({ bit, name: improvementNames[bit] });
    }
  }
  return improvements;
}

function hexBytes(slice) {
  return [...slice].map((value) => value.toString(16).padStart(2, "0")).join(" ");
}

const extractConfig = readJson(extractConfigPath);
const extractConfigDir = path.dirname(extractConfigPath);
const inputPath = resolveConfiguredPath(extractConfigDir, extractConfig.input, "input");
const rulesPath = extractConfig.rules
  ? resolveConfiguredPath(extractConfigDir, extractConfig.rules, "rules")
  : null;
if (extractConfig.rules && !fs.existsSync(rulesPath)) {
  throw new Error(`Configured rules file does not exist: ${rulesPath}`);
}
const outputDir = path.resolve(extractConfigDir, extractConfig.outputDir || "extracted-civ2");
const outputPrefix = path.resolve(
  outputDir,
  extractConfig.outputPrefix || path.basename(inputPath, path.extname(inputPath)),
);
fs.mkdirSync(path.dirname(outputPrefix), { recursive: true });
const bytes = fs.readFileSync(inputPath);
const improvementNames = parseRulesImproveNames(rulesPath);
const unitTypes = parseRulesUnitTypes(rulesPath);
const technologies = parseRulesTechnologies(rulesPath);
const governments = parseRulesGovernments(rulesPath);
const rulesLeaders = parseRulesLeaders(rulesPath);

function readCString(offset, length) {
  const slice = bytes.subarray(offset, offset + length);
  const nul = slice.indexOf(0);
  return slice.subarray(0, nul === -1 ? slice.length : nul).toString("latin1");
}

function treatyOtherCandidates(ownerCandidate) {
  return [1, 2, 3, 4, 5, 6, 7];
}

function decodeTreaty(rawBytes) {
  const first = rawBytes[0] ?? 0;
  const second = rawBytes[1] ?? 0;
  const flags = {
    contact: (first & 0x01) !== 0,
    ceaseFire: (first & 0x02) !== 0,
    peace: (first & 0x04) !== 0,
    alliance: (first & 0x08) !== 0,
    vendetta: (first & 0x10) !== 0,
    embassy: (first & 0x80) !== 0,
    war: (second & 0x20) !== 0,
  };
  let relation = "Unknown";
  if (flags.war) relation = "War";
  else if (flags.alliance) relation = "Alliance";
  else if (flags.peace) relation = "Peace";
  else if (flags.ceaseFire) relation = "Cease-fire";
  else if (flags.contact) relation = "Contact";
  return { relation, flags };
}

function civ2AttitudeToFreecivLove(attitude) {
  if (!Number.isInteger(attitude)) return null;
  return Math.max(-1000, Math.min(1000, 1000 - attitude * 20));
}

function civ2AttitudeName(attitude) {
  if (!Number.isInteger(attitude)) return "";
  if (attitude === 0) return "worshipful";
  if (attitude <= 10) return "enthusiastic";
  if (attitude <= 25) return "cordial";
  if (attitude <= 38) return "receptive";
  if (attitude <= 62) return "neutral";
  if (attitude <= 75) return "uncooperative";
  if (attitude <= 90) return "icy";
  if (attitude <= 100) return "hostile";
  return "enraged";
}

function decodeUnitActivity(classicLayout, rawBytes, unitType) {
  if (classicLayout) {
    const isLandUnit = unitType?.domain === 0;
    if (isLandUnit && (rawBytes[24] === 0x08 || rawBytes[24] === 0x03)) {
      return { civ2State: "Fortify", freecivActivity: "Fortifying" };
    }
    if (isLandUnit && rawBytes[24] === 0x04) {
      return { civ2State: "FortifiedCandidate", freecivActivity: "Idle" };
    }
    if (isLandUnit && rawBytes[20] === 0x40 && rawBytes[24] === 0x00) {
      return { civ2State: "FortifiedCandidate", freecivActivity: "Idle" };
    }
    if (
      isLandUnit
      && (
        (rawBytes[21] === 0x0c && rawBytes[22] === 0x0b && rawBytes[25] === 0x48)
        || (rawBytes[6] === 0x3f && rawBytes[21] === 0x2c && rawBytes[22] === 0x0b)
      )
    ) {
      return { civ2State: "FortifiedCandidate", freecivActivity: "Idle" };
    }
    if (rawBytes[6] === 0x01 && rawBytes[20] === 0x40 && rawBytes[21] === 0x00) {
      return { civ2State: "Sleep", freecivActivity: "Sentry" };
    }
  }
  return { civ2State: "Idle", freecivActivity: "Idle" };
}

function terrainToFreeciv(value) {
  // Byte 0 of each Civ2 tile record stores terrain in the low nibble. The
  // high bits carry resource/special flags, so 130 is still Grassland (2), etc.
  switch (value & 0x0f) {
    case 0:
      return "d";
    case 1:
      return "p";
    case 2:
      return "g";
    case 3:
      return "f";
    case 4:
      return "h";
    case 5:
      return "m";
    case 6:
      return "t";
    case 7:
      return "a";
    case 8:
      return "s";
    case 9:
      return "j";
    case 10:
      return " ";
    default:
      return "g";
  }
}

function terrainName(value) {
  return (
    [
      "Desert",
      "Plains",
      "Grassland",
      "Forest",
      "Hills",
      "Mountains",
      "Tundra",
      "Glacier",
      "Swamp",
      "Jungle",
      "Ocean",
    ][value & 0x0f] || "Unknown"
  );
}

const civ2ResourceByTerrainAndSlot = {
  0: { 1: "Oasis", 2: "Oil" },
  1: { 1: "Buffalo", 2: "Wheat" },
  3: { 1: "Pheasant", 2: "Silk" },
  4: { 1: "Coal", 2: "Wine" },
  5: { 1: "Gold", 2: "Iron" },
  6: { 1: "Game", 2: "Furs" },
  7: { 1: "Ivory", 2: "Oil" },
  8: { 1: "Peat", 2: "Spice" },
  9: { 1: "Gems", 2: "Fruit" },
  10: { 1: "Fish", 2: "Whales" },
};

function civ2ResourceSlot(seed, x, y) {
  const a = (x + y) >> 1;
  const b = x - a;
  const c = 13 * (b >> 2) + 11 * ((x + y) >> 3) + seed;
  if (((a & 3) + 4 * (b & 3)) !== (c & 15)) return 0;
  const d = 1 << ((seed >> 4) & 3);
  return (d & a) === (d & b) ? 2 : 1;
}

function civ2ResourceSeed(mapSeed) {
  return mapSeed & 0x3f;
}

function positiveModulo(value, modulus) {
  return ((value % modulus) + modulus) % modulus;
}

function civ2HutSeed(resourceSeed) {
  return resourceSeed & 0x1f;
}

const civ2GrasslandShieldModuloValues = new Set([0, 3, 5, 6]);

function isCiv2HutTile(x, y, resourceSeed, terrainIsWater) {
  if ((x + y) % 2 !== 0) return false;
  if (terrainIsWater) return false;
  const seed = civ2HutSeed(resourceSeed);
  const normalizedSum = (x + y) >> 1;
  const normalizedDifference = positiveModulo((x - y) >> 1, 4096);
  const hash =
    Math.floor(normalizedSum / 4) * 11 +
    Math.floor(normalizedDifference / 4) * 13 +
    8;
  const target = positiveModulo(normalizedSum, 4) + positiveModulo(normalizedDifference, 4) * 4;
  return positiveModulo(hash + seed, 32) === target;
}

function isCiv2ShieldGrasslandTile(nativeX, y, terrainCode) {
  if (terrainCode !== 2) return false;
  return civ2GrasslandShieldModuloValues.has(positiveModulo(6 * nativeX + y, 8));
}

function increment(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function sortedCounts(map) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .map(([value, count]) => ({ value, count }));
}

function markerForCity(name) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, " ");
}

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function printableStrings(offset, length) {
  const strings = [];
  let current = [];
  for (const value of bytes.subarray(offset, offset + length)) {
    if (value >= 32 && value < 127) {
      current.push(value);
    } else {
      if (current.length >= 3) strings.push(Buffer.from(current).toString("latin1"));
      current = [];
    }
  }
  if (current.length >= 3) strings.push(Buffer.from(current).toString("latin1"));
  return strings;
}

const civ2Layouts = {
  39: {
    name: "Classic/CiC",
    settingsSize: 558,
    tribeNameCount: 7,
    tribeNameRecordSize: 242,
    tribeInfoCount: 8,
    tribeInfoRecordSize: 1396,
    mapHeaderSize: 14,
    tileRecordSize: 6,
    postMapPaddingSize: 1008,
    unitRecordSize: 26,
    cityRecordSize: 84,
    cityNameOffset: 48,
    cityFields: {
      x: 16,
      y: 18,
      sizeCandidate: 14,
      populationSize: 25,
      ownerCandidate: 24,
      founderCandidate: 26,
      foodbox: 42,
      shieldbox: 44,
      baseTrade: 46,
      improvements: 68,
      production: 73,
    },
    lastContactOffset: 964,
  },
  40: {
    name: "Fantastic Worlds",
    settingsSize: 572,
    tribeNameCount: 7,
    tribeNameRecordSize: 242,
    tribeInfoCount: 8,
    tribeInfoRecordSize: 1428,
    mapHeaderSize: 14,
    tileRecordSize: 6,
    postMapPaddingSize: 1008,
    unitRecordSize: 26,
    cityRecordSize: 84,
    cityNameOffset: 48,
    cityFields: {
      x: 16,
      y: 18,
      sizeCandidate: 14,
      populationSize: 25,
      ownerCandidate: 24,
      founderCandidate: 26,
      foodbox: 42,
      shieldbox: 44,
      baseTrade: 46,
      improvements: 68,
      production: 73,
    },
    lastContactOffset: 996,
  },
  44: {
    name: "MGE",
    settingsSize: 572,
    tribeNameCount: 7,
    tribeNameRecordSize: 242,
    tribeInfoCount: 8,
    tribeInfoRecordSize: 1428,
    mapHeaderSize: 14,
    tileRecordSize: 6,
    postMapPaddingSize: 1024,
    unitRecordSize: 32,
    cityRecordSize: 88,
    cityNameOffset: 32,
    cityFields: {
      x: 0,
      y: 2,
      sizeCandidate: 9,
      populationSize: 9,
      ownerCandidate: 8,
      founderCandidate: 10,
      foodbox: 26,
      shieldbox: 28,
      baseTrade: 30,
      improvements: 52,
      production: 57,
    },
    lastContactOffset: 996,
  },
};

const civ2VersionNames = {
  39: "Classic/CiC",
  40: "Fantastic Worlds",
  44: "MGE",
  49: "ToT v1.0",
  50: "ToT v1.1",
};

function cloneCityFields(fields) {
  return { ...fields };
}

function cityLayoutVariantsFor(layout, version) {
  const defaultVariant = {
    name: `${layout.name} city fields +${layout.cityNameOffset}`,
    cityNameOffset: layout.cityNameOffset,
    cityFields: cloneCityFields(layout.cityFields),
    default: true,
  };
  if (version !== 40) return [defaultVariant];

  return [
    {
      ...defaultVariant,
      name: "Fantastic Worlds city fields +48",
    },
    {
      name: "Fantastic Worlds city fields +46",
      cityNameOffset: 46,
      cityFields: {
        ...cloneCityFields(layout.cityFields),
        foodbox: 40,
        shieldbox: 42,
        baseTrade: 44,
        improvements: 66,
        production: 71,
      },
      default: false,
    },
  ];
}

function getLayout(version) {
  const layout = civ2Layouts[version];
  if (!layout) throw new Error(`Unsupported Civ2 version for layout calculation: ${version}`);
  return layout;
}

function computeOffsets(layout, unitsCount, citiesCount, version) {
  const tribeInfoOffset =
    12 + layout.settingsSize + layout.tribeNameCount * layout.tribeNameRecordSize;
  const mapHeaderOffset = tribeInfoOffset + layout.tribeInfoCount * layout.tribeInfoRecordSize;
  const width = bytes.readUInt16LE(mapHeaderOffset);
  const height = bytes.readUInt16LE(mapHeaderOffset + 2);
  const surface = bytes.readUInt16LE(mapHeaderOffset + 4);
  const mapShape = bytes.readUInt16LE(mapHeaderOffset + 6);
  const mapSeed = bytes.readUInt16LE(mapHeaderOffset + 8);
  const minimapWidth = bytes.readUInt16LE(mapHeaderOffset + 10);
  const minimapHeight = bytes.readUInt16LE(mapHeaderOffset + 12);
  const visibleImprovementsOffset = mapHeaderOffset + layout.mapHeaderSize;
  const mapOffset = visibleImprovementsOffset + 7 * surface;
  const afterMapOffset =
    mapOffset +
    surface * layout.tileRecordSize +
    2 * minimapWidth * minimapHeight +
    layout.postMapPaddingSize;
  const unitRecordOffset = afterMapOffset;
  const computedCityRecordOffset = unitRecordOffset + unitsCount * layout.unitRecordSize;
  const cityTileKeys = mapCityTileKeys({
    mapOffset,
    halfWidth: width / 2,
    height,
    tileRecordSize: layout.tileRecordSize,
  });
  const citySelection = findCityRecordOffset({
    computedCityRecordOffset,
    cityRecordSize: layout.cityRecordSize,
    cityLayoutVariants: cityLayoutVariantsFor(layout, version),
    citiesCount,
    width,
    height,
    cityTileKeys,
  });

  return {
    tribeInfoOffset,
    tribeInfoRecordSize: layout.tribeInfoRecordSize,
    mapHeaderOffset,
    width,
    height,
    surface,
    mapShape,
    mapSeed,
    minimapWidth,
    minimapHeight,
    visibleImprovementsOffset,
    mapOffset,
    afterMapOffset,
    unitRecordOffset,
    computedCityRecordOffset,
    cityRecordOffset: citySelection.offset,
    cityLayoutVariant: citySelection.variant.name,
    cityLayoutVariantScores: citySelection.scored,
    cityTileCount: cityTileKeys.size,
    cityRecordSize: layout.cityRecordSize,
    cityNameOffset: citySelection.variant.cityNameOffset,
    cityFields: citySelection.variant.cityFields,
    civ2TileRecordSize: layout.tileRecordSize,
    unitRecordSize: layout.unitRecordSize,
  };
}

function isLikelyCityName(name) {
  return /^[ -~]{2,16}$/.test(name) && /[A-Za-z]/.test(name);
}

function mapCityTileKeys({ mapOffset, halfWidth, height, tileRecordSize }) {
  const keys = new Set();
  for (let y = 0; y < height; y++) {
    for (let hx = 0; hx < halfWidth; hx++) {
      const tileIndex = y * halfWidth + hx;
      const tileOffset = mapOffset + tileIndex * tileRecordSize;
      const improvementByte = bytes[tileOffset + 1];
      if ((improvementByte & 0x02) === 0) continue;
      const x = hx * 2 + (y & 1);
      keys.add(`${x},${y}`);
    }
  }
  return keys;
}

function isPrintableNameByte(value) {
  return value >= 32 && value <= 126;
}

function isLetterByte(value) {
  return value >= 65 && value <= 90 || value >= 97 && value <= 122;
}

function cityImprovementPlausibility(improvementBytes) {
  let lowBits = 0;
  let highBits = 0;
  for (let bit = 1; bit < Math.min(improvementBytes.length * 8, improvementNames.length); bit++) {
    const byte = improvementBytes[Math.floor(bit / 8)];
    if ((byte & (1 << (bit % 8))) === 0) continue;
    if (bit <= 16) lowBits++;
    if (bit >= 24) highBits++;
  }
  return lowBits * 2 - highBits;
}

function scoreCityTable({
  offset,
  cityRecordSize,
  cityNameOffset,
  cityFields,
  citiesCount,
  width,
  height,
  cityTileKeys,
  variant,
}) {
  let score = 0;
  let nonempty = 0;
  let cityTileMatches = 0;
  let invalidRecords = 0;
  let cityTileMismatches = 0;
  const examples = [];
  let likelyTruncatedNames = 0;
  for (let index = 0; index < citiesCount; index++) {
    const recordOffset = offset + index * cityRecordSize;
    if (recordOffset + cityRecordSize > bytes.length) break;

    const name = readCString(recordOffset + cityNameOffset, 16).trim();
    if (!name) continue;
    nonempty++;

    const x = bytes.readUInt16LE(recordOffset + cityFields.x);
    const y = bytes.readUInt16LE(recordOffset + cityFields.y);
    const populationSize = bytes[recordOffset + cityFields.populationSize];
    const ownerCandidate = bytes[recordOffset + cityFields.ownerCandidate];

    let recordScore = 0;
    if (isLikelyCityName(name)) recordScore += 4;
    if (/^[A-Z][A-Za-z .'-]*$/.test(name)) recordScore += 2;
    if (name.length < 2) recordScore -= 8;
    if (/^[a-z]/.test(name)) recordScore -= 3;
    if (
      cityNameOffset >= 2
      && isLetterByte(bytes[recordOffset + cityNameOffset - 2])
      && isPrintableNameByte(bytes[recordOffset + cityNameOffset - 1])
    ) {
      recordScore -= 8;
      likelyTruncatedNames++;
    }
    const validCoord = x < width && y < height;
    if (validCoord) {
      recordScore += 3;
      if (cityTileKeys.has(`${x},${y}`)) {
        recordScore += 12;
        cityTileMatches++;
      } else {
        recordScore -= 12;
        cityTileMismatches++;
      }
    } else {
      recordScore -= 30;
      invalidRecords++;
    }
    if (populationSize > 0 && populationSize <= 40) {
      recordScore += 2;
    } else {
      recordScore -= 10;
      invalidRecords++;
    }
    if (ownerCandidate <= 7) {
      recordScore += 2;
    } else {
      recordScore -= 10;
      invalidRecords++;
    }
    recordScore += cityImprovementPlausibility(
      [...bytes.subarray(recordOffset + cityFields.improvements, recordOffset + cityFields.improvements + 5)],
    );
    score += recordScore;
    if (examples.length < 5) examples.push(name);
  }
  return {
    offset,
    score,
    nonempty,
    examples,
    likelyTruncatedNames,
    cityTileMatches,
    cityTileMismatches,
    invalidRecords,
    variant,
  };
}

function findCityRecordOffset({
  computedCityRecordOffset,
  cityRecordSize,
  cityLayoutVariants,
  citiesCount,
  width,
  height,
  cityTileKeys,
}) {
  const candidates = new Map();
  for (let delta = -2 * cityRecordSize; delta <= 2 * cityRecordSize; delta += cityRecordSize) {
    candidates.set(computedCityRecordOffset + delta, true);
  }
  for (let delta = -32; delta <= 32; delta += 2) {
    candidates.set(computedCityRecordOffset + delta, true);
  }

  const scored = [...candidates.keys()]
    .filter((offset) => offset >= 0 && offset < bytes.length)
    .flatMap((offset) =>
      cityLayoutVariants.map((variant) =>
        scoreCityTable({
          offset,
          cityRecordSize,
          cityNameOffset: variant.cityNameOffset,
          cityFields: variant.cityFields,
          citiesCount,
          width,
          height,
          cityTileKeys,
          variant,
        }),
      ),
    )
    .sort((a, b) =>
      b.score - a.score
      || b.nonempty - a.nonempty
      || Number(b.variant.default) - Number(a.variant.default),
    );

  if (!scored[0] || scored[0].score === 0) {
    throw new Error(`Could not locate plausible city table near ${computedCityRecordOffset}`);
  }
  const best = scored[0];
  const bestDefault = scored.find((candidate) => candidate.variant.default);
  if (!best.variant.default && bestDefault && best.score < bestDefault.score + 20) {
    return {
      offset: bestDefault.offset,
      variant: bestDefault.variant,
      scored: scored.map(scoreSummary),
    };
  }
  return {
    offset: best.offset,
    variant: best.variant,
    scored: scored.map(scoreSummary),
  };
}

function scoreSummary(candidate) {
  return {
    offset: candidate.offset,
    variant: candidate.variant.name,
    score: candidate.score,
    nonempty: candidate.nonempty,
    likelyTruncatedNames: candidate.likelyTruncatedNames,
    cityTileMatches: candidate.cityTileMatches,
    cityTileMismatches: candidate.cityTileMismatches,
    invalidRecords: candidate.invalidRecords,
    examples: candidate.examples,
  };
}

const cityHeader =
  'c={"y","x","id","original","size","nspe0","nspe1","nspe2","food_stock","shield_stock","history","airlift","was_happy","had_famine","turn_plague","anarchy","rapture","steal","turn_founded","acquire_t","did_buy","did_sell","turn_last_built","name","currently_building_kind","currently_building_name","current_want","changed_from_kind","changed_from_name","before_change_shields","caravan_shields","disbanded_shields","last_turns_shield_surplus","style","city_radius_sq","improvements","wl_length","option0","option1","option2","wlcb","ai.urgency","ai.building_turn","ai.building_wait","ai.founder_turn","ai.founder_want","ai.founder_boat","texai.urgency","texai.building_turn","texai.building_wait","texai.founder_turn","texai.founder_want","texai.founder_boat","citizen0","rally_point_length","rally_point_persistent","rally_point_vigilant","rally_point_orders","rally_point_dirs","rally_point_activities","rally_point_action_vec","rally_point_tgt_vec","rally_point_sub_tgt_vec","cma_enabled","cma_minimal_surplus","cma_minimal_surplus,1","cma_minimal_surplus,2","cma_minimal_surplus,3","cma_minimal_surplus,4","cma_minimal_surplus,5","cma_factor","cma_factor,1","cma_factor,2","cma_factor,3","cma_factor,4","cma_factor,5","max_growth","require_happy","allow_disorder","allow_specialists","happy_factor"';
const noImprovements =
  "0000000000000000000000000000000000000000000000000000000000000000000000000";

function freecivCityRow(city) {
  const size = city.populationSize ?? city.sizeCandidate + 1;
  const food = Math.max(2, Math.floor(size * 2));
  const shields = Math.max(2, size);
  return [
    city.y,
    city.x,
    1000 + city.index,
    city.ownerCandidate,
    size,
    0,
    0,
    0,
    food,
    shields,
    0,
    0,
    "FALSE",
    "FALSE",
    -1,
    0,
    0,
    0,
    1,
    1,
    "FALSE",
    "FALSE",
    0,
    csvEscape(city.name),
    csvEscape("UnitType"),
    csvEscape("Warriors"),
    0,
    csvEscape("UnitType"),
    csvEscape("Warriors"),
    shields,
    0,
    0,
    shields,
    csvEscape("European"),
    5,
    csvEscape(noImprovements),
    0,
    "FALSE",
    "FALSE",
    "FALSE",
    0,
    1000,
    9,
    8,
    1,
    900,
    "FALSE",
    0,
    0,
    1,
    0,
    0,
    "FALSE",
    size,
    0,
    "FALSE",
    "FALSE",
    csvEscape("-"),
    csvEscape("-"),
    csvEscape("-"),
    -1,
    -1,
    -1,
    "FALSE",
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    "FALSE",
    "FALSE",
    "FALSE",
    "FALSE",
    0,
  ].join(",");
}

const header = {
  magic: bytes.subarray(0, 9).toString("latin1"),
  marker: bytes[9],
  version: bytes.readUInt16LE(10),
};

if (header.magic !== "CIVILIZE\0") {
  throw new Error(`Not a Civ2 save/scenario file: ${inputPath}`);
}

const calendar = {
  notes: [
    "Raw candidate fields only; the visible Civ2 month/year is not decoded from these yet.",
    "In the Civil War scenario, turnCounterCandidate 1 displays as July 1861 and 2 displays as August 1861.",
  ],
  turnCounterCandidate: bytes.readUInt16LE(0x1c),
  turnCounterOffset: 0x1c,
  dateWordCandidate: bytes.readUInt16LE(0x1e),
  dateWordHex: `0x${bytes.readUInt16LE(0x1e).toString(16).padStart(4, "0")}`,
  dateWordOffset: 0x1e,
  rawHeaderBytes0x10To0x27: hexBytes(bytes.subarray(0x10, 0x28)),
};

const unitsCount = bytes.readUInt16LE(0x3a);
const citiesCount = bytes.readUInt16LE(0x3c);
const layout = getLayout(header.version);
const offsets = computeOffsets(layout, unitsCount, citiesCount, header.version);
const civ2TechCount = Math.min(100, technologies.length || (header.version > 39 ? 100 : 93));
const firstToDiscoverOffset = 266;
const discoveredByOffset = firstToDiscoverOffset + civ2TechCount;
const wonderLocationsOffset = discoveredByOffset + civ2TechCount;
const globalTechnologies = Array.from({ length: civ2TechCount }, (_, index) => {
  const definition = technologies[index] || null;
  const discoveredByByte = bytes[discoveredByOffset + index] ?? 0;
  return {
    index,
    name: definition?.name || "",
    abbreviation: definition?.abbreviation || "",
    firstToDiscoverRaw: bytes[firstToDiscoverOffset + index] ?? 0,
    discoveredByRaw: discoveredByByte,
    discoveredByOwners: Array.from({ length: 8 }, (_, ownerCandidate) => ownerCandidate)
      .filter((ownerCandidate) => (discoveredByByte & (1 << ownerCandidate)) !== 0),
  };
});

const civ2CityStyleNames = ["Bronze Age", "Classical", "Far East", "Medieval"];
const governmentTitleNames = governments.map((government) => government.name);

// Civ2 has seven tribe-name records followed by tribe-info blocks. The info
// blocks include barbarians at index 0, so playable tribe owner ids are 1..7.
const tribeNameOffset = 12 + layout.settingsSize;
const tribeNames = Array.from({ length: layout.tribeNameCount }, (_, index) => {
  const offset = tribeNameOffset + index * layout.tribeNameRecordSize;
  const strings = printableStrings(offset, layout.tribeNameRecordSize);
  const cityStyleRaw = bytes.readInt16LE(offset);
  const leaderTitles = Object.fromEntries(
    governmentTitleNames.map((name, titleIndex) => [
      name,
      readCString(offset + 74 + titleIndex * 24, 24).trim(),
    ]),
  );
  return {
    ownerCandidate: index + 1,
    offset,
    cityStyleRaw,
    cityStyle: civ2CityStyleNames[cityStyleRaw] || "Unknown",
    leader: readCString(offset + 2, 24).trim(),
    plural: readCString(offset + 26, 24).trim(),
    adjective: readCString(offset + 50, 24).trim(),
    leaderTitles,
    strings,
  };
});

const tribeInfoOffset = offsets.tribeInfoOffset;
const tribeInfoRecordSize = offsets.tribeInfoRecordSize;
const tribeInfos = Array.from({ length: 8 }, (_, index) => {
  const offset = tribeInfoOffset + index * tribeInfoRecordSize;
  const treatyOffset = offset + 36;
  const techBytes = bytes.subarray(offset + 88, offset + 100);
  const knownTechnologies = [];
  for (let techIndex = 0; techIndex < Math.min(techBytes.length * 8, technologies.length); techIndex++) {
    const byte = techBytes[Math.floor(techIndex / 8)];
    const bitMask = 1 << (techIndex % 8);
    if ((byte & bitMask) === 0) continue;
    const definition = technologies[techIndex] || {};
    knownTechnologies.push({
      index: techIndex,
      name: definition.name || "",
      abbreviation: definition.abbreviation || "",
    });
  }
  const treatyCandidates = treatyOtherCandidates(index);
  return {
    index,
    genderByte: bytes[offset + 1],
    gender: bytes[offset + 1] === 0 ? "male" : "female",
    money: bytes.readInt16LE(offset + 2),
    nation: bytes[offset + 6],
    researchProgress: bytes[offset + 8],
    currentResearchIndex: bytes[offset + 10] === 0xff ? null : bytes[offset + 10],
    currentResearchName: bytes[offset + 10] === 0xff ? "" : technologies[bytes[offset + 10]]?.name || "",
    scienceRate: bytes[offset + 19] * 10,
    taxRate: bytes[offset + 20] * 10,
    luxuryRate: Math.max(0, 100 - bytes[offset + 19] * 10 - bytes[offset + 20] * 10),
    government: bytes[offset + 21],
    techsOffset: offset + 88,
    techsRawBytes: hexBytes(techBytes),
    knownTechnologies,
    treatiesOffset: treatyOffset,
    treaties: treatyCandidates.map((otherCandidate, treatyIndex) => {
      const itemOffset = treatyOffset + treatyIndex * 4;
      const attitudeOffset = offset + 64 + otherCandidate;
      const lastContactOffset = offset + layout.lastContactOffset + treatyIndex * 2;
      const civ2Attitude = bytes[attitudeOffset];
      const rawBytes = bytes.subarray(itemOffset, itemOffset + 4);
      return {
        otherCandidate,
        offset: itemOffset,
        rawBytes: hexBytes(rawBytes),
        rawUInt32: bytes.readUInt32LE(itemOffset),
        attitudeOffset,
        civ2Attitude,
        civ2AttitudeName: civ2AttitudeName(civ2Attitude),
        freecivLove: civ2AttitudeToFreecivLove(civ2Attitude),
        lastContactOffset,
        lastContactTurn: bytes.readInt16LE(lastContactOffset),
        decoded: decodeTreaty(rawBytes),
      };
    }),
  };
});

const playerTreasuryByOwnerCandidate = Object.fromEntries(
  tribeInfos.slice(1).map((info) => [info.index, info.money]),
);

// Civ2 stores x as doubled columns, so map area is x * y / 2.
const mapHeaderOffset = offsets.mapHeaderOffset;
const width = offsets.width;
const height = offsets.height;
const surface = offsets.surface;
const halfWidth = width / 2;
const minimapWidth = offsets.minimapWidth;
const minimapHeight = offsets.minimapHeight;
const visibleImprovementsOffset = offsets.visibleImprovementsOffset;
const mapOffset = offsets.mapOffset;
const civ2TileRecordSize = offsets.civ2TileRecordSize;
const terrainByteInTileRecord = 0;
const improvementByteInTileRecord = 1;
const resourceSeed = civ2ResourceSeed(offsets.mapSeed);
const hutSeed = civ2HutSeed(resourceSeed);
const riverMask = 0x80;
const roadMask = 0x17;
const civ2Improvements = {
  Unit: 0x01,
  City: 0x02,
  Irrigation: 0x04,
  Mine: 0x08,
  Farmland: 0x0c,
  Road: 0x10,
  Railroad: 0x20,
  Fortress: 0x40,
  Airbase: 0x42,
  Pollution: 0x80,
};

function emptyFeatureRows(width, height) {
  return {
    rows: Array.from({ length: height }, () => ".".repeat(width)),
    nativeRows: Array.from({ length: height }, () => ".".repeat(width / 2)),
    nativeTileCount: 0,
  };
}

function emptyVisibilityRows(width, height) {
  return {
    rows: Array.from({ length: height }, () => ".".repeat(width)),
    nativeRows: Array.from({ length: height }, () => ".".repeat(width / 2)),
    nativeTileCount: 0,
  };
}

function markFeature(feature, x, y) {
  feature.nativeRows[y] =
    feature.nativeRows[y].slice(0, x) + "R" + feature.nativeRows[y].slice(x + 1);
  feature.rows[y] =
    feature.rows[y].slice(0, x * 2) + "RR" + feature.rows[y].slice(x * 2 + 2);
  feature.nativeTileCount++;
}

function markVisibility(visibility, x, y) {
  visibility.nativeRows[y] =
    visibility.nativeRows[y].slice(0, x) + "K" + visibility.nativeRows[y].slice(x + 1);
  visibility.rows[y] =
    visibility.rows[y].slice(0, x * 2) + "KK" + visibility.rows[y].slice(x * 2 + 2);
  visibility.nativeTileCount++;
}

const freeciv21FeatureNames = [
  "roads",
  "railroads",
  "irrigation",
  "mines",
  "farmland",
  "fortresses",
  "airbases",
  "pollution",
  "rivers",
  "resources",
  "huts",
  "grasslandShields",
];
const freeciv21Features = Object.fromEntries(
  freeciv21FeatureNames.map((name) => [name, emptyFeatureRows(width, height)]),
);
const visibilityByOwnerCandidate = Object.fromEntries(
  Array.from({ length: 7 }, (_, index) => [String(index + 1), emptyVisibilityRows(width, height)]),
);
const visibleFeaturesByOwnerCandidate = Object.fromEntries(
  Array.from({ length: 7 }, (_, index) => [
    String(index + 1),
    Object.fromEntries(
      freeciv21FeatureNames
        .filter((name) => !["resources", "huts", "grasslandShields"].includes(name))
        .map((name) => [name, emptyFeatureRows(width, height)]),
    ),
  ]),
);

const terrainRows = [];
const nativeTerrainRows = [];
const roadRows = [];
const nativeRoadRows = [];
const riverRows = [];
const nativeRiverRows = [];
const terrainByteCounts = new Map();
const terrainCodeCounts = new Map();
let roadNativeTileCount = 0;
let riverNativeTileCount = 0;
const resourceTiles = [];
const resourceCounts = new Map();
const hutTiles = [];
const grasslandShieldTiles = [];
for (let y = 0; y < height; y++) {
  let row = "";
  let nativeRow = "";
  let roadRow = "";
  let nativeRoadRow = "";
  let riverRow = "";
  let nativeRiverRow = "";
  for (let hx = 0; hx < halfWidth; hx++) {
    const tileIndex = y * halfWidth + hx;
    const tileOffset = mapOffset + tileIndex * civ2TileRecordSize;
    const terrainByte = bytes[tileOffset + terrainByteInTileRecord];
    const improvementByte = bytes[tileOffset + improvementByteInTileRecord];
    const visibilityByte = bytes[tileOffset + 4];
    const terrainCode = terrainByte & 0x0f;
    const tile = terrainToFreeciv(terrainByte);
    const hasRiver = (terrainByte & riverMask) !== 0;
    const hasNoResources = (terrainByte & 0x40) !== 0;
    const hasCiv2Airbase =
      (improvementByte & civ2Improvements.Airbase) === civ2Improvements.Airbase;
    const hasRoad = (improvementByte & roadMask) !== 0;
    const hasFreeciv21Road =
      (improvementByte & civ2Improvements.Road) === civ2Improvements.Road ||
      (!hasCiv2Airbase && (improvementByte & civ2Improvements.City) === civ2Improvements.City);
    const hasFreeciv21Railroad =
      (improvementByte & civ2Improvements.Railroad) === civ2Improvements.Railroad;
    const hasFreeciv21Irrigation =
      (improvementByte & civ2Improvements.Irrigation) === civ2Improvements.Irrigation;
    const hasFreeciv21Mine =
      (improvementByte & civ2Improvements.Mine) === civ2Improvements.Mine;
    const hasFreeciv21Farmland =
      (improvementByte & civ2Improvements.Farmland) === civ2Improvements.Farmland;
    const hasFreeciv21Fortress =
      !hasCiv2Airbase &&
      (improvementByte & civ2Improvements.Fortress) === civ2Improvements.Fortress;
    const hasFreeciv21Airbase = hasCiv2Airbase;
    const hasFreeciv21Pollution =
      (improvementByte & civ2Improvements.Pollution) === civ2Improvements.Pollution;
    increment(terrainByteCounts, terrainByte);
    increment(terrainCodeCounts, terrainName(terrainByte));
    nativeRow += tile;
    row += tile + tile;
    nativeRiverRow += hasRiver ? "R" : ".";
    riverRow += hasRiver ? "RR" : "..";
    nativeRoadRow += hasRoad ? "R" : ".";
    roadRow += hasRoad ? "RR" : "..";
    if (hasRiver) riverNativeTileCount++;
    if (hasRoad) roadNativeTileCount++;
    if (hasRiver) markFeature(freeciv21Features.rivers, hx, y);
    if (hasFreeciv21Road) markFeature(freeciv21Features.roads, hx, y);
    if (hasFreeciv21Railroad) markFeature(freeciv21Features.railroads, hx, y);
    if (hasFreeciv21Irrigation) markFeature(freeciv21Features.irrigation, hx, y);
    if (hasFreeciv21Farmland) markFeature(freeciv21Features.farmland, hx, y);
    if (hasFreeciv21Mine && !hasFreeciv21Farmland) markFeature(freeciv21Features.mines, hx, y);
    if (hasFreeciv21Fortress) markFeature(freeciv21Features.fortresses, hx, y);
    if (hasFreeciv21Airbase) markFeature(freeciv21Features.airbases, hx, y);
    if (hasFreeciv21Pollution) markFeature(freeciv21Features.pollution, hx, y);
    for (let ownerCandidate = 1; ownerCandidate <= 7; ownerCandidate++) {
      if ((visibilityByte & (1 << ownerCandidate)) === 0) continue;
      const ownerKey = String(ownerCandidate);
      markVisibility(visibilityByOwnerCandidate[ownerKey], hx, y);

      if (hasRiver) {
        markFeature(visibleFeaturesByOwnerCandidate[ownerKey].rivers, hx, y);
      }

      const visibleImprovementByte =
        bytes[visibleImprovementsOffset + (ownerCandidate - 1) * surface + tileIndex];
      const visibleHasCiv2Airbase =
        (visibleImprovementByte & civ2Improvements.Airbase) === civ2Improvements.Airbase;
      if (
        (visibleImprovementByte & civ2Improvements.Road) === civ2Improvements.Road
        || (
          !visibleHasCiv2Airbase
          && (visibleImprovementByte & civ2Improvements.City) === civ2Improvements.City
        )
      ) {
        markFeature(visibleFeaturesByOwnerCandidate[ownerKey].roads, hx, y);
      }
      if ((visibleImprovementByte & civ2Improvements.Railroad) === civ2Improvements.Railroad) {
        markFeature(visibleFeaturesByOwnerCandidate[ownerKey].railroads, hx, y);
      }
      if ((visibleImprovementByte & civ2Improvements.Irrigation) === civ2Improvements.Irrigation) {
        markFeature(visibleFeaturesByOwnerCandidate[ownerKey].irrigation, hx, y);
      }
      const visibleHasFarmland =
        (visibleImprovementByte & civ2Improvements.Farmland) === civ2Improvements.Farmland;
      if (visibleHasFarmland) {
        markFeature(visibleFeaturesByOwnerCandidate[ownerKey].farmland, hx, y);
      }
      if (
        (visibleImprovementByte & civ2Improvements.Mine) === civ2Improvements.Mine
        && !visibleHasFarmland
      ) {
        markFeature(visibleFeaturesByOwnerCandidate[ownerKey].mines, hx, y);
      }
      if (
        !visibleHasCiv2Airbase
        && (visibleImprovementByte & civ2Improvements.Fortress) === civ2Improvements.Fortress
      ) {
        markFeature(visibleFeaturesByOwnerCandidate[ownerKey].fortresses, hx, y);
      }
      if (visibleHasCiv2Airbase) {
        markFeature(visibleFeaturesByOwnerCandidate[ownerKey].airbases, hx, y);
      }
      if ((visibleImprovementByte & civ2Improvements.Pollution) === civ2Improvements.Pollution) {
        markFeature(visibleFeaturesByOwnerCandidate[ownerKey].pollution, hx, y);
      }
    }
    const civ2X = hx * 2 + (y & 1);
    if (isCiv2ShieldGrasslandTile(hx, y, terrainCode)) {
      markFeature(freeciv21Features.grasslandShields, hx, y);
      grasslandShieldTiles.push({
        x: civ2X,
        y,
        nativeX: hx,
        terrain: terrainName(terrainByte),
      });
    }
    if (isCiv2HutTile(civ2X, y, resourceSeed, terrainCode === 10)) {
      markFeature(freeciv21Features.huts, hx, y);
      hutTiles.push({
        x: civ2X,
        y,
        nativeX: hx,
        terrain: terrainName(terrainByte),
      });
    }
    const resourceSlot = hasNoResources ? 0 : civ2ResourceSlot(resourceSeed, civ2X, y);
    const resourceName = civ2ResourceByTerrainAndSlot[terrainCode]?.[resourceSlot];
    if (resourceName) {
      markFeature(freeciv21Features.resources, hx, y);
      increment(resourceCounts, resourceName);
      resourceTiles.push({
        x: civ2X,
        y,
        nativeX: hx,
        terrain: terrainName(terrainByte),
        slot: resourceSlot,
        resource: resourceName,
      });
    }
  }
  nativeTerrainRows.push(nativeRow);
  terrainRows.push(row);
  nativeRiverRows.push(nativeRiverRow);
  riverRows.push(riverRow);
  nativeRoadRows.push(nativeRoadRow);
  roadRows.push(roadRow);
}

const cityRecordOffset = offsets.cityRecordOffset;
const cityRecordSize = offsets.cityRecordSize;
const cityNameOffset = offsets.cityNameOffset;
const cities = [];

const civ2UnitOrderNames = {
  1: "Fortify",
  2: "Fortified",
  3: "Sentry",
  4: "Build Fortress",
  5: "Build Road/Railroad",
  6: "Irrigate/Farmland",
  7: "Mine",
  8: "Transform",
  9: "Clean Pollution",
  10: "Build Airbase",
  11: "Go To",
  255: "None",
};

function hexByte(value) {
  return value.toString(16).padStart(2, "0");
}

function signed16(value) {
  return value >= 0x8000 ? value - 0x10000 : value;
}

function decodeUnitRecord(index) {
  const offset = offsets.unitRecordOffset + index * offsets.unitRecordSize;
  if (offset + offsets.unitRecordSize > bytes.length) return null;
  const classicLayout = header.version === 39 || header.version === 40;
  const rawX = classicLayout ? bytes.readUInt16LE(offset + 16) : bytes.readUInt16LE(offset);
  const rawY = classicLayout ? bytes.readUInt16LE(offset + 18) : bytes.readUInt16LE(offset + 2);
  const typeIndex = classicLayout ? bytes[offset + 22] : bytes[offset + 6];
  const ownerCandidate = classicLayout ? bytes[offset + 23] : bytes[offset + 7];
  const orders = classicLayout ? bytes[offset + 6] : bytes[offset + 15];
  const homeCityIndex = classicLayout ? bytes[offset + 12] : bytes[offset + 16];
  const flag0 = bytes[offset + 4];
  const flag1 = bytes[offset + 5];
  const flag2 = classicLayout ? bytes[offset + 24] : bytes[offset + 5];
  const classicStatus = classicLayout ? bytes[offset + 21] : 0;
  const links = classicLayout ? [] : [bytes.readUInt16LE(offset + 22), bytes.readUInt16LE(offset + 24)];
  const rawBytes = bytes.subarray(offset, offset + offsets.unitRecordSize);
  const unitType = unitTypes[typeIndex];
  const activity = decodeUnitActivity(classicLayout, rawBytes, unitType);
  const id = offsets.unitRecordSize >= 32 ? bytes.readUInt16LE(offset + 26) : null;
  const signedX = signed16(rawX);
  const signedY = signed16(rawY);
  const ownerOffMapSentinel = !classicLayout
    && signedX === signedY
    && signedX === -100 * (ownerCandidate + 1);
  const alternateX = classicLayout ? null : bytes[offset + 18];
  const alternateY = classicLayout ? null : bytes[offset + 20];
  const x = rawX;
  const y = rawY;
  const inactiveCandidate = !classicLayout && id === 0 && ownerOffMapSentinel;
  const unit = {
    index,
    offset,
    layout: classicLayout ? "classic" : "mge",
    rawX,
    rawY,
    x,
    y,
    signedX,
    signedY,
    alternateX,
    alternateY,
    coordinateSource: "primary",
    nativeX: Math.floor(x / 2),
    typeIndex,
    typeName: unitType?.name || "",
    ownerCandidate,
    movesUsed: classicLayout ? bytes[offset + 25] : bytes[offset + 8],
    hpLost: classicLayout ? bytes[offset + 8] : bytes[offset + 10],
    workProgress: classicLayout ? bytes[offset + 10] : bytes[offset + 11],
    commodity: classicLayout ? bytes[offset + 14] : bytes[offset + 13],
    orders,
    orderName: civ2UnitOrderNames[orders] || `Unknown (${orders})`,
    activity,
    homeCityIndex: homeCityIndex === 0xff || homeCityIndex >= citiesCount ? null : homeCityIndex,
    gotoX: classicLayout ? null : bytes.readUInt16LE(offset + 17),
    gotoY: classicLayout ? null : bytes.readUInt16LE(offset + 19),
    links,
    flags: {
      raw: [flag0, flag1, flag2].map(hexByte).join(" "),
      classicStatus: classicLayout ? hexByte(classicStatus) : null,
      movedCandidate: (flag0 & 0x40) !== 0,
      veteranCandidate: (flag1 & 0x20) !== 0,
      starCandidate: (flag2 & 0x01) !== 0,
    },
    ownerOffMapSentinel,
    inactiveCandidate,
    placementStatus: inactiveCandidate
      ? "Likely removed/dead MGE unit slot"
      : ownerOffMapSentinel
        ? "Owner-coded off-map MGE coordinate"
        : "Map tile",
    rawBytes: [...rawBytes].map(hexByte).join(" "),
  };
  if (offsets.unitRecordSize >= 32) {
    unit.id = id;
    unit.unknownTail = [...bytes.subarray(offset + 28, offset + 32)].map(hexByte).join(" ");
  }
  return unit;
}

const units = Array.from({ length: unitsCount }, (_, index) => decodeUnitRecord(index)).filter(Boolean);

for (let index = 0; index < citiesCount; index++) {
  const offset = cityRecordOffset + index * cityRecordSize;
  if (offset + cityRecordSize > bytes.length) {
    break;
  }

  const name = readCString(offset + cityNameOffset, 16).trim();

  const cityFields = layout.cityFields;
  const improvementBytes = [...bytes.subarray(offset + cityFields.improvements, offset + cityFields.improvements + 5)];
  const improvementMask = bytes.readUInt32LE(offset + cityFields.improvements);
  const productionItem = bytes[offset + cityFields.production];
  const productionUnit = unitTypes[productionItem];
  const productionImprovementIndex = 256 - productionItem;
  const productionImprovementName =
    productionImprovementIndex >= 0
    && productionImprovementIndex < improvementNames.length
    && improvementNames[productionImprovementIndex] !== "Nothing"
      ? improvementNames[productionImprovementIndex]
      : null;
  const foodbox = bytes.readInt16LE(offset + cityFields.foodbox);
  const shieldbox = bytes.readInt16LE(offset + cityFields.shieldbox);
  const baseTrade = bytes.readInt16LE(offset + cityFields.baseTrade);
  cities.push({
    index,
    name,
    x: bytes.readUInt16LE(offset + cityFields.x),
    y: bytes.readUInt16LE(offset + cityFields.y),
    sizeCandidate: bytes[offset + cityFields.sizeCandidate],
    populationSize: bytes[offset + cityFields.populationSize],
    ownerCandidate: bytes[offset + cityFields.ownerCandidate],
    founderCandidate: bytes[offset + cityFields.founderCandidate],
    foodbox,
    shieldbox,
    baseTrade,
    improvementMask,
    improvementBytes: improvementBytes
      .map((value) => value.toString(16).padStart(2, "0"))
      .join(" "),
    improvements: decodeCityImprovements(improvementBytes, improvementNames),
    currentProduction: productionUnit
      ? {
          raw: productionItem,
          kind: "UnitType",
          civ2Name: productionUnit.name,
          typeIndex: productionUnit.index,
        }
      : productionImprovementName
        ? {
            raw: productionItem,
            kind: "Building",
            civ2Name: productionImprovementName,
            improvementIndex: productionImprovementIndex,
          }
        : {
            raw: productionItem,
            kind: "Unknown",
          },
    raw: {
      b6: bytes[offset + 6],
      b12: bytes[offset + 12],
      b14: bytes[offset + 14],
      b16: bytes[offset + 16],
      b18: bytes[offset + 18],
      b24: bytes[offset + 24],
      b26: bytes[offset + 26],
      b38: bytes[offset + 38],
      b40: bytes[offset + 40],
      b42: bytes[offset + 42],
      b73: productionItem,
    },
  });
}

for (const unit of units) {
  if (unit.homeCityIndex !== null) {
    unit.homeCityName = cities[unit.homeCityIndex]?.name || "";
  }
}

const previewRows = terrainRows.map((row) => row.split(""));
const nativePreviewRows = nativeTerrainRows.map((row) => row.split(""));
const roadPreviewRows = terrainRows.map((row, y) =>
  row
    .split("")
    .map((tile, x) => (roadRows[y][x] === "R" && tile !== " " ? "#" : tile)),
);
const nativeRoadPreviewRows = nativeTerrainRows.map((row, y) =>
  row
    .split("")
    .map((tile, x) => (nativeRoadRows[y][x] === "R" && tile !== " " ? "#" : tile)),
);
const riverPreviewRows = terrainRows.map((row, y) =>
  row
    .split("")
    .map((tile, x) => (riverRows[y][x] === "R" && tile !== " " ? "~" : tile)),
);
const nativeRiverPreviewRows = nativeTerrainRows.map((row, y) =>
  row
    .split("")
    .map((tile, x) => (nativeRiverRows[y][x] === "R" && tile !== " " ? "~" : tile)),
);
for (const city of cities) {
  if (city.y < 0 || city.y >= height || city.x < 0 || city.x >= width) {
    continue;
  }
  const marker = markerForCity(city.name);
  const nativeX = Math.floor(city.x / 2);
  previewRows[city.y][city.x] = marker[0];
  nativePreviewRows[city.y][nativeX] = marker[0];
  nativeRoadPreviewRows[city.y][nativeX] = marker[0];
  nativeRiverPreviewRows[city.y][nativeX] = marker[0];
  if (city.x + 1 < width) {
    previewRows[city.y][city.x + 1] = marker[1];
    roadPreviewRows[city.y][city.x + 1] = marker[1];
    riverPreviewRows[city.y][city.x + 1] = marker[1];
  }
  roadPreviewRows[city.y][city.x] = marker[0];
  riverPreviewRows[city.y][city.x] = marker[0];
}

const csvLines = [
  "index,name,x,y,sizeCandidate,populationSize,ownerCandidate,founderCandidate,foodbox,shieldbox,baseTrade,b6,b12,b14,b16,b18,b24,b26,b38,b40,b42",
  ...cities.map((city) =>
    [
      city.index,
      JSON.stringify(city.name),
      city.x,
      city.y,
      city.sizeCandidate,
      city.populationSize,
      city.ownerCandidate,
      city.founderCandidate,
      city.foodbox,
      city.shieldbox,
      city.baseTrade,
      city.raw.b6,
      city.raw.b12,
      city.raw.b14,
      city.raw.b16,
      city.raw.b18,
      city.raw.b24,
      city.raw.b26,
      city.raw.b38,
      city.raw.b40,
      city.raw.b42,
    ].join(",")
  ),
];

const unitCsvLines = [
  "index,typeIndex,typeName,ownerCandidate,x,y,nativeX,movesUsed,hpLost,workProgress,commodity,orders,orderName,civ2State,freecivActivity,homeCityIndex,homeCityName,gotoX,gotoY,links,flagBytes,movedCandidate,veteranCandidate,starCandidate",
  ...units.map((unit) =>
    [
      unit.index,
      unit.typeIndex,
      JSON.stringify(unit.typeName),
      unit.ownerCandidate,
      unit.x,
      unit.y,
      unit.nativeX,
      unit.movesUsed,
      unit.hpLost,
      unit.workProgress,
      unit.commodity,
      unit.orders,
      JSON.stringify(unit.orderName),
      JSON.stringify(unit.activity?.civ2State || "Idle"),
      JSON.stringify(unit.activity?.freecivActivity || "Idle"),
      unit.homeCityIndex ?? "",
      JSON.stringify(unit.homeCityName || ""),
      unit.gotoX,
      unit.gotoY,
      JSON.stringify(unit.links.join(" ")),
      JSON.stringify(unit.flags.raw),
      unit.flags.movedCandidate,
      unit.flags.veteranCandidate,
      unit.flags.starCandidate,
    ].join(",")
  ),
];

const mapFragment = [
  "[map]",
  "have_huts=FALSE",
  "have_resources=FALSE",
  ...terrainRows.map((row, y) => `t${String(y).padStart(4, "0")}=${JSON.stringify(row)}`),
  "startpos_count=0",
  ...terrainRows.map((row, y) => `source${String(y).padStart(4, "0")}=${JSON.stringify("0".repeat(row.length))}`),
  "",
  "; Extracted Civ2 city positions. Full player city tables still need owner decoding.",
  ...cities.map((city) => `; city=${JSON.stringify(city.name)}, x=${city.x}, y=${city.y}, sizeCandidate=${city.sizeCandidate}, ownerCandidate=${city.ownerCandidate}`),
  "",
];

const nativeMapFragment = [
  "[map]",
  "have_huts=FALSE",
  "have_resources=FALSE",
  ...nativeTerrainRows.map((row, y) => `t${String(y).padStart(4, "0")}=${JSON.stringify(row)}`),
  "startpos_count=0",
  ...nativeTerrainRows.map((row, y) => `source${String(y).padStart(4, "0")}=${JSON.stringify("0".repeat(row.length))}`),
  "",
  "; Native-width Freeciv terrain fragment. Civ2 doubled x coordinates are remapped with floor(x / 2).",
  ...cities.map((city) => `; city=${JSON.stringify(city.name)}, x=${Math.floor(city.x / 2)}, y=${city.y}, civ2x=${city.x}, populationSize=${city.populationSize}, sizeCandidate=${city.sizeCandidate}, ownerCandidate=${city.ownerCandidate}`),
  "",
];

const ownerGroups = Map.groupBy
  ? Map.groupBy(cities, (city) => city.ownerCandidate)
  : cities.reduce((groups, city) => {
      if (!groups.has(city.ownerCandidate)) groups.set(city.ownerCandidate, []);
      groups.get(city.ownerCandidate).push(city);
      return groups;
    }, new Map());

const ownerUnitGroups = Map.groupBy
  ? Map.groupBy(
      units.filter((unit) => unit.ownerCandidate >= 0 && unit.ownerCandidate <= 7 && !unit.inactiveCandidate),
      (unit) => unit.ownerCandidate,
    )
  : units.reduce((groups, unit) => {
      if (unit.ownerCandidate < 0 || unit.ownerCandidate > 7 || unit.inactiveCandidate) return groups;
      if (!groups.has(unit.ownerCandidate)) groups.set(unit.ownerCandidate, []);
      groups.get(unit.ownerCandidate).push(unit);
      return groups;
    }, new Map());

const activeOwnerCandidates = [...new Set([...ownerGroups.keys(), ...ownerUnitGroups.keys()])]
  .sort((a, b) => a - b);

function usableRulesLeaderName(value) {
  const text = (value || "").trim();
  return text && text !== "..." ? text : "";
}

function leaderNameFromRules(entry, gender) {
  if (!entry) return "";
  if (gender === "female") {
    return usableRulesLeaderName(entry.femaleLeader) || usableRulesLeaderName(entry.maleLeader);
  }
  return usableRulesLeaderName(entry.maleLeader) || usableRulesLeaderName(entry.femaleLeader);
}

function resolveNameValue(savedValue, fallbackValue) {
  const saved = (savedValue || "").trim();
  if (saved) return { value: saved, source: "save" };
  const fallback = (fallbackValue || "").trim();
  if (fallback) return { value: fallback, source: "rules-fallback" };
  return { value: "", source: "empty" };
}

const factions = activeOwnerCandidates
  .map((ownerCandidate) => {
    const ownerCities = ownerGroups.get(ownerCandidate) || [];
    const ownerUnits = ownerUnitGroups.get(ownerCandidate) || [];
    const info = tribeInfos[ownerCandidate];
    const names = tribeNames.find((tribeName) => tribeName.ownerCandidate === ownerCandidate);
    const rulesLeader = ownerCandidate === 0 ? null : rulesLeaders[info?.nation ?? -1];
    const resolvedLeader = resolveNameValue(names?.leader, leaderNameFromRules(rulesLeader, info?.gender));
    const resolvedPlural = resolveNameValue(names?.plural, rulesLeader?.plural);
    const resolvedAdjective = resolveNameValue(names?.adjective, rulesLeader?.adjective);
    const nameStrings = [
      resolvedLeader.value,
      resolvedPlural.value,
      resolvedAdjective.value,
      ...(names?.strings || []),
    ].filter(Boolean);
    return {
      ownerCandidate,
      kind: ownerCandidate === 0 ? "barbarian" : "tribe",
      leader: resolvedLeader.value,
      plural: resolvedPlural.value,
      adjective: resolvedAdjective.value,
      nameSources: {
        leader: resolvedLeader.source,
        plural: resolvedPlural.source,
        adjective: resolvedAdjective.source,
      },
      rulesLeaderFallback: rulesLeader
        ? {
            index: rulesLeader.index,
            maleLeader: rulesLeader.maleLeader,
            femaleLeader: rulesLeader.femaleLeader,
            plural: rulesLeader.plural,
            adjective: rulesLeader.adjective,
          }
        : null,
      cityStyleRaw: names?.cityStyleRaw ?? null,
      cityStyle: names?.cityStyle || "Unknown",
      leaderTitles: names?.leaderTitles || {},
      savedNameStrings: names?.strings || [],
      nameStrings: [...new Set(nameStrings)],
      cityCount: ownerCities.length,
      cityExamples: ownerCities.slice(0, 8).map((city) => city.name),
      unitCount: ownerUnits.length,
      unitExamples: ownerUnits.slice(0, 8).map((unit) => ({
        index: unit.index,
        typeName: unit.typeName,
        x: unit.x,
        y: unit.y,
      })),
      treasury: info?.money ?? 0,
      genderByte: info?.genderByte ?? 0,
      gender: info?.gender ?? "male",
      nationByte: info?.nation ?? 0,
      governmentByte: info?.government ?? 0,
      governmentName: governments[info?.government ?? 0]?.name || "",
      taxRate: info?.taxRate ?? 0,
      scienceRate: info?.scienceRate ?? 0,
      luxuryRate: info?.luxuryRate ?? 0,
      currentResearchIndex: info?.currentResearchIndex ?? null,
      currentResearchName: info?.currentResearchName || "",
      researchProgress: info?.researchProgress ?? 0,
      knownTechnologyCount: info?.knownTechnologies?.length ?? 0,
    };
  });

const factionReport = {
  input: path.basename(inputPath),
  header,
  calendar,
  layout: layout.name,
  inferred: {
    tribeNameOffset,
    tribeNameRecordSize: layout.tribeNameRecordSize,
    tribeInfoOffset,
    tribeInfoRecordSize,
  },
  notes: [
    "ownerCandidate is the Civ2 tribe/player id seen in city and unit records.",
    "Faction entries include ownerCandidate values that own at least one extracted city or one extracted unit.",
    "Unit-only faction detection ignores inactive MGE unit slots and unit owner candidates outside 0..7.",
    "ownerCandidate 0 is barbarian; playable tribe-name records cover ownerCandidate 1..7.",
    "Use this file to decide the manual Freeciv conversion config players array.",
    "governmentName is decoded from the Civ2 @GOVERNMENTS section when rules.txt is configured.",
  ],
  governments,
  rulesLeaders,
  factions,
};

const factionNameByOwner = new Map(
  factions.map((faction) => [
    faction.ownerCandidate,
    faction.leader || faction.plural || `ownerCandidate ${faction.ownerCandidate}`,
  ]),
);
const diplomacyOwnerCandidates = activeOwnerCandidates.filter((ownerCandidate) => ownerCandidate >= 1 && ownerCandidate <= 7);
const diplomacyPairs = [];
for (let i = 0; i < diplomacyOwnerCandidates.length; i++) {
  for (let j = i + 1; j < diplomacyOwnerCandidates.length; j++) {
    const a = diplomacyOwnerCandidates[i];
    const b = diplomacyOwnerCandidates[j];
    const aToB = tribeInfos[a]?.treaties.find((entry) => entry.otherCandidate === b);
    const bToA = tribeInfos[b]?.treaties.find((entry) => entry.otherCandidate === a);
    diplomacyPairs.push({
      a,
      aName: factionNameByOwner.get(a),
      b,
      bName: factionNameByOwner.get(b),
      aToB: aToB
        ? {
            rawBytes: aToB.rawBytes,
            rawUInt32: aToB.rawUInt32,
            attitudeOffset: aToB.attitudeOffset,
            civ2Attitude: aToB.civ2Attitude,
            civ2AttitudeName: aToB.civ2AttitudeName,
            freecivLove: aToB.freecivLove,
            lastContactOffset: aToB.lastContactOffset,
            lastContactTurn: aToB.lastContactTurn,
            decoded: aToB.decoded,
          }
        : null,
      bToA: bToA
        ? {
            rawBytes: bToA.rawBytes,
            rawUInt32: bToA.rawUInt32,
            attitudeOffset: bToA.attitudeOffset,
            civ2Attitude: bToA.civ2Attitude,
            civ2AttitudeName: bToA.civ2AttitudeName,
            freecivLove: bToA.freecivLove,
            lastContactOffset: bToA.lastContactOffset,
            lastContactTurn: bToA.lastContactTurn,
            decoded: bToA.decoded,
          }
        : null,
      symmetric: Boolean(aToB && bToA && aToB.rawBytes === bToA.rawBytes),
    });
  }
}

const diplomacyReport = {
  input: path.basename(inputPath),
  header,
  calendar,
  layout: layout.name,
  inferred: {
    tribeInfoOffset,
    tribeInfoRecordSize,
    treatiesOffsetInTribeInfoRecord: 36,
    treatyRecordSize: 4,
    treatyRecordCountPerTribe: 7,
    attitudeOffsetFormula: "tribeInfoRecord + 64 + targetOwnerCandidate",
    lastContactOffsetInTribeInfoRecord: layout.lastContactOffset,
    lastContactRecordSize: 2,
  },
  notes: [
    "Diplomacy extraction decodes treaty bits and directional Civ2 attitude values.",
    "Each tribe-info block contains seven 4-byte treaty records for ownerCandidate 1..7, using slot otherCandidate - 1.",
    "Civ2 attitude ranges from 0 (like) to 100 (dislike); freecivLove maps it linearly to 1000..-1000.",
    "lastContactTurn is a signed 16-bit field; -1 appears to mean no previous contact, while 0 or greater means contact has occurred.",
    "Only pairs between playable ownerCandidate values 1..7 that own at least one extracted city or one extracted unit are listed in pairs.",
    "decoded.relation uses Freeciv21's known formal treaty bits; Civ2 attitude labels such as neutral/icy/enraged are represented numerically as civ2Attitude.",
  ],
  factions: factions
    .filter((faction) => faction.ownerCandidate >= 1 && faction.ownerCandidate <= 7)
    .map((faction) => ({
      ownerCandidate: faction.ownerCandidate,
      leader: faction.leader,
      plural: faction.plural,
      adjective: faction.adjective,
    })),
  byOwner: tribeInfos.map((info) => ({
    ownerCandidate: info.index,
    treatiesOffset: info.treatiesOffset,
    treaties: info.treaties,
  })),
  pairs: diplomacyPairs,
};

const technologyReport = {
  input: path.basename(inputPath),
  header,
  calendar,
  layout: layout.name,
  inferred: {
    civ2TechCount,
    rulesTechnologyCount: technologies.length,
    firstToDiscoverOffset,
    discoveredByOffset,
    wonderLocationsOffset,
    techsOffsetInTribeInfoRecord: 88,
    techsBytesInTribeInfoRecord: 12,
    techsBitCapacityInTribeInfoRecord: 96,
  },
  notes: [
    "Technology definitions are parsed from the @CIVILIZE section of rules.txt.",
    "Per-faction known technologies are decoded from the 12-byte tribe-info technology bitfield at offset +88.",
    "The extractor uses the @CIVILIZE rules.txt entry count, capped at 100, as the technology slot count.",
    "The per-faction bitfield is decoded as 12 bytes / 96 bits; rule entries beyond bit 95 are listed as notRepresentableInKnownTechBitfield until any remaining per-faction storage is identified.",
    "globalTechnologies uses the Civ2 header first_to_discover and discovered_by arrays. discoveredByOwners are raw owner-candidate bits.",
  ],
  technologies,
  globalTechnologies,
  byOwner: tribeInfos.map((info) => ({
    ownerCandidate: info.index,
    leader: factions.find((faction) => faction.ownerCandidate === info.index)?.leader || "",
    currentResearchIndex: info.currentResearchIndex,
    currentResearchName: info.currentResearchName,
    researchProgress: info.researchProgress,
    techsOffset: info.techsOffset,
    techsRawBytes: info.techsRawBytes,
    knownTechnologyCount: info.knownTechnologies.length,
    knownTechnologies: info.knownTechnologies,
  })),
  notRepresentableInKnownTechBitfield: technologies.slice(96).map((technology) => ({
    index: technology.index,
    name: technology.name,
    abbreviation: technology.abbreviation,
  })),
};

const unitGroupsByOwner = Map.groupBy
  ? Map.groupBy(units, (unit) => unit.ownerCandidate)
  : units.reduce((groups, unit) => {
      if (!groups.has(unit.ownerCandidate)) groups.set(unit.ownerCandidate, []);
      groups.get(unit.ownerCandidate).push(unit);
      return groups;
    }, new Map());

const unitGroupsByType = Map.groupBy
  ? Map.groupBy(units, (unit) => unit.typeIndex)
  : units.reduce((groups, unit) => {
      if (!groups.has(unit.typeIndex)) groups.set(unit.typeIndex, []);
      groups.get(unit.typeIndex).push(unit);
      return groups;
    }, new Map());

const unitReport = {
  input: path.basename(inputPath),
  header,
  calendar,
  layout: layout.name,
  inferred: {
    unitsCount,
    unitRecordOffset: offsets.unitRecordOffset,
    unitRecordSize: offsets.unitRecordSize,
    rulesPath: rulesPath ? path.basename(rulesPath) : null,
  },
  notes: [
    "Unit x coordinates are Civ2 doubled coordinates; nativeX is floor(x / 2).",
    "typeIndex is the Civ2 unit type index into the @UNITS section from rules.txt.",
    "ownerCandidate is the Civ2 tribe/player id seen in unit records.",
    "moved/veteran/star are currently marked Candidate because Civ2 packs these as bitfields.",
    "Freeciv unit creation is not done here; this file is the extraction/mapping input.",
  ],
  unitTypes,
  byOwner: [...unitGroupsByOwner.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ownerCandidate, ownerUnits]) => ({
      ownerCandidate,
      count: ownerUnits.length,
      examples: ownerUnits.slice(0, 12).map((unit) => ({
        index: unit.index,
        typeIndex: unit.typeIndex,
        typeName: unit.typeName,
        x: unit.x,
        y: unit.y,
        homeCityName: unit.homeCityName || "",
      })),
    })),
  byType: [...unitGroupsByType.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([typeIndex, typeUnits]) => ({
      typeIndex,
      typeName: unitTypes[typeIndex]?.name || "",
      count: typeUnits.length,
      owners: sortedCounts(
        typeUnits.reduce((counts, unit) => {
          increment(counts, unit.ownerCandidate);
          return counts;
        }, new Map()),
      ),
    })),
  units,
};

const cityFragment = [
  "; Freeciv city-table fragments grouped by decoded Civ2 ownerCandidate.",
  "; Paste rows into matching [playerN] sections after mapping Civ2 owners to Freeciv players.",
  "",
];
for (const [owner, group] of [...ownerGroups.entries()].sort((a, b) => a[0] - b[0])) {
  cityFragment.push(`; ownerCandidate=${owner}`);
  cityFragment.push(`ncities=${group.length}`);
  cityFragment.push(cityHeader);
  cityFragment.push(...group.map(freecivCityRow));
  cityFragment.push("}");
  cityFragment.push("");
}

const report = {
  input: path.basename(inputPath),
  header,
  calendar,
  layout: layout.name,
  inferred: {
    width,
    height,
    surface,
    halfWidth,
    minimapWidth,
    minimapHeight,
    unitsCount,
    citiesCount,
    tribeInfoOffset,
    tribeInfoRecordSize,
    mapHeaderOffset,
    mapShape: offsets.mapShape,
    mapSeed: offsets.mapSeed,
    mapSeedHex: `0x${offsets.mapSeed.toString(16).padStart(4, "0")}`,
    resourceSeed,
    resourceSeedHex: `0x${resourceSeed.toString(16).padStart(2, "0")}`,
    hutSeed,
    hutSeedHex: `0x${hutSeed.toString(16).padStart(2, "0")}`,
    visibleImprovementsOffset,
    mapOffset,
    afterMapOffset: offsets.afterMapOffset,
    unitRecordOffset: offsets.unitRecordOffset,
    unitRecordSize: offsets.unitRecordSize,
    computedCityRecordOffset: offsets.computedCityRecordOffset,
    cityLayoutVariant: offsets.cityLayoutVariant,
    cityRecordOffsetDelta: offsets.cityRecordOffset - offsets.computedCityRecordOffset,
    cityTileCount: offsets.cityTileCount,
    cityLayoutVariantScores: offsets.cityLayoutVariantScores,
    civ2TileRecordSize,
    terrainByteInTileRecord,
    improvementByteInTileRecord,
    riverMask,
    roadMask,
    civ2Improvements,
    cityRecordOffset,
    cityRecordSize,
    cityNameOffset,
    cityImprovementMaskOffset: offsets.cityFields.improvements,
    rulesPath: rulesPath ? path.basename(rulesPath) : null,
  },
  cityImprovementNames: improvementNames,
  unitTypes,
  technologies,
  terrainStats: {
    rawBytes: sortedCounts(terrainByteCounts),
    decodedTerrain: sortedCounts(terrainCodeCounts),
  },
  features: {
    roads: {
      nativeTileCount: roadNativeTileCount,
      freecivTileCount: roadNativeTileCount * 2,
      rows: roadRows,
      nativeRows: nativeRoadRows,
    },
    rivers: {
      nativeTileCount: riverNativeTileCount,
      freecivTileCount: riverNativeTileCount * 2,
      rows: riverRows,
      nativeRows: nativeRiverRows,
    },
    freeciv21: Object.fromEntries(
      Object.entries(freeciv21Features).map(([name, feature]) => [
        name,
        {
          nativeTileCount: feature.nativeTileCount,
          freecivTileCount: feature.nativeTileCount * 2,
          rows: feature.rows,
          nativeRows: feature.nativeRows,
        },
      ]),
    ),
    resources: {
      seed: resourceSeed,
      seedHex: `0x${resourceSeed.toString(16).padStart(2, "0")}`,
      mapSeed: offsets.mapSeed,
      mapSeedHex: `0x${offsets.mapSeed.toString(16).padStart(4, "0")}`,
      notes: [
        "Civ2 special resource slots use the low 6 bits of the map header seed.",
        "Tiles with terrain byte bit 0x40 set suppress generated resources.",
      ],
      nativeTileCount: resourceTiles.length,
      freecivTileCount: resourceTiles.length * 2,
      counts: sortedCounts(resourceCounts),
      tiles: resourceTiles,
    },
    huts: {
      seed: hutSeed,
      seedHex: `0x${hutSeed.toString(16).padStart(2, "0")}`,
      resourceSeed,
      resourceSeedHex: `0x${resourceSeed.toString(16).padStart(2, "0")}`,
      mapSeed: offsets.mapSeed,
      mapSeedHex: `0x${offsets.mapSeed.toString(16).padStart(4, "0")}`,
      notes: [
        "Civ2 hut locations use a modulo-32 seed derived from the low 5 bits of the resource seed.",
        "The generated hut pattern is filtered to land tiles only; ocean hut candidates are omitted.",
      ],
      nativeTileCount: hutTiles.length,
      freecivTileCount: hutTiles.length * 2,
      rows: freeciv21Features.huts.rows,
      nativeRows: freeciv21Features.huts.nativeRows,
      tiles: hutTiles,
    },
    grasslandShields: {
      notes: [
        "Civ2 grassland shields are generated from native tile-column coordinates where (6*nativeX + y) mod 8 is 0, 3, 5, or 6.",
        "Only tiles whose decoded Civ2 terrain is Grassland are marked.",
      ],
      nativeTileCount: grasslandShieldTiles.length,
      freecivTileCount: grasslandShieldTiles.length * 2,
      rows: freeciv21Features.grasslandShields.rows,
      nativeRows: freeciv21Features.grasslandShields.nativeRows,
      tiles: grasslandShieldTiles,
    },
  },
  visibility: {
    notes: [
      "Civ2 tile visibility is a per-tile bitfield. Rows use K for explored/known and . for unknown.",
      "visibleFeatures are per-player remembered tile improvements from Civ2's player-map arrays; rivers are always visible on known Civ2 tiles.",
    ],
    byOwnerCandidate: Object.fromEntries(
      Object.entries(visibilityByOwnerCandidate).map(([ownerCandidate, visibility]) => [
        ownerCandidate,
        {
          nativeTileCount: visibility.nativeTileCount,
          freecivTileCount: visibility.nativeTileCount * 2,
          rows: visibility.rows,
          nativeRows: visibility.nativeRows,
          visibleFeatures: Object.fromEntries(
            Object.entries(visibleFeaturesByOwnerCandidate[ownerCandidate]).map(([name, feature]) => [
              name,
              {
                nativeTileCount: feature.nativeTileCount,
                freecivTileCount: feature.nativeTileCount * 2,
                rows: feature.rows,
                nativeRows: feature.nativeRows,
              },
            ]),
          ),
        },
      ]),
    ),
  },
  nativeFreeciv: {
    width: halfWidth,
    height,
    terrainRows: nativeTerrainRows,
  },
  tribeNames,
  tribeInfos,
  governments,
  factions,
  playerTreasuryByOwnerCandidate,
  cities,
  units,
};

function sortByRulesOrder(names, order) {
  return [...names].sort((a, b) => {
    const ai = order.has(a) ? order.get(a) : Number.MAX_SAFE_INTEGER;
    const bi = order.has(b) ? order.get(b) : Number.MAX_SAFE_INTEGER;
    if (ai !== bi) {
      return ai - bi;
    }
    return a.localeCompare(b);
  });
}

function blankTemplateMap(names, order) {
  return Object.fromEntries(sortByRulesOrder(names, order).map((name) => [name, ""]));
}

const unitTypeOrder = new Map(unitTypes.map((unitType, index) => [unitType.name, index]));
const improvementOrder = new Map(improvementNames.map((name, index) => [name, index]));
const templateUnitNames = new Set(
  units
    .filter((unit) => !unit.inactiveCandidate)
    .map((unit) => unit.typeName)
    .filter((name) => name && name !== "None"),
);
const templateImprovementNames = new Set();

for (const city of cities) {
  if (city.currentProduction?.kind === "UnitType" && city.currentProduction.civ2Name) {
    templateUnitNames.add(city.currentProduction.civ2Name);
  }

  if (
    ["Improvement", "Building", "CityImprovement"].includes(city.currentProduction?.kind)
    && city.currentProduction.civ2Name
  ) {
    templateImprovementNames.add(city.currentProduction.civ2Name);
  }

  for (const improvement of city.improvements || []) {
    if (improvement.name && improvement.name !== "Nothing") {
      templateImprovementNames.add(improvement.name);
    }
  }
}

const templateUnitMap = blankTemplateMap(templateUnitNames, unitTypeOrder);
const templateImprovementMap = blankTemplateMap(templateImprovementNames, improvementOrder);
const templateTechNames = new Set();
for (const info of tribeInfos) {
  for (const technology of info.knownTechnologies || []) {
    if (technology.name) templateTechNames.add(technology.name);
  }
  if (info.currentResearchName) templateTechNames.add(info.currentResearchName);
}
const technologyOrder = new Map(technologies.map((technology, index) => [technology.name, index]));
const templateTechMap = blankTemplateMap(templateTechNames, technologyOrder);
const templateGovernmentNames = new Set(
  factions.map((faction) => faction.governmentName).filter(Boolean),
);
const governmentOrder = new Map(governments.map((government) => [government.name, government.index]));
const templateGovernmentMap = blankTemplateMap(templateGovernmentNames, governmentOrder);

fs.writeFileSync(`${outputPrefix}-map-and-cities.json`, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(`${outputPrefix}-factions.json`, `${JSON.stringify(factionReport, null, 2)}\n`);
fs.writeFileSync(`${outputPrefix}-diplomacy.json`, `${JSON.stringify(diplomacyReport, null, 2)}\n`);
fs.writeFileSync(`${outputPrefix}-technologies.json`, `${JSON.stringify(technologyReport, null, 2)}\n`);
fs.writeFileSync(`${outputPrefix}-units.json`, `${JSON.stringify(unitReport, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "template-unit-map.json"), `${JSON.stringify(templateUnitMap, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "template-improvement-map.json"), `${JSON.stringify(templateImprovementMap, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "template-tech-map.json"), `${JSON.stringify(templateTechMap, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "template-government-map.json"), `${JSON.stringify(templateGovernmentMap, null, 2)}\n`);
fs.writeFileSync(`${outputPrefix}-cities.csv`, `${csvLines.join("\n")}\n`);
fs.writeFileSync(`${outputPrefix}-units.csv`, `${unitCsvLines.join("\n")}\n`);
fs.writeFileSync(`${outputPrefix}-map-preview.txt`, `${previewRows.map((row) => row.join("")).join("\n")}\n`);
fs.writeFileSync(`${outputPrefix}-native-map-preview.txt`, `${nativePreviewRows.map((row) => row.join("")).join("\n")}\n`);
fs.writeFileSync(`${outputPrefix}-road-preview.txt`, `${roadPreviewRows.map((row) => row.join("")).join("\n")}\n`);
fs.writeFileSync(`${outputPrefix}-native-road-preview.txt`, `${nativeRoadPreviewRows.map((row) => row.join("")).join("\n")}\n`);
fs.writeFileSync(`${outputPrefix}-river-preview.txt`, `${riverPreviewRows.map((row) => row.join("")).join("\n")}\n`);
fs.writeFileSync(`${outputPrefix}-native-river-preview.txt`, `${nativeRiverPreviewRows.map((row) => row.join("")).join("\n")}\n`);
fs.writeFileSync(`${outputPrefix}-freeciv-map-fragment.sav`, `${mapFragment.join("\n")}`);
fs.writeFileSync(`${outputPrefix}-freeciv-native-map-fragment.sav`, `${nativeMapFragment.join("\n")}`);
fs.writeFileSync(`${outputPrefix}-freeciv-city-fragment.sav`, `${cityFragment.join("\n")}`);

console.log(`Civ2 version: ${header.version} (${civ2VersionNames[header.version] || "Unknown"})`);
if (header.version === 40) {
  console.log(
    `Fantastic Worlds city layout: ${offsets.cityLayoutVariant}, city table delta ${offsets.cityRecordOffset - offsets.computedCityRecordOffset}`,
  );
}
console.log(`Inferred map: ${width} x ${height}`);
console.log(`Factions extracted: ${factions.length}`);
for (const faction of factions) {
  console.log(
    `  ownerCandidate=${faction.ownerCandidate}, kind=${faction.kind}, leader=${JSON.stringify(faction.leader)}, plural=${JSON.stringify(faction.plural)}, adjective=${JSON.stringify(faction.adjective)}, government=${JSON.stringify(faction.governmentName)}`,
  );
}
console.log(`Units in header: ${unitsCount}`);
console.log(`Cities extracted: ${cities.length}`);
console.log(`Unit types from rules: ${unitTypes.length}`);
console.log(`Units extracted: ${units.length}`);
console.log(`Wrote ${path.basename(outputPrefix)}-map-and-cities.json`);
console.log(`Wrote ${path.basename(outputPrefix)}-factions.json`);
console.log(`Wrote ${path.basename(outputPrefix)}-diplomacy.json`);
console.log(`Wrote ${path.basename(outputPrefix)}-technologies.json`);
console.log(`Wrote ${path.basename(outputPrefix)}-units.json`);
console.log("Wrote template-unit-map.json");
console.log("Wrote template-improvement-map.json");
console.log("Wrote template-tech-map.json");
console.log("Wrote template-government-map.json");
console.log(`Wrote ${path.basename(outputPrefix)}-cities.csv`);
console.log(`Wrote ${path.basename(outputPrefix)}-units.csv`);
console.log(`Wrote ${path.basename(outputPrefix)}-map-preview.txt`);
console.log(`Wrote ${path.basename(outputPrefix)}-native-map-preview.txt`);
console.log(`Wrote ${path.basename(outputPrefix)}-road-preview.txt`);
console.log(`Wrote ${path.basename(outputPrefix)}-native-road-preview.txt`);
console.log(`Wrote ${path.basename(outputPrefix)}-river-preview.txt`);
console.log(`Wrote ${path.basename(outputPrefix)}-native-river-preview.txt`);
console.log(`Wrote ${path.basename(outputPrefix)}-freeciv-map-fragment.sav`);
console.log(`Wrote ${path.basename(outputPrefix)}-freeciv-native-map-fragment.sav`);
console.log(`Wrote ${path.basename(outputPrefix)}-freeciv-city-fragment.sav`);
