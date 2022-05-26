import { strToUint8Array, hashCode, jsonCopy, registerTabs } from "../helperFunctions.js";
import { convertRawMods, createModCache, getStatModsFromDefaultStatValues, ModDB, modTemplateList } from "../mods.js";
import * as configs from "./simConfigs.js";
import * as pako from "../libs/pako.js";
import * as calcDamage from "../damageCalc.js";
import * as eventListener from "../eventListener.js";
import * as chart from "./simChart.js";

/**@typedef {import('./simConfigs.js').Config} Config */

/**
 * @typedef ModuleSimData
 * @property {StatModList} defaultStatMods
 * @property {{attackSkills: Skills.AttackSkill[], supports: Skills.SupportSkill[]}} skills
 * @property {{modTables: Items.ModTable[]}} items
 */

/**
 * top level sim object
 * @typedef SimData
 * @property {number} startLevel
 * @property {number} endLevel
 * @property {number} numIterations
 * @property {SimInstance[]} instances
 */

/**
 * @typedef SimInstance
 * @property {Config} config
 * @property {ModuleSimData} moduleData
 * @property {SimResult[]} results
 */

/**
 * @typedef SimResult
 * @property {number} level
 * @property {number} value
 * @property {ModDB} modDB
 * @property {DamageCalc.StatsOutput} [statsOutput]
 */

eventListener.add(eventListener.EventType.MODULE_CHANGED, initModule);

//UI
const simPage = document.querySelector(".p-sim");
const optionsContainer = simPage.querySelector(".p-simulation .s-options");
simPage.querySelector(".p-simulation .start-sim").addEventListener("click", (e) => {
	run();
});
registerTabs(Array.from(simPage.querySelectorAll(".s-tabs .g-button")), 0);

/**@type {Modules.ModuleData} */
var module = undefined;

class Simulator {
	/**
	 * @param {string} name
	 */
	constructor(name) {
		this.name = name;
	}

	/**@returns {StatModList} */
	getStatMods() {
		return null;
	}
}

export async function init() {
	configs.init();
}

function initModule(tempModule) {
	module = jsonCopy(tempModule);
	convertMods(module);
	// const defaultStatMods = getStatModsFromDefaultStatValues(module.player?.defaultStatValues || {});
	// for (const config of configs.getConfigs()) {
	// 	setConfigMods(config, module, defaultStatMods);
	// }
}

/**@param {Modules.ModuleData} module */
function convertMods(module) {
	{
		for (const skill of module.skills.attackSkills) {
			convertRawMods(skill.mods);
		}
		for (const skill of module.skills.supportSkills) {
			convertRawMods(skill.mods);
		}
	}

	if (module.items) {
		for (const modTable of module.items.modTables) {
			modTable.mods.forEach((x) => (x.id = modTable.id));
			convertRawMods(modTable.mods);
		}
	}
}

async function run() {
	if (!module) {
		console.warn("No module available");
		return;
	}

	const numIterations = parseFloat(optionsContainer.querySelector(".iterations").querySelector("input").value);
	const startLevel = parseFloat(optionsContainer.querySelector(".min-level").querySelector("input").value) || 1;
	const endLevel = parseFloat(optionsContainer.querySelector(".max-level").querySelector("input").value) || module.enemies.enemyList.length;

	/**@type {SimData} */
	const simData = {
		startLevel,
		endLevel,
		numIterations,
		instances: [],
	};

	for (const config of configs.getConfigs()) {
		if (config.disabled) {
			continue;
		}
		const moduleData = getModuleSimData(simData, config);
		simData.instances.push({ config, moduleData, results: [] });
	}

	simData.instances.forEach(async (simInstance) => {
		await simulate(simData, simInstance);
        setCache(simData, simInstance);
	});

    chart.draw(simData);
}

/**
 * @param {SimData} simData
 * @param {SimInstance} simInstance
 */
async function simulate(simData, simInstance) {
	const { startLevel, endLevel, numIterations } = simData;
	const { config, moduleData } = simInstance;

	const cachedSimResult = getCache(simInstance.config);
	const cacheDirty = checkCacheDirty(simData, simInstance, cachedSimResult) || false;
	console.log('IsDirty: ' + cacheDirty);
    simInstance.results = [];
	return new Promise(async (resolve) => {
		for (let j = startLevel; j <= endLevel; j++) {
			/**@type {SimResult} */
			const simResult = {
				level: j,
				modDB: new ModDB(),
				value: 0,
			};
			simInstance.results[j - startLevel] = simResult;
			const simulators = getSimulators(config, j);
			if (cachedSimResult && !cacheDirty) {
				const statMods = cachedSimResult.statModLists[j - 1];
				simResult.modDB.add(statMods);
				calcStats(simResult);
			} else {
				simResult.modDB.add(moduleData.defaultStatMods);
				for (let j = 0; j < numIterations; j++) {
					for (const simulator of simulators) {
						simResult.modDB.removeBySource(simulator);
						const statMods = simulator.getStatMods();
						simResult.modDB.add(statMods);
					}
					calcStats(simResult);
				}
			}
		}
		resolve();
	});
}

/**
 * @param {Config} config
 * @param {number} level
 */
function getSimulators(config, level) {
	const simulators = [];

	/**@param {Mod} a @param {Mod} b */
	const idComparer = function (a, b) {
		return a.id === b.id;
	};

	{
		const simulator = new Simulator("Attack Skills");
		const attackSkills = module.skills.attackSkills.filter((x) => x.levelReq <= level);
		const statMods = attackSkills.reduce((a, c) => {
			const attackSpeedStatMod = { name: "attackSpeed", valueType: "base", value: c.stats.attackSpeed };
			const baseDamageMultiplierStatMod = { name: "baseDamageMultiplier", valueType: "base", value: c.stats.baseDamageMultiplier };
			a.push([...c.mods.flatMap((x) => x.stats), attackSpeedStatMod, baseDamageMultiplierStatMod]);
			return a;
		}, []);
		simulator.getStatMods = function () {
			return getRandoms(statMods, 1).flatMap((x) => x);
		};
		simulators.push(simulator);
	}

	if (module.skills.supportSkills) {
		const simulator = new Simulator("Support Skills");
		const supports = module.skills.supportSkills.filter((support) => support.levelReq <= level);
		const statMods = supports.reduce((a, c) => {
			if (
				modMatchIds(
					c.mods.map((x) => x.id),
					config.targetIds
				)
			) {
				a.push(c.mods.flatMap((x) => x.stats));
			}
			return a;
		}, []);
		const maxSupports = module.skills.maxSupports;
		simulator.getStatMods = function () {
			return getRandoms(statMods, maxSupports).flatMap((x) => x);
		};
		simulators.push(simulator);
	}

	if (module.items) {
		const simulator = new Simulator("Items");
		const numItems = module.items.items.filter((x) => level >= x.levelReq).length;

		/**@type {ModList} */
		const mods = module.items.modTables.reduce((a, c) => {
			if (modMatchIds([c.id], config.targetIds)) {
				a.push([...c.mods].reverse().find((x) => x.levelReq <= level));
			}
			return a;
		}, []);
		const numMods = module.items.maxMods;

		simulator.getStatMods = function () {
			const totalStatMods = [];
			for (let i = 0; i < numItems; i++) {
				const prioritizedMods = mods.filter((x) => config.modPriorities.some((y) => y.toLowerCase() === x.id));

				let statMods = [];
				if (prioritizedMods.length > numMods) {
					statMods = getRandoms(prioritizedMods, numMods, idComparer).flatMap((x) => x.stats);
				} else {
					statMods = getRandoms(mods, numMods, idComparer).flatMap((x) => x.stats);
				}
				totalStatMods.push(...statMods);
			}
			return totalStatMods;
		};
		simulators.push(simulator);
	}

	return simulators;
}

/**
 * @param {any[]} arr
 * @param {number} n
 * @param {(a,b) => boolean} [checkEquality]
 * @returns {any[]}
 */
function getRandoms(arr, n, checkEquality) {
	if (arr.length === 0) {
		return [];
	}
	const arrCopy = [...arr];
	const result = [];
	for (let i = 0; i < n && arrCopy.length > 0; i++) {
		const item = getRandom();
		result.push(item);
	}
	return result;
	function getRandom() {
		const index = Math.floor(Math.random() * arrCopy.length);
		const item = arrCopy[index];
		if (checkEquality) {
			if (arrCopy.some((x) => checkEquality(item, x))) {
				arrCopy.splice(index, 1);
			}
		}
		return item;
	}
}

/**
 * @param {SimResult} simResult
 */
function calcStats(simResult) {
	const modList = simResult.modDB.getModList();
	const modCache = createModCache(modList);
	const conversionTable = calcDamage.createConversionTable(modList);
	const output = calcDamage.calcStats({ statModList: modList, modCache, conversionTable });
	{
		//check attack sustainability
		const manaSpentPerSecond = output.attackSpeed * output.attackCost;
		const factor = manaSpentPerSecond / output.manaRegen;
		if (factor > 1) {
			return;
		}
	}

	if (output.dps > simResult.value) {
		simResult.value = output.dps;
		simResult.statsOutput = output;
	}

	// {
	// 	const health = simData.module.enemies.enemyList[simData.level - 1].health;
	// 	const dps = simData.output.dps;
	// 	const killTime = health / dps;
	// 	simData.simCalc.killTime = `${killTime.toFixed()} seconds`;
	// }
}

/**
 * returns and object containing the data from the module used in the simulation
 * @param {SimData} simData
 * @param {Config} config
 * @returns {ModuleSimData}
 */
function getModuleSimData(simData, config) {
	const { endLevel } = simData;
	const skills = {
		attackSkills: [],
		supports: [],
	};

	const defaultStatValues = module.player?.defaultStatValues;
    const defaultStatMods = getStatModsFromDefaultStatValues(defaultStatValues || {});

	//skills
	{
		const attackSkills = module.skills.attackSkills.filter((x) => x.levelReq <= endLevel);
		skills.attackSkills.push(...attackSkills);

		if (module.skills.supportSkills) {
			let supportSkills = module.skills.supportSkills.filter((x) => x.levelReq <= endLevel);
			supportSkills = supportSkills.filter((support) => {
				if (support.levelReq <= endLevel) {
					return;
				}
				if (
					modMatchIds(
						support.mods.map((x) => x.id),
						config.targetIds
					)
				) {
					return true;
				}
			});
		}
	}

	const items = {
		modTables: [],
	};
	//items
	if (module.items) {
		let modTables = module.items.modTables.filter((x) => modMatchIds([x.id], config.targetIds));
		modTables.forEach((x) => {
			x.mods = x.mods.filter((x) => x.levelReq <= endLevel);
		});

		items.modTables.push(...modTables);
	}

	return {
		defaultStatMods,
		skills,
		items,
	};
}

/**
 * @param {string[]} ids1
 * @param {string[]} ids2
 * @returns {boolean}
 */
function modMatchIds(ids1, ids2) {
	return ids1.some((x) => ids2.some((y) => x === y));
}

//Cache
/**
 * @typedef CacheObj
 * @property {string} hashCode
 * @property {StatModList[]} statModLists
 */

/**@param {Config} config */
function getCacheKey(config) {
	return "ds" + config.id;
}

/**
 * @param {SimInstance} simInstance
 */
function setCache(simData, simInstance) {
	const key = getCacheKey(simInstance.config);

	// const statMods = simData.results.map(x => x.modDB.getModList());
	/**@type {CacheObj} */
	const valueToCache = {
		hashCode: generateCacheHashCode(simData, simInstance),
		statModLists: simInstance.results.map((x) => x.modDB.getModList()),
	};
	const statModsStr = JSON.stringify(valueToCache);
	let uint8array = pako.gzip(statModsStr);
	const ascii = btoa(String.fromCharCode(...uint8array));
	sessionStorage.setItem(key, ascii);
}

/**
 *
 * @param {SimData} simData
 * @param {SimInstance} simInstance
 * @returns {string}
 */
function generateCacheHashCode(simData, simInstance) {
	return hashCode(
		JSON.stringify({
			startLevel: simData.startLevel,
			endLevel: simData.endLevel,
			numIterations: simData.numIterations,
			moduleData: hashCode(JSON.stringify(simInstance.moduleData)),
			config: hashCode(JSON.stringify(simInstance.config)),
		})
	);
}

/**
 * @param {Config} config
 * @returns {CacheObj}
 */
function getCache(config) {
	const key = getCacheKey(config);
	const str = sessionStorage.getItem(key);
	if (!str) {
		return;
	}
	const uint8array = strToUint8Array(atob(str));
	const decompressed = pako.ungzip(uint8array, { to: "string" });

	//@ts-expect-error
	const cacheObj = JSON.parse(decompressed);
	return cacheObj;
}

/**
 *
 * @param {SimData} simData
 * @param {SimInstance} simInstance
 * @param {CacheObj} cache
 */
function checkCacheDirty(simData, simInstance, cache) {
	const a = generateCacheHashCode(simData, simInstance);
	const b = cache?.hashCode;
	return a !== b;
}
