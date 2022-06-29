import { calcModTotal } from "./damageCalc.js";
import { deepFreeze, jsonCopy } from "./helperFunctions.js";

export const modRegexes = {
	modDesc: /{(?<v1>[0-9]+(?:\.[0-9]+)?)(?:-(?<v2>[0-9]+(?:\.[0-9]+)?))?}/g,
	templateDesc: /{[^}]*}/g,
};

/**@type {StatModFlags} */
export const statModFlags = Object.freeze({
	None: 0,
	Attack: 1,
	Bleed: 2,
});

export const keywordTypes = deepFreeze({
	perStat: "perStat",
});

export const valueTypes = deepFreeze({
	base: "base",
	inc: "inc",
	more: "more",
});
// export const statModNames = deepFreeze(getStatModNames());
// export const modTemplates = deepFreeze(getMods());

/**
 * @returns {Modifiers.ModList}
 */
// export function getModTemplateList() {
// 	return jsonCopy(Object.values(mods));
// }



export const statModNames = Object.freeze({
	damage: "damage",
	minPhysicalDamage: "minPhysicalDamage",
	maxPhysicalDamage: "maxPhysicalDamage",
	physicalDamage: "physicalDamage",
	minElementalDamage: "minElementalDamage",
	maxElementalDamage: "maxElementalDamage",
	elementalDamage: "elementalDamage",
	minChaosDamage: "minChaosDamage",
	maxChaosDamage: "maxChaosDamage",
	chaosDamage: "chaosDamage",
	hitChance: "hitChance",
	attackSpeed: "attackSpeed",
	critChance: "critChance",
	critMulti: "critMulti",
	bleedChance: "bleedChance",
	bleedCount: "bleedCount",
	duration: "duration",
	mana: "mana",
	manaRegen: "manaRegen",
	manaCost: "manaCost",
	strength: "strength",
	dexterity: "dexterity",
	intelligence: "intelligence",
});

/**
 *
 * @param {string} name
 * @param {number} value
 * @param {{flags?: number, keyword?: StatModKeyword}} param
 * @returns {StatMod}
 */
export function createBaseStatMod(name, value, { flags = 0, keyword } = {}) {
	let statMod = undefined;
	switch (name) {
		case "attackSpeed":
		case "manaCost":
			statMod = createStat(name, "base", { flags, keyword });
			break;
	}
	if (!statMod) {
		console.warn(`${name} is an invalid stat name`);
		return;
	}
	statMod.value = value;
	return statMod;
}

/**
 * @param {any} rawMods
 * @returns {ModList}
 */
export function convertRawMods(rawMods) {
	if (!rawMods) {
		return;
	}
	if (!Array.isArray(rawMods)) {
		rawMods = [rawMods];
	}

	const mods = [];
	for (const rawMod of rawMods) {
		mods.push(convert(rawMod));
	}
	return mods;

	/**
	 * @param {RawMod} rawMod
	 * @returns {Mod}
	 */
	function convert(rawMod) {
		if (!(typeof rawMod === "string")) {
            if(/**@type {Mod}*/(rawMod).id){
                console.warn('Mod has already been converted');
                return rawMod;
            }
			return;
		}
		const split = rawMod.split("|");
		const id = split[0];
		const desc = split[1];
		const template = jsonCopy(modTemplateList.find((x) => x.id === id));

		const modDescStats = [...desc.matchAll(modRegexes.modDesc)];
		const templateDescStats = [...template.desc.matchAll(modRegexes.templateDesc)];
		if (modDescStats.length !== templateDescStats.length) {
			//TODO: Add a check in config to ignore errors and continue anyways
			const proceed = confirm("An error has occured!\nIf you continue, things may not work as intended");
			if (!proceed) {
				throw new Error(`A Modifier with id: '${id}' contains the wrong number of stat values. ${desc} must match with ${template.desc}`);
			}
		}

		for (let i = 0; i < modDescStats.length; i++) {
			const min = parseFloat(modDescStats[i].groups.v1);
			const max = parseFloat(modDescStats[i].groups.v2) || undefined;
			const propDescriptor = {
				configurable: false,
				enumerable: true,
			};
			Object.defineProperties(template.stats[i], {
				min: {
					value: min,
					...propDescriptor,
				},
				max: {
					value: max,
					...propDescriptor,
				},
				value: {
					value: min,
					writable: max !== undefined,
					...propDescriptor,
				},
			});
		}

        return Object.freeze({...template, rawDesc: desc});
	}
}

/**
 * @typedef ModTemplate
 * @property {string} id
 * @property {string} desc
 * @property {StatModList} stats
 * @property {string}[rawDesc]
 * @type {ModTemplate[]} 
 */
export const modTemplateList = deepFreeze([
	{
		id: "moreDamage",
		desc: "{}% More Damage",
		stats: [{ name: statModNames.damage, valueType: valueTypes.more }],
	},
	{
		id: "basePhysicalDamage",
		desc: "Adds {} To {} Physical Damage",
		stats: [
			{ name: statModNames.physicalDamage, valueType: valueTypes.base },
			{ name: statModNames.physicalDamage, valueType: valueTypes.base },
		],
	},
	{
		id: "incPhysicalDamage",
		desc: "{}% Increased Physical Damage",
		stats: [{ name: statModNames.physicalDamage, valueType: valueTypes.inc }],
	},
	{
		id: "morePhysicalDamage",
		desc: "{}% More Physical Damage",
		stats: [{ name: statModNames.physicalDamage, valueType: valueTypes.more }],
	},
	{
		id: "baseHitChance",
		desc: "+{}% To Hit Chance",
		stats: [{ name: statModNames.hitChance, valueType: valueTypes.base }],
	},
	{
		id: "incAttackSpeed",
		desc: "{}% Increased Attack Speed",
		stats: [{ name: statModNames.attackSpeed, valueType: valueTypes.inc }],
	},
	{
		id: "moreAttackSpeed",
		desc: "{}% More Attack Speed",
		stats: [{ name: statModNames.attackSpeed, valueType: valueTypes.more }],
	},
	{
		id: "baseCritChance",
		desc: "+{}% To Critical Strike Chance",
		stats: [{ name: statModNames.critChance, valueType: valueTypes.base }],
	},
	{
		id: "baseCritMulti",
		desc: "+{}% To Critical Strike Multiplier",
		stats: [{ name: statModNames.critMulti, valueType: valueTypes.base }],
	},
	{
		id: "baseBleedChance",
		desc: "+{}% Chance To Bleed",
		stats: [{ name: statModNames.bleedChance, valueType: valueTypes.base }],
	},
	{
		id: "incBleedDamage",
		desc: "{}% Increased Bleed Damage",
		stats: [{ name: statModNames.physicalDamage, valueType: valueTypes.inc, flags: statModFlags.Bleed }],
	},
	{
		id: "moreBleedDamage",
		desc: "{}% More Bleed Damage",
		stats: [{ name: statModNames.physicalDamage, valueType: valueTypes.more, flags: statModFlags.Bleed }],
	},
	{
		id: "incBleedDuration",
		desc: "{}% Increased Bleed Duration",
		stats: [{ name: statModNames.duration, valueType: valueTypes.inc, flags: statModFlags.Bleed }],
	},
	{
		id: "baseBleedCount",
		desc: "+{} To Number Of Bleed Instances",
		stats: [{ name: statModNames.bleedCount, valueType: valueTypes.base }],
	},
	{
		id: "baseMaxMana",
		desc: "+{} To Maximum Mana",
		stats: [{ name: statModNames.mana, valueType: valueTypes.base }],
	},
	{
		id: "incMaxMana",
		desc: "{}% Increased Maximum Mana",
		stats: [{ name: statModNames.mana, valueType: valueTypes.inc }],
	},
	{
		id: "moreMaxMana",
		desc: "{}% More Maximum Mana",
		stats: [{ name: statModNames.mana, valueType: valueTypes.more }],
	},
	{
		id: "baseManaRegen",
		desc: "+{} To Mana Regeneration",
		stats: [{ name: statModNames.manaRegen, valueType: valueTypes.base }],
	},
	{
		id: "incManaRegen",
		desc: "{}% Increased Mana Regeneration",
		stats: [{ name: statModNames.manaRegen, valueType: valueTypes.inc }],
	},
	{
		id: "baseStrength",
		desc: "+{} To Strength",
		stats: [{ name: statModNames.strength, valueType: valueTypes.base }],
	},
	{
		id: "incStrength",
		desc: "{}% Increased Strength",
		stats: [{ name: statModNames.strength, valueType: valueTypes.inc }],
	},
	{
		id: "incPhysicalDamagePerBaseStrength",
		desc: "{}% Increased Physical Damage Per {} Strength",
		stats: [{ name: statModNames.physicalDamage, valueType: valueTypes.inc, keyword: { name: statModNames.strength, type: keywordTypes.perStat, index: 1 } }],
	},
	{
		id: "baseDexterity",
		desc: "+{} To Dexterity",
		stats: [{ name: statModNames.dexterity, valueType: valueTypes.base }],
	},
	{
		id: "incDexterity",
		desc: "{}% Increased Dexterity",
		stats: [{ name: statModNames.dexterity, valueType: valueTypes.inc }],
	},
	{
		id: "baseHitChancePerDexterity",
		desc: "+{}% To Hit Chance Per {} Dexterity",
		stats: [{ name: statModNames.hitChance, valueType: valueTypes.base, keyword: { name: statModNames.strength, type: keywordTypes.perStat, index: 1 } }],
	},
	{
		id: "baseIntelligence",
		desc: "+{} To Intelligence",
		stats: [{ name: statModNames.intelligence, valueType: valueTypes.base }],
	},
	{
		id: "incIntelligence",
		desc: "{}% Increased Intelligence",
		stats: [{ name: statModNames.intelligence, valueType: valueTypes.inc }],
	},
	{
		id: "baseManaPerIntelligence",
		desc: "+{} To Maximum Mana Per {} Intelligence",
		stats: [{ name: statModNames.mana, valueType: valueTypes.base, keyword: { name: statModNames.strength, type: keywordTypes.perStat, index: 1 } }],
	},
]);

/**
 *
 * @param {StatModList} statModList
 * @returns {ModCache}
 */
export function createModCache(statModList) {
	return Object.freeze({
		strength: calcModTotal(statModList, statModNames.strength),
		dexterity: calcModTotal(statModList, statModNames.dexterity),
		intelligence: calcModTotal(statModList, statModNames.intelligence),
		attackSpeed: calcModTotal(statModList, statModNames.attackSpeed),
		attackCost: calcModTotal(statModList, statModNames.manaCost, { flags: statModFlags.Attack }),
		manaRegen: calcModTotal(statModList, statModNames.manaRegen),
		maxMana: calcModTotal(statModList, statModNames.mana),
		bleedCount: calcModTotal(statModList, statModNames.bleedCount),
		bleedDuration: calcModTotal(statModList, statModNames.duration, { flags: statModFlags.Bleed }),
	});
}

/**
 * @param {string} name
 * @param {string} valueType
 * @param {{flags?: number, keyword?: StatModKeyword}} param
 * @returns {StatMod}
 */
export function createStat(name, valueType, { flags = 0, keyword } = {}) {
	const descriptor = {
		writable: false,
		enumerable: true,
	};
	return Object.defineProperties(
		{ name, valueType, flags, keyword },
		{
			name: descriptor,
			valueType: descriptor,
			flags: descriptor,
			keyword: descriptor,
		}
	);
}

/**
 * @param {StatName} name
 * @param {StatModKeywordType} type
 * @param {number} index
 * @returns {StatModKeyword}
 */
function createStatKeyword(name, type, index) {
	const descriptor = {
		writable: false,
		enumerable: true,
	};
	return Object.defineProperties(
		{ name, type, index },
		{
			name: descriptor,
			type: descriptor,
			index: descriptor,
		}
	);
}

/**@param {Object.<string, object>} statKeyValuePairs */
export function getStatModsFromDefaultStatValues(statKeyValuePairs) {
	statKeyValuePairs = statKeyValuePairs || {};
	const statMods = [];
	for (const [key, value] of Object.entries(statKeyValuePairs)) {
		let statMod = undefined;
		switch (key) {
			case "minPhysicalDamage":
			case "maxPhysicalDamage":
			case "attackSpeed":
			case "critChance":
			case "critMulti":
			case "bleedCount":
			case "mana":
			case "manaRegen":
			case "strength":
			case "dexterity":
			case "intelligence":
				statMod = createStat(key, "base");
				break;
			case "bleedDuration":
				statMod = createStat("duration", "base", { flags: statModFlags.Bleed });
				break;
		}
		if (value) {
			statMod.value = value;
			statMods.push(statMod);
		}
	}
	return statMods;
}

export class ModDB {
	constructor() {
		/**@type {{statMod: StatMod, source?: object}[]} */
		let modList = [];

		/**
		 * @param {StatMod | StatModList} statMods
		 * @param {object} [source]
		 */
		this.add = function (statMods, source) {
			if (!Array.isArray(statMods)) {
				statMods = [statMods];
			}
			for (const statMod of statMods) {
				modList.push({ statMod, source });
			}
		};

		this.removeBySource = function (source) {
			if (source) {
				modList = modList.filter((x) => x.source !== source);
			}
		};

		/**@returns {StatModList} */
		this.getModList = function () {
			return modList.map((x) => x.statMod);
		};
	}
}
