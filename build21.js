const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

const buildConfigPath = path.resolve(
  process.cwd(),
  argValue("--build-config") || "",
);
if (!argValue("--build-config")) {
  throw new Error("Missing required --build-config path");
}
const configArgIndex = process.argv.indexOf("--config");

function readJson(pathname) {
  return JSON.parse(fs.readFileSync(pathname, "utf8").replace(/^\uFEFF/, ""));
}

function resolveConfiguredPath(configDir, pathname, fieldName) {
  if (!pathname) throw new Error(`Missing ${fieldName} in ${buildConfigPath}`);
  return path.resolve(configDir, pathname);
}

const buildConfig = readJson(buildConfigPath);
const buildConfigDir = path.dirname(buildConfigPath);
const mode = process.argv.includes("--freeciv21-3.1.1")
  ? "freeciv21_3_1_1"
  : process.argv.includes("--freeciv21-v3")
  ? "freeciv21V3"
  : process.argv.includes("--native-v2")
    ? "nativeV2"
    : buildConfig.mode || "default";
const nativeV2 = mode === "nativeV2";
const freeciv21V3 = mode === "freeciv21V3";
const freeciv21_3_1_1 = mode === "freeciv21_3_1_1";
const freeciv21NativeMode = freeciv21V3 || freeciv21_3_1_1;
const nativeWidthMode = nativeV2 || freeciv21NativeMode;
const conversionConfigPath =
  configArgIndex === -1
    ? resolveConfiguredPath(buildConfigDir, buildConfig.conversionConfig, "conversionConfig")
    : path.resolve(process.cwd(), process.argv[configArgIndex + 1] || "");
const templatePath = resolveConfiguredPath(buildConfigDir, buildConfig.template, "template");
const extractedPath = resolveConfiguredPath(buildConfigDir, buildConfig.extracted, "extracted");
const mapFragmentPath = resolveConfiguredPath(buildConfigDir, buildConfig.mapFragment, "mapFragment");
const diplomacyPath = buildConfig.diplomacy
  ? resolveConfiguredPath(buildConfigDir, buildConfig.diplomacy, "diplomacy")
  : null;
const freecivBuildingsRulesetPath = buildConfig.freecivBuildingsRuleset
  ? resolveConfiguredPath(buildConfigDir, buildConfig.freecivBuildingsRuleset, "freecivBuildingsRuleset")
  : null;
const freecivUnitsRulesetPath = buildConfig.freecivUnitsRuleset
  ? resolveConfiguredPath(buildConfigDir, buildConfig.freecivUnitsRuleset, "freecivUnitsRuleset")
  : null;
const freecivTechsRulesetPath = buildConfig.freecivTechsRuleset
  ? resolveConfiguredPath(buildConfigDir, buildConfig.freecivTechsRuleset, "freecivTechsRuleset")
  : null;
const technologiesPath = buildConfig.technologies
  ? resolveConfiguredPath(buildConfigDir, buildConfig.technologies, "technologies")
  : null;
const improvementMapPath = buildConfig.improvementMap
  ? resolveConfiguredPath(buildConfigDir, buildConfig.improvementMap, "improvementMap")
  : null;
const unitMapPath = buildConfig.unitMap
  ? resolveConfiguredPath(buildConfigDir, buildConfig.unitMap, "unitMap")
  : null;
const techMapPath = buildConfig.techMap
  ? resolveConfiguredPath(buildConfigDir, buildConfig.techMap, "techMap")
  : null;
const governmentMapPath = buildConfig.governmentMap
  ? resolveConfiguredPath(buildConfigDir, buildConfig.governmentMap, "governmentMap")
  : null;
const unmappedImprovementsReportPath = buildConfig.unmappedImprovementsReport
  ? resolveConfiguredPath(buildConfigDir, buildConfig.unmappedImprovementsReport, "unmappedImprovementsReport")
  : null;
const unmappedUnitsReportPath = buildConfig.unmappedUnitsReport
  ? resolveConfiguredPath(buildConfigDir, buildConfig.unmappedUnitsReport, "unmappedUnitsReport")
  : null;
const unmappedTechsReportPath = buildConfig.unmappedTechsReport
  ? resolveConfiguredPath(buildConfigDir, buildConfig.unmappedTechsReport, "unmappedTechsReport")
  : null;
const unitHomecityReportPath = buildConfig.unitHomecityReport
  ? resolveConfiguredPath(buildConfigDir, buildConfig.unitHomecityReport, "unitHomecityReport")
  : null;
const outputPath = resolveConfiguredPath(
  buildConfigDir,
  buildConfig.outputs?.[mode],
  `outputs.${mode}`,
);
const compressedOutputPath = `${outputPath}.zst`;
const validationReportPath = buildConfig.validationReport
  ? resolveConfiguredPath(buildConfigDir, buildConfig.validationReport, "validationReport")
  : outputPath.replace(/\.sav$/i, "-validation-report.json");

const cityHeader =
  'c={"y","x","id","original","size","nspe0","nspe1","nspe2","food_stock","shield_stock","history","airlift","was_happy","had_famine","turn_plague","anarchy","rapture","steal","turn_founded","acquire_t","did_buy","did_sell","turn_last_built","name","currently_building_kind","currently_building_name","current_want","changed_from_kind","changed_from_name","before_change_shields","caravan_shields","disbanded_shields","last_turns_shield_surplus","style","city_radius_sq","improvements","wl_length","option0","option1","option2","wlcb","ai.urgency","ai.building_turn","ai.building_wait","ai.founder_turn","ai.founder_want","ai.founder_boat","texai.urgency","texai.building_turn","texai.building_wait","texai.founder_turn","texai.founder_want","texai.founder_boat","citizen0","rally_point_length","rally_point_persistent","rally_point_vigilant","rally_point_orders","rally_point_dirs","rally_point_activities","rally_point_action_vec","rally_point_tgt_vec","rally_point_sub_tgt_vec","cma_enabled","cma_minimal_surplus","cma_minimal_surplus,1","cma_minimal_surplus,2","cma_minimal_surplus,3","cma_minimal_surplus,4","cma_minimal_surplus,5","cma_factor","cma_factor,1","cma_factor,2","cma_factor,3","cma_factor,4","cma_factor,5","max_growth","require_happy","allow_disorder","allow_specialists","happy_factor"';
const unitHeader =
  'u={"id","x","y","facing","nationality","veteran","hp","homecity","type_by_name","activity","activity_count","activity_tgt","changed_from","changed_from_count","changed_from_tgt","done_moving","moves","fuel","born","current_form_turn","battlegroup","go","goto_x","goto_y","server_side_agent","passenger","ferryboat","charge","bodyguard","texaipassenger","texaiferryboat","texaicharge","texaibodyguard","ord_map","ord_city","moved","paradropped","transported_by","carrying","action_decision","action_decision_tile_x","action_decision_tile_y","stay","orders_length","orders_index","orders_repeat","orders_vigilant","orders_list","dir_list","activity_list","action_vec","tgt_vec","sub_tgt_vec"';
const freeciv21_3_1_1UnitHeader =
  'u={"id","x","y","facing","nationality","veteran","hp","homecity","name","type_by_name","activity","activity_count","activity_tgt","changed_from","changed_from_count","changed_from_tgt","done_moving","moves","fuel","born","battlegroup","go","goto_x","goto_y","server_side_agent","passenger","ferryboat","charge","bodyguard","ord_map","ord_city","moved","paradropped","transported_by","carrying","action_decision","action_decision_tile_x","action_decision_tile_y","stay","orders_length","orders_index","orders_repeat","orders_vigilant","orders_list","dir_list","activity_list","action_vec","tgt_vec","sub_tgt_vec"';

function parseIntegerString(value, label) {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || !/^-?\d+$/.test(value.trim())) {
    throw new Error(`${label} must be an integer string when provided`);
  }
  return Number.parseInt(value, 10);
}

function translatedSaveString(value) {
  return `_("${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`;
}

function setScenarioField(section, key, value, afterKey) {
  if (value === undefined || value === null) return section;
  const line = `${key}=${translatedSaveString(value)}`;
  const fieldRegex = new RegExp(`^${key}=_\\("[\\s\\S]*?"\\)$`, "m");
  if (fieldRegex.test(section)) return section.replace(fieldRegex, line);

  const afterRegex = afterKey ? new RegExp(`^${afterKey}=.*$`, "m") : null;
  if (afterRegex?.test(section)) {
    return section.replace(afterRegex, (match) => `${match}\n${line}`);
  }
  return section.replace(/^(\[scenario\]\r?\n)/, `$1${line}\n`);
}

function scenarioMetadataForMode() {
  const scenario = buildConfig.scenario || {};
  const names = scenario.names || buildConfig.scenarioNames || {};
  return {
    name:
      names[mode] ||
      scenario.name ||
      buildConfig.scenarioName ||
      (freeciv21NativeMode
        ? "Civil War Civ2 Import V3 Freeciv21"
        : nativeV2
          ? "Civil War Civ2 Import Native V2"
          : "Civil War Civ2 Import"),
    authors: scenario.authors ?? buildConfig.scenarioAuthors,
    description: scenario.description ?? buildConfig.scenarioDescription,
  };
}

function readConfig() {
  if (!conversionConfigPath) throw new Error("Missing path after --config");
  const config = readJson(conversionConfigPath);
  if (!Array.isArray(config.players) || config.players.length === 0) {
    throw new Error(`Config ${conversionConfigPath} must define a non-empty players array`);
  }
  parseIntegerString(config.year, `Config ${conversionConfigPath} year`);
  for (const [index, player] of config.players.entries()) {
    for (const field of ["owner", "nation", "color"]) {
      if (player[field] === undefined) {
        throw new Error(`Config player ${index} is missing ${field}`);
      }
    }
    if (player.name !== undefined && typeof player.name !== "string") {
      throw new Error(`Config player ${index} name must be a string when provided`);
    }
    if (!Number.isInteger(player.owner)) {
      throw new Error(`Config player ${index} owner must be an integer`);
    }
    if (!Array.isArray(player.color) || player.color.length !== 3) {
      throw new Error(`Config player ${index} color must be [r,g,b]`);
    }
    parseIntegerString(player.gold, `Config player ${index} gold`);
    if (
      player.gender !== undefined
      && player.gender !== ""
      && !["male", "female", "Male", "Female"].includes(player.gender)
    ) {
      throw new Error(`Config player ${index} gender must be "male" or "female" when provided`);
    }
  }
  return config;
}

const config = readConfig();
let playerMeta = config.players;
let ownerToPlayer = new Map(playerMeta.map((player, playerId) => [player.owner, playerId]));
const improvementNameMap = improvementMapPath ? readJson(improvementMapPath) : {};
const unitNameMap = unitMapPath ? readJson(unitMapPath) : {};
const techNameMap = techMapPath ? readJson(techMapPath) : {};
const governmentNameMap = governmentMapPath ? readJson(governmentMapPath) : {};
const unmappedImprovements = new Map();
const unmappedUnits = new Map();
const unmappedTechs = new Map();
const unitHomecityIssues = new Map();
const coinageFallbacks = [];

function parseFreecivBuildingsRuleset(rulesetPath) {
  if (!rulesetPath) return [];
  const text = fs.readFileSync(rulesetPath, "utf8").replace(/^\uFEFF/, "");
  return [...text.matchAll(/^\[building_([^\]]+)\]([\s\S]*?)(?=^\[building_|(?![\s\S]))/gm)].map(
    ([, sectionName, body], index) => {
      const nameMatch =
        body.match(/^name\s*=\s*_\("([^"]+)"\)/m) || body.match(/^name\s*=\s*"([^"]+)"/m);
      const ruleNameMatch = body.match(/^rule_name\s*=\s*"([^"]+)"/m);
      const genusMatch = body.match(/^genus\s*=\s*"([^"]+)"/m);
      const displayName = nameMatch?.[1] || "";
      return {
        index,
        section: `building_${sectionName}`,
        name: displayName,
        ruleName: ruleNameMatch?.[1] || displayName,
        genus: genusMatch?.[1] || "",
      };
    },
  );
}

function parseQuotedListSetting(body, settingName) {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${settingName}\\s*=`).test(line));
  if (start < 0) return [];
  const collected = [lines[start].replace(new RegExp(`^${settingName}\\s*=`), "")];
  for (let index = start + 1; index < lines.length; index++) {
    const line = lines[index];
    if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line)) break;
    collected.push(line);
  }
  return [...collected.join("\n").matchAll(/"([^"]+)"/g)].map(([, value]) => value);
}

function parseFreecivUnitsRuleset(rulesetPath) {
  if (!rulesetPath) return [];
  const text = fs.readFileSync(rulesetPath, "utf8").replace(/^\uFEFF/, "");
  return [...text.matchAll(/^\[unit_([^\]]+)\]([\s\S]*?)(?=^\[unit_|(?![\s\S]))/gm)].map(
    ([, sectionName, body]) => {
      const nameMatch =
        body.match(/^name\s*=\s*_\("(?:\?unit:)?([^"]+)"\)/m) ||
        body.match(/^name\s*=\s*"([^"]+)"/m);
      const ruleNameMatch = body.match(/^rule_name\s*=\s*"([^"]+)"/m);
      const hitpointsMatch = body.match(/^hitpoints\s*=\s*(\d+)/m);
      const moveRateMatch = body.match(/^move_rate\s*=\s*(\d+)/m);
      const transportCapMatch = body.match(/^transport_cap\s*=\s*(\d+)/m);
      const fuelMatch = body.match(/^fuel\s*=\s*(\d+)/m);
      const displayName = nameMatch?.[1] || "";
      return {
        section: `unit_${sectionName}`,
        name: displayName,
        ruleName: ruleNameMatch?.[1] || displayName,
        unitClass: body.match(/^class\s*=\s*"([^"]+)"/m)?.[1] || "",
        hitpoints: hitpointsMatch ? Number.parseInt(hitpointsMatch[1], 10) : 10,
        moveRate: moveRateMatch ? Number.parseInt(moveRateMatch[1], 10) : 1,
        transportCap: transportCapMatch ? Number.parseInt(transportCapMatch[1], 10) : 0,
        cargo: parseQuotedListSetting(body, "cargo"),
        fuel: fuelMatch ? Number.parseInt(fuelMatch[1], 10) : 0,
      };
    },
  );
}

function normalizeTranslatedName(name) {
  return name.replace(/^\?[^:]+:/, "");
}

function parseFreecivTechsRuleset(rulesetPath) {
  if (!rulesetPath) return [];
  const text = fs.readFileSync(rulesetPath, "utf8").replace(/^\uFEFF/, "");
  return [...text.matchAll(/^\[advance_([^\]]+)\]([\s\S]*?)(?=^\[advance_|(?![\s\S]))/gm)].map(
    ([, sectionName, body]) => {
      const nameMatch =
        body.match(/^name\s*=\s*_\("([^"]+)"\)/m) || body.match(/^name\s*=\s*"([^"]+)"/m);
      const ruleNameMatch = body.match(/^rule_name\s*=\s*"([^"]+)"/m);
      const displayName = normalizeTranslatedName(nameMatch?.[1] || "");
      return {
        section: `advance_${sectionName}`,
        name: displayName,
        ruleName: ruleNameMatch?.[1] || displayName,
      };
    },
  );
}

const freecivBuildings = parseFreecivBuildingsRuleset(freecivBuildingsRulesetPath);
const freecivBuildingIndexByName = new Map();
for (const building of freecivBuildings) {
  for (const key of [building.ruleName, building.name]) {
    if (key && !freecivBuildingIndexByName.has(key)) {
      freecivBuildingIndexByName.set(key, building.index);
    }
  }
}
const noImprovements = "0".repeat(freecivBuildings.length || 73);

const freecivUnits = parseFreecivUnitsRuleset(freecivUnitsRulesetPath);
const freecivUnitByName = new Map();
for (const unit of freecivUnits) {
  for (const key of [unit.ruleName, unit.name]) {
    if (key && !freecivUnitByName.has(key)) {
      freecivUnitByName.set(key, unit);
    }
  }
}
const freecivTechs = parseFreecivTechsRuleset(freecivTechsRulesetPath);
const freecivTechNames = new Set();
for (const tech of freecivTechs) {
  for (const key of [tech.ruleName, tech.name]) {
    if (key) freecivTechNames.add(key);
  }
}

function noteUnmappedImprovement(cityName, civ2Name, reason) {
  const key = `${civ2Name}\t${reason}`;
  if (!unmappedImprovements.has(key)) {
    unmappedImprovements.set(key, { civ2Name, reason, cities: [] });
  }
  const entry = unmappedImprovements.get(key);
  if (entry.cities.length < 20 && !entry.cities.includes(cityName)) {
    entry.cities.push(cityName);
  }
}

function noteUnmappedUnit(unit, reason) {
  const civ2Name = unit.typeName || `typeIndex ${unit.typeIndex}`;
  const key = `${civ2Name}\t${reason}`;
  if (!unmappedUnits.has(key)) {
    unmappedUnits.set(key, { civ2Name, reason, units: [] });
  }
  const entry = unmappedUnits.get(key);
  if (entry.units.length < 30 && !entry.units.some((item) => item.index === unit.index)) {
    entry.units.push({
      index: unit.index,
      ownerCandidate: unit.ownerCandidate,
      x: unit.x,
      y: unit.y,
      rawX: unit.rawX,
      rawY: unit.rawY,
      signedX: unit.signedX,
      signedY: unit.signedY,
      alternateX: unit.alternateX,
      alternateY: unit.alternateY,
      coordinateSource: unit.coordinateSource || "",
      ownerOffMapSentinel: Boolean(unit.ownerOffMapSentinel),
      placementStatus: unit.placementStatus || "",
      homeCityName: unit.homeCityName || "",
    });
  }
}

function noteUnmappedUnitProduction(cityName, civ2Name, reason) {
  const key = `${civ2Name}\t${reason}`;
  if (!unmappedUnits.has(key)) {
    unmappedUnits.set(key, { civ2Name, reason, units: [], cities: [] });
  }
  const entry = unmappedUnits.get(key);
  if (!entry.cities) entry.cities = [];
  if (entry.cities.length < 20 && !entry.cities.includes(cityName)) {
    entry.cities.push(cityName);
  }
}

function resolvedFreecivUnit(unit) {
  if (Object.prototype.hasOwnProperty.call(unit, "freecivUnit")) {
    return unit.freecivUnit;
  }
  return mapUnitType(unit);
}

function noteUnmappedTech(ownerCandidate, civ2Name, reason, freecivName = "") {
  const key = `${civ2Name}\t${reason}\t${freecivName}`;
  if (!unmappedTechs.has(key)) {
    unmappedTechs.set(key, { civ2Name, freecivName, reason, ownerCandidates: [] });
  }
  const entry = unmappedTechs.get(key);
  if (!entry.ownerCandidates.includes(ownerCandidate)) {
    entry.ownerCandidates.push(ownerCandidate);
  }
}

function noteUnitHomecityIssue(unit, reason, city) {
  const key = `${unit.typeName || `typeIndex ${unit.typeIndex}`}\t${reason}`;
  if (!unitHomecityIssues.has(key)) {
    unitHomecityIssues.set(key, { civ2Name: unit.typeName || "", reason, units: [] });
  }
  const entry = unitHomecityIssues.get(key);
  if (entry.units.length < 50) {
    entry.units.push({
      index: unit.index,
      ownerCandidate: unit.ownerCandidate,
      x: unit.x,
      y: unit.y,
      homeCityIndex: unit.homeCityIndex,
      homeCityName: unit.homeCityName || city?.name || "",
      homeCityOwnerCandidate: city?.ownerCandidate,
    });
  }
}

function cityImprovementString(city) {
  if (!city.improvements?.length || !freecivBuildings.length) return noImprovements;
  const bits = Array(freecivBuildings.length).fill("0");
  for (const improvement of city.improvements) {
    const civ2Name = improvement.name;
    if (!Object.prototype.hasOwnProperty.call(improvementNameMap, civ2Name)) {
      noteUnmappedImprovement(city.name, civ2Name, "missing from improvement map");
      continue;
    }
    const freecivName = improvementNameMap[civ2Name];
    if (!freecivName) {
      noteUnmappedImprovement(city.name, civ2Name, "intentionally skipped");
      continue;
    }
    const index = freecivBuildingIndexByName.get(freecivName);
    if (index === undefined) {
      noteUnmappedImprovement(city.name, civ2Name, `Freeciv building not found: ${freecivName}`);
      continue;
    }
    bits[index] = "1";
  }
  return bits.join("");
}

function mapUnitType(unit) {
  const civ2Name = unit.typeName;
  if (!Object.prototype.hasOwnProperty.call(unitNameMap, civ2Name)) {
    noteUnmappedUnit(unit, "missing from unit map");
    return null;
  }
  const freecivName = unitNameMap[civ2Name];
  if (!freecivName) {
    noteUnmappedUnit(unit, "intentionally skipped");
    return null;
  }
  const freecivUnit = freecivUnitByName.get(freecivName);
  if (!freecivUnit) {
    noteUnmappedUnit(unit, `Freeciv unit not found: ${freecivName}`);
    return null;
  }
  return freecivUnit;
}

function cityProduction(city) {
  const production = city.currentProduction;
  let fallbackReason = production?.kind || production?.civ2Name
    ? "current production was not mapped"
    : "no current production decoded";
  if (production?.kind === "UnitType" && production.civ2Name) {
    if (!Object.prototype.hasOwnProperty.call(unitNameMap, production.civ2Name)) {
      noteUnmappedUnitProduction(city.name, production.civ2Name, "production missing from unit map");
      fallbackReason = "unit production missing from unit map";
    } else {
      const freecivName = unitNameMap[production.civ2Name];
      if (!freecivName) {
        noteUnmappedUnitProduction(city.name, production.civ2Name, "production intentionally skipped");
        fallbackReason = "unit production intentionally skipped";
      } else if (!freecivUnitByName.has(freecivName)) {
        noteUnmappedUnitProduction(city.name, production.civ2Name, `production Freeciv unit not found: ${freecivName}`);
        fallbackReason = `mapped Freeciv unit not found: ${freecivName}`;
      } else {
      return { kind: "UnitType", name: freecivName };
      }
    }
  }
  if (production?.kind === "Building" && production.civ2Name) {
    if (!Object.prototype.hasOwnProperty.call(improvementNameMap, production.civ2Name)) {
      noteUnmappedImprovement(city.name, production.civ2Name, "production missing from improvement map");
      fallbackReason = "building production missing from improvement map";
    } else {
      const freecivName = improvementNameMap[production.civ2Name];
      if (!freecivName) {
        noteUnmappedImprovement(city.name, production.civ2Name, "production intentionally skipped");
        fallbackReason = "building production intentionally skipped";
      } else if (!freecivBuildingIndexByName.has(freecivName)) {
        noteUnmappedImprovement(city.name, production.civ2Name, `production Freeciv building not found: ${freecivName}`);
        fallbackReason = `mapped Freeciv building not found: ${freecivName}`;
      } else {
        return { kind: "Building", name: freecivName };
      }
    }
  }
  coinageFallbacks.push({
    city: city.name,
    ownerCandidate: city.ownerCandidate,
    civ2Kind: production?.kind || "",
    civ2Name: production?.civ2Name || "",
    reason: fallbackReason,
  });
  return { kind: "Building", name: "Coinage" };
}

const landTerrains = new Set(["a", "d", "f", "g", "h", "j", "m", "p", "s", "t"]);
const irrigableTerrains = new Set(["d", "g", "h", "p", "s"]);
const mineableTerrains = new Set(["a", "d", "h", "m", "t"]);
const freeciv32ExtraNames = [
  "Irrigation", "Mine", "Oil Well", "Oil Platform", "Pollution", "Hut", "Farmland", "Fallout",
  "Fort", "Fortress", "Airstrip", "Airbase", "Buoy", "Ruins", "Road", "Railroad",
  "Maglev", "River", "Gold", "Iron", "Game", "Furs", "Coal", "Fish", "Fruit", "Gems",
  "Buffalo", "Wheat", "Oasis", "Peat", "Pheasant", "Resources", "Ivory", "Silk",
  "Spice", "Whales", "Wine", "Oil",
];
const targetExtraNames = freeciv32ExtraNames;
const extraIndex = Object.fromEntries(targetExtraNames.map((name, index) => [name, index]));

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function cityRow(city, playerId) {
  const style = playerMeta[playerId]?.style || "European";
  const size = city.populationSize ?? city.sizeCandidate + 1;
  const food = Math.max(0, Number.isInteger(city.foodbox) ? city.foodbox : Math.max(2, Math.floor(size * 2)));
  const shields = Math.max(0, Number.isInteger(city.shieldbox) ? city.shieldbox : Math.max(2, size));
  const lastTurnShieldSurplus = Math.max(2, size);
  const production = cityProduction(city);
  return [
    city.y,
    city.x,
    1000 + city.index,
    playerId,
    size,
    0,
    0,
    size,
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
    csvEscape(production.kind),
    csvEscape(production.name),
    0,
    csvEscape(production.kind),
    csvEscape(production.name),
    shields,
    0,
    0,
    lastTurnShieldSurplus,
    csvEscape(style),
    5,
    csvEscape(cityImprovementString(city)),
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

function freecivActivityId(activity) {
  const activityIds = {
    Idle: 0,
    Fortified: 4,
    Sentry: 5,
    Fortifying: 10,
  };
  return activityIds[activity] ?? 0;
}

function parseCiv2MoveRate(raw) {
  if (typeof raw !== "string") return null;
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : null;
}

function unitMoveState(unit, freecivUnit) {
  const freecivFullMoves = Math.max(0, (freecivUnit.moveRate || 0) * 6);
  if (freecivFullMoves === 0) {
    return { moves: 0, doneMoving: "TRUE", moved: "FALSE" };
  }
  return { moves: freecivFullMoves, doneMoving: "FALSE", moved: "FALSE" };

  const civ2MoveRate = parseCiv2MoveRate(unit.civ2UnitType?.moveRaw);
  const civ2FullMoves = civ2MoveRate === null ? 0 : Math.round(civ2MoveRate * 8);
  const movesUsed = Number.isInteger(unit.movesUsed) ? unit.movesUsed : 0;
  const activity = unit.activity?.freecivActivity || "Idle";

  if (civ2FullMoves <= 0) {
    return {
      moves: freecivFullMoves,
      doneMoving: activity === "Idle" ? "FALSE" : "TRUE",
      moved: movesUsed > 0 ? "TRUE" : "FALSE",
    };
  }

  const remainingCiv2Moves = Math.max(0, Math.min(civ2FullMoves, civ2FullMoves - movesUsed));
  const moves = Math.round((remainingCiv2Moves / civ2FullMoves) * freecivFullMoves);
  return {
    moves,
    doneMoving: moves === 0 || activity !== "Idle" ? "TRUE" : "FALSE",
    moved: movesUsed > 0 ? "TRUE" : "FALSE",
  };
}

function unitFreecivId(unit) {
  return 2000 + unit.index;
}

function unitTileKey(unit) {
  const x = nativeWidthMode ? unit.nativeX : unit.x;
  return `${unit.ownerCandidate}:${x},${unit.y}`;
}

function unitMapX(unit) {
  return nativeWidthMode ? unit.nativeX : unit.x;
}

function validMapCoord(x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < width && y >= 0 && y < height;
}

function unitHasValidMapTile(unit) {
  return validMapCoord(unitMapX(unit), unit.y);
}

function invalidUnitTileReason(unit, freecivUnit) {
  if (unit.inactiveCandidate) {
    const signed = Number.isInteger(unit.signedX) && Number.isInteger(unit.signedY)
      ? ` at owner-coded sentinel coordinate ${unit.signedX},${unit.signedY}`
      : "";
    return `skipped likely removed/dead MGE ${freecivUnit.ruleName} slot${signed}`;
  }
  if (unit.ownerOffMapSentinel) {
    const signed = Number.isInteger(unit.signedX) && Number.isInteger(unit.signedY)
      ? ` ${unit.signedX},${unit.signedY}`
      : "";
    return `skipped owner-coded off-map MGE ${freecivUnit.ruleName} coordinate${signed}`;
  }
  return `skipped ${freecivUnit.ruleName} with invalid map tile`;
}

function canTransportUnit(transporter, passenger) {
  const transporterType = transporter.freecivUnit || mapUnitType(transporter);
  const passengerType = passenger.freecivUnit || mapUnitType(passenger);
  if (!transporterType || !passengerType) return false;
  if ((transporterType.transportCap || 0) <= 0) return false;
  if (transporter === passenger) return false;
  if (passenger.transportedById !== undefined) return false;
  if (!Array.isArray(transporterType.cargo) || transporterType.cargo.length === 0) return false;
  return transporterType.cargo.includes(passengerType.unitClass);
}

function transportPreferenceScore(transporter, passenger) {
  const transporterType = transporter.freecivUnit || mapUnitType(transporter);
  const passengerType = passenger.freecivUnit || mapUnitType(passenger);
  if (!transporterType || !passengerType) return 1000;
  const cargo = transporterType.cargo || [];
  const carriesAir = cargo.some((unitClass) => ["Air", "Helicopter", "Missile"].includes(unitClass));
  if (["Land", "Small Land", "Big Land", "Merchant"].includes(passengerType.unitClass) && carriesAir) {
    return 10;
  }
  if (["Air", "Helicopter", "Missile"].includes(passengerType.unitClass) && carriesAir) {
    return 0;
  }
  return 1;
}

function assignTransportedUnits(units) {
  const byTile = new Map();
  for (const unit of units) {
    unit.freecivUnit = mapUnitType(unit);
    unit.transportedById = undefined;
    unit.transportCargoIds = [];
    if (!unit.freecivUnit) continue;
    if (!unitHasValidMapTile(unit)) {
      noteUnmappedUnit(unit, invalidUnitTileReason(unit, unit.freecivUnit));
      continue;
    }
    const key = unitTileKey(unit);
    if (!byTile.has(key)) byTile.set(key, []);
    byTile.get(key).push(unit);
  }

  for (const tileUnits of byTile.values()) {
    const x = nativeWidthMode ? tileUnits[0].nativeX : tileUnits[0].x;
    const y = tileUnits[0].y;
    if (landTerrains.has(terrainAt(x, y))) continue;

    const transporters = tileUnits
      .filter((unit) => (unit.freecivUnit?.transportCap || 0) > 0)
      .sort((a, b) => unitFreecivId(a) - unitFreecivId(b));
    if (transporters.length === 0) continue;

    for (const passenger of tileUnits) {
      const transporter = transporters
        .filter((candidate) =>
          candidate.transportCargoIds.length < candidate.freecivUnit.transportCap
          && canTransportUnit(candidate, passenger)
        )
        .sort((a, b) =>
          transportPreferenceScore(a, passenger) - transportPreferenceScore(b, passenger)
          || a.freecivUnit.cargo.length - b.freecivUnit.cargo.length
          || unitFreecivId(a) - unitFreecivId(b)
        )[0];
      if (!transporter) continue;
      passenger.transportedById = unitFreecivId(transporter);
      passenger.activity = {
        ...(passenger.activity || {}),
        freecivActivity: "Sentry",
      };
      transporter.transportCargoIds.push(unitFreecivId(passenger));
    }
  }
}

function unitRow(unit, playerId) {
  const freecivUnit = resolvedFreecivUnit(unit);
  if (!freecivUnit) return null;
  const x = unitMapX(unit);
  const y = unit.y;
  if (!validMapCoord(x, y)) {
    noteUnmappedUnit(unit, invalidUnitTileReason(unit, freecivUnit));
    return null;
  }
  if (freeciv21IncompatibleUnitPlacement(unit)) {
    noteUnmappedUnit(unit, "skipped Freeciv21 3.1.1 incompatible right-edge unit placement");
    return null;
  }
  const terrain = terrainAt(x, y);
  if (
    unit.transportedById === undefined
    && ["Land", "Small Land", "Big Land", "Merchant"].includes(freecivUnit.unitClass)
    && !landTerrains.has(terrain)
  ) {
    noteUnmappedUnit(unit, `skipped ${freecivUnit.ruleName} on non-land terrain`);
    return null;
  }
  const homecity = unit.homecityId || 0;
  const activity = freecivActivityId(unit.activity?.freecivActivity || "Idle");
  const moveState = unitMoveState(unit, freecivUnit);
  const row = [
    unitFreecivId(unit),
    x,
    y,
    csvEscape("1"),
    playerId,
    unit.flags?.veteranCandidate ? 1 : 0,
    freecivUnit.hitpoints,
    homecity,
    csvEscape(freecivUnit.ruleName),
    activity,
    0,
    -1,
    0,
    0,
    -1,
    moveState.doneMoving,
    moveState.moves,
    freecivUnit.fuel || 0,
    1,
    1,
    -1,
    "FALSE",
    0,
    0,
    0,
    -1,
    0,
    0,
    0,
    -1,
    0,
    0,
    0,
    0,
    0,
    moveState.moved,
    "FALSE",
    unit.transportedById ?? -1,
    csvEscape(""),
    0,
    -1,
    -1,
    "FALSE",
    0,
    0,
    "FALSE",
    "FALSE",
    csvEscape("-"),
    csvEscape("-"),
    csvEscape("-"),
    -1,
    -1,
    -1,
  ];
  if (freeciv21_3_1_1) {
    return [
      ...row.slice(0, 8),
      csvEscape(""),
      row[8],
      ...row.slice(9, 19),
      ...row.slice(20, 29),
      ...row.slice(33),
    ].join(",");
  }
  return row.join(",");
}

function unitWillBeWritten(unit) {
  const freecivUnit = resolvedFreecivUnit(unit);
  if (!freecivUnit) return false;
  const x = unitMapX(unit);
  if (!validMapCoord(x, unit.y)) return false;
  if (freeciv21IncompatibleUnitPlacement(unit)) return false;
  const terrain = terrainAt(x, unit.y);
  return !(
    unit.transportedById === undefined
    && ["Land", "Small Land", "Big Land", "Merchant"].includes(freecivUnit.unitClass)
    && !landTerrains.has(terrain)
  );
}

function freeciv21IncompatibleUnitPlacement(unit) {
  if (!freeciv21_3_1_1) return false;
  if (!Number.isInteger(unit.x) || !Number.isInteger(extracted?.inferred?.width)) return false;
  const lastCiv2Column = extracted.inferred.width - 1;
  return unit.x === lastCiv2Column
    && Number.isInteger(unit.orders)
    && ![0xff, 0x00, 0x01, 0x02, 0x03].includes(unit.orders);
}

function parseTerrainRows(fragmentText, height) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const y4 = String(y).padStart(4, "0");
    const match = fragmentText.match(new RegExp(`^t${y4}="([^"]*)"`, "m"));
    if (!match) throw new Error(`Missing terrain row t${y4}`);
    rows.push(match[1].split(""));
  }
  return rows;
}

function rowsToLines(prefix, rows) {
  return rows.map((row, y) => `${prefix}${String(y).padStart(4, "0")}="${row.join("")}"`);
}

function commaRowsToLines(prefix, rows) {
  return rows.map((row, y) => `${prefix}${String(y).padStart(4, "0")}="${row.join(",")}"`);
}

function emptyExtraRows(width, height) {
  return Array.from({ length: extraLayerCountForTarget() }, () =>
    Array.from({ length: height }, () => Array(width).fill("0")),
  );
}

function cloneExtraRows(rows) {
  return rows.map((layer) => layer.map((row) => [...row]));
}

function setExtra(extraRows, index, x, y) {
  if (!Number.isInteger(index)) return;
  const layer = Math.floor(index / 4);
  const bit = 1 << (index % 4);
  const current = Number.parseInt(extraRows[layer][y][x], 16);
  extraRows[layer][y][x] = (current | bit).toString(16);
}

function replaceSettings(text, width, height, cityCount) {
  const tilesPerPlayer = Math.floor((width * height) / playerMeta.length);
  const aiFill = Math.max(0, playerMeta.length - 1);
  const wrapSetting = extracted.inferred?.mapShape === 0 ? "WRAPX" : "";
  const configuredYear = parseIntegerString(config.year, `Config ${conversionConfigPath} year`);
  let updated = text
    .replace(/\[scenario\]\r?\n[\s\S]*?(?=\r?\n\[savefile\])/, replaceScenarioSection)
    .replace(/^year=-?\d+/m, configuredYear === undefined ? "$&" : `year=${configuredYear}`)
    .replace(/"aifill",\d+,\d+,"Changed"/, `"aifill",${aiFill},${aiFill},"Changed"`)
    .replace(/"topology","[^"]*","[^"]*","Changed"/, `"topology","${freeciv21NativeMode ? "ISO" : ""}","${freeciv21NativeMode ? "ISO" : ""}","Changed"`)
    .replace(/"wrap","[^"]*","[^"]*","Changed"/, `"wrap","${wrapSetting}","${wrapSetting}","Changed"`)
    .replace(/"xsize",\d+,\d+,"Changed"/, `"xsize",${width},${width},"Changed"`)
    .replace(/"ysize",\d+,\d+,"Changed"/, `"ysize",${height},${height},"Changed"`)
    .replace(/"tilesperplayer",\d+,\d+,"Changed"/, `"tilesperplayer",${tilesPerPlayer},${tilesPerPlayer},"Changed"`)
    .replace(/identity_number_used=\d+/, `identity_number_used=${1000 + cityCount + 100}`);

  if (freeciv21_3_1_1) {
    updated = updated
      .replace(/\[savefile\]\r?\n[\s\S]*?(?=\r?\n\[game\])/, replaceFreeciv21_3_1_1SavefileSection)
      .replace(/^revision="[^"]*"/m, 'revision="3.1.1"');
  }

  return updated;
}

function replaceFreeciv21_3_1_1SavefileSection(section) {
  const actionVector =
    '"Establish Embassy","Establish Embassy Stay","Investigate City","Investigate City Spend Unit","Poison City","Poison City Escape","Steal Gold","Steal Gold Escape","Sabotage City","Sabotage City Escape","Targeted Sabotage City","Targeted Sabotage City Escape","Sabotage City Production","Sabotage City Production Escape","Steal Tech","Steal Tech Escape Expected","Targeted Steal Tech","Targeted Steal Tech Escape Expected","Incite City","Incite City Escape","Establish Trade Route","Enter Marketplace","Help Wonder","Bribe Unit","Sabotage Unit","Sabotage Unit Escape","Capture Units","Found City","Join City","Steal Maps","Steal Maps Escape","Bombard","Bombard 2","Bombard 3","Suitcase Nuke","Suitcase Nuke Escape","Explode Nuclear","Nuke City","Nuke Units","Destroy City","Expel Unit","Recycle Unit","Disband Unit","Home City","Upgrade Unit","Paradrop Unit","Airlift Unit","Attack","Suicide Attack","Surgical Strike Building","Surgical Strike Production","Conquer City","Conquer City 2","Heal Unit","Transform Terrain","Cultivate","Plant","Pillage","Fortify","Build Road","Convert Unit","Build Base","Build Mine","Build Irrigation","Clean Pollution","Clean Fallout","Transport Alight","Transport Unload","Transport Disembark","Transport Disembark 2","Transport Board","Transport Embark","Spread Plague","Spy Attack","User Action 1","User Action 2","User Action 3"';
  const extrasVector = freeciv32ExtraNames.map((name) => `"${name}"`).join(",");

  return section
    .replace(/^version=\d+/m, "version=50")
    .replace(/^revision="[^"]*"/m, 'revision="3.1.1"')
    .replace(/^extras_size=\d+/m, `extras_size=${freeciv32ExtraNames.length}`)
    .replace(/^extras_vector=.*$/m, `extras_vector=${extrasVector}`)
    .replace(/^action_size=\d+/m, "action_size=77")
    .replace(/^action_vector=.*$/m, `action_vector=${actionVector}`);
}

function replaceScenarioSection(section) {
  const metadata = scenarioMetadataForMode();
  section = setScenarioField(section, "name", metadata.name, "is_scenario");
  section = setScenarioField(section, "authors", metadata.authors, "name");
  section = setScenarioField(section, "description", metadata.description, "authors");
  return section;
}

function extraLayerCountForTarget() {
  return 10;
}

function appendExtraRows(lines, extraRows, width, height, prefixBase) {
  for (let extra = 0; extra < extraLayerCountForTarget(); extra++) {
    const prefix = `${prefixBase}${String(extra).padStart(2, "0")}_`;
    const rows = extraRows?.[extra] || Array.from({ length: height }, () => Array(width).fill("0"));
    lines.push(...rowsToLines(prefix, rows));
  }
}

function replaceMapSection(text, terrainRows, extraRows, ownerRows, sourceRows) {
  const width = terrainRows[0].length;
  const height = terrainRows.length;
  const zeroRow = "0".repeat(width);
  const mapLines = [
    "[map]",
    "have_huts=FALSE",
    `have_resources=${mapHasResources ? "TRUE" : "FALSE"}`,
    "random_seed=290772120",
    ...rowsToLines("t", terrainRows),
    "startpos_count=0",
  ];

  appendExtraRows(mapLines, extraRows, width, height, "e");

  mapLines.push(...commaRowsToLines("owner", ownerRows));
  mapLines.push(...commaRowsToLines("source", sourceRows));
  mapLines.push(...commaRowsToLines("eowner", Array.from({ length: height }, () => Array(width).fill("-"))));
  mapLines.push(...commaRowsToLines("placing", Array.from({ length: height }, () => Array(width).fill("-"))));
  mapLines.push(...commaRowsToLines("infra_turns", Array.from({ length: height }, () => Array(width).fill("0"))));
  mapLines.push(...commaRowsToLines("worked", workedRows));

  for (let knownLayer = 0; knownLayer < 2; knownLayer++) {
    const prefix = `k${String(knownLayer).padStart(2, "0")}_`;
    for (let y = 0; y < height; y++) {
      mapLines.push(`${prefix}${String(y).padStart(4, "0")}="${zeroRow}"`);
    }
  }

  return text.replace(/\[map\]\r?\n[\s\S]*?(?=\r?\n\[players\])/, `${mapLines.join("\n")}\n`);
}

function governmentNameForPlayer(meta, section) {
  if (meta.government) return meta.government;
  const faction = extracted.factions?.find((item) => item.ownerCandidate === meta.owner);
  const governmentByte = faction?.governmentByte;
  const governmentName = faction?.governmentName;
  if (governmentName) {
    const mappedByName = governmentNameMap[governmentName];
    if (mappedByName) return mappedByName;
  }
  if (governmentByte !== undefined) {
    // Backward compatibility with older scenario maps keyed by raw Civ2 byte.
    const mapped = governmentNameMap[String(governmentByte)];
    if (mapped) return mapped;
  }
  return section.match(/government_name="([^"]*)"/)?.[1] || "Despotism";
}

function genderKindForPlayer(meta) {
  if (meta.gender) {
    return meta.gender.toLowerCase() === "female" ? "Female" : "Male";
  }
  const faction = extracted.factions?.find((item) => item.ownerCandidate === meta.owner);
  return faction?.gender === "female" ? "Female" : "Male";
}

function playerNameForPlayer(meta, section) {
  if (meta.name) return meta.name;
  const faction = extracted.factions?.find((item) => item.ownerCandidate === meta.owner);
  return faction?.leader || (section || "").match(/name="([^"]*)"/)?.[1] || meta.nation;
}

function replacePlayerMetadata(section, playerId) {
  const meta = playerMeta[playerId];
  const playerName = playerNameForPlayer(meta, section);
  const style = meta.style || "European";
  const government = governmentNameForPlayer(meta, section);
  const genderKind = genderKindForPlayer(meta);
  const barbarianType = meta.isBarbarian ? (meta.barbarianType || "Land") : "None";
  section = section.match(/^flags=/m)
    ? section.replace(/^flags=.*$/m, 'flags="ai"')
    : section.replace(/^(\[player\d+\]\r?\n)/, '$1flags="ai"\n');
  section = section.match(/^ai\.level=/m)
    ? section.replace(/^ai\.level=.*$/m, 'ai.level="Normal"')
    : section.replace(/^ai\.barb_type=/m, 'ai.level="Normal"\n$&');

  return section
    .replace(/name="[^"]*"/, `name="${playerName}"`)
    .replace(/nation="[^"]*"/, `nation="${meta.nation}"`)
    .replace(/team_no=\d+/, `team_no=${playerId}`)
    .replace(/government_name="[^"]*"/, `government_name="${government}"`)
    .replace(/style_by_name="[^"]*"/, `style_by_name="${style}"`)
    .replace(/kind="[^"]*"/, `kind="${genderKind}"`)
    .replace(/color\.r=\d+/, `color.r=${meta.color[0]}`)
    .replace(/color\.g=\d+/, `color.g=${meta.color[1]}`)
    .replace(/color\.b=\d+/, `color.b=${meta.color[2]}`)
    .replace(/ai\.barb_type="[^"]*"/, `ai.barb_type="${barbarianType}"`);
}

function replacePlayerTreasury(section, playerId) {
  const meta = playerMeta[playerId];
  const ownerCandidate = meta?.owner;
  const faction = extracted.factions?.find((item) => item.ownerCandidate === ownerCandidate);
  const gold = parseIntegerString(meta?.gold, `Config player ${playerId} gold`)
    ?? extracted.playerTreasuryByOwnerCandidate?.[ownerCandidate]
    ?? faction?.treasury;
  if (gold === undefined) return section;
  return section.replace(/gold=\d+/, `gold=${gold}`);
}

function replacePlayerRates(section, playerId) {
  const meta = playerMeta[playerId];
  const faction = extracted.factions?.find((item) => item.ownerCandidate === meta?.owner);
  if (!faction) return section;

  const tax = faction.taxRate;
  const science = faction.scienceRate;
  const luxury = faction.luxuryRate ?? Math.max(0, 100 - tax - science);
  if (![tax, science, luxury].every((value) => Number.isInteger(value))) return section;

  return section
    .replace(/rates\.tax=\d+/, `rates.tax=${tax}`)
    .replace(/rates\.science=\d+/, `rates.science=${science}`)
    .replace(/rates\.luxury=\d+/, `rates.luxury=${luxury}`);
}

function replacePlayerCities(section, playerId, cities) {
  const rows = cities.map((city) => cityRow(city, playerId));
  const table = rows.length ? `${cityHeader}\n${rows.join("\n")}\n}\n` : "";
  section = section.replace(/ncities=\d+/, `ncities=${cities.length}`);
  return section.replace(
    /routes_max_length=0\r?\n(?:c=\{[\s\S]*?\}\r?\n)?nunits=0/,
    `routes_max_length=0\n${table}nunits=0`,
  );
}

function replacePlayerUnits(section, playerId, units) {
  const rows = units.map((unit) => unitRow(unit, playerId)).filter(Boolean);
  const header = freeciv21_3_1_1 ? freeciv21_3_1_1UnitHeader : unitHeader;
  const table = rows.length ? `orders_max_length=0\n${header}\n${rows.join("\n")}\n}\n` : "orders_max_length=0\n";
  section = section.replace(/nunits=\d+/, `nunits=${rows.length}`);
  return section.replace(
    /orders_max_length=0\r?\n(?:u=\{[\s\S]*?\}\r?\n)?(?=map_t0000=)/,
    table,
  );
}

function replacePlayerKnownMap(section, terrainRows, extraRows, ownerRows, knownRows, visibleExtraRows) {
  const width = terrainRows[0].length;
  const height = terrainRows.length;
  const zeroRow = "0".repeat(width);
  const oneRow = "1".repeat(width);
  const rows = terrainRows.map((row, y) =>
    row.map((tile, x) => (knownRows?.[y]?.[x] === "K" ? tile : "u")).join(""),
  );
  const lines = rows.map((row, y) => `map_t${String(y).padStart(4, "0")}="${row}"`);
  const privateOwnerRows = ownerRows.map((row, y) =>
    row.map((owner, x) => (knownRows?.[y]?.[x] === "K" ? owner : "-")),
  );

  lines.push(...commaRowsToLines("map_owner", privateOwnerRows));
  lines.push(...commaRowsToLines("extras_owner", Array.from({ length: height }, () => Array(width).fill("-"))));
  appendExtraRows(lines, visibleExtraRows, width, height, "map_e");

  for (let updateLayer = 0; updateLayer < 4; updateLayer++) {
    const prefix = `map_u${String(updateLayer).padStart(2, "0")}_`;
    const row = updateLayer === 0 ? oneRow : zeroRow;
    for (let y = 0; y < height; y++) {
      lines.push(`${prefix}${String(y).padStart(4, "0")}="${row}"`);
    }
  }

  lines.push("dc_total=0");

  return section.replace(/map_t0000="[^"]*"\r?\n[\s\S]*$/, `${lines.join("\n")}\n`);
}

function ensureFreeciv21_3_1_1PlayerFields(section, playerId) {
  if (!freeciv21_3_1_1) return section;
  const hasCities = (citiesByPlayer[playerId]?.length || 0) > 0;
  const value = hasCities ? "TRUE" : "FALSE";
  if (/^got_first_city=/m.test(section)) {
    return section.replace(/^got_first_city=(TRUE|FALSE)/m, `got_first_city=${value}`);
  }
  return section.replace(/^ai\.level=.*$/m, (match) => `${match}\ngot_first_city=${value}`);
}

function replacePlayersMetadataSection(text) {
  return text.replace(/\[players\]\r?\n[\s\S]*?(?=\r?\n\[player0\])/, (section) => {
    const destroyedWonders =
      section.match(/destroyed_wonders="[^"]*"/)?.[0] ||
      'destroyed_wonders="0000000000000000000000000000000000000000000000000000000000000000000000000"';
    const identityNumber = section.match(/identity_number_used=\d+/)?.[0] || "identity_number_used=0";
    const shuffled = playerMeta.map((_, playerId) => `shuffled_player_${playerId}=${playerId}`);
    return ["[players]", `nplayers=${playerMeta.length}`, destroyedWonders, identityNumber, ...shuffled, ""].join("\n");
  });
}

function playerSectionRange(text, playerId) {
  const startToken = `[player${playerId}]\n`;
  const start = text.indexOf(startToken);
  if (start === -1) return null;
  const nextPlayer = text.indexOf(`\n[player${playerId + 1}]`, start + startToken.length);
  const nextSection = text.slice(start + startToken.length).match(/\n\[[^\]]+\]/);
  if (nextPlayer === -1 && !nextSection) {
    throw new Error(`Could not find end of ${startToken.trim()}`);
  }
  const end = nextPlayer === -1 ? start + startToken.length + nextSection.index : nextPlayer;
  return { start, end };
}

function existingPlayerIds(text) {
  return [...text.matchAll(/^\[player(\d+)\]$/gm)].map((match) => Number.parseInt(match[1], 10));
}

function ensurePlayerSections(text) {
  text = replacePlayersMetadataSection(text);
  const ids = existingPlayerIds(text);
  const maxExistingId = Math.max(...ids);
  for (let playerId = maxExistingId; playerId >= playerMeta.length; playerId--) {
    const range = playerSectionRange(text, playerId);
    if (range) text = text.slice(0, range.start) + text.slice(range.end);
  }
  if (maxExistingId + 1 >= playerMeta.length) return text;

  const templateRange = playerSectionRange(text, maxExistingId);
  if (!templateRange) throw new Error("Could not find template player section to clone");
  const templateSection = text.slice(templateRange.start, templateRange.end);
  const insertAt = templateRange.end;
  const additions = [];

  for (let playerId = maxExistingId + 1; playerId < playerMeta.length; playerId++) {
    additions.push(templateSection.replace(/^\[player\d+\]/, `[player${playerId}]`));
  }

  return text.slice(0, insertAt) + `\n${additions.join("\n")}` + text.slice(insertAt);
}

function diplomacyForOwners(ownerCandidate, otherOwnerCandidate) {
  const ownerDiplomacy = diplomacy?.byOwner?.find((item) => item.ownerCandidate === ownerCandidate);
  return ownerDiplomacy?.treaties?.find((item) => item.otherCandidate === otherOwnerCandidate) || null;
}

function civ2AttitudeToFreecivLove(attitude) {
  if (!Number.isInteger(attitude)) return null;
  return Math.max(-1000, Math.min(1000, 1000 - attitude * 20));
}

function finalDiplomacyState(treaty) {
  const decoded = treaty?.decoded;
  const flags = decoded?.flags || {};
  if (treaty && !Number.isInteger(treaty.lastContactTurn)) {
    throw new Error(
      `Diplomacy row ${treaty.rawBytes || "(unknown raw bytes)"} is missing lastContactTurn; rerun the extractor before building.`,
    );
  }
  const hasFormalTreaty = flags.peace || flags.alliance;
  const hasContact = flags.contact
    || hasFormalTreaty
    || (Number.isInteger(treaty?.lastContactTurn) && treaty.lastContactTurn >= 0);
  if (!hasContact) return { state: "Never met", flags, hasContact };

  let state = decoded?.relation || "Unknown";
  if (state === "Contact") state = "Cease-fire";
  if (state === "Unknown") state = "Cease-fire";
  return { state, flags, hasContact };
}

function diplomacyRow(playerId, otherId) {
  if (playerId === otherId) {
    return '"Never met","Never met",0,0,0,0,FALSE,FALSE,FALSE';
  }
  const ownerCandidate = playerMeta[playerId]?.owner;
  const otherOwnerCandidate = playerMeta[otherId]?.owner;
  const treaty = diplomacyForOwners(ownerCandidate, otherOwnerCandidate);
  const { state, flags } = finalDiplomacyState(treaty);
  const hasContact = state !== "Never met";
  const closest = state;
  const turnsLeft = state === "Cease-fire" ? 16 : 0;
  const contactTurnsLeft = hasContact ? 20 : 0;
  const embassy = hasContact && flags.embassy ? "TRUE" : "FALSE";
  const sharedVision = state === "Alliance" ? "TRUE" : "FALSE";
  return `"${state}","${closest}",0,${turnsLeft},0,${contactTurnsLeft},${embassy},${sharedVision},FALSE`;
}

function aiDiplomacyRow(playerId, otherId) {
  const ownerCandidate = playerMeta[playerId]?.owner;
  const otherOwnerCandidate = playerMeta[otherId]?.owner;
  const treaty = diplomacyForOwners(ownerCandidate, otherOwnerCandidate);
  const { state } = finalDiplomacyState(treaty);
  const attitudeLove = civ2AttitudeToFreecivLove(treaty?.civ2Attitude);
  const love = attitudeLove ?? (state === "War" ? -100 : 1);
  return `${love},${otherId},-1,5,0,0,0,0,0`;
}

function replacePlayerDiplomacy(section, playerId) {
  const diplomacyRows = playerMeta.map((_, otherId) => diplomacyRow(playerId, otherId));
  const aiRows = playerMeta.map((_, otherId) => aiDiplomacyRow(playerId, otherId));
  const texaiRows = playerMeta.map((_, otherId) => `${otherId},-1,5,0,0,0,0,0`);

  section = section.replace(
    /diplstate=\{"current","closest","first_contact_turn","turns_left","has_reason_to_cancel","contact_turns_left","embassy","gives_shared_vision","gives_shared_tiles"\r?\n[\s\S]*?\r?\n\}/,
    [
      'diplstate={"current","closest","first_contact_turn","turns_left","has_reason_to_cancel","contact_turns_left","embassy","gives_shared_vision","gives_shared_tiles"',
      ...diplomacyRows,
      "}",
    ].join("\n"),
  );
  section = section.replace(
    /ai=\{"love","spam","countdown","war_reason","patience","warn_space","ask_peace","ask_alliance","ask_ceasefire"\r?\n[\s\S]*?\r?\n\}/,
    ['ai={"love","spam","countdown","war_reason","patience","warn_space","ask_peace","ask_alliance","ask_ceasefire"', ...aiRows, "}"].join("\n"),
  );
  return section.replace(
    /texai=\{"spam","countdown","war_reason","patience","warn_space","ask_peace","ask_alliance","ask_ceasefire"\r?\n[\s\S]*?\r?\n\}/,
    ['texai={"spam","countdown","war_reason","patience","warn_space","ask_peace","ask_alliance","ask_ceasefire"', ...texaiRows, "}"].join("\n"),
  );
}

function replacePlayerSection(text, playerId, replacer) {
  const startToken = `[player${playerId}]\n`;
  const start = text.indexOf(startToken);
  if (start === -1) throw new Error(`Missing ${startToken.trim()}`);
  const next = text.indexOf(`\n[player${playerId + 1}]`, start + startToken.length);
  const nextSection = text.slice(start + startToken.length).match(/\n\[[^\]]+\]/);
  const end = next === -1 ? start + startToken.length + nextSection.index : next;
  const before = text.slice(0, start);
  const section = text.slice(start, end);
  const after = text.slice(end);
  return before + replacer(section) + after;
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuote && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (char === "," && !inQuote) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function trimTableBlockForColumns(block, prefix, allowedColumns) {
  const lines = block.split(/\r?\n/);
  if (!lines[0]?.startsWith(`${prefix}={`)) return block;
  const headerCells = parseCsvLine(lines[0].slice(prefix.length + 2));
  const keepIndexes = [];
  const keptHeaders = [];
  headerCells.forEach((header, index) => {
    if (allowedColumns.has(header)) {
      keepIndexes.push(index);
      keptHeaders.push(header);
    }
  });
  if (keepIndexes.length === headerCells.length) return block;

  const output = [`${prefix}={${keptHeaders.map(csvEscape).join(",")}`];
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];
    if (line === "}") {
      output.push(line);
      continue;
    }
    if (!line) {
      output.push(line);
      continue;
    }
    const cells = parseCsvLine(line);
    output.push(keepIndexes.map((cellIndex, keptIndex) =>
      serializeSaveCell(cells[cellIndex] ?? "", keptHeaders[keptIndex]),
    ).join(","));
  }
  return output.join("\n");
}

function serializeSaveCell(value, header = "") {
  const forceStringHeaders = new Set([
    "facing", "name", "currently_building_kind", "currently_building_name",
    "changed_from_kind", "changed_from_name", "style", "improvements",
    "type_by_name", "carrying", "orders_list", "dir_list", "activity_list",
    "tgt_vec", "action_list",
  ]);
  if (forceStringHeaders.has(header)) {
    return csvEscape(value);
  }
  if (/^-?\d+$/.test(value) || value === "TRUE" || value === "FALSE") {
    return value;
  }
  return csvEscape(value);
}

function trimTableBlocksForColumns(text, prefix, allowedColumns) {
  const blockRegex = new RegExp(`^${prefix}=\\{[^\\n]*\\n[\\s\\S]*?^\\}`, "gm");
  return text.replace(blockRegex, (block) => trimTableBlockForColumns(block, prefix, allowedColumns));
}

function normalizeTableBlockForColumns(block, prefix, targetColumns, defaults = {}) {
  const lines = block.split(/\r?\n/);
  if (!lines[0]?.startsWith(`${prefix}={`)) return block;
  const headerCells = parseCsvLine(lines[0].slice(prefix.length + 2));
  const output = [`${prefix}={${targetColumns.map(csvEscape).join(",")}`];
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];
    if (line === "}") {
      output.push(line);
      continue;
    }
    if (!line) {
      output.push(line);
      continue;
    }
    const cells = parseCsvLine(line);
    const row = new Map();
    headerCells.forEach((header, cellIndex) => row.set(header, cells[cellIndex] ?? ""));
    output.push(targetColumns.map((header) =>
      serializeSaveCell(row.has(header) ? row.get(header) : (defaults[header] ?? ""), header),
    ).join(","));
  }
  return output.join("\n");
}

function normalizeTableBlocksForColumns(text, prefix, targetColumns, defaults = {}) {
  const blockRegex = new RegExp(`^${prefix}=\\{[^\\n]*\\n[\\s\\S]*?^\\}`, "gm");
  return text.replace(blockRegex, (block) => normalizeTableBlockForColumns(block, prefix, targetColumns, defaults));
}

function updateSettingsCount(text) {
  return text.replace(/^(set=\{[^\n]*\n)([\s\S]*?)(^\}\r?\n)set_count=\d+/m, (match, start, rows, end) => {
    const count = rows.split(/\r?\n/).filter((line) => line.trim()).length;
    return `${start}${rows}${end}set_count=${count}`;
  });
}

function cleanupFreeciv21_3_1_1Settings(text) {
  const supportedSettings = [
    "aifill", "alltemperate", "animals", "aqueductloss", "borders",
    "caravan_bonus_style", "citymindist", "citynames", "conquercost",
    "diplbulbcost", "diplgoldcost", "diplomacy", "dispersion", "flatpoles",
    "foggedborders", "fogofwar", "foodbox", "freecost", "fulltradesize",
    "gameseed", "generator", "globalwarming", "globalwarming_percent", "gold",
    "happyborders", "huts", "incite_gold_capt_chance",
    "incite_gold_loss_chance", "killcitizen", "killstack", "killunhomed",
    "landmass", "mapseed", "mapsize", "maxplayers", "minplayers",
    "multiresearch", "nationset", "notradesize", "nuclearwinter",
    "nuclearwinter_percent", "occupychance", "plrcolormode", "rapturedelay",
    "razechance", "revealmap", "revolentype", "sciencebox", "separatepoles",
    "shieldbox", "singlepole", "size", "specials", "startcity", "startpos",
    "startunits", "steepness", "team_pooled_research", "teamplacement",
    "techleak", "techlevel", "techlossforgiveness", "techlossrestore",
    "techlost_donor", "techlost_recv", "techpenalty", "temperature",
    "tilesperplayer", "tinyisles", "topology", "trade_revenue_style",
    "trademindist", "tradeworldrelpct", "trading_city", "trading_gold",
    "trading_tech", "traitdistribution", "wetness", "xsize", "ysize",
  ];
  const supportedSettingsSet = new Set(supportedSettings);
  const defaultSettings = new Map([
    ["alltemperate", ["FALSE", "FALSE"]],
    ["maxplayers", ["500", "500"]],
    ["singlepole", ["FALSE", "FALSE"]],
  ]);

  return text.replace(/^(set=\{[^\n]*\n)([\s\S]*?)(^\}\r?\n)set_count=\d+/m, (match, start, rows, end) => {
    const lines = rows.split(/\r?\n/).filter((line) => line.trim());
    const settingRows = new Map();
    for (const line of lines) {
      const cells = parseCsvLine(line);
      const name = cells[0];
      if (!supportedSettingsSet.has(name)) continue;
      settingRows.set(name, [cells[1] ?? "", cells[2] ?? ""]);
    }
    const keptRows = [];
    for (const name of supportedSettings) {
      const values = settingRows.get(name) ?? defaultSettings.get(name);
      if (!values) continue;
      keptRows.push([
        serializeSaveCell(name, "name"),
        serializeSaveCell(values[0], "value"),
        serializeSaveCell(values[1], "gamestart"),
      ].join(","));
    }
    return `set={"name","value","gamestart"\n${keptRows.join("\n")}\n${end}set_count=${keptRows.length}`;
  });
}

function cleanupFreeciv21_3_1_1Save(text) {
  if (!freeciv21_3_1_1) return text;

  const cityColumns = new Set([
    "y", "x", "id", "original", "size", "nspe0", "nspe1", "nspe2",
    "food_stock", "shield_stock", "history", "airlift", "was_happy",
    "turn_plague", "anarchy", "rapture", "steal", "turn_founded",
    "did_buy", "did_sell", "turn_last_built", "name",
    "currently_building_kind", "currently_building_name",
    "changed_from_kind", "changed_from_name", "before_change_shields",
    "caravan_shields", "disbanded_shields", "last_turns_shield_surplus",
    "style", "city_radius_sq", "improvements", "wl_length", "option0",
    "option1", "option2", "ai.urgency", "ai.building_turn",
    "ai.building_wait", "ai.founder_turn", "ai.founder_want",
    "ai.founder_boat", "citizen0", "citizen1", "citizen2", "citizen3",
    "citizen4", "citizen5", "citizen6", "citizen7",
  ]);
  const freeciv21CityColumns = [
    "y", "x", "id", "original", "size", "nspe0", "nspe1", "nspe2",
    "traderoute0", "route_direction0", "route_good0",
    "traderoute1", "route_direction1", "route_good1",
    "traderoute2", "route_direction2", "route_good2",
    "traderoute3", "route_direction3", "route_good3",
    "traderoute4", "route_direction4", "route_good4",
    "food_stock", "shield_stock", "history", "airlift", "was_happy",
    "turn_plague", "anarchy", "rapture", "steal", "turn_founded",
    "did_buy", "did_sell", "turn_last_built", "name",
    "currently_building_kind", "currently_building_name",
    "changed_from_kind", "changed_from_name", "before_change_shields",
    "bought_shields", "caravan_shields", "disbanded_shields",
    "last_turns_shield_surplus", "style", "city_radius_sq",
    "improvements", "wl_length", "option0", "option1", "option2",
    "ai.urgency", "ai.building_turn", "ai.building_wait",
    "ai.founder_turn", "ai.founder_want", "ai.founder_boat",
    "citizen0", "rally_point_length", "rally_point_persistent",
    "rally_point_vigilant", "rally_point_orders", "rally_point_dirs",
    "rally_point_activities", "rally_point_action_vec",
    "rally_point_tgt_vec", "rally_point_sub_tgt_vec", "cma_enabled",
    "cma_minimal_surplus", "cma_minimal_surplus,1",
    "cma_minimal_surplus,2", "cma_minimal_surplus,3",
    "cma_minimal_surplus,4", "cma_minimal_surplus,5", "cma_factor",
    "cma_factor,1", "cma_factor,2", "cma_factor,3", "cma_factor,4",
    "cma_factor,5", "max_growth", "require_happy", "allow_disorder",
    "allow_specialists", "happy_factor",
  ];
  const freeciv21CityDefaults = {
    route_direction0: "Bidirectional",
    route_direction1: "Bidirectional",
    route_direction2: "Bidirectional",
    route_direction3: "Bidirectional",
    route_direction4: "Bidirectional",
    route_good0: "Goods",
    route_good1: "Goods",
    route_good2: "Goods",
    route_good3: "Goods",
    route_good4: "Goods",
    rally_point_orders: "-",
    rally_point_dirs: "-",
    rally_point_activities: "-",
    rally_point_action_vec: "-1",
    rally_point_tgt_vec: "-1",
    rally_point_sub_tgt_vec: "-1",
  };
  for (let route = 0; route < 5; route++) {
    freeciv21CityDefaults[`traderoute${route}`] = "0";
  }
  for (const column of freeciv21CityColumns) {
    if (!(column in freeciv21CityDefaults)) freeciv21CityDefaults[column] = "0";
  }
  for (const column of [
    "was_happy", "did_buy", "did_sell", "option0", "option1", "option2",
    "ai.founder_boat", "rally_point_persistent", "rally_point_vigilant",
    "cma_enabled", "require_happy", "allow_disorder", "allow_specialists",
  ]) {
    freeciv21CityDefaults[column] = "FALSE";
  }
  const unitColumns = new Set([
    "id", "x", "y", "facing", "nationality", "veteran", "hp", "homecity", "name",
    "type_by_name", "activity", "activity_count", "activity_tgt",
    "changed_from", "changed_from_count", "changed_from_tgt", "done_moving",
    "moves", "fuel", "born", "battlegroup", "go", "goto_x", "goto_y",
    "server_side_agent", "ai", "passenger", "ferryboat", "charge", "bodyguard", "ord_map",
    "ord_city", "moved", "paradropped", "transported_by", "carrying",
    "action_decision", "action_decision_tile_x", "action_decision_tile_y",
    "stay", "orders_length", "orders_index", "orders_repeat",
    "orders_vigilant", "orders_list", "dir_list", "activity_list",
    "action_vec", "tgt_vec", "action_list", "sub_tgt_vec",
  ]);
  const diplstateColumns = new Set([
    "current", "closest", "first_contact_turn", "turns_left",
    "has_reason_to_cancel", "contact_turns_left", "embassy",
    "gives_shared_vision",
  ]);
  const cleanedTables = trimTableBlocksForColumns(
    trimTableBlocksForColumns(text, "u", unitColumns),
    "diplstate",
    diplstateColumns,
  )
    .replace(
      /texai=\{"spam","countdown","war_reason","patience","warn_space","ask_peace","ask_alliance","ask_ceasefire"\r?\n[\s\S]*?\r?\n\}\r?\n/g,
      "",
    )
    .replace(/^orig_version=.*\r?\n/gm, "")
    .replace(/^dbid=.*\r?\n/gm, "")
    .replace(/^city_options_size=.*\r?\n/gm, "")
    .replace(/^city_options_vector=.*\r?\n/gm, "")
    .replace(/^city_counters_order_size=.*\r?\n/gm, "")
    .replace(/^diplstate\d+\.gives_shared_tiles=.*\r?\n/gm, "")
    .replace(/(\[game\]\r?\n[\s\S]*?)^random_seed=.*\r?\n/m, "$1")
    .replace(/^ai_types=.*\r?\n/m, 'ai_types="classic"\n')
    .replace(/^adv\.wonder_city=.*\r?\n/gm, "")
    .replace(/^orders_max_length=.*\r?\n/gm, "")
    .replace(/^infrapts=.*\r?\n/gm, "")
    .replace(/^autoselect_weight=.*\r?\n/gm, "")
    .replace(/^wl_max_length=.*\r?\n/gm, "")
    .replace(/^routes_max_length=.*\r?\n/gm, "");
  return cleanupFreeciv21_3_1_1Settings(
    normalizeTableBlocksForColumns(cleanedTables, "c", freeciv21CityColumns, freeciv21CityDefaults),
  );
}

function technologyNames(text) {
  const match = text.match(/technology_vector=([^\n]+)/);
  if (!match) throw new Error("Missing technology_vector");
  return parseCsvLine(match[1]).map((name) => name.replace(/^"|"$/g, ""));
}

function mapCiv2Tech(civ2Name, ownerCandidate) {
  if (!civ2Name) return "";
  if (!Object.prototype.hasOwnProperty.call(techNameMap, civ2Name)) {
    noteUnmappedTech(ownerCandidate, civ2Name, "missing from tech map");
    return "";
  }
  const freecivName = techNameMap[civ2Name];
  if (freecivName === null || freecivName === "") {
    noteUnmappedTech(ownerCandidate, civ2Name, "intentionally skipped");
    return "";
  }
  if (!freecivTechNames.has(freecivName)) {
    noteUnmappedTech(ownerCandidate, civ2Name, "Freeciv tech not found", freecivName);
    return "";
  }
  return freecivName;
}

function mappedTechsForPlayer(playerId) {
  const ownerCandidate = playerMeta[playerId]?.owner;
  const ownerTech = technologies?.byOwner?.find((item) => item.ownerCandidate === ownerCandidate);
  const mapped = [];
  for (const technology of ownerTech?.knownTechnologies || []) {
    const freecivName = mapCiv2Tech(technology.name, ownerCandidate);
    if (freecivName) mapped.push(freecivName);
  }
  return mapped;
}

function ownerTechForPlayer(playerId) {
  const ownerCandidate = playerMeta[playerId]?.owner;
  return technologies?.byOwner?.find((item) => item.ownerCandidate === ownerCandidate);
}

function mappedCurrentResearchForPlayer(playerId) {
  const ownerCandidate = playerMeta[playerId]?.owner;
  const ownerTech = ownerTechForPlayer(playerId);
  const freecivName = mapCiv2Tech(ownerTech?.currentResearchName, ownerCandidate);
  return freecivName || "A_UNSET";
}

function replaceResearchSection(text) {
  const names = technologyNames(text);
  const rows = playerMeta.map((_, playerId) => {
    const knownTechs = new Set(mappedTechsForPlayer(playerId));
    const done = names.map((name) => (name === "A_NONE" || knownTechs.has(name) ? "1" : "0")).join("");
    const techCount = [...done].filter((char) => char === "1").length;
    const ownerTech = ownerTechForPlayer(playerId);
    const goalName = mappedCurrentResearchForPlayer(playerId);
    const bulbs = Number.isInteger(ownerTech?.researchProgress) ? ownerTech.researchProgress : 0;
    if (freeciv21_3_1_1) {
      return `${playerId},"${goalName}",${techCount},0,0,"",${bulbs},"${goalName}",FALSE,"${done}"`;
    }
    return `${playerId},"${goalName}",${techCount},0,0,"",${bulbs},"${goalName}",0,"${done}"`;
  });
  const researchSection = [
    "[research]",
    freeciv21_3_1_1
      ? 'r={"number","goal_name","techs","futuretech","bulbs_before","saved_name","bulbs","now_name","got_tech","done"'
      : 'r={"number","goal_name","techs","futuretech","bulbs_before","saved_name","bulbs","now_name","free_bulbs","done"',
    ...rows,
    "}",
    `count=${playerMeta.length}`,
    "",
  ].join("\n");

  if (/\[research\]\r?\n[\s\S]*?(?=\r?\n\[history\])/.test(text)) {
    return text.replace(/\[research\]\r?\n[\s\S]*?(?=\r?\n\[history\])/, researchSection);
  }
  return text.replace(/\n\[history\]/, `\n${researchSection}[history]`);
}

const extracted = JSON.parse(fs.readFileSync(extractedPath, "utf8"));
const mapHasResources = Boolean(extracted.features?.resources?.tiles?.length);
const diplomacy = diplomacyPath ? readJson(diplomacyPath) : null;
const technologies = technologiesPath ? readJson(technologiesPath) : null;
const hasCiv2Barbarians = (extracted.cities || []).some((city) => city.ownerCandidate === 0)
  || (extracted.units || []).some((unit) => unit.ownerCandidate === 0);
const configuredBarbarianPlayer = playerMeta.find((player) => player.owner === 0);
if (hasCiv2Barbarians) {
  const barbarianDefaults = {
    owner: 0,
    name: "Barbarians",
    gender: "male",
    nation: "Barbarian",
    government: "Despotism",
    style: "European",
    color: [80, 80, 80],
    barbarianType: "Land",
    isBarbarian: true,
  };
  if (configuredBarbarianPlayer) {
    Object.assign(configuredBarbarianPlayer, {
      ...barbarianDefaults,
      ...configuredBarbarianPlayer,
      isBarbarian: true,
      barbarianType: configuredBarbarianPlayer.barbarianType || barbarianDefaults.barbarianType,
    });
  } else {
    playerMeta = [...playerMeta, barbarianDefaults];
  }
  ownerToPlayer = new Map(playerMeta.map((player, playerId) => [player.owner, playerId]));
}
let width = nativeWidthMode ? extracted.nativeFreeciv.width : extracted.inferred.width;
const extractedHeight = extracted.inferred.height;
let terrainRows = nativeWidthMode
  ? extracted.nativeFreeciv.terrainRows.map((row) => row.split(""))
  : parseTerrainRows(fs.readFileSync(mapFragmentPath, "utf8"), extractedHeight);
const needsEvenFreeciv21Width = freeciv21_3_1_1 && width % 2 !== 0;
if (needsEvenFreeciv21Width) {
  // Freeciv21 3.1.1 can silently stall on odd XYSIZE widths in scenario saves.
  // Pad one inert edge column and let the real [map] dimensions match settings.
  terrainRows = terrainRows.map((row) => [...row, row[row.length - 1] || "o"]);
  width += 1;
}
const needsEvenIsoHeight = freeciv21NativeMode && terrainRows.length % 2 !== 0;
if (needsEvenIsoHeight) {
  // Freeciv rejects ISO/hex maps with odd ysize. Civ2 scenarios can have
  // odd heights, so pad one inert row after the original map.
  terrainRows = [...terrainRows, [...terrainRows[terrainRows.length - 1]]];
}
const height = terrainRows.length;
const cities = extracted.cities
  .filter((city) => city.name && ownerToPlayer.has(city.ownerCandidate))
  .map((city) => (nativeWidthMode ? { ...city, civ2x: city.x, x: Math.floor(city.x / 2) } : city));
const cityByIndex = new Map(cities.map((city) => [city.index, city]));
const civ2UnitTypeByIndex = new Map((extracted.unitTypes || []).map((unitType) => [unitType.index, unitType]));
// For future crash isolation, temporarily add:
// const unitOwnerIsolationTest = new Set([1, 2, 3, 4, 5, 6, 7]);
// and include `&& unitOwnerIsolationTest.has(unit.ownerCandidate)` in the filter below.
const units = (extracted.units || [])
  .filter((unit) =>
    ownerToPlayer.has(unit.ownerCandidate)
    && unit.typeName
  )
  .map((unit) => {
    const baseUnit = { ...unit, civ2UnitType: civ2UnitTypeByIndex.get(unit.typeIndex) || null };
    if (!Number.isInteger(unit.homeCityIndex)) {
      return { ...baseUnit, homecityId: 0 };
    }
    const homeCity = cityByIndex.get(unit.homeCityIndex);
    if (!homeCity) {
      noteUnitHomecityIssue(unit, "home city index not found in converted cities");
      return { ...baseUnit, homecityId: 0 };
    }
    if (ownerToPlayer.get(homeCity.ownerCandidate) !== ownerToPlayer.get(unit.ownerCandidate)) {
      noteUnitHomecityIssue(unit, "home city belongs to different mapped player", homeCity);
      return { ...baseUnit, homecityId: 0 };
    }
    return { ...baseUnit, homecityId: 1000 + homeCity.index };
  });
assignTransportedUnits(units);
const extraRows = emptyExtraRows(width, height);
const roadRows = nativeWidthMode
  ? extracted.features?.roads?.nativeRows || []
  : extracted.features?.roads?.rows || [];
const riverRows = nativeWidthMode
  ? extracted.features?.rivers?.nativeRows || []
  : extracted.features?.rivers?.rows || [];
const freeciv21Features = extracted.features?.freeciv21 || {};

function featureRows(name) {
  const feature = freeciv21Features[name] || {};
  return nativeWidthMode ? feature.nativeRows || [] : feature.rows || [];
}

function terrainAt(x, y) {
  return terrainRows[y]?.[x];
}

function terrainSupportsExtra(extraName, terrain) {
  if (!landTerrains.has(terrain)) return false;
  if (extraName === "Irrigation" || extraName === "Farmland") {
    return irrigableTerrains.has(terrain);
  }
  if (extraName === "Mine") {
    return mineableTerrains.has(terrain);
  }
  return true;
}

const resourceExtraIndexes = [
  "Gold",
  "Iron",
  "Game",
  "Furs",
  "Coal",
  "Fish",
  "Fruit",
  "Gems",
  "Buffalo",
  "Wheat",
  "Oasis",
  "Peat",
  "Pheasant",
  "Resources",
  "Ivory",
  "Silk",
  "Spice",
  "Whales",
  "Wine",
  "Oil",
].map((name) => extraIndex[name]);

function hasExtra(rows, index, x, y) {
  const layer = Math.floor(index / 4);
  const bit = 1 << (index % 4);
  const current = Number.parseInt(rows[layer]?.[y]?.[x] || "0", 16);
  return (current & bit) !== 0;
}

function tileHasResourceBonus(rows, x, y) {
  return resourceExtraIndexes.some((index) => hasExtra(rows, index, x, y));
}

function hasAdjoiningResourceBonus(rows, x, y) {
  const wrapX = extracted.inferred?.mapShape === 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const yy = y + dy;
      if (yy < 0 || yy >= height) continue;
      let xx = x + dx;
      if (wrapX) {
        xx = (xx + width) % width;
      } else if (xx < 0 || xx >= width) {
        continue;
      }
      if (tileHasResourceBonus(rows, xx, yy)) return true;
    }
  }
  return false;
}

function addSparseRandomGrasslandShields(rows, baseResourceRows, knownRows = null) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (terrainRows[y]?.[x] !== "g") continue;
      if (knownRows && knownRows[y]?.[x] !== "K") continue;
      if (tileHasResourceBonus(baseResourceRows, x, y)) continue;
      if (hasAdjoiningResourceBonus(baseResourceRows, x, y)) continue;
      const roll = Math.floor(Math.random() * 1000) + 1;
      if (roll <= 250) {
        setExtra(rows, extraIndex.Resources, x, y);
      }
    }
  }
}

for (const city of cities) {
  const playerId = ownerToPlayer.get(city.ownerCandidate);
  const land = playerId === 1 ? "p" : "g";
  if (!landTerrains.has(terrainRows[city.y][city.x])) {
    terrainRows[city.y][city.x] = land;
  }
  setExtra(extraRows, extraIndex.Road, city.x, city.y);
}

if (freeciv21NativeMode) {
  const featureConfigs = [
    ["rivers", "River"],
    ["irrigation", "Irrigation"],
    ["mines", "Mine"],
    ["farmland", "Farmland"],
    ["roads", "Road"],
    ["railroads", "Railroad"],
    ["fortresses", "Fortress"],
    ["airbases", "Airbase"],
    ["pollution", "Pollution"],
  ];

  for (const [featureName, extraName] of featureConfigs) {
    const rows = featureRows(featureName);
    for (let y = 0; y < height; y++) {
      const row = rows[y] || "";
      for (let x = 0; x < width; x++) {
        const terrain = terrainAt(x, y);
        if (row[x] === "R" && terrainSupportsExtra(extraName, terrain)) {
          setExtra(extraRows, extraIndex[extraName], x, y);
          if (extraName === "Railroad") {
            setExtra(extraRows, extraIndex.Road, x, y);
          }
        }
      }
    }
  }

  for (const resourceTile of extracted.features?.resources?.tiles || []) {
    const resourceIndex = extraIndex[resourceTile.resource];
    const x = nativeWidthMode ? resourceTile.nativeX : resourceTile.x;
    const y = resourceTile.y;
    if (resourceIndex !== undefined && terrainRows[y]?.[x] !== "g") {
      setExtra(extraRows, resourceIndex, x, y);
      if (!nativeWidthMode && x + 1 < width) {
        setExtra(extraRows, resourceIndex, x + 1, y);
      }
    }
  }
  const baseResourceRows = cloneExtraRows(extraRows);
  addSparseRandomGrasslandShields(extraRows, baseResourceRows);
} else {
  for (let y = 0; y < height; y++) {
    const roadRow = roadRows[y] || "";
    const riverRow = riverRows[y] || "";
    for (let x = 0; x < width; x++) {
      if (riverRow[x] === "R" && landTerrains.has(terrainRows[y][x])) {
        setExtra(extraRows, extraIndex.River, x, y);
      }
      if (roadRow[x] === "R" && landTerrains.has(terrainRows[y][x])) {
        setExtra(extraRows, extraIndex.Road, x, y);
      }
    }
  }
}

const ownerRows = Array.from({ length: height }, () => Array(width).fill("-"));
const sourceRows = Array.from({ length: height }, () => Array(width).fill("-"));
const workedRows = Array.from({ length: height }, () => Array(width).fill("-"));
for (const city of cities) {
  const playerId = ownerToPlayer.get(city.ownerCandidate);
  workedRows[city.y][city.x] = String(1000 + city.index);
  for (let yy = Math.max(0, city.y - 2); yy <= Math.min(height - 1, city.y + 2); yy++) {
    for (let xx = Math.max(0, city.x - 2); xx <= Math.min(width - 1, city.x + 2); xx++) {
      const dx = xx - city.x;
      const dy = yy - city.y;
      if (dx * dx + dy * dy <= 5) {
        ownerRows[yy][xx] = String(playerId);
        sourceRows[yy][xx] = String(1000 + city.index);
      }
    }
  }
}

const citiesByPlayer = Array.from({ length: playerMeta.length }, () => []);
for (const city of cities) {
  citiesByPlayer[ownerToPlayer.get(city.ownerCandidate)].push(city);
}
const unitsByPlayer = Array.from({ length: playerMeta.length }, () => []);
for (const unit of units) {
  unitsByPlayer[ownerToPlayer.get(unit.ownerCandidate)].push(unit);
}

const enableCiv2Visibility = true;

function knownRowsForPlayer(playerId) {
  if (!enableCiv2Visibility) {
    return Array.from({ length: height }, () => Array(width).fill("K"));
  }

  const ownerCandidate = String(playerMeta[playerId]?.owner);
  const visibility = extracted.visibility?.byOwnerCandidate?.[ownerCandidate];
  const rows = nativeWidthMode ? visibility?.nativeRows : visibility?.rows;
  if (rows?.length === height) {
    return rows.map((row) => row.split(""));
  }
  return Array.from({ length: height }, () => Array(width).fill("K"));
}

function visibleFeatureRowsForPlayer(playerId) {
  if (!enableCiv2Visibility) {
    return extraRows;
  }

  const ownerCandidate = String(playerMeta[playerId]?.owner);
  const visibility = extracted.visibility?.byOwnerCandidate?.[ownerCandidate];
  const visibleFeatures = visibility?.visibleFeatures;
  if (!visibleFeatures) {
    return extraRows;
  }

  const playerExtraRows = emptyExtraRows(width, height);
  const featureConfigs = [
    ["rivers", "River"],
    ["irrigation", "Irrigation"],
    ["mines", "Mine"],
    ["farmland", "Farmland"],
    ["roads", "Road"],
    ["railroads", "Railroad"],
    ["fortresses", "Fortress"],
    ["airbases", "Airbase"],
    ["pollution", "Pollution"],
  ];

  for (const [featureName, extraName] of featureConfigs) {
    const feature = visibleFeatures[featureName] || {};
    const rows = nativeWidthMode ? feature.nativeRows || [] : feature.rows || [];
    for (let y = 0; y < height; y++) {
      const row = rows[y] || "";
      for (let x = 0; x < width; x++) {
        const terrain = terrainAt(x, y);
        if (row[x] === "R" && terrainSupportsExtra(extraName, terrain)) {
          setExtra(playerExtraRows, extraIndex[extraName], x, y);
          if (extraName === "Railroad") {
            setExtra(playerExtraRows, extraIndex.Road, x, y);
          }
        }
      }
    }
  }

  const knownRows = knownRowsForPlayer(playerId);
  for (const resourceTile of extracted.features?.resources?.tiles || []) {
    const resourceIndex = extraIndex[resourceTile.resource];
    const x = nativeWidthMode ? resourceTile.nativeX : resourceTile.x;
    const y = resourceTile.y;
    if (
      resourceIndex !== undefined
      && knownRows[y]?.[x] === "K"
      && terrainRows[y]?.[x] !== "g"
    ) {
      setExtra(playerExtraRows, resourceIndex, x, y);
      if (!nativeWidthMode && x + 1 < width && knownRows[y]?.[x + 1] === "K") {
        setExtra(playerExtraRows, resourceIndex, x + 1, y);
      }
    }
  }
  const baseResourceRows = cloneExtraRows(playerExtraRows);
  addSparseRandomGrasslandShields(playerExtraRows, baseResourceRows, knownRows);
  return playerExtraRows;
}

function sortedReportEntries(map) {
  return [...map.values()].sort((a, b) =>
    (a.civ2Name || "").localeCompare(b.civ2Name || "") || (a.reason || "").localeCompare(b.reason || ""),
  );
}

function visibilitySummaryForPlayer(playerId) {
  const ownerCandidate = String(playerMeta[playerId]?.owner);
  const visibility = extracted.visibility?.byOwnerCandidate?.[ownerCandidate];
  const sourceRows = nativeWidthMode ? visibility?.nativeRows : visibility?.rows;
  const rows = knownRowsForPlayer(playerId);
  const knownTiles = rows.reduce((count, row) => count + row.filter((tile) => tile === "K").length, 0);
  const totalTiles = width * height;
  return {
    playerId,
    ownerCandidate: playerMeta[playerId]?.owner,
    name: playerNameForPlayer(playerMeta[playerId], ""),
    source: !enableCiv2Visibility ? "disabled-full-map" : sourceRows?.length === height ? "civ2" : "fallback-full-map",
    knownTiles,
    totalTiles,
    knownPercent: totalTiles ? Number(((knownTiles / totalTiles) * 100).toFixed(2)) : 0,
    hasVisibleFeatureRows: Boolean(visibility?.visibleFeatures),
  };
}

function diplomacySummary() {
  const neverMet = [];
  const raw0cNeverMet = [];
  const formalTreatyWithoutContactBit = [];
  const asymmetric = [];
  for (let a = 0; a < playerMeta.length; a++) {
    for (let b = a + 1; b < playerMeta.length; b++) {
      const aOwner = playerMeta[a]?.owner;
      const bOwner = playerMeta[b]?.owner;
      const aToB = diplomacyForOwners(aOwner, bOwner);
      const bToA = diplomacyForOwners(bOwner, aOwner);
      const aState = finalDiplomacyState(aToB);
      const bState = finalDiplomacyState(bToA);
      const pair = {
        a: playerNameForPlayer(playerMeta[a], ""),
        b: playerNameForPlayer(playerMeta[b], ""),
        aOwner,
        bOwner,
        aToB: {
          rawBytes: aToB?.rawBytes || "",
          state: aState.state,
          hasContact: aState.hasContact,
          contactBit: Boolean(aState.flags.contact),
          lastContactTurn: aToB?.lastContactTurn ?? null,
          embassy: aState.state !== "Never met" && Boolean(aState.flags.embassy),
          civ2Attitude: aToB?.civ2Attitude ?? null,
          civ2AttitudeName: aToB?.civ2AttitudeName || "",
          freecivLove: civ2AttitudeToFreecivLove(aToB?.civ2Attitude),
        },
        bToA: {
          rawBytes: bToA?.rawBytes || "",
          state: bState.state,
          hasContact: bState.hasContact,
          contactBit: Boolean(bState.flags.contact),
          lastContactTurn: bToA?.lastContactTurn ?? null,
          embassy: bState.state !== "Never met" && Boolean(bState.flags.embassy),
          civ2Attitude: bToA?.civ2Attitude ?? null,
          civ2AttitudeName: bToA?.civ2AttitudeName || "",
          freecivLove: civ2AttitudeToFreecivLove(bToA?.civ2Attitude),
        },
      };
      if (aState.state === "Never met" || bState.state === "Never met") neverMet.push(pair);
      if (
        (aState.state === "Never met" && aToB?.rawBytes === "0c 00 00 00")
        || (bState.state === "Never met" && bToA?.rawBytes === "0c 00 00 00")
      ) {
        raw0cNeverMet.push(pair);
      }
      if (aState.state !== bState.state || pair.aToB.embassy !== pair.bToA.embassy) {
        asymmetric.push(pair);
      }
      for (const [treaty, finalState, from, to] of [
        [aToB, aState, pair.a, pair.b],
        [bToA, bState, pair.b, pair.a],
      ]) {
        const rawRelation = treaty?.decoded?.relation || "Unknown";
        if (!finalState.flags.contact && ["Alliance", "Peace", "Cease-fire", "War"].includes(rawRelation)) {
          formalTreatyWithoutContactBit.push({
            from,
            to,
            rawBytes: treaty?.rawBytes || "",
            rawRelation,
            finalState: finalState.state,
            hasContact: finalState.hasContact,
            contactBit: Boolean(finalState.flags.contact),
            lastContactTurn: treaty?.lastContactTurn ?? null,
            suppressedEmbassy: Boolean(finalState.flags.embassy),
          });
        }
      }
    }
  }
  return {
    notes: [
      "Civ2 attitude values are mapped linearly to Freeciv AI love: 0 -> 1000, 50 -> 0, 100 -> -1000.",
      "Effective Civ2 contact is true when the treaty CONTACT bit is set or lastContactTurn is 0 or greater.",
      "formalTreatyWithoutContactBit lists treaty-looking Civ2 rows where the explicit CONTACT bit is not set; some still have contact through lastContactTurn.",
    ],
    counts: {
      neverMetPairs: neverMet.length,
      raw0cNeverMetPairs: raw0cNeverMet.length,
      asymmetricPairs: asymmetric.length,
      formalTreatyWithoutContactBit: formalTreatyWithoutContactBit.length,
    },
    neverMet,
    raw0cNeverMet,
    asymmetric,
    formalTreatyWithoutContactBit,
  };
}

function transportedUnitSummary() {
  const transported = units.filter((unit) => unit.transportedById !== undefined && unitWillBeWritten(unit));
  const byTransporter = new Map();
  for (const unit of transported) {
    const key = String(unit.transportedById);
    if (!byTransporter.has(key)) byTransporter.set(key, { transporterId: unit.transportedById, cargo: [] });
    byTransporter.get(key).cargo.push({
      id: unitFreecivId(unit),
      civ2Type: unit.typeName,
      freecivType: unit.freecivUnit?.ruleName || "",
      x: nativeWidthMode ? unit.nativeX : unit.x,
      y: unit.y,
      ownerCandidate: unit.ownerCandidate,
    });
  }
  return {
    transportedUnitCount: transported.length,
    transporterInstanceCount: byTransporter.size,
    instances: [...byTransporter.values()],
  };
}

function buildValidationReport() {
  const unmappedImprovementEntries = sortedReportEntries(unmappedImprovements);
  const unmappedUnitEntries = sortedReportEntries(unmappedUnits);
  const unmappedTechEntries = sortedReportEntries(unmappedTechs);
  const writtenUnits = units.filter(unitWillBeWritten);
  const skippedUnitEntries = unmappedUnitEntries.filter((entry) =>
    entry.reason.startsWith("skipped") || entry.reason.includes("intentionally skipped"),
  );
  return {
    generatedAt: new Date().toISOString(),
    scenarioName: buildConfig.scenarioName || "",
    mode,
    output: outputPath,
    inputs: {
      extracted: extractedPath,
      diplomacy: diplomacyPath,
      technologies: technologiesPath,
      unitMap: unitMapPath,
      improvementMap: improvementMapPath,
      techMap: techMapPath,
      governmentMap: governmentMapPath,
    },
    totals: {
      width,
      height,
      cities: cities.length,
      units: writtenUnits.length,
      extractedMappedUnits: units.length,
      players: playerMeta.length,
      unmappedImprovementEntries: unmappedImprovementEntries.length,
      unmappedUnitEntries: unmappedUnitEntries.length,
      unmappedTechEntries: unmappedTechEntries.length,
      skippedUnitEntries: skippedUnitEntries.length,
      coinageFallbacks: coinageFallbacks.length,
      unitHomecityIssueEntries: unitHomecityIssues.size,
    },
    players: playerMeta.map((meta, playerId) => ({
      playerId,
      ownerCandidate: meta.owner,
      name: playerNameForPlayer(meta, ""),
      nation: meta.nation,
      cities: citiesByPlayer[playerId]?.length || 0,
      units: (unitsByPlayer[playerId] || []).filter(unitWillBeWritten).length,
      extractedMappedUnits: unitsByPlayer[playerId]?.length || 0,
      currentResearchCiv2: ownerTechForPlayer(playerId)?.currentResearchName || "",
      currentResearchFreeciv: mappedCurrentResearchForPlayer(playerId),
      researchProgress: ownerTechForPlayer(playerId)?.researchProgress ?? 0,
    })),
    unmapped: {
      improvements: unmappedImprovementEntries,
      units: unmappedUnitEntries,
      techs: unmappedTechEntries,
    },
    skippedUnits: skippedUnitEntries,
    coinageFallbacks,
    unitHomecityIssues: sortedReportEntries(unitHomecityIssues),
    transportedUnits: transportedUnitSummary(),
    diplomacy: diplomacySummary(),
    visibility: playerMeta.map((_, playerId) => visibilitySummaryForPlayer(playerId)),
  };
}

let text = fs.readFileSync(templatePath, "utf8");
text = replaceSettings(text, width, height, cities.length);
text = replaceMapSection(text, terrainRows, extraRows, ownerRows, sourceRows);
text = ensurePlayerSections(text);
for (let playerId = 0; playerId < playerMeta.length; playerId++) {
  text = replacePlayerSection(text, playerId, (section) => {
    section = replacePlayerMetadata(section, playerId);
    section = replacePlayerTreasury(section, playerId);
    section = replacePlayerRates(section, playerId);
    section = replacePlayerDiplomacy(section, playerId);
    section = replacePlayerCities(section, playerId, citiesByPlayer[playerId]);
    section = replacePlayerUnits(section, playerId, unitsByPlayer[playerId]);
    section = replacePlayerKnownMap(
      section,
      terrainRows,
      extraRows,
      ownerRows,
      knownRowsForPlayer(playerId),
      visibleFeatureRowsForPlayer(playerId),
    );
    section = ensureFreeciv21_3_1_1PlayerFields(section, playerId);
    return section;
  });
}
text = replaceResearchSection(text);
text = cleanupFreeciv21_3_1_1Save(text);
const validationReport = buildValidationReport();

fs.writeFileSync(outputPath, text);
fs.writeFileSync(compressedOutputPath, zlib.zstdCompressSync(Buffer.from(text, "utf8")));
fs.mkdirSync(path.dirname(validationReportPath), { recursive: true });
fs.writeFileSync(validationReportPath, `${JSON.stringify(validationReport, null, 2)}\n`);
if (unmappedImprovementsReportPath) {
  fs.mkdirSync(path.dirname(unmappedImprovementsReportPath), { recursive: true });
  fs.writeFileSync(
    unmappedImprovementsReportPath,
    `${JSON.stringify(
      {
        freecivBuildingsRuleset: freecivBuildingsRulesetPath,
        improvementMap: improvementMapPath,
        freecivBuildingCount: freecivBuildings.length,
        entries: [...unmappedImprovements.values()].sort((a, b) =>
          a.civ2Name.localeCompare(b.civ2Name) || a.reason.localeCompare(b.reason),
        ),
      },
      null,
      2,
    )}\n`,
  );
}
if (unmappedUnitsReportPath) {
  fs.mkdirSync(path.dirname(unmappedUnitsReportPath), { recursive: true });
  fs.writeFileSync(
    unmappedUnitsReportPath,
    `${JSON.stringify(
      {
        freecivUnitsRuleset: freecivUnitsRulesetPath,
        unitMap: unitMapPath,
        freecivUnitCount: freecivUnits.length,
        entries: [...unmappedUnits.values()].sort((a, b) =>
          a.civ2Name.localeCompare(b.civ2Name) || a.reason.localeCompare(b.reason),
        ),
      },
      null,
      2,
    )}\n`,
  );
}
if (unmappedTechsReportPath) {
  fs.mkdirSync(path.dirname(unmappedTechsReportPath), { recursive: true });
  fs.writeFileSync(
    unmappedTechsReportPath,
    `${JSON.stringify(
      {
        freecivTechsRuleset: freecivTechsRulesetPath,
        techMap: techMapPath,
        freecivTechCount: freecivTechs.length,
        entries: [...unmappedTechs.values()].sort((a, b) =>
          a.civ2Name.localeCompare(b.civ2Name) || a.reason.localeCompare(b.reason),
        ),
      },
      null,
      2,
    )}\n`,
  );
}
if (unitHomecityReportPath) {
  fs.mkdirSync(path.dirname(unitHomecityReportPath), { recursive: true });
  fs.writeFileSync(
    unitHomecityReportPath,
    `${JSON.stringify(
      {
        notes: [
          "Only same-owner converted cities are assigned as Freeciv unit homecities.",
          "Units listed here were left unhomed with homecity=0.",
        ],
        entries: [...unitHomecityIssues.values()].sort((a, b) =>
          a.civ2Name.localeCompare(b.civ2Name) || a.reason.localeCompare(b.reason),
        ),
      },
      null,
      2,
    )}\n`,
  );
}

console.log(`Wrote ${outputPath}`);
console.log(`Wrote ${compressedOutputPath}`);
console.log(`Wrote ${validationReportPath}`);
if (unmappedImprovementsReportPath) console.log(`Wrote ${unmappedImprovementsReportPath}`);
if (unmappedUnitsReportPath) console.log(`Wrote ${unmappedUnitsReportPath}`);
if (unmappedTechsReportPath) console.log(`Wrote ${unmappedTechsReportPath}`);
if (unitHomecityReportPath) console.log(`Wrote ${unitHomecityReportPath}`);
for (let playerId = 0; playerId < playerMeta.length; playerId++) {
  const mappedUnitCount = unitsByPlayer[playerId].filter((unit) => {
    const freecivName = unitNameMap[unit.typeName];
    return freecivName && freecivUnitByName.has(freecivName) && unitWillBeWritten(unit);
  }).length;
  console.log(
    `player${playerId} ${playerNameForPlayer(playerMeta[playerId], "")}: ${citiesByPlayer[playerId].length} cities, ${mappedUnitCount} units`,
  );
}
