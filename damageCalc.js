import { avg, clamp01, randomRange, toCamelCasePropertyName } from "./helperFunctions.js";
import { statModNames, statModFlags } from "./mods.js";

/**
 * @typedef Player
 * @property {StatModList} statModList
 * @property {ModCache} modCache
 * @property {DamageCalc.ConversionTable} conversionTable
 */

/**@type {DamageCalc.DamageTypes} */
export const damageTypes = { physical: "physical", elemental: "elemental", chaos: "chaos" };
Object.freeze(damageTypes);

/**@type {DamageCalc.DamageType[]} */
const damageTypesStrings = Object.seal(Object.values(damageTypes));

export const DamageTypeFlags = {
	physical: 1 << 0,
	elemental: 1 << 1,
	chaos: 1 << 2,
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

/**
 * @param {Player} player
 * @returns {DamageCalc.AttackOutput} damage
 */
export function calcAttack(player) {
	/**@type {DamageCalc.AttackOutput} */
	const output = {
		totalDamage: 0,
		ailments: [],
	};

	const config = {
		flags: statModFlags.Attack,
		self: player,
		calcMinMax: randomRange,
	};

	var modList = player.statModList;
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
		config.flags = statModFlags.Bleed;
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
 * @param {DamageCalc.StatsInput} input
 * @returns {DamageCalc.StatsOutput}
 */
export function calcStats(input) {
	const { statModList, conversionTable, modCache } = input;
	const calcMinMax = input.calcMinMax ?? avg;

	/**@type {DamageCalc.Configuration} */
	const config = {
		flags: statModFlags.Attack,
		calcMinMax,
		modCache,
	};

	const hitChance = calcModTotal(statModList, statModNames.hitChance, config) / 100;
	const attackSpeed = config.modCache.attackSpeed;
	const mana = config.modCache.maxMana;
	const manaRegen = config.modCache.manaRegen;
	const critChance = clamp01(calcModTotal(statModList, statModNames.critChance, config) / 100);
	const critMulti = Math.max(1, calcModTotal(statModList, statModNames.critMulti) / 100);
	const strength = config.modCache.strength;
	const dexterity = config.modCache.dexterity;
	const intelligence = config.modCache.intelligence;
	const critMultiFactor = 1 + (critChance * critMulti);

    const physicalDamage = (function(){
        const baseDamageResult = calcBaseDamage(statModList, conversionTable, config);
        const minPhysicalAttackDamage = baseDamageResult.physical.min * critMultiFactor * hitChance;
        const maxPhysicalAttackDamage = baseDamageResult.physical.max * critMultiFactor * hitChance;
        const avgPhysicalAttackDamage = avg(minPhysicalAttackDamage, maxPhysicalAttackDamage);

        const physicalAttackDps = avgPhysicalAttackDamage * attackSpeed * hitChance;
        return {
            minPhysicalAttackDamage,
            maxPhysicalAttackDamage,
            avgPhysicalAttackDamage,
            physicalAttackDps
        }
    })();

	const minTotalAttackDamage = physicalDamage.minPhysicalAttackDamage;
    const maxTotalAttackDamage = physicalDamage.maxPhysicalAttackDamage;
    const avgTotalAttackDamage = physicalDamage.avgPhysicalAttackDamage;


	//bleed
	

	const bleed = (function () {
		config.flags = statModFlags.Bleed;
		const { min, max } = calcAilmentBaseDamage(statModList, conversionTable, damageTypes.physical, config);
		const avgBleedDamage = avg(min, max);
		const bleedChance = clamp01(calcModTotal(statModList, statModNames.bleedChance, config) / 100);
		const bleedDuration = Math.max(0.001, calcModTotal(statModList, statModNames.duration, config));
		const bleedCount = calcModBase(statModList, statModNames.bleedCount, config);

		const numStacksPerSecond = Math.min(bleedCount, bleedDuration * attackSpeed * bleedChance);
        const bleedDps = avgBleedDamage * numStacksPerSecond;
        
		return {
			bleedDps,
			bleedChance,
            bleedDuration,
			bleedCount,
		};
	})();

    const dps = physicalDamage.physicalAttackDps + bleed.bleedDps;
    
	return {
		dps,
        physicalAttackDps: physicalDamage.physicalAttackDps,
		minPhysicalAttackDamage: physicalDamage.minPhysicalAttackDamage,
        maxPhysicalAttackDamage: physicalDamage.maxPhysicalAttackDamage,
		bleedDps: bleed.bleedDps,
		bleedChance: bleed.bleedChance,
        bleedCount: bleed.bleedCount,
        bleedDuration: bleed.bleedDuration,
        minTotalAttackDamage,
        maxTotalAttackDamage,
		attackSpeed: modCache.attackSpeed,
		critChance: critChance,
		critMulti: critMulti,
		hitChance: hitChance,
		mana,
		manaRegen,
		strength,
		dexterity,
		intelligence,
        attackCost: modCache.attackCost
	};
}

/**
 * @param {StatMod[]} modList
 * @param {DamageCalc.ConversionTable} conversionTable
 * @param {DamageCalc.Configuration} config
 * @returns {DamageCalc.BaseDamageOutput}
 */
function calcBaseDamage(modList, conversionTable, config) {
	const output = {};
	for (const damageType of damageTypesStrings) {
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
 * @param {StatModList} modList
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

	for (const otherType of damageTypesStrings) {
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
 * @param {StatModList} modList
 * @param {DamageCalc.ConversionTable} conversionTable
 * @param {DamageCalc.DamageType} damageType
 * @param {DamageCalc.Configuration} config
 * @param {number} typeFlags
 * @returns {{min: number, max: number}}
 */
function calcAilmentBaseDamage(modList, conversionTable, damageType, config, typeFlags = 0) {
	let { min, max } = calcDamage(modList, conversionTable, damageType, config, typeFlags);
	if (conversionTable) {
		min *= conversionTable[damageType].multi;
		max *= conversionTable[damageType].multi;
	}
	return { min, max };
}

/**
 * @param {Player} player
 * @param {DamageCalc.Configuration} [config]
 * @returns {number} baseDamage
 */
export function calcBleedDamage(player, config) {
	config.flags = statModFlags.Bleed;
	const modList = player.statModList;
	const { min, max } = calcAilmentBaseDamage(modList, player.conversionTable, damageTypes.physical, config);
	const value = config.calcMinMax(min, max);
	return value;
}

/**
 * @param {StatModList} modList
 * @returns {DamageCalc.ConversionTable}
 */
export function createConversionTable(modList) {
	const conversionTable = {};
	for (let i = 0; i < damageTypesStrings.length; i++) {
		const damageType = damageTypesStrings[i];
		const globalConv = {};
		const skillConv = {};
		const add = {};
		let globalTotal = 0;
		let skillTotal = 0;

		for (let j = i + 1; j < damageTypesStrings.length; j++) {
			const otherDamageType = damageTypesStrings[j];
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
 * @param {StatMod[]} modList
 * @param {string | string[]} modNames
 * @param {DamageCalc.Configuration} [config]
 */
export function calcModBase(modList, modNames, config) {
	return calcModSum(modList, "base", modNames, config);
}

/**
 * @param {StatMod[]} modList
 * @param {string | string[]} modNames
 * @param {DamageCalc.Configuration} [config]
 */
export function calcModInc(modList, modNames, config) {
	return Math.max(0, 1 + calcModSum(modList, "inc", modNames, config) / 100);
}

/**
 * @param {StatMod[]} modList
 * @param {string | string[]} modNames
 * @param {DamageCalc.Configuration} [config]
 */
export function calcModMore(modList, modNames, config) {
	//already starts at 1 and divides by 100
	return Math.max(0, calcModSum(modList, "more", modNames, config));
}

/**
 * @param {StatMod[]} modList
 * @param {string | string[]} modNames
 * @param {DamageCalc.Configuration} [config]
 */
export function calcModTotal(modList, modNames, config) {
	const base = calcModSum(modList, "base", modNames, config);
	const total = calcModIncMore(modList, modNames, base, config);
	return total;
}

/**
 * @param {StatMod[]} modList
 * @param {string | string[]} modNames
 * @param {number} baseValue
 * @param {DamageCalc.Configuration} [config]
 */
export function calcModIncMore(modList, modNames, baseValue, config) {
	if (baseValue <= 0) {
		return 0;
	}
	const inc = calcModInc(modList, modNames, config);
	const more = calcModMore(modList, modNames, config);
	return baseValue * inc * more;
}

/**
 * @param {StatMod[]} modList
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
			const modFlags = mod?.flags || 0;
			if (mod.name !== modName) {
				return false;
			}
			if (mod.valueType !== valueType) {
				return false;
			}

			if ((flags & modFlags) !== modFlags) {
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
	return Math.max(0, result);
}

/**
 * @param {StatMod} statMod
 * @param {StatModList} modList
 * @param {DamageCalc.Configuration} [config]
 */
function handleModKeywords(statMod, modList, config) {
	const keyword = statMod.keyword;
	let value = 0;
	let statValue = 0;
	switch (statMod.keyword.type) {
		case "perStat":
			statValue = config.modCache[keyword.name] || calcModTotal(modList, keyword.name, config);
			value = statMod.value * ((1 / keyword.value) * statValue);
			break;
	}
	return value;
}
