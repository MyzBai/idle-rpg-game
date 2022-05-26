import { convertRawMods, createModCache, getStatModsFromDefaultStatValues, ModDB, modTemplateList } from "../mods.js";
import { getModule } from "./jsonEditor.js";
import * as calcDamage from "../damageCalc.js";
import { getFormattedStats, getFormattedTableFragment } from "../stats.js";
import { hashCode, jsonCopy, registerTabs, strToUint8Array } from "../helperFunctions.js";
import * as eventListener from "../eventListener.js";
import * as pako from "../libs/pako.js";
import * as chart from "./simChart.js";
import * as configs from './simConfigs.js';

/**@typedef {import('./simConfigs.js').Config} Config */
/**
 * @typedef SimResult
 * @property {string} configId
 * @property {number} level
 * @property {number} value
 * @property {ModDB} modDB
 * @property {DamageCalc.StatsOutput} [statsOutput]
 */

/**
 * @typedef SimData
 * @property {number} startLevel
 * @property {number} endLevel
 * @property {number} numIterations
 * @property {Config} config
 * @property {SimResult[]} [results]
 */


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
	// run() {}
}

const simPage = document.querySelector('.p-sim');
const optionsContainer = simPage.querySelector(".p-simulation .s-options");

//Module changed
eventListener.add(eventListener.EventType.MODULE_CHANGED, initModule);

registerTabs(Array.from(simPage.querySelectorAll('.s-tabs .g-button')), 0);


simPage.querySelector(".p-simulation .start-sim").addEventListener("click", (e) => {
	run();
});

// simPage.querySelector(".s-tabs .clear-cache").addEventListener("click", () => {
// 	clearCache();
// });

const progressBar = {
	container: document.querySelector(".p-sim .s-progress-bar"),
	element: document.querySelector(".p-sim .progress-bar"),
	text: document.querySelector(".p-sim .s-progress-bar .text"),
};

/**@type {Modules.ModuleData} */
var module = undefined;

export async function init() {

    configs.init();
}

function initModule(tempModule) {
	module = jsonCopy(tempModule);
	convertMods(module);
	const defaultStatMods = getStatModsFromDefaultStatValues(module.player?.defaultStatValues || {});
	for (const config of configs.getConfigs()) {
		setConfigMods(config, module, defaultStatMods);
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

    /**@type {SimData[]} */
    const simDatas = configs.getConfigs().map(config => {
        /**@type {SimData} */
        const simData = {
            config,
            startLevel,
            endLevel,
            numIterations
        };
        return simData;
    });

    simDatas.forEach(async simData => {
        await simulate(simData);
        setCache(simData);
    });

	// chart.draw(simDatas);

	progressBar.container.classList.remove("active");
}

/**@param {SimData} simData */
async function simulate(simData){
    const {startLevel, endLevel, numIterations, config} = simData;
	const defaultStatMods = getStatModsFromDefaultStatValues(module.player?.defaultStatValues || {});

    const numConfigsToSimulate = configs.getConfigs().length - getCachedSims().length;
    const numLevelsToSimulate = endLevel - startLevel + 1;
    let simCounter = 0;
    if (numConfigsToSimulate * numLevelsToSimulate > 0) {
        progressBar.container.classList.add("active");
    }
    let now = performance.now();

    const cachedSimResult = getCache(simData);
    const cacheDirty = checkCacheDirty(simData, cachedSimResult);
    simData.results = [];
    return new Promise(async (resolve) => {
        for (let j = startLevel; j <= endLevel; j++) {
            /**@type {SimResult} */
            const simResult = {
                configId: simData.config.id,
                level: j,
                modDB: new ModDB(),
                value: 0,
            };
            simData.results[j - startLevel] = simResult;
            const simulators = getSimulators(config, j);
            if (cachedSimResult && !cacheDirty) {
                const statMods = cachedSimResult.statModLists[j - 1];
                simResult.modDB.add(statMods);
                calcStats(simResult);
            } else {
                simResult.modDB.add(defaultStatMods);
                for (let j = 0; j < numIterations; j++) {
                    for (const simulator of simulators) {
                        simResult.modDB.removeBySource(simulator);
                        const statMods = simulator.getStatMods();
                        simResult.modDB.add(statMods);
                    }
                    calcStats(simResult);
                }
            }
           

            if (performance.now() - now > 300) {
                now = performance.now();
                const pct = (simCounter / (numConfigsToSimulate * numLevelsToSimulate)) * 100;
                progressBar.text.textContent = `${pct.toFixed()}%`;
                //@ts-expect-error
                progressBar.element.style.width = `${pct}%`;

                await new Promise((resolve) => requestAnimationFrame(resolve));
            }
            simCounter++;
        }
        resolve();
    });
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

/**
 * @param {Config} config
 * @param {Modules.ModuleData} module
 * @param {StatModList} defaultStatMods
 *
 */
function setConfigMods(config, module, defaultStatMods) {
	const targetIds = config.targetIds;
	const statMods = defaultStatMods;
	{
		const mods = module.skills.attackSkills.filter((x) => x.mods.every((y) => modMatchIds([y.id], targetIds)));
		statMods.push(
			...mods.reduce((a, c) => {
				const attackSpeedStatMod = { name: "attackSpeed", valueType: "base", value: c.stats.attackSpeed };
				const baseDamageMultiplierStatMod = { name: "baseDamageMultiplier", valueType: "base", value: c.stats.baseDamageMultiplier };
				a.push([...c.mods.flatMap((x) => x.stats), attackSpeedStatMod, baseDamageMultiplierStatMod]);
				return a;
			}, [])
		);
	}
	if (module.skills.supportSkills) {
		const mods = module.skills.supportSkills.filter((x) => x.mods.every((y) => modMatchIds([y.id], targetIds)));
		statMods.push(
			...mods.reduce((a, c) => {
				if (
					modMatchIds(
						c.mods.map((x) => x.id),
						targetIds
					)
				) {
					a.push(c.mods.flatMap((x) => x.stats));
				}
				return a;
			}, [])
		);
	}
	if (module.items) {
		const mods = module.items.modTables.filter((x) => modMatchIds([x.id], targetIds)).flatMap((x) => x.mods);
		statMods.push(...mods.flatMap((x) => x.stats));
	}
	config.statModList = statMods;
}

/**
 * @param {string[]} ids1
 * @param {string[]} ids2
 * @returns {boolean}
 */
function modMatchIds(ids1, ids2) {
	return ids1.some((x) => ids2.some((y) => x === y));
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

/**@param {Config} config */
function getCacheKey(config) {
    return 'ds' + config.id;
}

/**
 * @typedef CacheObj
 * @property {number} startLevel
 * @property {number} endLevel
 * @property {number} numIterations
 * @property {StatModList[]} statModLists
 */

/**
 * @param {SimData} simData
 */
function setCache(simData) {
	const key = getCacheKey(simData.config);
    
	// const statMods = simData.results.map(x => x.modDB.getModList());
    /**@type {CacheObj} */
    const valueToCache = {
        startLevel: simData.startLevel,
        endLevel: simData.endLevel,
        numIterations: simData.numIterations,
        statModLists: simData.results.map(x => x.modDB.getModList())
    };
	const statModsStr = JSON.stringify(valueToCache);
	let uint8array = pako.gzip(statModsStr);
	const ascii = btoa(String.fromCharCode(...uint8array));
	sessionStorage.setItem(key, ascii);
}

/**
 * @param {SimData} simData
 * @returns {CacheObj}
 */
function getCache(simData) {
	const key = getCacheKey(simData.config);
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

function getCachedSims(){
    const values = [];
    for (const config of configs.getConfigs()) {
        const key = getCacheKey(config);
        const value = sessionStorage.getItem(key);
        if(value){
            values.push(value);
        }
    }
    return values;
}

/**
 * 
 * @param {SimData} simData 
 * @param {CacheObj} cache
 */
function checkCacheDirty(simData, cache){
    
    const moduleModList = [];
    const a = {
        startLevel: simData.startLevel,
        endLevel: simData.endLevel,
        numIterations: simData.numIterations,
        moduleModList,
    }
    return JSON.stringify(a) === JSON.stringify(cache);
}


/**
 * @typedef ModuleSimData
 * @property {{attackSkills: Skills.AttackSkill[], supports: Skills.SupportSkill[]}} skills
 * @property {{modTables: Items.ModTable[]}} items
 */

/**
 * returns and object containing the data from the module used in the simulation
 * @param {SimData} simData 
 * @returns {ModuleSimData}
 */
function getModuleSimData(simData){
    const {endLevel} = simData;
    const skills = {
        attackSkills: [],
        supports: []
    }

    //skills
    {
        const attackSkills = module.skills.attackSkills.filter(x => x.levelReq <= endLevel);
        skills.attackSkills.push(...attackSkills);

        if(module.skills.supportSkills){
            let supportSkills = module.skills.supportSkills.filter(x => x.levelReq <= endLevel);
            supportSkills = supportSkills.filter(support => {
                if(support.levelReq <= endLevel){
                    return;
                }
                if(modMatchIds(support.mods.map(x => x.id), simData.config.targetIds)){
                    return true;
                }
            });
        }
    }

    const items = {
        modTables: []
    }
    //items
    if(module.items){
        let modTables = module.items.modTables.filter(x => modMatchIds([x.id], simData.config.targetIds));
        modTables.forEach(x => {
            x.mods = x.mods.filter(x => x.levelReq <= endLevel);
        });

        items.modTables.push(...modTables);
    }

    return {
        skills,
        items
    }
}