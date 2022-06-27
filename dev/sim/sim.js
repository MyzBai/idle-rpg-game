import * as simTextEditor from "./simTextEditor.js";
import * as helperFunctions from "../../helperFunctions.js";
import * as moduleTextEditor from "../jsonEditor.js";
import { createModCache, getStatModsFromDefaultStatValues, ModDB, modTemplateList } from "../../mods.js";
import { extractAttackSkillStats, convertModuleMods } from "../../modUtils.js";
import * as calcDamage from "../../damageCalc.js";
import * as chart from "./simChart.js";
import * as pako from "../../libs/pako.js";

/** @typedef {import('./simTextEditor').Config} Config */

/**
 * //Per Config
 * @typedef {{name: string, results: SimInstance[]}[]} SimResult
 */

/**
 * @typedef SimCalcResult
 * @property {number} dps
 * @property {StatModList} [statModList]
 * @property {DamageCalc.StatsOutput} [statsOutput]
 */

/**
 * @typedef SimInstance
 * @property {ModDB} modDB
 * @property {string} hash
 * @property {SimCalcResult} [result]
 */

/**
 * @typedef {ConfigCache[]} SimCache
 * @typedef ConfigCache
 * @property {string} name
 * @property {ResultCache[]} results
 * @typedef ResultCache
 * @property {string} hash
 * @property {StatModList} statModList
 */

class Simulator {
	constructor(name) {
		this.name = name;
		this.data = undefined;
	}
	/**@returns {StatModList} */
	getStatMods() {
		return null;
	}
}

export async function init() {
	await simTextEditor.init();

	simTextEditor.onConfigDataChanges.listen((simData) => {
		run();
	});
}

async function run() {
	const module = helperFunctions.jsonCopy(moduleTextEditor.module);
	if (!module) {
		console.warn("no module available");
		return;
	}

	const configData = helperFunctions.deepFreeze(helperFunctions.jsonCopy(simTextEditor.modelData));
	if (!configData) {
		console.warn("no configData available");
		return;
	}

	console.time("sim");

	/**@type {SimCache} */
	const cache = getCache();

	const iterations = configData.iterations;
	const endLevel = module.enemies.enemyList.length;

	//convert mods - mods in the module has raw unparsed statMods
	convertModuleMods(module);

	const defaultStatMods = getStatModsFromDefaultStatValues(module.player?.defaultStatValues);

	// /**@type {SimResult} */
	// const simResult = { endLevel, configs: [] };
	/**@type {SimResult} */
	const simResult = [];

	for (const config of configData.configs) {
		// const cache = cachedSimData[config.name];

		const configCache = cache?.find((x) => x.name === config.name);

		const simConfig = { name: config.name, results: [] };
		simResult.push(simConfig);

		let lastHash = undefined;
		for (let i = 0; i < endLevel; i++) {
			const level = i + 1;
			const data = getConfigDataAtLevel(module, config, level);
			data.hash = helperFunctions.hashCode(data.hash + JSON.stringify(iterations));

			//same data as last level, just use the previous results
			if (lastHash === data.hash) {
				simConfig.results.push(simConfig.results[i - 1]);
				// console.log(`Level ${level} did not change`);
				continue;
			}
			lastHash = data.hash;

			/**@type {SimInstance} */
			const simInstance = {
				modDB: new ModDB(),
				hash: data.hash,
			};

			simConfig.results.push(simInstance);

			const cacheInstance = configCache?.results[i];

			if (cacheInstance && cacheInstance.hash == data.hash) {
				const statMods = cacheInstance.statModList;
				simInstance.modDB.add(statMods);
				calcStats(simInstance);
				console.log(`Level ${level} was cached`);
				continue;
			}

			//simulate
			console.log(`Level ${level} was simulated`);
			simInstance.modDB.add(defaultStatMods);
			for (let j = 0; j < iterations; j++) {
				simInstance.modDB.removeBySource(simInstance);
				for (const simulator of data.simulators) {
					const statMods = simulator.getStatMods();
					simInstance.modDB.add(statMods, simInstance);
				}
				calcStats(simInstance);
			}
		}
	}

	console.timeEnd("sim");

	//then save config to local storage
	{
		setCache(simResult);
	}

	chart.draw(simResult);
}

/**
 * @param {SimInstance} simInstance
 */
function calcStats(simInstance) {
	const { modDB } = simInstance;
	const statModList = modDB.getModList();
	const modCache = createModCache(statModList);
	const conversionTable = calcDamage.createConversionTable(statModList);
	const output = calcDamage.calcStats({ statModList, modCache, conversionTable });

	{
		if (output.attackCost > output.mana) {
			//cant afford to attack
			return;
		}

		//TODO::add a boolean in config to allow or ignore attacks which cannot be idled
		const manaSpentPerSecond = output.attackSpeed * output.attackCost;
		const fac = manaSpentPerSecond / output.manaRegen;
		if (fac > 1) {
			//cannot idle because mana cost exceeds mana regen
			return;
		}
	}

	simInstance.result = simInstance.result || { dps: 0 };

	if (output.dps > simInstance.result.dps) {
		simInstance.result.dps = output.dps;
		simInstance.result.statsOutput = output;
		simInstance.result.statModList = statModList;
	}
}

/**
 * @param {Modules.ModuleData} module
 * @param {Config} config
 * @param {number} level
 * @returns {{hash: string, simulators: Simulator[]}}
 */
function getConfigDataAtLevel(module, config, level) {
	const simulators = [];
	const data = [];

	const idComparer = (a, b) => {
		return a.id === b.id;
	};

	{
		//Attack Skills
		const simulator = new Simulator("Attack Skills");
		const attackSkills = module.skills.attackSkills.filter((x) => x.levelReq <= level && config.skills.attacks.some((y) => y === x.name));

		data.push(attackSkills);
		simulator.getStatMods = () => {
			const skill = getRandoms(attackSkills, 1)[0];
			const statMods = [];
			statMods.push(...Object.values(extractAttackSkillStats(skill.stats)));
			statMods.push(...skill.mods.flatMap((x) => x.stats.flatMap((y) => y)));
			return statMods;
		};
		simulators.push(simulator);
	}
	if (module.skills.supportSkills) {
		//Support Skills
		const simulator = new Simulator("Support Skills");
		const supports = module.skills.supportSkills.filter((x) => x.levelReq <= level && config.skills.supports.some((y) => y.name === x.name));

		const maxSupports = module.skills.maxSupports;
		data.push({ supports, maxSupports });
		simulator.getStatMods = () => {
			const prioritizedSupports = supports.filter((x) => config.skills.supports.some((y) => y.priority && y.name === x.name));
			let numSupportsRemaining = maxSupports - prioritizedSupports.length;
			if (numSupportsRemaining < 0) {
				return getRandoms(prioritizedSupports, maxSupports).flatMap((x) => x.mods.flatMap((y) => y.stats));
			} else {
				const statMods = prioritizedSupports.flatMap((x) => x.mods.flatMap((y) => y.stats));
				statMods.push(...getRandoms(supports, numSupportsRemaining, idComparer).flatMap((x) => x.mods.flatMap((y) => y.stats)));
				return statMods;
			}
		};
		simulators.push(simulator);
	}

	if (module.items) {
		const simulator = new Simulator("Items");

        const modTables = module.items.modTables.filter(x => config.items.mods.some(y => x.some(z => z.mod.id === y.name)));

		const itemMods = modTables.reduce((a, c) => {
            const highestLevelReqMod = [...c].filter(x => x.levelReq <= level).sort((a, b) => b.levelReq - a.levelReq)[0];
            a.push(highestLevelReqMod);
			return a;
		}, []);

		const numItems = module.items.items.filter((x) => x.levelReq <= level).length;
		const maxMods = module.items.maxMods; //max mods per item
		data.push({ itemMods, numItems, maxMods });
		simulator.getStatMods = () => {
			const totalStatMods = [];
			for (let i = 0; i < numItems; i++) {
				let numModsRemaining = maxMods;
				const prioritizedMods = itemMods.filter((x) => config.items.mods.some((y) => y.priority && y.name === x.mod.id));

				const statMods = [];
				numModsRemaining -= prioritizedMods.length;
				if (numModsRemaining < 0) {
					statMods.push(...getRandoms(prioritizedMods, maxMods, idComparer).flatMap((x) => x.mod.stats));
				} else {
					statMods.push(...prioritizedMods.flatMap((x) => x.mod.stats));
					statMods.push(...getRandoms(itemMods, numModsRemaining, idComparer).flatMap((x) => x.mod.stats));
				}
				totalStatMods.push(...statMods);
			}
			return totalStatMods;
		};

		simulators.push(simulator);
	}

	return { hash: helperFunctions.hashCode(JSON.stringify(data)), simulators };
}

function getCache() {
	try {
		const key = "dsc";
		const value = sessionStorage.getItem(key) || "";
		const uncompressed = uncompressPako(value) || undefined;
		if (uncompressed) {
			return JSON.parse(uncompressed);
		}
	} catch (error) {
		console.error(error);
	}

	return undefined;
}

/**
 * @param {SimResult} simResult
 */
function setCache(simResult) {
	const key = "dsc";

	const cache = simResult.reduce((cache, config) => {
		const name = config.name;
		const instances = config.results.reduce((instances, result) => {
			const hash = result.hash;
			const statModList = result.result.statModList;
			instances.push({ hash, statModList });
			return instances;
		}, []);
		cache.push({ name, results: instances });
		return cache;
	}, []);

	//compressed ascii string
	const cascii = compressPako(JSON.stringify(cache));
	sessionStorage.setItem(key, cascii);
}

/**
 * @param {string} str
 * @returns {string}
 */
function compressPako(str) {
	const uint8array = pako.gzip(str);
	const ascii = btoa(String.fromCharCode(...uint8array));
	return ascii;
}

/**
 * @param {string} str
 * @returns {string}
 */
function uncompressPako(str) {
	const uint8array = helperFunctions.strToUint8Array(atob(str));
	const decompressed = pako.ungzip(uint8array, { to: "string" });
	//@ts-expect-error
	return decompressed || "";
}

/**
 * @template T
 * @param {T[]} arr
 * @param {number} n
 * @param {(a,b) => boolean} [checkEquality]
 * @returns {T[]}
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
