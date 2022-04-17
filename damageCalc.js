import { avg, randomRange, toCamelCasePropertyName } from "./helperFunctions.js";
// import * as player from './player.js';

/**
 * @typedef Player
 * @property {Modifiers.ModList} modList
 * @property {Modifiers.ModCache} modCache
 * @property {DamageCalc.ConversionTable} conversionTable
 */

export const DamageTypes = ["physical", "elemental", "chaos"];

export const DamageTypeFlags = {
	physical: 1 << 0,
	elemental: 1 << 1,
	chaos: 1 << 2,
};

export const ModFlags = {
	/**@param {number} value @param {...number} flags */
	hasFlags: (value, ...flags) => flags.every((flag) => flag & value),
	Attack: 1 << 0,
	Ailment: 1 << 1,
	Bleed: 1 << 2,
	Ignite: 1 << 3,
	Poison: 1 << 4,
	DamageOverTime: 1 << 5,
};

export const Conditions = {};

//Generates an array of arrays containing the mod names for each flag
//value of 3 are the 2 first bits, meaning physical and elemental damage
const damageNamesMetaTable = (() => {
	const names = [];
	const length = Object.values(DamageTypeFlags).reduce((a, v) => a + v);
	for (let i = 0; i <= length; i++) {
		const flagList = ["damage"];
		for (const [type, flag] of Object.entries(DamageTypeFlags)) {
			if (flag & i) {
				flagList.push(toCamelCasePropertyName(type, "damage"));
			}
		}
		names.push(flagList);
	}
	return names;
})();

const attackFlags = ModFlags.Attack;
const bleedFlags = ModFlags.Ailment | ModFlags.Bleed | ModFlags.DamageOverTime;

/**
 * @param {Player} player
 * @returns {DamageCalc.AttackOutput} damage
 */
export function calcAttack(player) {
	/**@type {DamageCalc.AttackOutput} */
	var output = {
		totalDamage: 0,
		ailments: [],
	};

	var config = {
		flags: ModFlags.Attack,
		self: player,
		calcMinMax: randomRange,
	};

	var modList = player.modList;
	var conversionTable = player.conversionTable;
	var hitChance = calcModTotal(modList, "hitChance", config) / 100;

	output.wasHit = randomRange(0, 1) < hitChance;
	if (!output.wasHit) {
		return output;
	}

	var baseDamageResult = calcBaseDamage(modList, conversionTable, config);
	var totalBasePhysicalDamage = baseDamageResult.physical.value;
	var totalBaseElementalDamage = baseDamageResult.elemental.value;
	var totalBaseChaosDamage = baseDamageResult.chaos.value;
	var totalBaseDamage = totalBasePhysicalDamage + totalBaseElementalDamage + totalBaseChaosDamage;

	var critChance = calcModTotal(modList, "critChance", config) / 100;
	if (randomRange(0, 1) < critChance) {
		output.wasCrit = true;
		let critMulti = 1 + calcModTotal(modList, "critMulti") / 100;
		totalBaseDamage *= critMulti;
	}

	//Bleed
	var bleedChance = calcModTotal(modList, "bleedChance", config) / 100;
	if (randomRange(0, 1) < bleedChance) {
		config.flags = ModFlags.Bleed;
		const baseDamage = calcBleedDamage(player, config);
		const duration = calcModTotal(modList, "duration", config);
		/**@type {Ailments.Instance} */
		const ailment = {
			type: "bleed",
			damage: baseDamage,
			duration,
		};
		output.ailments.push(ailment);
	}

	//Ignite

	//Poison

	output.totalDamage = totalBaseDamage;
	return output;
}

/**
 * @param {Player} player
 * @returns {DamageCalc.StatsOutput}
 */
export function calcStats(player) {
	/**@type {DamageCalc.Configuration} */
	var config = {
		flags: attackFlags,
		self: player,
		calcMinMax: avg,
		modCache: player.modCache,
	};

	/**@type {DamageCalc.StatsOutput} */
	const output = {};

	var modList = player.modList;
	output.hitChance = calcModTotal(modList, "hitChance", config) / 100;
	output.hitChance = Math.min(100, Math.max(0, output.hitChance));
	output.attackSpeed = config.modCache.attackSpeed;
	output.maxMana = config.modCache.maxMana;
	output.manaRegen = config.modCache.manaRegen;
	output.critChance = calcModTotal(modList, "critChance", config) / 100;
	output.critMulti = calcModTotal(modList, "critMulti") / 100;
	output.strength = config.modCache.strength;
	output.dexterity = config.modCache.dexterity;
	output.intelligence = config.modCache.intelligence;

	let baseDamageResult = calcBaseDamage(modList, player.conversionTable, config);
	output.minPhysicalDamage = baseDamageResult.physical.min;
	output.maxPhysicalDamage = baseDamageResult.physical.max;
	output.minElementalDamage = baseDamageResult.elemental.min;
	output.maxElementalDamage = baseDamageResult.elemental.max;
	output.minChaosDamage = baseDamageResult.chaos.min;
	output.maxChaosDamage = baseDamageResult.chaos.max;
	output.minTotalCombinedDamage = output.minPhysicalDamage + output.minElementalDamage + output.minChaosDamage;
	output.maxTotalCombinedDamage = output.maxPhysicalDamage + output.maxElementalDamage + output.maxChaosDamage;
	//dps
	{
		let avgDamage = avg(output.minTotalCombinedDamage, output.maxTotalCombinedDamage);
		let critDamage = avgDamage * (output.critChance * output.critMulti);
		output.dps = (avgDamage + critDamage) * output.attackSpeed * output.hitChance;
	}

	{
		config.flags = bleedFlags;
		output.bleedChance = calcModTotal(modList, "bleedChance", config) / 100;
		var baseBleedDamage = calcAilmentBaseDamage(modList, player.conversionTable, "physical", config);
		output.minBleedDamage = baseBleedDamage.min;
		output.maxBleedDamage = baseBleedDamage.max;
	}

	return output;
}

/**
 * @param {Modifiers.StatMod[]} modList
 * @param {DamageCalc.ConversionTable} conversionTable
 * @param {DamageCalc.Configuration} config
 * @returns {DamageCalc.BaseDamageOutput}
 */
function calcBaseDamage(modList, conversionTable, config) {
	const output = {};
	for (const damageType of DamageTypes) {
		var { min, max } = calcDamage(modList, conversionTable, damageType, config);
		const convMulti = conversionTable[damageType].multi;
		min *= convMulti;
		max *= convMulti;

		const baseDamage = config.calcMinMax(min, max);
		output[damageType] = {
			min,
			max,
			value: baseDamage,
		};
	}
	/**@type {DamageCalc.BaseDamageOutput} */
	return output;
}

/**
 * @param {Modifiers.ModList} modList
 * @param {DamageCalc.ConversionTable} conversionTable
 * @param {string} damageType which damage type to calculate damage for
 * @param {DamageCalc.Configuration} config
 * @param {number} typeFlags used as index in damageNamesMetaTable
 * @returns {{min: number, max: number}} {min, max}
 */
function calcDamage(modList, conversionTable, damageType, config, typeFlags = 0) {
	typeFlags |= DamageTypeFlags[damageType];

	let addMin = 0;
	let addMax = 0;

	for (const otherType of DamageTypes) {
		if (otherType === damageType || !conversionTable) {
			break;
		}

		const convMulti = conversionTable[otherType][damageType];
		if (convMulti > 0) {
			const { min, max } = calcDamage(modList, conversionTable, otherType, config, typeFlags);
			addMin += Math.ceil(min * convMulti);
			addMax += Math.ceil(max * convMulti);
		}
	}

	if (addMin !== 0 && addMax !== 0) {
		addMin = Math.ceil(addMin);
		addMax = Math.ceil(addMax);
	}

	const baseMin = calcModSum(modList, "base", toCamelCasePropertyName("min", damageType, "damage"), config);
	const baseMax = calcModSum(modList, "base", toCamelCasePropertyName("max", damageType, "damage"), config);

	const modNames = damageNamesMetaTable[typeFlags];
	const min = Math.round(calcModIncMore(modList, modNames, baseMin, config) + addMin);
	const max = Math.round(calcModIncMore(modList, modNames, baseMax, config) + addMax);
	return { min, max };
}

/**
 * @param {Modifiers.ModList} modList
 * @param {DamageCalc.ConversionTable} conversionTable
 * @param {DamageCalc.DamageType} damageType
 * @param {DamageCalc.Configuration} config
 * @param {number} typeFlags
 * @returns {{min: number, max: number}}
 */
function calcAilmentBaseDamage(modList, conversionTable, damageType, config, typeFlags = 0) {
	var { min, max } = calcDamage(modList, conversionTable, damageType, config, typeFlags);
	if (conversionTable) {
		min *= conversionTable[damageType].multi;
		max *= conversionTable[damageType].multi;
	}
	return { min, max };
}

/**
 * @param {Player} player
 * @returns {number} baseDamage
 */
export function calcBleedDamage(player, config) {
	config.flags &= ModFlags.Bleed & ModFlags.Ailment;
	var modList = player.modList;
	var { min, max } = calcAilmentBaseDamage(modList, player.conversionTable, "physical", config, 0);
	var value = config.calcMinMax(min, max);
	return value;
}

/**
 * @param {Modifiers.StatMod[]} modList
 * @returns {DamageCalc.ConversionTable}
 */
export function createConversionTable(modList) {
	var conversionTable = {};
	for (let i = 0; i < DamageTypes.length; i++) {
		const damageType = DamageTypes[i];
		const globalConv = {};
		const skillConv = {};
		const add = {};
		let globalTotal = 0;
		let skillTotal = 0;

		for (let j = i + 1; j < DamageTypes.length; j++) {
			const otherDamageType = DamageTypes[j];
			globalConv[otherDamageType] = calcModSum(modList, "base", toCamelCasePropertyName(damageType, "converted-to", otherDamageType));
			globalTotal += globalConv[otherDamageType];
			skillConv[otherDamageType] = calcModSum(modList, "base", toCamelCasePropertyName("skill", damageType, "converted-to", otherDamageType));
			skillTotal += skillConv[otherDamageType];
			add[otherDamageType] = calcModSum(modList, "base", toCamelCasePropertyName(damageType, "gain-as", otherDamageType));
		}

		if (skillTotal > 100) {
			const fac = 100 / skillTotal;
			for (const [key, value] of Object.entries(skillConv)) {
				skillConv[key] = value * fac;
			}
			for (const key in Object.keys(globalConv)) {
				globalConv[key] = 0;
			}
		} else if (globalTotal + skillTotal > 100) {
			const fac = (100 - skillTotal) / globalTotal;
			for (const [key, value] of Object.entries(globalConv)) {
				globalConv[key] = value * fac;
			}
			globalTotal *= fac;
		}

		const conversionValues = { multi: 1 };
		for (const [key, value] of Object.entries(globalConv)) {
			const skillConvValue = skillConv[key] || 0;
			const addValue = add[key] || 0;
			conversionValues[key] = (value + skillConvValue + addValue) / 100;
		}
		const multi = 1 - Math.min((globalTotal + skillTotal) / 100, 1);
		conversionValues.multi = multi;
		conversionTable[damageType] = conversionValues;
	}
	conversionTable["chaos"] = { multi: 1 };
	return conversionTable;
}

/**
 * @param {Modifiers.StatMod[]} modList
 * @param {string | string[]} modNames
 * @param {DamageCalc.Configuration} [config]
 */
export function calcModTotal(modList, modNames, config) {
	var base = calcModSum(modList, "base", modNames, config);
	var total = calcModIncMore(modList, modNames, base, config);
	return total;
}

/**
 * @param {Modifiers.StatMod[]} modList
 * @param {string | string[]} modNames
 * @param {number} baseValue
 * @param {DamageCalc.Configuration} config
 */
export function calcModIncMore(modList, modNames, baseValue, config) {
	if (baseValue <= 0) return 0;
	var inc = 1 + calcModSum(modList, "inc", modNames, config) / 100; //divide by 100 because it's a multiplier, eg. 10% is 1 + 0.1 not 1 + 10
	var more = calcModSum(modList, "more", modNames, config);
	return baseValue * inc * more;
}

/**
 * @param {Modifiers.StatMod[]} modList
 * @param {string} valueType
 * @param {string | string[]} modNames
 * @param {DamageCalc.Configuration} [config]
 */
export function calcModSum(modList, valueType, modNames, config) {
	config = config || {};
	let flags = config.flags || 0;
	let result = valueType === "more" ? 1 : 0;

	if (!Array.isArray(modNames)) {
		modNames = [modNames];
	}

	for (const modName of modNames) {
		const filteredModList = modList.filter((mod) => {
			var modFlags = mod?.flags || 0;
			if (mod.name !== modName) {
				return false;
			}
			if (mod.valueType !== valueType) {
				return false;
			}

			if ((modFlags & flags) !== modFlags) {
				return false;
			}
			return true;
		});
		for (const filteredMod of filteredModList) {
			let value = filteredMod.value;
			if (filteredMod.keyword) {
				value = handleModKeywords(filteredMod, modList, config);
			}
			if (valueType === "more") {
				result *= 1 + value / 100;
			} else {
				result += value;
			}
		}
	}

	if (Number.isNaN(result)) {
		console.error("damageCalc.js/calcModSum returned a NAN. Expected a number", { valueType, modNames });
		return 0;
	}
	return result;
}

/**
 * @param {Modifiers.StatMod} statMod
 * @param {Modifiers.ModList} modList
 * @param {DamageCalc.Configuration} [config]
 */
function handleModKeywords(statMod, modList, config) {
    const keyword = statMod.keyword;
	let value = 0;
	let statValue = 0;
	switch (statMod.keyword.type) {
		case "perStat":
			statValue = config.modCache[keyword.name] || calcModTotal(modList, keyword.name, config);
			value = statMod.value * (1 / keyword.value * statValue);
			break;
	}
	return value;
}
