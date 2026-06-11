const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { TextDecoder } = require("node:util");

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
// Canonical converter output: Freeciv21 V3/native-width ISO map.
// This shape is also the preferred Freeciv target because it preserves the Civ2 map geometry.
const mode = "freeciv21V3";
const nativeV2 = false;
const freeciv21V3 = true;
const freeciv21NativeMode = true;
const nativeWidthMode = true;
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
const freecivGovernmentsRulesetPath = buildConfig.freecivGovernmentsRuleset
  ? resolveConfiguredPath(buildConfigDir, buildConfig.freecivGovernmentsRuleset, "freecivGovernmentsRuleset")
  : freecivBuildingsRulesetPath
    ? path.join(path.dirname(freecivBuildingsRulesetPath), "governments.ruleset")
    : null;
const hasConfiguredFreecivTerrainRuleset = Boolean(buildConfig.freecivTerrainRuleset);
const freecivTerrainRulesetPath = hasConfiguredFreecivTerrainRuleset
  ? resolveConfiguredPath(buildConfigDir, buildConfig.freecivTerrainRuleset, "freecivTerrainRuleset")
  : freecivBuildingsRulesetPath
    ? path.join(path.dirname(freecivBuildingsRulesetPath), "terrain.ruleset")
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
const templateText = fs.readFileSync(templatePath, "utf8");

const cityHeader =
  'c={"y","x","id","original","size","nspe0","nspe1","nspe2","food_stock","shield_stock","history","airlift","was_happy","had_famine","turn_plague","anarchy","rapture","steal","turn_founded","acquire_t","did_buy","did_sell","turn_last_built","name","currently_building_kind","currently_building_name","current_want","changed_from_kind","changed_from_name","before_change_shields","caravan_shields","disbanded_shields","last_turns_shield_surplus","style","city_radius_sq","improvements","wl_length","option0","option1","option2","wlcb","ai.urgency","ai.building_turn","ai.building_wait","ai.founder_turn","ai.founder_want","ai.founder_boat","texai.urgency","texai.building_turn","texai.building_wait","texai.founder_turn","texai.founder_want","texai.founder_boat","citizen0","rally_point_length","rally_point_persistent","rally_point_vigilant","rally_point_orders","rally_point_dirs","rally_point_activities","rally_point_action_vec","rally_point_tgt_vec","rally_point_sub_tgt_vec","cma_enabled","cma_minimal_surplus","cma_minimal_surplus,1","cma_minimal_surplus,2","cma_minimal_surplus,3","cma_minimal_surplus,4","cma_minimal_surplus,5","cma_factor","cma_factor,1","cma_factor,2","cma_factor,3","cma_factor,4","cma_factor,5","max_growth","require_happy","allow_disorder","allow_specialists","happy_factor"';
const unitHeader =
  'u={"id","x","y","facing","nationality","veteran","hp","homecity","type_by_name","activity","activity_count","activity_tgt","changed_from","changed_from_count","changed_from_tgt","done_moving","moves","fuel","born","current_form_turn","battlegroup","go","goto_x","goto_y","server_side_agent","passenger","ferryboat","charge","bodyguard","texaipassenger","texaiferryboat","texaicharge","texaibodyguard","ord_map","ord_city","moved","paradropped","transported_by","carrying","action_decision","action_decision_tile_x","action_decision_tile_y","stay","orders_length","orders_index","orders_repeat","orders_vigilant","orders_list","dir_list","activity_list","action_vec","tgt_vec","sub_tgt_vec"';

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

function descriptionFromFile(descriptionFile, descriptionEncoding = "utf-8") {
  if (typeof descriptionFile !== "string" || !descriptionFile.trim()) return undefined;
  const descriptionPath = path.resolve(buildConfigDir, descriptionFile);
  try {
    const stat = fs.statSync(descriptionPath);
    if (!stat.isFile()) return undefined;
    const decoder = new TextDecoder(descriptionEncoding || "utf-8", { fatal: true });
    return decoder.decode(fs.readFileSync(descriptionPath)).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  } catch {
    return undefined;
  }
}

function scenarioMetadataForMode() {
  const scenario = buildConfig.scenario || {};
  const names = scenario.names || buildConfig.scenarioNames || {};
  const fallbackDescription = scenario.description ?? buildConfig.scenarioDescription;
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
    description: descriptionFromFile(scenario.descriptionFile, scenario.descriptionEncoding) ?? fallbackDescription,
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
    if (player.techOverrides !== undefined) {
      const overrides = player.techOverrides;
      if (overrides === null || Array.isArray(overrides) || typeof overrides !== "object") {
        throw new Error(`Config player ${index} techOverrides must be an object when provided`);
      }
      if (overrides.copyFromOwner !== undefined && !Number.isInteger(overrides.copyFromOwner)) {
        throw new Error(`Config player ${index} techOverrides.copyFromOwner must be an integer ownerCandidate`);
      }
      for (const field of ["add", "remove"]) {
        if (overrides[field] !== undefined && !Array.isArray(overrides[field])) {
          throw new Error(`Config player ${index} techOverrides.${field} must be an array`);
        }
        for (const [techIndex, techName] of (overrides[field] || []).entries()) {
          if (typeof techName !== "string" || !techName.trim()) {
            throw new Error(`Config player ${index} techOverrides.${field}[${techIndex}] must be a non-empty string`);
          }
        }
      }
    }
  }
  return config;
}

const config = readConfig();
let playerMeta = config.players;
let ownerToPlayer = new Map(playerMeta.map((player, playerId) => [player.owner, playerId]));
const civ2FeatureNameAliases = new Map([
  ["river", "rivers"],
  ["rivers", "rivers"],
  ["irrigation", "irrigation"],
  ["mine", "mines"],
  ["mines", "mines"],
  ["farmland", "farmland"],
  ["road", "roads"],
  ["roads", "roads"],
  ["railroad", "railroads"],
  ["railroads", "railroads"],
  ["fort", "fortresses"],
  ["forts", "fortresses"],
  ["fortress", "fortresses"],
  ["fortresses", "fortresses"],
  ["airbase", "airbases"],
  ["airbases", "airbases"],
  ["airfield", "airbases"],
  ["airfields", "airbases"],
  ["airstrip", "airbases"],
  ["airstrips", "airbases"],
  ["pollution", "pollution"],
  ["resource", "resources"],
  ["resources", "resources"],
  ["hut", "huts"],
  ["huts", "huts"],
  ["village", "huts"],
  ["villages", "huts"],
]);
const mapFeatureTransformTargetAliases = new Map([
  ...civ2FeatureNameAliases,
  ["fort", "forts"],
  ["forts", "forts"],
]);
const defaultCiv2FeatureExtraNames = new Map([
  ["rivers", "River"],
  ["irrigation", "Irrigation"],
  ["mines", "Mine"],
  ["farmland", "Farmland"],
  ["roads", "Road"],
  ["railroads", "Railroad"],
  ["forts", "Fort"],
  ["fortresses", "Fortress"],
  ["airbases", "Airbase"],
  ["pollution", "Pollution"],
  ["huts", "Hut"],
]);

function skippedCiv2FeaturesFromConfig(config) {
  const overrides = config.mapFeatureOverrides === undefined ? {} : config.mapFeatureOverrides;
  if (overrides === null || Array.isArray(overrides) || typeof overrides !== "object") {
    throw new Error(`Config ${conversionConfigPath} mapFeatureOverrides must be an object when provided`);
  }
  const skipCiv2Features = overrides.skipCiv2Features === undefined ? [] : overrides.skipCiv2Features;
  const skip = overrides.skip === undefined ? [] : overrides.skip;
  if (!Array.isArray(skipCiv2Features)) {
    throw new Error(`Config ${conversionConfigPath} mapFeatureOverrides.skipCiv2Features must be an array when provided`);
  }
  if (!Array.isArray(skip)) {
    throw new Error(`Config ${conversionConfigPath} mapFeatureOverrides.skip must be an array when provided`);
  }
  return new Set([...skipCiv2Features, ...skip].map((name, index) => {
    if (typeof name !== "string" || !name.trim()) {
      throw new Error(
        `Config ${conversionConfigPath} mapFeatureOverrides skip entry ${index} must be a non-empty string`,
      );
    }
    const normalized = civ2FeatureNameAliases.get(String(name).trim().toLowerCase());
    if (!normalized) {
      throw new Error(
        `Config ${conversionConfigPath} mapFeatureOverrides skip entries have unknown feature "${name}"`,
      );
    }
    return normalized;
  }));
}

const skippedCiv2Features = skippedCiv2FeaturesFromConfig(config);

function mapFeatureTransformsFromConfig(config) {
  const transforms = config.mapFeatureTransforms === undefined ? {} : config.mapFeatureTransforms;
  if (transforms === null || Array.isArray(transforms) || typeof transforms !== "object") {
    throw new Error(`Config ${conversionConfigPath} mapFeatureTransforms must be an object when provided`);
  }
  const replace = transforms.replace === undefined ? {} : transforms.replace;
  if (replace === null || Array.isArray(replace) || typeof replace !== "object") {
    throw new Error(`Config ${conversionConfigPath} mapFeatureTransforms.replace must be an object when provided`);
  }
  const normalized = new Map();
  for (const [fromName, toName] of Object.entries(replace)) {
    if (typeof fromName !== "string" || !fromName.trim()) {
      throw new Error(`Config ${conversionConfigPath} mapFeatureTransforms.replace source feature names must be non-empty strings`);
    }
    if (typeof toName !== "string" || !toName.trim()) {
      throw new Error(`Config ${conversionConfigPath} mapFeatureTransforms.replace.${fromName} must be a non-empty string`);
    }
    const from = civ2FeatureNameAliases.get(fromName.trim().toLowerCase());
    const to = mapFeatureTransformTargetAliases.get(toName.trim().toLowerCase());
    if (!from) {
      throw new Error(`Config ${conversionConfigPath} mapFeatureTransforms.replace has unknown source feature "${fromName}"`);
    }
    if (!to) {
      throw new Error(`Config ${conversionConfigPath} mapFeatureTransforms.replace.${fromName} has unknown target feature "${toName}"`);
    }
    if (from === "resources" || to === "resources") {
      throw new Error(`Config ${conversionConfigPath} mapFeatureTransforms.replace cannot transform resources`);
    }
    if (normalized.has(from)) {
      throw new Error(
        `Config ${conversionConfigPath} mapFeatureTransforms.replace has duplicate source feature "${fromName}" after normalization`,
      );
    }
    if (shouldSkipCiv2Feature(to)) {
      throw new Error(
        `Config ${conversionConfigPath} mapFeatureTransforms.replace.${fromName} targets skipped feature "${toName}"`,
      );
    }
    normalized.set(from, to);
  }
  return normalized;
}

function transformedCiv2FeatureName(featureName) {
  return mapFeatureTransforms.get(featureName) || featureName;
}

const mapFeatureTransforms = mapFeatureTransformsFromConfig(config);
function normalizeTerrainLookupName(name) {
  return name.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function terrainAliasKeys(name) {
  const normalized = normalizeTerrainLookupName(name);
  if (!normalized) return [];
  return [...new Set([normalized, normalized.replace(/\s+/g, "_"), normalized.replace(/\s+/g, "-")])];
}

function parseRulesetString(body, settingName) {
  const match =
    body.match(new RegExp(`^${settingName}\\s*=\\s*_\\("([^"]*)"\\)`, "m")) ||
    body.match(new RegExp(`^${settingName}\\s*=\\s*"([^"]*)"`, "m"));
  return match?.[1] || "";
}

function parseRulesetInteger(body, settingName) {
  const match = body.match(new RegExp(`^${settingName}\\s*=\\s*(-?\\d+)`, "m"));
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function parseFreecivTerrainRuleset(rulesetPath) {
  if (!rulesetPath || !fs.existsSync(rulesetPath)) return [];
  const text = fs.readFileSync(rulesetPath, "utf8").replace(/^\uFEFF/, "");
  return [...text.matchAll(/^\[terrain_([^\]]+)\]([\s\S]*?)(?=^\[terrain_|(?![\s\S]))/gm)]
    .map(([, sectionName, body]) => ({
      section: `terrain_${sectionName}`,
      key: sectionName,
      name: parseRulesetString(body, "name").replace(/^\?[^:]+:/, ""),
      identifier: parseRulesetString(body, "identifier"),
      class: parseRulesetString(body, "class"),
      irrigationResult: parseRulesetString(body, "irrigation_result"),
      irrigationFoodIncr: parseRulesetInteger(body, "irrigation_food_incr"),
      miningResult: parseRulesetString(body, "mining_result"),
      miningShieldIncr: parseRulesetInteger(body, "mining_shield_incr"),
      resources: parseQuotedListSetting(body, "resources"),
    }))
    .filter((terrain) => terrain.name && terrain.identifier);
}

function parseFreecivResourceRuleset(rulesetPath) {
  if (!rulesetPath || !fs.existsSync(rulesetPath)) return [];
  const text = fs.readFileSync(rulesetPath, "utf8").replace(/^\uFEFF/, "");
  return [...text.matchAll(/^\[resource_([^\]]+)\]([\s\S]*?)(?=^\[|$(?![\s\S]))/gm)]
    .map(([, sectionName, body]) => ({
      section: `resource_${sectionName}`,
      key: sectionName,
      extra: parseRulesetString(body, "extra"),
      identifier: parseRulesetString(body, "identifier"),
    }))
    .filter((resource) => resource.extra);
}

const legacyTerrainNameAliases = new Map([
  ["a", "a"],
  ["arctic", "a"],
  ["glacier", "a"],
  ["d", "d"],
  ["desert", "d"],
  ["f", "f"],
  ["forest", "f"],
  ["g", "g"],
  ["grassland", "g"],
  ["grass", "g"],
  ["h", "h"],
  ["hill", "h"],
  ["hills", "h"],
  ["j", "j"],
  ["jungle", "j"],
  ["m", "m"],
  ["mountain", "m"],
  ["mountains", "m"],
  ["o", "o"],
  ["ocean", "o"],
  ["p", "p"],
  ["plain", "p"],
  ["plains", "p"],
  ["s", "s"],
  ["swamp", "s"],
  ["t", "t"],
  ["tundra", "t"],
]);
const legacyTargetTerrainNameAliases = new Map([
  ...legacyTerrainNameAliases,
  ["ocean", " "],
  ["inaccessible", "i"],
  ["lake", "+"],
  ["lakes", "+"],
]);
const legacyLandTerrainIdentifiers = ["a", "d", "f", "g", "h", "j", "m", "p", "s", "t"];
const legacyIrrigableTerrainIdentifiers = ["d", "g", "h", "p", "s"];
const legacyMineableTerrainIdentifiers = ["a", "d", "h", "m", "t"];
const terrainCompatibilityAliases = new Map([
  ["arctic", "glacier"],
  ["grass", "grassland"],
  ["hill", "hills"],
  ["mountain", "mountains"],
  ["plain", "plains"],
  ["lakes", "lake"],
]);
const freecivTerrains = parseFreecivTerrainRuleset(freecivTerrainRulesetPath);
if (hasConfiguredFreecivTerrainRuleset && freecivTerrains.length === 0) {
  throw new Error(`Configured freecivTerrainRuleset ${freecivTerrainRulesetPath} did not contain any terrain definitions`);
}
const freecivResources = parseFreecivResourceRuleset(freecivTerrainRulesetPath);
const legacyResourcesByTerrainIdentifier = new Map([
  ["a", ["Ivory", "Oil"]],
  ["d", ["Oasis", "Oil"]],
  ["f", ["Pheasant", "Silk"]],
  ["g", ["Resources"]],
  ["h", ["Coal", "Wine"]],
  ["j", ["Gems", "Fruit"]],
  ["m", ["Gold", "Iron"]],
  ["p", ["Buffalo", "Wheat"]],
  ["s", ["Peat", "Spice"]],
  ["t", ["Game", "Furs"]],
  [" ", ["Fish", "Whales"]],
  ["o", ["Fish", "Whales"]],
  [":", ["Fish", "Whales"]],
]);
function addTerrainLookupEntry(map, key, identifier) {
  if (!key || identifier === undefined || identifier === null) return;
  for (const aliasKey of terrainAliasKeys(key)) {
    map.set(aliasKey, identifier);
  }
}

function buildTerrainNameAliases(targetOnlyNames = []) {
  const aliases = new Map(legacyTerrainNameAliases);
  const targetOnly = new Set(targetOnlyNames.map(normalizeTerrainLookupName));
  for (const terrain of freecivTerrains) {
    const keys = [terrain.key, terrain.name, terrain.identifier];
    if (targetOnly.has(normalizeTerrainLookupName(terrain.key)) || targetOnly.has(normalizeTerrainLookupName(terrain.name))) {
      continue;
    }
    for (const key of keys) addTerrainLookupEntry(aliases, key, terrain.identifier);
  }
  for (const [alias, canonical] of terrainCompatibilityAliases) {
    const identifier = aliases.get(normalizeTerrainLookupName(canonical));
    if (identifier) addTerrainLookupEntry(aliases, alias, identifier);
  }
  return aliases;
}

function buildTargetTerrainNameAliases() {
  const aliases = new Map(legacyTargetTerrainNameAliases);
  for (const terrain of freecivTerrains) {
    for (const key of [terrain.key, terrain.name, terrain.identifier]) {
      addTerrainLookupEntry(aliases, key, terrain.identifier);
    }
  }
  for (const [alias, canonical] of terrainCompatibilityAliases) {
    const identifier = aliases.get(normalizeTerrainLookupName(canonical));
    if (identifier) addTerrainLookupEntry(aliases, alias, identifier);
  }
  return aliases;
}

const terrainNameAliases = buildTerrainNameAliases(["inaccessible", "inaccesible"]);
const targetTerrainNameAliases = buildTargetTerrainNameAliases();

function terrainIdentifiersMatching(predicate) {
  return [...new Set(freecivTerrains.filter(predicate).map((terrain) => terrain.identifier))].sort();
}

function isOceanicTerrain(terrain) {
  return normalizeTerrainLookupName(terrain.class) === "oceanic";
}

function isInaccessibleTerrain(terrain) {
  return ["inaccessible", "inaccesible"].includes(normalizeTerrainLookupName(terrain.name))
    || ["inaccessible", "inaccesible"].includes(normalizeTerrainLookupName(terrain.key));
}

function buildLandTerrains() {
  const dynamicLandTerrains = terrainIdentifiersMatching((terrain) => !isOceanicTerrain(terrain) && !isInaccessibleTerrain(terrain));
  return new Set(dynamicLandTerrains.length > 0 ? dynamicLandTerrains : legacyLandTerrainIdentifiers);
}

function terrainResultAllowsImprovement(result) {
  return Boolean(result) && normalizeTerrainLookupName(result) !== "no";
}

function buildIrrigableTerrains() {
  const dynamicIrrigableTerrains = terrainIdentifiersMatching((terrain) =>
    terrainResultAllowsImprovement(terrain.irrigationResult) || (terrain.irrigationFoodIncr || 0) > 0,
  );
  return new Set(dynamicIrrigableTerrains.length > 0 ? dynamicIrrigableTerrains : legacyIrrigableTerrainIdentifiers);
}

function buildMineableTerrains() {
  const dynamicMineableTerrains = terrainIdentifiersMatching((terrain) =>
    terrainResultAllowsImprovement(terrain.miningResult) || (terrain.miningShieldIncr || 0) > 0,
  );
  return new Set(dynamicMineableTerrains.length > 0 ? dynamicMineableTerrains : legacyMineableTerrainIdentifiers);
}

function terrainIdentifierByName(name, fallback) {
  return targetTerrainNameAliases.get(normalizeTerrainLookupName(name)) || fallback;
}

function terrainOverridesFromConfig(config) {
  const overrides = config.terrainOverrides === undefined ? {} : config.terrainOverrides;
  if (overrides === null || Array.isArray(overrides) || typeof overrides !== "object") {
    throw new Error(`Config ${conversionConfigPath} terrainOverrides must be an object when provided`);
  }
  const replace = overrides.replace === undefined ? {} : overrides.replace;
  if (replace === null || Array.isArray(replace) || typeof replace !== "object") {
    throw new Error(`Config ${conversionConfigPath} terrainOverrides.replace must be an object when provided`);
  }
  const normalized = new Map();
  for (const [fromName, replacementConfig] of Object.entries(replace)) {
    if (typeof fromName !== "string" || !fromName.trim()) {
      throw new Error(`Config ${conversionConfigPath} terrainOverrides.replace source terrain names must be non-empty strings`);
    }
    const replacementPath = `terrainOverrides.replace.${fromName}`;
    let toName = replacementConfig;
    let addFeatureNames = [];
    if (replacementConfig !== null && !Array.isArray(replacementConfig) && typeof replacementConfig === "object") {
      toName = replacementConfig.terrain;
      addFeatureNames = replacementConfig.add === undefined ? [] : replacementConfig.add;
      if (!Array.isArray(addFeatureNames)) {
        throw new Error(`Config ${conversionConfigPath} ${replacementPath}.add must be an array when provided`);
      }
    } else if (replacementConfig !== null && typeof replacementConfig === "object") {
      throw new Error(`Config ${conversionConfigPath} ${replacementPath} must be a non-empty string or an object`);
    }
    if (typeof toName !== "string" || !toName.trim()) {
      throw new Error(`Config ${conversionConfigPath} ${replacementPath} must define a non-empty target terrain`);
    }
    const from = terrainNameAliases.get(fromName.trim().toLowerCase());
    const to = targetTerrainNameAliases.get(toName.trim().toLowerCase());
    if (!from) {
      throw new Error(`Config ${conversionConfigPath} terrainOverrides.replace has unknown source terrain "${fromName}"`);
    }
    if (!to) {
      throw new Error(`Config ${conversionConfigPath} terrainOverrides.replace.${fromName} has unknown target terrain "${toName}"`);
    }
    const add = addFeatureNames.map((featureName, index) => {
      if (typeof featureName !== "string" || !featureName.trim()) {
        throw new Error(`Config ${conversionConfigPath} ${replacementPath}.add[${index}] must be a non-empty string`);
      }
      const normalizedFeatureName = mapFeatureTransformTargetAliases.get(featureName.trim().toLowerCase());
      if (!normalizedFeatureName) {
        throw new Error(`Config ${conversionConfigPath} ${replacementPath}.add has unknown feature "${featureName}"`);
      }
      if (normalizedFeatureName === "resources") {
        throw new Error(`Config ${conversionConfigPath} ${replacementPath}.add cannot add resources`);
      }
      return normalizedFeatureName;
    });
    if (normalized.has(from)) {
      throw new Error(
        `Config ${conversionConfigPath} terrainOverrides.replace has duplicate source terrain "${fromName}" after normalization`,
      );
    }
    normalized.set(from, { terrain: to, add: [...new Set(add)] });
  }
  return normalized;
}

const terrainOverrides = terrainOverridesFromConfig(config);
const appliedTerrainOverrides = [];
const pendingTerrainOverrideFeatureAdds = [];
const appliedTerrainOverrideFeatureAdds = [];

function resourceOverridesFromConfig(config) {
  const overrides = config.resourceOverrides === undefined ? {} : config.resourceOverrides;
  if (overrides === null || Array.isArray(overrides) || typeof overrides !== "object") {
    throw new Error(`Config ${conversionConfigPath} resourceOverrides must be an object when provided`);
  }
  const remove = overrides.remove === undefined ? [] : overrides.remove;
  if (!Array.isArray(remove)) {
    throw new Error(`Config ${conversionConfigPath} resourceOverrides.remove must be an array when provided`);
  }
  const normalized = new Set();
  for (const [index, resourceName] of remove.entries()) {
    if (typeof resourceName !== "string" || !resourceName.trim()) {
      throw new Error(`Config ${conversionConfigPath} resourceOverrides.remove[${index}] must be a non-empty string`);
    }
    const normalizedName = resourceNameAliases.get(resourceName.trim().toLowerCase());
    if (!normalizedName) {
      throw new Error(`Config ${conversionConfigPath} resourceOverrides.remove has unknown resource "${resourceName}"`);
    }
    normalized.add(normalizedName);
  }
  return normalized;
}

function countAppliedResourceOverride(section, resourceName) {
  appliedResourceOverrides[section][resourceName] = (appliedResourceOverrides[section][resourceName] || 0) + 1;
}

function countAppliedResourceSlotConversion(originalResourceName, convertedResourceName) {
  if (!originalResourceName || !convertedResourceName || originalResourceName === convertedResourceName) return;
  const key = `${originalResourceName}->${convertedResourceName}`;
  appliedResourceOverrides.slotConversions[key] = (appliedResourceOverrides.slotConversions[key] || 0) + 1;
}

const cityImprovementOverrides = config.cityImprovementOverrides === undefined ? {} : config.cityImprovementOverrides;
if (
  cityImprovementOverrides === null
  || Array.isArray(cityImprovementOverrides)
  || typeof cityImprovementOverrides !== "object"
) {
  throw new Error(`Config ${conversionConfigPath} cityImprovementOverrides must be an object when provided`);
}
for (const [cityName, override] of Object.entries(cityImprovementOverrides)) {
  if (override === null || Array.isArray(override) || typeof override !== "object") {
    throw new Error(`Config ${conversionConfigPath} cityImprovementOverrides.${cityName} must be an object`);
  }
  for (const field of ["add", "remove"]) {
    if (override[field] !== undefined && !Array.isArray(override[field])) {
      throw new Error(`Config ${conversionConfigPath} cityImprovementOverrides.${cityName}.${field} must be an array`);
    }
    for (const [index, improvementName] of (override[field] || []).entries()) {
      if (typeof improvementName !== "string" || !improvementName.trim()) {
        throw new Error(
          `Config ${conversionConfigPath} cityImprovementOverrides.${cityName}.${field}[${index}] must be a non-empty string`,
        );
      }
    }
  }
}
const appliedCityImprovementOverrides = [];
const cityImprovementOverrideUseCounts = new Map(
  Object.keys(cityImprovementOverrides).map((cityName) => [cityName, 0]),
);

function shouldSkipCiv2Feature(featureName) {
  return skippedCiv2Features.has(featureName);
}

const improvementNameMap = improvementMapPath ? readJson(improvementMapPath) : {};
const unitNameMap = unitMapPath ? readJson(unitMapPath) : {};
const techNameMap = techMapPath ? readJson(techMapPath) : {};
const governmentNameMap = governmentMapPath ? readJson(governmentMapPath) : {};
const unmappedImprovements = new Map();
const unmappedUnits = new Map();
const unmappedTechs = new Map();
const unitHomecityIssues = new Map();
const coinageFallbacks = [];
const appliedPlayerTechOverrides = [];
const mappedTechsForPlayerCache = new Map();
const intentionallySkippedUnitInstanceKeys = new Set();
const mappedButUnplacedUnitInstanceKeys = new Set();

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
    if (/^\[[^\]]+\]/.test(line)) break;
    if (!line.trim() || line.trim().startsWith(";")) break;
    if (/^[A-Za-z_][A-Za-z0-9_]*\s*=/.test(line)) break;
    collected.push(line);
  }
  return [...collected.join("\n").matchAll(/"([^"]+)"/g)].map(([, value]) => value);
}

function parseFreecivUnitClassesRuleset(rulesetPath) {
  if (!rulesetPath) return [];
  const text = fs.readFileSync(rulesetPath, "utf8").replace(/^\uFEFF/, "");
  return [...text.matchAll(/^\[unitclass_([^\]]+)\]([\s\S]*?)(?=^\[unitclass_|^\[unit_|(?![\s\S]))/gm)].map(
    ([, sectionName, body]) => {
      const nameMatch =
        body.match(/^name\s*=\s*_\("(?:\?unitclass:)?([^"]+)"\)/m) ||
        body.match(/^name\s*=\s*"([^"]+)"/m);
      const ruleNameMatch = body.match(/^rule_name\s*=\s*"([^"]+)"/m);
      const moveTypeMatch = body.match(/^move_type\s*=\s*"([^"]+)"/m);
      const displayName = nameMatch?.[1] || "";
      return {
        section: `unitclass_${sectionName}`,
        name: displayName,
        ruleName: ruleNameMatch?.[1] || displayName,
        moveType: moveTypeMatch?.[1] || "",
        flags: parseQuotedListSetting(body, "flags"),
      };
    },
  );
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

function parseFreecivGovernmentsRuleset(rulesetPath) {
  if (!rulesetPath || !fs.existsSync(rulesetPath)) return [];
  const text = fs.readFileSync(rulesetPath, "utf8").replace(/^\uFEFF/, "");
  return [...text.matchAll(/^\[government_([^\]]+)\]([\s\S]*?)(?=^\[government_|(?![\s\S]))/gm)].map(
    ([, sectionName, body]) => {
      const nameMatch =
        body.match(/^name\s*=\s*_\("([^"]+)"\)/m) || body.match(/^name\s*=\s*"([^"]+)"/m);
      const ruleNameMatch = body.match(/^rule_name\s*=\s*"([^"]+)"/m);
      const displayName = normalizeTranslatedName(nameMatch?.[1] || "");
      return {
        section: `government_${sectionName}`,
        name: displayName,
        ruleName: ruleNameMatch?.[1] || displayName,
      };
    },
  );
}

const freecivBuildings = parseFreecivBuildingsRuleset(freecivBuildingsRulesetPath);
const freecivBuildingIndexByName = new Map();
const freecivBuildingByName = new Map();
for (const building of freecivBuildings) {
  for (const key of [building.ruleName, building.name]) {
    if (key && !freecivBuildingIndexByName.has(key)) {
      freecivBuildingIndexByName.set(key, building.index);
    }
    if (key && !freecivBuildingByName.has(key)) {
      freecivBuildingByName.set(key, building);
    }
  }
}
const noImprovements = "0".repeat(freecivBuildings.length || 73);

const freecivUnitClasses = parseFreecivUnitClassesRuleset(freecivUnitsRulesetPath);
const freecivUnitClassByName = new Map();
for (const unitClass of freecivUnitClasses) {
  for (const key of [unitClass.ruleName, unitClass.name]) {
    if (key && !freecivUnitClassByName.has(key)) {
      freecivUnitClassByName.set(key, unitClass);
    }
  }
}
const fallbackLandUnitClasses = new Set(["Land", "Small Land", "Big Land", "Merchant"]);
const fallbackAirUnitClasses = new Set(["Air", "Helicopter", "Missile"]);

const freecivUnits = parseFreecivUnitsRuleset(freecivUnitsRulesetPath);
const freecivUnitByName = new Map();
for (const unit of freecivUnits) {
  for (const key of [unit.ruleName, unit.name]) {
    if (key && !freecivUnitByName.has(key)) {
      freecivUnitByName.set(key, unit);
    }
  }
}

function unitClassRecord(unitClassName) {
  return freecivUnitClassByName.get(unitClassName);
}

function unitClassFlags(unitClassName) {
  return new Set(unitClassRecord(unitClassName)?.flags || []);
}

function isLandUnitClass(unitClassName) {
  const unitClass = unitClassRecord(unitClassName);
  if (unitClass?.moveType) return unitClass.moveType === "Land";
  const flags = unitClassFlags(unitClassName);
  if (flags.has("Ground")) return true;
  return fallbackLandUnitClasses.has(unitClassName);
}

function isAirUnitClass(unitClassName) {
  const unitClass = unitClassRecord(unitClassName);
  if (unitClass?.moveType) return unitClass.moveType === "Air";
  const flags = unitClassFlags(unitClassName);
  if (flags.has("Aerial") || flags.has("Missile")) return true;
  return fallbackAirUnitClasses.has(unitClassName);
}

function isLandUnitType(unitType) {
  return isLandUnitClass(unitType?.unitClass || "");
}

const freecivTechs = parseFreecivTechsRuleset(freecivTechsRulesetPath);
const freecivTechByName = new Map();
for (const tech of freecivTechs) {
  for (const key of [tech.ruleName, tech.name]) {
    if (key && !freecivTechByName.has(key)) {
      freecivTechByName.set(key, tech);
    }
  }
}
const freecivGovernments = parseFreecivGovernmentsRuleset(freecivGovernmentsRulesetPath);
const freecivGovernmentByName = new Map();
for (const government of freecivGovernments) {
  for (const key of [government.ruleName, government.name]) {
    if (key && !freecivGovernmentByName.has(key)) {
      freecivGovernmentByName.set(key, government);
    }
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

function resolveImprovementForCity(cityName, sourceName, reasonPrefix) {
  const mappedName = Object.prototype.hasOwnProperty.call(improvementNameMap, sourceName)
    ? improvementNameMap[sourceName]
    : sourceName;
  if (!mappedName) {
    noteUnmappedImprovement(cityName, sourceName, `${reasonPrefix} intentionally skipped`);
    return null;
  }
  const building = freecivBuildingByName.get(mappedName);
  if (!building) {
    noteUnmappedImprovement(cityName, sourceName, `${reasonPrefix} Freeciv building not found: ${mappedName}`);
    return null;
  }
  return {
    sourceName,
    mappedName,
    ruleName: building.ruleName,
    index: building.index,
  };
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

function unitInstanceKey(unit) {
  if (Number.isInteger(unit.index)) return `index:${unit.index}`;
  return `${unit.ownerCandidate ?? "?"}:${unit.typeIndex ?? unit.typeName ?? "?"}:${unit.rawX ?? unit.x ?? "?"},${unit.rawY ?? unit.y ?? "?"}`;
}

function noteIntentionallySkippedUnitInstance(unit) {
  intentionallySkippedUnitInstanceKeys.add(unitInstanceKey(unit));
}

function noteMappedButUnplacedUnitInstance(unit) {
  mappedButUnplacedUnitInstanceKeys.add(unitInstanceKey(unit));
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

function normalizeUnitMapActivity(activity, civ2Name) {
  if (activity === undefined) return undefined;
  if (typeof activity !== "string" || !activity.trim()) {
    throw new Error(`Unit map entry "${civ2Name}" activity must be a non-empty string when provided`);
  }
  const normalized = activity.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const activityAliases = new Map([
    ["idle", "Idle"],
    ["none", "Idle"],
    ["sentry", "Sentry"],
    ["sleep", "Sentry"],
    ["sleeping", "Sentry"],
    ["fortified", "Fortified"],
    ["fortify", "Fortifying"],
    ["fortifying", "Fortifying"],
  ]);
  const freecivActivity = activityAliases.get(normalized);
  if (!freecivActivity) {
    throw new Error(
      `Unit map entry "${civ2Name}" activity must be one of idle, sentry, fortified, or fortifying`,
    );
  }
  return freecivActivity;
}

function normalizeUnitMapVeteran(veteran, civ2Name) {
  if (veteran === undefined) return undefined;
  if (!Number.isInteger(veteran) || veteran < 0 || veteran > 3) {
    throw new Error(`Unit map entry "${civ2Name}" veteran must be an integer from 0 to 3 when provided`);
  }
  return veteran;
}

function unitMapEntryFor(civ2Name) {
  if (!Object.prototype.hasOwnProperty.call(unitNameMap, civ2Name)) return null;
  const entry = unitNameMap[civ2Name];
  if (typeof entry === "string") {
    return {
      freecivName: entry,
      activity: undefined,
      veteran: undefined,
    };
  }
  if (entry === null || Array.isArray(entry) || typeof entry !== "object") {
    throw new Error(`Unit map entry "${civ2Name}" must be a string or an object`);
  }
  if (!Object.prototype.hasOwnProperty.call(entry, "unit")) {
    throw new Error(`Unit map entry "${civ2Name}" object must include a unit field`);
  }
  if (typeof entry.unit !== "string") {
    throw new Error(`Unit map entry "${civ2Name}" unit must be a string`);
  }
  return {
    freecivName: entry.unit,
    activity: normalizeUnitMapActivity(entry.activity, civ2Name),
    veteran: normalizeUnitMapVeteran(entry.veteran, civ2Name),
  };
}

function applyUnitMapOverrides(unit, mapEntry) {
  if (mapEntry.activity === undefined && mapEntry.veteran === undefined) {
    delete unit.unitMapOverrides;
    return;
  }
  unit.unitMapOverrides = {};
  if (mapEntry.activity !== undefined) unit.unitMapOverrides.activity = mapEntry.activity;
  if (mapEntry.veteran !== undefined) unit.unitMapOverrides.veteran = mapEntry.veteran;
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

function resolveTechForPlayer(ownerCandidate, sourceName, reasonPrefix) {
  const mappedName = Object.prototype.hasOwnProperty.call(techNameMap, sourceName)
    ? techNameMap[sourceName]
    : sourceName;
  if (!mappedName) {
    noteUnmappedTech(ownerCandidate, sourceName, `${reasonPrefix} intentionally skipped`);
    return null;
  }
  const tech = freecivTechByName.get(mappedName);
  if (!tech) {
    noteUnmappedTech(ownerCandidate, sourceName, `${reasonPrefix} Freeciv tech not found`, mappedName);
    return null;
  }
  return {
    sourceName,
    mappedName,
    ruleName: tech.ruleName,
  };
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
  if (!freecivBuildings.length) return noImprovements;
  const bits = Array(freecivBuildings.length).fill("0");
  for (const improvement of city.improvements || []) {
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
    const building = freecivBuildingByName.get(freecivName);
    if (!building) {
      noteUnmappedImprovement(city.name, civ2Name, `Freeciv building not found: ${freecivName}`);
      continue;
    }
    bits[building.index] = "1";
  }
  const override = cityImprovementOverrides[city.name];
  if (override) {
    cityImprovementOverrideUseCounts.set(city.name, (cityImprovementOverrideUseCounts.get(city.name) || 0) + 1);
    for (const sourceName of override.remove || []) {
      const resolved = resolveImprovementForCity(city.name, sourceName, "manual remove");
      if (!resolved) continue;
      bits[resolved.index] = "0";
      appliedCityImprovementOverrides.push({
        city: city.name,
        action: "remove",
        sourceName: resolved.sourceName,
        mappedName: resolved.mappedName,
        ruleName: resolved.ruleName,
      });
    }
    for (const sourceName of override.add || []) {
      const resolved = resolveImprovementForCity(city.name, sourceName, "manual add");
      if (!resolved) continue;
      bits[resolved.index] = "1";
      appliedCityImprovementOverrides.push({
        city: city.name,
        action: "add",
        sourceName: resolved.sourceName,
        mappedName: resolved.mappedName,
        ruleName: resolved.ruleName,
      });
    }
  }
  return bits.join("");
}

function mapUnitType(unit) {
  const civ2Name = unit.typeName;
  const mapEntry = unitMapEntryFor(civ2Name);
  if (!mapEntry) {
    noteUnmappedUnit(unit, "missing from unit map");
    return null;
  }
  const freecivName = mapEntry.freecivName;
  if (!freecivName) {
    noteIntentionallySkippedUnitInstance(unit);
    noteUnmappedUnit(unit, "intentionally skipped");
    return null;
  }
  const freecivUnit = freecivUnitByName.get(freecivName);
  if (!freecivUnit) {
    noteUnmappedUnit(unit, `Freeciv unit not found: ${freecivName}`);
    return null;
  }
  applyUnitMapOverrides(unit, mapEntry);
  return freecivUnit;
}

function cityProduction(city) {
  const production = city.currentProduction;
  let fallbackReason = production?.kind || production?.civ2Name
    ? "current production was not mapped"
    : "no current production decoded";
  if (production?.kind === "UnitType" && production.civ2Name) {
    const mapEntry = unitMapEntryFor(production.civ2Name);
    if (!mapEntry) {
      noteUnmappedUnitProduction(city.name, production.civ2Name, "production missing from unit map");
      fallbackReason = "unit production missing from unit map";
    } else {
      const freecivName = mapEntry.freecivName;
      if (!freecivName) {
        noteUnmappedUnitProduction(city.name, production.civ2Name, "production intentionally skipped");
        fallbackReason = "unit production intentionally skipped";
      } else {
        const freecivUnit = freecivUnitByName.get(freecivName);
        if (!freecivUnit) {
          noteUnmappedUnitProduction(city.name, production.civ2Name, `production Freeciv unit not found: ${freecivName}`);
          fallbackReason = `mapped Freeciv unit not found: ${freecivName}`;
        } else {
          return { kind: "UnitType", name: freecivUnit.ruleName };
        }
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
      } else {
        const building = freecivBuildingByName.get(freecivName);
        if (!building) {
          noteUnmappedImprovement(city.name, production.civ2Name, `production Freeciv building not found: ${freecivName}`);
          fallbackReason = `mapped Freeciv building not found: ${freecivName}`;
        } else {
          return { kind: "Building", name: building.ruleName };
        }
      }
    }
  }
  const fallback = productionFallback();
  coinageFallbacks.push({
    city: city.name,
    ownerCandidate: city.ownerCandidate,
    civ2Kind: production?.kind || "",
    civ2Name: production?.civ2Name || "",
    reason: fallbackReason,
    fallbackKind: fallback.kind,
    fallbackName: fallback.name,
  });
  return fallback;
}

function isCoinageFallbackTargetRuleset() {
  const coinageFallbackRulesets = new Set(["civ2civ3", "classic"]);
  return [freecivBuildingsRulesetPath, freecivUnitsRulesetPath, freecivTechsRulesetPath]
    .filter(Boolean)
    .some((rulesetPath) => rulesetPath.split(/[\\/]+/).some((part) => coinageFallbackRulesets.has(part.toLowerCase())));
}

function productionFallback() {
  if (isCoinageFallbackTargetRuleset()) {
    const building = freecivBuildingByName.get("Coinage");
    return { kind: "Building", name: building?.ruleName || "Coinage" };
  }
  const unit = freecivUnitByName.get("Settlers");
  return { kind: "UnitType", name: unit?.ruleName || "Settlers" };
}

const landTerrains = buildLandTerrains();
const grasslandTerrainIdentifier = terrainIdentifierByName("grassland", "g");
const plainsTerrainIdentifier = terrainIdentifierByName("plains", "p");
const irrigableTerrains = buildIrrigableTerrains();
const mineableTerrains = buildMineableTerrains();
const freeciv32ExtraNames = [
  "Irrigation", "Mine", "Oil Well", "Oil Platform", "Pollution", "Hut", "Farmland", "Fallout",
  "Fort", "Fortress", "Airstrip", "Airbase", "Buoy", "Ruins", "Road", "Railroad",
  "Maglev", "River", "Gold", "Iron", "Game", "Furs", "Coal", "Fish", "Fruit", "Gems",
  "Buffalo", "Wheat", "Oasis", "Peat", "Pheasant", "Resources", "Ivory", "Silk",
  "Spice", "Whales", "Wine", "Oil",
];

function parseTemplateExtraVector(text) {
  const match = text.match(/^extras_vector=(.*)$/m);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]*)"/g)].map(([, name]) => name);
}

function parseTemplateActivitiesVector(text) {
  const match = text.match(/^activities_vector=(.*)$/m);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]*)"/g)].map(([, name]) => name);
}

const templateExtraNames = parseTemplateExtraVector(templateText);
const targetExtraNames = templateExtraNames.length > 0 ? templateExtraNames : freeciv32ExtraNames;
const extraIndex = Object.fromEntries(targetExtraNames.map((name, index) => [name, index]));
const extraNameByNormalizedName = new Map(targetExtraNames.map((name) => [name.trim().toLowerCase(), name]));
const templateActivityNames = parseTemplateActivitiesVector(templateText);
const fallbackActivityIds = {
  Idle: 0,
  Fortified: 4,
  Sentry: 5,
  Fortifying: 10,
};
const activityIds = templateActivityNames.length > 0
  ? Object.fromEntries(templateActivityNames.map((name, index) => [name, index]))
  : fallbackActivityIds;

function resolveTargetExtraName(extraName) {
  if (extraIndex[extraName] !== undefined) return extraName;
  return extraNameByNormalizedName.get(extraName.trim().toLowerCase()) || null;
}

function validateCiv2FeatureExtraNames(defaults) {
  const resolved = new Map();
  const missing = [];
  for (const [featureName, extraName] of defaults) {
    const targetExtraName = resolveTargetExtraName(extraName);
    if (targetExtraName) {
      resolved.set(featureName, targetExtraName);
    } else {
      missing.push({ featureName, extraName });
    }
  }
  return { resolved, missing };
}

const validatedCiv2FeatureExtras = validateCiv2FeatureExtraNames(defaultCiv2FeatureExtraNames);
const civ2FeatureExtraNames = validatedCiv2FeatureExtras.resolved;
const missingCiv2FeatureExtraNames = validatedCiv2FeatureExtras.missing;
const legacyResourceNames = [...new Set([...legacyResourcesByTerrainIdentifier.values()].flat())];

function resourcesFromResourceRuleset() {
  return [...new Set(freecivResources.map((resource) => resource.extra))]
    .filter((name) => extraIndex[name] !== undefined)
    .sort((a, b) => a.localeCompare(b));
}

const rulesetResourceNames = resourcesFromResourceRuleset();
const rulesetResourceNamesMissingFromExtras = [...new Set(freecivResources.map((resource) => resource.extra))]
  .filter((name) => extraIndex[name] === undefined)
  .sort((a, b) => a.localeCompare(b));
const targetResourceNames = rulesetResourceNames.length > 0
  ? rulesetResourceNames
  : legacyResourceNames.filter((name) => extraIndex[name] !== undefined);
const targetResourceNameSet = new Set(targetResourceNames);

function filteredTerrainResources(resources) {
  return (resources || []).filter((name) => targetResourceNameSet.has(name));
}

const dynamicResourcesByTerrainIdentifier = new Map(
  freecivTerrains
    .map((terrain) => [terrain.identifier, filteredTerrainResources(terrain.resources)])
    .filter(([, resources]) => resources.length > 0),
);
const resourcesByTerrainIdentifier = new Map([
  ...legacyResourcesByTerrainIdentifier,
  ...dynamicResourcesByTerrainIdentifier,
]);

function buildResourceNameAliases() {
  const aliases = new Map();
  for (const resourceName of targetResourceNames) {
    aliases.set(resourceName.trim().toLowerCase(), resourceName);
  }
  const compatibilityAliases = new Map([
    ["fur", "Furs"],
    ["gem", "Gems"],
    ["resource", "Resources"],
    ["whale", "Whales"],
  ]);
  for (const [alias, resourceName] of compatibilityAliases) {
    if (targetResourceNameSet.has(resourceName)) aliases.set(alias, resourceName);
  }
  return aliases;
}

const resourceNameAliases = buildResourceNameAliases();
const removedResources = resourceOverridesFromConfig(config);
const appliedResourceOverrides = {
  global: {},
  visibility: {},
  slotConversions: {},
  skippedSparseGrasslandResources: false,
  grasslandShields: {
    source: "extracted.features.grasslandShields",
    global: {
      extracted: 0,
      written: 0,
      alreadyPresent: 0,
      skippedMissingExtra: 0,
      skippedRemovedResource: 0,
      skippedNonGrassland: 0,
      skippedUnknownTile: 0,
    },
    visibility: {
      extracted: 0,
      written: 0,
      alreadyPresent: 0,
      skippedMissingExtra: 0,
      skippedRemovedResource: 0,
      skippedNonGrassland: 0,
      skippedUnknownTile: 0,
    },
  },
};

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
  const improvements = cityImprovementString(city);
  city.freecivImprovementString = improvements;
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
    csvEscape(improvements),
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
  return activityIds[activity] ?? fallbackActivityIds[activity] ?? 0;
}

function unitFreecivActivity(unit) {
  return unit.unitMapOverrides?.activity || unit.activity?.freecivActivity || "Idle";
}

function parseCiv2MoveRate(raw) {
  if (typeof raw !== "string") return null;
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)/);
  return match ? Number.parseFloat(match[1]) : null;
}

function unitMoveState(unit, freecivUnit) {
  const freecivFullMoves = Math.max(0, (freecivUnit.moveRate || 0) * 6);
  const activity = unitFreecivActivity(unit);
  if (freecivFullMoves === 0) {
    return { moves: 0, doneMoving: "TRUE", moved: "FALSE" };
  }
  return { moves: freecivFullMoves, doneMoving: activity === "Idle" ? "FALSE" : "TRUE", moved: "FALSE" };

  const civ2MoveRate = parseCiv2MoveRate(unit.civ2UnitType?.moveRaw);
  const civ2FullMoves = civ2MoveRate === null ? 0 : Math.round(civ2MoveRate * 8);
  const movesUsed = Number.isInteger(unit.movesUsed) ? unit.movesUsed : 0;

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
  const carriesAir = cargo.some((unitClass) => isAirUnitClass(unitClass));
  if (isLandUnitType(passengerType) && carriesAir) {
    return 10;
  }
  if (isAirUnitClass(passengerType.unitClass) && carriesAir) {
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
    noteMappedButUnplacedUnitInstance(unit);
    noteUnmappedUnit(unit, invalidUnitTileReason(unit, freecivUnit));
    return null;
  }
  const terrain = terrainAt(x, y);
  if (
    unit.transportedById === undefined
    && isLandUnitType(freecivUnit)
    && !landTerrains.has(terrain)
  ) {
    noteMappedButUnplacedUnitInstance(unit);
    noteUnmappedUnit(unit, `skipped ${freecivUnit.ruleName} on non-land terrain`);
    return null;
  }
  const homecity = unit.homecityId || 0;
  const activity = freecivActivityId(unitFreecivActivity(unit));
  const veteran = unit.unitMapOverrides?.veteran ?? (unit.flags?.veteranCandidate ? 1 : 0);
  const moveState = unitMoveState(unit, freecivUnit);
  const row = [
    unitFreecivId(unit),
    x,
    y,
    csvEscape("1"),
    playerId,
    veteran,
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
  return row.join(",");
}

function unitWillBeWritten(unit) {
  const freecivUnit = resolvedFreecivUnit(unit);
  if (!freecivUnit) return false;
  const x = unitMapX(unit);
  if (!validMapCoord(x, unit.y)) return false;
  const terrain = terrainAt(x, unit.y);
  return !(
    unit.transportedById === undefined
    && isLandUnitType(freecivUnit)
    && !landTerrains.has(terrain)
  );
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

function applyTerrainOverrides(rows) {
  if (terrainOverrides.size === 0) return rows;
  const counts = new Map();
  const updatedRows = rows.map((row, y) => row.map((terrain, x) => {
    const replacement = terrainOverrides.get(terrain);
    if (!replacement || replacement.terrain === terrain) return terrain;
    const key = `${terrain}\t${replacement.terrain}`;
    counts.set(key, (counts.get(key) || 0) + 1);
    if (replacement.add.length > 0) {
      pendingTerrainOverrideFeatureAdds.push({
        x,
        y,
        from: terrain,
        to: replacement.terrain,
        features: replacement.add,
      });
    }
    return replacement.terrain;
  }));
  appliedTerrainOverrides.push(
    ...[...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, count]) => {
        const [from, to] = key.split("\t");
        return { from, to, count };
      }),
  );
  return updatedRows;
}

function applyTerrainOverrideFeatureAdds(rows, terrainRows) {
  const counts = new Map();
  for (const item of pendingTerrainOverrideFeatureAdds) {
    const terrain = terrainRows[item.y]?.[item.x];
    for (const featureName of item.features) {
      const extraName = civ2FeatureExtraNames.get(featureName);
      const key = `${item.from}\t${item.to}\t${featureName}`;
      if (!extraName || extraIndex[extraName] === undefined) {
        counts.set(key, {
          from: item.from,
          to: item.to,
          feature: featureName,
          extra: extraName || "",
          added: 0,
          alreadyPresent: 0,
          skippedUnsupported: 0,
          skippedMissingExtra: (counts.get(key)?.skippedMissingExtra || 0) + 1,
        });
        continue;
      }
      const current = counts.get(key) || {
        from: item.from,
        to: item.to,
        feature: featureName,
        extra: extraName,
        added: 0,
        alreadyPresent: 0,
        skippedUnsupported: 0,
        skippedMissingExtra: 0,
      };
      if (terrainSupportsExtra(extraName, terrain)) {
        if (hasExtra(rows, extraIndex[extraName], item.x, item.y)) {
          current.alreadyPresent++;
        } else {
          setMapFeatureExtra(rows, extraName, item.x, item.y);
          current.added++;
        }
      } else {
        current.skippedUnsupported++;
      }
      counts.set(key, current);
    }
  }
  appliedTerrainOverrideFeatureAdds.push(
    ...[...counts.values()].sort((a, b) =>
      `${a.from}\t${a.to}\t${a.feature}`.localeCompare(`${b.from}\t${b.to}\t${b.feature}`),
    ),
  );
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
    .replace(/^"topology","[^"]*","[^"]*","([^"]*)"$/m, `"topology","${freeciv21NativeMode ? "ISO" : ""}","${freeciv21NativeMode ? "ISO" : ""}","$1"`)
    .replace(/^"wrap","[^"]*","[^"]*","([^"]*)"$/m, `"wrap","${wrapSetting}","${wrapSetting}","$1"`)
    .replace(/^"xsize",\d+,\d+,"([^"]*)"$/m, `"xsize",${width},${width},"$1"`)
    .replace(/^"ysize",\d+,\d+,"([^"]*)"$/m, `"ysize",${height},${height},"$1"`)
    .replace(/"tilesperplayer",\d+,\d+,"Changed"/, `"tilesperplayer",${tilesPerPlayer},${tilesPerPlayer},"Changed"`)
    .replace(/identity_number_used=\d+/, `identity_number_used=${1000 + cityCount + 100}`);

  return updated;
}

function replaceScenarioSection(section) {
  const metadata = scenarioMetadataForMode();
  section = setScenarioField(section, "name", metadata.name, "is_scenario");
  section = setScenarioField(section, "authors", metadata.authors, "name");
  section = setScenarioField(section, "description", metadata.description, "authors");
  return section;
}

function extraLayerCountForTarget() {
  return Math.max(1, Math.ceil(targetExtraNames.length / 4));
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
    `have_huts=${countExtraInRows(extraRows, "Hut") > 0 ? "TRUE" : "FALSE"}`,
    `have_resources=${countResourceExtrasInRows(extraRows) > 0 ? "TRUE" : "FALSE"}`,
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
  const canonicalGovernmentName = (name) => freecivGovernmentByName.get(name)?.ruleName || name;
  if (meta.government) return canonicalGovernmentName(meta.government);
  const faction = extracted.factions?.find((item) => item.ownerCandidate === meta.owner);
  const governmentByte = faction?.governmentByte;
  const governmentName = faction?.governmentName;
  if (governmentName) {
    const mappedByName = governmentNameMap[governmentName];
    if (mappedByName) return canonicalGovernmentName(mappedByName);
  }
  if (governmentByte !== undefined) {
    // Backward compatibility with older scenario maps keyed by raw Civ2 byte.
    const mapped = governmentNameMap[String(governmentByte)];
    if (mapped) return canonicalGovernmentName(mapped);
  }
  return canonicalGovernmentName(section.match(/government_name="([^"]*)"/)?.[1] || "Despotism");
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

function playerSummaryName(playerId) {
  const meta = playerMeta[playerId];
  const playerName = playerNameForPlayer(meta, "");
  return meta?.nation ? `${playerName} (${meta.nation})` : playerName;
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
    /routes_max_length=0\r?\n(?:c=\{[\s\S]*?\}\r?\n)?nunits=(\d+)/,
    `routes_max_length=0\n${table}nunits=$1`,
  );
}

function replacePlayerUnits(section, playerId, units) {
  const rows = units.map((unit) => unitRow(unit, playerId)).filter(Boolean);
  const table = rows.length ? `orders_max_length=0\n${unitHeader}\n${rows.join("\n")}\n}\n` : "orders_max_length=0\n";
  section = section.replace(/nunits=\d+/, `nunits=${rows.length}`);
  return section.replace(
    /orders_max_length=0\r?\n(?:u=\{[\s\S]*?\}\r?\n)?(?=map_t0000=)/,
    table,
  );
}

function cityDisplayName(city) {
  const name = city.name?.trim();
  return name || `(blank city at ${city.x},${city.y})`;
}

function palaceCitiesForPlayer(playerId) {
  const palace = freecivBuildingByName.get("Palace");
  if (!palace) return null;
  return citiesByPlayer[playerId].filter((city) => city.freecivImprovementString?.[palace.index] === "1");
}

function printPalaceReport() {
  const palace = freecivBuildingByName.get("Palace");
  if (!palace) {
    console.log("Palace report skipped: Palace building not found in Freeciv ruleset.");
    return;
  }

  console.log("Palace cities:");
  const withoutPalace = [];
  for (let playerId = 0; playerId < playerMeta.length; playerId++) {
    const palaceCities = palaceCitiesForPlayer(playerId) || [];
    const playerName = playerSummaryName(playerId);
    const cityNames = palaceCities.map(cityDisplayName);
    if (cityNames.length === 0) withoutPalace.push({ playerId, playerName });
    console.log(
      `player${playerId} ${playerName}: ${cityNames.length ? cityNames.join(", ") : "NONE"}`,
    );
  }

  console.log("Factions without Palace:");
  if (withoutPalace.length === 0) {
    console.log("none");
    return;
  }
  for (const entry of withoutPalace) {
    console.log(`player${entry.playerId} ${entry.playerName}`);
  }
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
  const freecivTech = freecivTechByName.get(freecivName);
  if (!freecivTech) {
    noteUnmappedTech(ownerCandidate, civ2Name, "Freeciv tech not found", freecivName);
    return "";
  }
  return freecivTech.ruleName;
}

function mappedTechsForPlayer(playerId) {
  if (mappedTechsForPlayerCache.has(playerId)) {
    return mappedTechsForPlayerCache.get(playerId);
  }
  const ownerCandidate = playerMeta[playerId]?.owner;
  const ownerTech = technologies?.byOwner?.find((item) => item.ownerCandidate === ownerCandidate);
  const mapped = new Set();
  for (const technology of ownerTech?.knownTechnologies || []) {
    const freecivName = mapCiv2Tech(technology.name, ownerCandidate);
    if (freecivName) mapped.add(freecivName);
  }
  const overrides = playerMeta[playerId]?.techOverrides || {};
  if (overrides.copyFromOwner !== undefined) {
    const sourcePlayerId = ownerToPlayer.get(overrides.copyFromOwner);
    if (sourcePlayerId === undefined) {
      throw new Error(
        `Config player ${playerId} techOverrides.copyFromOwner references unknown ownerCandidate ${overrides.copyFromOwner}`,
      );
    }
    const sourceTechs = mappedTechsForPlayer(sourcePlayerId);
    for (const ruleName of sourceTechs) {
      mapped.add(ruleName);
    }
    appliedPlayerTechOverrides.push({
      playerId,
      ownerCandidate,
      player: playerNameForPlayer(playerMeta[playerId], ""),
      action: "copyFromOwner",
      sourceOwnerCandidate: overrides.copyFromOwner,
      sourcePlayerId,
      sourcePlayer: playerNameForPlayer(playerMeta[sourcePlayerId], ""),
      copiedTechCount: sourceTechs.length,
    });
  }
  for (const sourceName of overrides.remove || []) {
    const resolved = resolveTechForPlayer(ownerCandidate, sourceName, "manual remove");
    if (!resolved) continue;
    mapped.delete(resolved.ruleName);
    appliedPlayerTechOverrides.push({
      playerId,
      ownerCandidate,
      player: playerNameForPlayer(playerMeta[playerId], ""),
      action: "remove",
      sourceName: resolved.sourceName,
      mappedName: resolved.mappedName,
      ruleName: resolved.ruleName,
    });
  }
  for (const sourceName of overrides.add || []) {
    const resolved = resolveTechForPlayer(ownerCandidate, sourceName, "manual add");
    if (!resolved) continue;
    mapped.add(resolved.ruleName);
    appliedPlayerTechOverrides.push({
      playerId,
      ownerCandidate,
      player: playerNameForPlayer(playerMeta[playerId], ""),
      action: "add",
      sourceName: resolved.sourceName,
      mappedName: resolved.mappedName,
      ruleName: resolved.ruleName,
    });
  }
  const mappedList = [...mapped];
  mappedTechsForPlayerCache.set(playerId, mappedList);
  return mappedList;
}

function techSummaryForPlayer(playerId) {
  const ownerCandidate = playerMeta[playerId]?.owner;
  const ownerTech = technologies?.byOwner?.find((item) => item.ownerCandidate === ownerCandidate);
  let unmapped = 0;
  for (const technology of ownerTech?.knownTechnologies || []) {
    const civ2Name = technology.name;
    if (!Object.prototype.hasOwnProperty.call(techNameMap, civ2Name)) {
      unmapped++;
      continue;
    }
    const mappedName = techNameMap[civ2Name];
    if (!mappedName || !freecivTechByName.get(mappedName)) {
      unmapped++;
    }
  }
  return {
    mapped: mappedTechsForPlayer(playerId).length,
    unmapped,
  };
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
    const currentResearch = mappedCurrentResearchForPlayer(playerId);
    const bulbs = Number.isInteger(ownerTech?.researchProgress) ? ownerTech.researchProgress : 0;
    return `${playerId},"${currentResearch}",${techCount},0,0,"",${bulbs},"${currentResearch}",0,"${done}"`;
  });
  const researchSection = [
    "[research]",
    'r={"number","goal_name","techs","futuretech","bulbs_before","saved_name","bulbs","now_name","free_bulbs","done"',
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
const needsEvenIsoHeight = freeciv21NativeMode && terrainRows.length % 2 !== 0;
if (needsEvenIsoHeight) {
  // Freeciv rejects ISO/hex maps with odd ysize. Civ2 scenarios can have
  // odd heights, so pad one inert row after the original map.
  terrainRows = [...terrainRows, [...terrainRows[terrainRows.length - 1]]];
}
terrainRows = applyTerrainOverrides(terrainRows);
const height = terrainRows.length;
const cities = extracted.cities
  .filter((city) => city.name !== undefined && ownerToPlayer.has(city.ownerCandidate))
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

function resourceNameForCurrentTerrainSlot(resourceTile, x, y) {
  const slotIndex = Number.isInteger(resourceTile.slot) ? resourceTile.slot - 1 : -1;
  if (slotIndex < 0) return resourceTile.resource;
  const terrain = terrainAt(x, y);
  const terrainResources = resourcesByTerrainIdentifier.get(terrain) || [];
  return terrainResources[slotIndex] || null;
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

function setMapFeatureExtra(rows, extraName, x, y) {
  const index = extraIndex[extraName];
  if (index === undefined) return false;
  setExtra(rows, index, x, y);
  if (extraName === "Railroad" && extraIndex.Road !== undefined) {
    setExtra(rows, extraIndex.Road, x, y);
  }
  return true;
}

const resourceExtraIndexes = targetResourceNames.map((name) => extraIndex[name]).filter(Number.isInteger);

function hasExtra(rows, index, x, y) {
  const layer = Math.floor(index / 4);
  const bit = 1 << (index % 4);
  const current = Number.parseInt(rows[layer]?.[y]?.[x] || "0", 16);
  return (current & bit) !== 0;
}

function countExtraInRows(rows, extraName) {
  const index = extraIndex[extraName];
  if (index === undefined) return 0;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (hasExtra(rows, index, x, y)) count++;
    }
  }
  return count;
}

function countResourceExtrasInRows(rows) {
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (resourceExtraIndexes.some((index) => hasExtra(rows, index, x, y))) count++;
    }
  }
  return count;
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
  if (removedResources.has("Resources")) {
    appliedResourceOverrides.skippedSparseGrasslandResources = true;
    return;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (terrainRows[y]?.[x] !== grasslandTerrainIdentifier) continue;
      if (knownRows && knownRows[y]?.[x] !== "K") continue;
      if (tileHasResourceBonus(baseResourceRows, x, y)) continue;
      if (hasAdjoiningResourceBonus(baseResourceRows, x, y)) continue;
      const roll = Math.floor(Math.random() * 1000) + 1;
      if (roll <= 250) {
        if (extraIndex.Resources !== undefined) setExtra(rows, extraIndex.Resources, x, y);
      }
    }
  }
}

function addExtractedGrasslandShields(rows, knownRows = null, section = "global") {
  const stats = appliedResourceOverrides.grasslandShields[section];
  const resourceIndex = extraIndex.Resources;
  const tiles = extracted.features?.grasslandShields?.tiles || [];
  stats.extracted += tiles.length;
  for (const tile of tiles) {
    const x = nativeWidthMode ? tile.nativeX : tile.x;
    const y = tile.y;
    if (!Number.isInteger(x) || !Number.isInteger(y) || y < 0 || y >= height || x < 0 || x >= width) {
      stats.skippedUnknownTile++;
      continue;
    }
    if (knownRows && knownRows[y]?.[x] !== "K") {
      stats.skippedUnknownTile++;
      continue;
    }
    if (terrainRows[y]?.[x] !== grasslandTerrainIdentifier) {
      stats.skippedNonGrassland++;
      continue;
    }
    if (removedResources.has("Resources")) {
      stats.skippedRemovedResource++;
      continue;
    }
    if (resourceIndex === undefined) {
      stats.skippedMissingExtra++;
      continue;
    }
    if (hasExtra(rows, resourceIndex, x, y)) {
      stats.alreadyPresent++;
    } else {
      setExtra(rows, resourceIndex, x, y);
      stats.written++;
    }
    if (!nativeWidthMode && x + 1 < width && (!knownRows || knownRows[y]?.[x + 1] === "K")) {
      if (hasExtra(rows, resourceIndex, x + 1, y)) {
        stats.alreadyPresent++;
      } else {
        setExtra(rows, resourceIndex, x + 1, y);
        stats.written++;
      }
    }
  }
}

for (const city of cities) {
  const playerId = ownerToPlayer.get(city.ownerCandidate);
  const land = playerId === 1 ? plainsTerrainIdentifier : grasslandTerrainIdentifier;
  if (!landTerrains.has(terrainRows[city.y][city.x])) {
    terrainRows[city.y][city.x] = land;
  }
  if (extraIndex.Road !== undefined) setExtra(extraRows, extraIndex.Road, city.x, city.y);
}
applyTerrainOverrideFeatureAdds(extraRows, terrainRows);

if (freeciv21NativeMode) {
  for (const [featureName] of civ2FeatureExtraNames) {
    if (shouldSkipCiv2Feature(featureName)) continue;
    const targetFeatureName = transformedCiv2FeatureName(featureName);
    const extraName = civ2FeatureExtraNames.get(targetFeatureName);
    const rows = featureRows(featureName);
    for (let y = 0; y < height; y++) {
      const row = rows[y] || "";
      for (let x = 0; x < width; x++) {
        const terrain = terrainAt(x, y);
        if (row[x] === "R" && terrainSupportsExtra(extraName, terrain)) {
          setMapFeatureExtra(extraRows, extraName, x, y);
        }
      }
    }
  }

  if (!shouldSkipCiv2Feature("resources")) {
    for (const resourceTile of extracted.features?.resources?.tiles || []) {
      if (removedResources.has(resourceTile.resource)) {
        countAppliedResourceOverride("global", resourceTile.resource);
        continue;
      }
      const x = nativeWidthMode ? resourceTile.nativeX : resourceTile.x;
      const y = resourceTile.y;
      const resourceName = resourceNameForCurrentTerrainSlot(resourceTile, x, y);
      const resourceIndex = extraIndex[resourceName];
      if (
        resourceName
        && !removedResources.has(resourceName)
        && resourceIndex !== undefined
        && terrainRows[y]?.[x] !== grasslandTerrainIdentifier
      ) {
        countAppliedResourceSlotConversion(resourceTile.resource, resourceName);
        setExtra(extraRows, resourceIndex, x, y);
        if (!nativeWidthMode && x + 1 < width) {
          setExtra(extraRows, resourceIndex, x + 1, y);
        }
      } else if (resourceName && removedResources.has(resourceName)) {
        countAppliedResourceOverride("global", resourceName);
      }
    }
  }
  if (!shouldSkipCiv2Feature("resources")) {
    addExtractedGrasslandShields(extraRows);
  }
} else {
  for (let y = 0; y < height; y++) {
    const roadRow = roadRows[y] || "";
    const riverRow = riverRows[y] || "";
    const hutRow = featureRows("huts")[y] || "";
    for (let x = 0; x < width; x++) {
      if (
        !shouldSkipCiv2Feature("rivers")
        && riverRow[x] === "R"
        && landTerrains.has(terrainRows[y][x])
      ) {
        const extraName = civ2FeatureExtraNames.get(transformedCiv2FeatureName("rivers"));
        if (terrainSupportsExtra(extraName, terrainRows[y][x])) {
          setMapFeatureExtra(extraRows, extraName, x, y);
        }
      }
      if (
        !shouldSkipCiv2Feature("roads")
        && roadRow[x] === "R"
        && landTerrains.has(terrainRows[y][x])
      ) {
        const extraName = civ2FeatureExtraNames.get(transformedCiv2FeatureName("roads"));
        if (terrainSupportsExtra(extraName, terrainRows[y][x])) {
          setMapFeatureExtra(extraRows, extraName, x, y);
        }
      }
      if (
        !shouldSkipCiv2Feature("huts")
        && hutRow[x] === "R"
        && landTerrains.has(terrainRows[y][x])
      ) {
        const extraName = civ2FeatureExtraNames.get(transformedCiv2FeatureName("huts"));
        if (terrainSupportsExtra(extraName, terrainRows[y][x])) {
          setMapFeatureExtra(extraRows, extraName, x, y);
        }
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
  for (const [featureName] of civ2FeatureExtraNames) {
    if (shouldSkipCiv2Feature(featureName)) continue;
    const targetFeatureName = transformedCiv2FeatureName(featureName);
    const extraName = civ2FeatureExtraNames.get(targetFeatureName);
    const feature = visibleFeatures[featureName] || {};
    const rows = nativeWidthMode ? feature.nativeRows || [] : feature.rows || [];
    for (let y = 0; y < height; y++) {
      const row = rows[y] || "";
      for (let x = 0; x < width; x++) {
        const terrain = terrainAt(x, y);
        if (row[x] === "R" && terrainSupportsExtra(extraName, terrain)) {
          setMapFeatureExtra(playerExtraRows, extraName, x, y);
        }
      }
    }
  }

  const knownRows = knownRowsForPlayer(playerId);
  if (!shouldSkipCiv2Feature("resources")) {
    for (const resourceTile of extracted.features?.resources?.tiles || []) {
      if (removedResources.has(resourceTile.resource)) {
        countAppliedResourceOverride("visibility", resourceTile.resource);
        continue;
      }
      const x = nativeWidthMode ? resourceTile.nativeX : resourceTile.x;
      const y = resourceTile.y;
      const resourceName = resourceNameForCurrentTerrainSlot(resourceTile, x, y);
      const resourceIndex = extraIndex[resourceName];
      if (
        resourceName
        && !removedResources.has(resourceName)
        && resourceIndex !== undefined
        && knownRows[y]?.[x] === "K"
        && terrainRows[y]?.[x] !== grasslandTerrainIdentifier
      ) {
        setExtra(playerExtraRows, resourceIndex, x, y);
        if (!nativeWidthMode && x + 1 < width && knownRows[y]?.[x + 1] === "K") {
          setExtra(playerExtraRows, resourceIndex, x + 1, y);
        }
      } else if (resourceName && removedResources.has(resourceName)) {
        countAppliedResourceOverride("visibility", resourceName);
      }
    }
  }
  if (!shouldSkipCiv2Feature("resources")) {
    addExtractedGrasslandShields(playerExtraRows, knownRows, "visibility");
  }
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
      freecivTerrainRuleset: freecivTerrainRulesetPath,
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
      intentionallySkippedUnitInstances: intentionallySkippedUnitInstanceKeys.size,
      mappedButUnplacedUnitInstances: mappedButUnplacedUnitInstanceKeys.size,
      coinageFallbacks: coinageFallbacks.length,
      unitHomecityIssueEntries: unitHomecityIssues.size,
    },
    mapFeatureOverrides: {
      skippedCiv2Features: [...skippedCiv2Features].sort(),
    },
    mapFeatureTransforms: {
      replace: Object.fromEntries([...mapFeatureTransforms.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    },
    productionFallback: {
      ruleset: isCoinageFallbackTargetRuleset() ? "civ2civ3/classic" : "other",
      ...productionFallback(),
    },
    extras: {
      source: templateExtraNames.length > 0 ? "template extras_vector" : "legacy freeciv32 fallback",
      count: targetExtraNames.length,
      layerCount: extraLayerCountForTarget(),
      names: targetExtraNames,
      civ2FeatureMappings: Object.fromEntries([...civ2FeatureExtraNames.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
      missingCiv2FeatureMappings: missingCiv2FeatureExtraNames,
      resourceExtraCount: resourceExtraIndexes.length,
      huts: {
        extractedNativeTileCount: extracted.features?.huts?.nativeTileCount || 0,
        extractedFreecivTileCount: extracted.features?.huts?.freecivTileCount || 0,
        writtenTileCount: countExtraInRows(extraRows, "Hut"),
        skipped: shouldSkipCiv2Feature("huts"),
        targetExtraName: civ2FeatureExtraNames.get("huts") || null,
        targetExtraPresent: extraIndex.Hut !== undefined,
      },
    },
    activities: {
      source: templateActivityNames.length > 0 ? "template activities_vector" : "legacy fallback",
      names: templateActivityNames,
      ids: activityIds,
    },
    unitClasses: {
      source: freecivUnitClasses.length > 0 ? "units.ruleset unitclass sections" : "legacy fallback",
      count: freecivUnitClasses.length,
      classes: freecivUnitClasses.map((unitClass) => ({
        name: unitClass.name,
        ruleName: unitClass.ruleName,
        moveType: unitClass.moveType,
        flags: unitClass.flags,
        landLike: isLandUnitClass(unitClass.ruleName) || isLandUnitClass(unitClass.name),
        airLike: isAirUnitClass(unitClass.ruleName) || isAirUnitClass(unitClass.name),
      })),
    },
    terrainOverrides: {
      replace: Object.fromEntries([...terrainOverrides.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
      applied: appliedTerrainOverrides,
      featureAdds: appliedTerrainOverrideFeatureAdds,
      freecivTerrainCount: freecivTerrains.length,
      landIdentifiers: [...landTerrains].sort(),
      oceanicIdentifiers: terrainIdentifiersMatching(isOceanicTerrain),
      grasslandIdentifier: grasslandTerrainIdentifier,
      plainsIdentifier: plainsTerrainIdentifier,
      irrigableIdentifiers: [...irrigableTerrains].sort(),
      mineableIdentifiers: [...mineableTerrains].sort(),
    },
    resourceOverrides: {
      source: rulesetResourceNames.length > 0 ? "terrain.ruleset resource sections + template extras_vector" : "legacy resource fallback",
      count: targetResourceNames.length,
      rulesetResourceCount: freecivResources.length,
      names: targetResourceNames,
      missingFromExtrasVector: rulesetResourceNamesMissingFromExtras,
      remove: [...removedResources].sort((a, b) => a.localeCompare(b)),
      applied: appliedResourceOverrides,
    },
    cityImprovementOverrides: {
      configured: cityImprovementOverrides,
      applied: appliedCityImprovementOverrides,
      unmatchedCityNames: [...cityImprovementOverrideUseCounts.entries()]
        .filter(([, useCount]) => useCount === 0)
        .map(([cityName]) => cityName),
      duplicateCityNameMatches: [...cityImprovementOverrideUseCounts.entries()]
        .filter(([, useCount]) => useCount > 1)
        .map(([cityName, useCount]) => ({ cityName, useCount })),
    },
    playerTechOverrides: {
      configured: playerMeta
        .map((meta, playerId) => ({
          playerId,
          ownerCandidate: meta.owner,
          player: playerNameForPlayer(meta, ""),
          techOverrides: meta.techOverrides || {},
        }))
        .filter((entry) => Object.keys(entry.techOverrides).length > 0),
      applied: appliedPlayerTechOverrides,
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

let text = templateText;
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
    return section;
  });
}
text = replaceResearchSection(text);
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
console.log(`Unmapped unit report entries: ${validationReport.totals?.unmappedUnitEntries ?? unmappedUnits.size}`);
console.log(
  `Units skipped by empty unit map entry: ${validationReport.totals?.intentionallySkippedUnitInstances ?? intentionallySkippedUnitInstanceKeys.size}`,
);
console.log(
  `Mapped units not placed on map: ${validationReport.totals?.mappedButUnplacedUnitInstances ?? mappedButUnplacedUnitInstanceKeys.size}`,
);
console.log(
  `Unmapped improvements: ${validationReport.totals?.unmappedImprovementEntries ?? unmappedImprovements.size}`,
);
console.log(`Unmapped techs: ${validationReport.totals?.unmappedTechEntries ?? unmappedTechs.size}`);
for (let playerId = 0; playerId < playerMeta.length; playerId++) {
  const mappedUnitCount = unitsByPlayer[playerId].filter((unit) => {
    const freecivName = unitMapEntryFor(unit.typeName)?.freecivName;
    return freecivName && freecivUnitByName.get(freecivName) && unitWillBeWritten(unit);
  }).length;
  const techSummary = techSummaryForPlayer(playerId);
  console.log(
    `player${playerId} ${playerSummaryName(playerId)}: ${citiesByPlayer[playerId].length} cities, ${mappedUnitCount} units, ${techSummary.mapped} mapped techs, ${techSummary.unmapped} unmapped techs`,
  );
}
printPalaceReport();
