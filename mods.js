import { calcModTotal } from "./damageCalc.js";
import { deepFreeze } from "./helperFunctions.js";

export const modRegexes = {
	modDesc: /{(?<v1>[0-9]+(?:\.[0-9]+)?)(?:-(?<v2>[0-9]+(?:\.[0-9]+)?))?}/g,
	templateDesc: /{[^}]*}/g,
};

/**@type {StatModFlags} */
export const statModFlags = Object.freeze({
    None: 0,
    Attack: 1,
    Bleed: 2
});

export const keywordTypes = deepFreeze({
	perStat: "perStat",
});

export const valueTypes = deepFreeze({
	base: "base",
	inc: "inc",
	more: "more",
});
export const statModNames = deepFreeze(getStatModNames());
export const modTemplates = deepFreeze(getMods());

export const modTemplateList = (function () {
	const templateList = Object.values(modTemplates);
	return templateList;
})();

/**
 * @param {string} id
 * @returns {Mod}
 */
export function getModTemplateById(id) {
	const template = modTemplates[id];
	if (!template) {
		console.error(`mod with id: ${id} does not exists`);
		return;
	}
	return JSON.parse(JSON.stringify(template));
}

/**
 * @returns {Modifiers.ModList}
 */
// export function getModTemplateList() {
// 	return jsonCopy(Object.values(mods));
// }

/**
 * @param {string} description
 * @param {StatModList} stats
 */
export function parseModDescription(description, stats) {
	let i = 0;
	return description.replaceAll(modRegexes.templateDesc, function () {
		const stat = stats[i++];
		const numDescimals = stat.min.toString().match(/\.\d+/)?.[0].length - 1 || 0;
		return stat.value.toFixed(numDescimals);
	});
}

function getStatModNames() {
	return {
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
	};
}

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
 * @typedef RawMod
 * @property {string} id
 * @property {string} description
 *
 * @param {RawMod | RawMod[]} rawMods
 * @returns {Mod[]} rawMods
 */
export function convertRawMods(rawMods) {
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
		const { id, description } = rawMod;

		const template = getModTemplateById(id);

		const modDescStats = [...description.matchAll(modRegexes.modDesc)];
		const templateDescStats = [...template.description.matchAll(modRegexes.templateDesc)];
		if (modDescStats.length !== templateDescStats.length) {
			//TODO: Add a check in config to ignore errors and continue anyways
			const proceed = confirm("An error has occured!\nIf you continue, things may not work as intended");
			if (!proceed) {
				throw new Error(`A Modifier with id: '${id}' contains the wrong number of stat values. ${rawMod.description} must match with ${template.description}`);
			}
		}

		for (let i = 0; i < modDescStats.length; i++) {
			const min = parseFloat(modDescStats[i].groups.v1);
			const max = parseFloat(modDescStats[i].groups.v2) || undefined;
			Object.defineProperties(template.stats[i], {
				min: {
					value: min,
					configurable: false,
				},
				max: {
					value: max,
					configurable: false,
				},
				value: {
					value: min,
                    configurable: false,
					writable: max !== undefined,
                    enumerable: true
				},
			});
		}
        // rawMod.description = template.description;
        Object.defineProperty(rawMod, 'description', {
            value: template.description,
            configurable: false
        });
        Object.defineProperty(rawMod, 'stats', {
            value: template.stats,
            configurable: false
        });
		return template;
	}
}

function getMods() {
	return {
		moreDamage: createMod("moreDamage", "{}% More Damage", [createStat(statModNames.damage, valueTypes.more)]),
		basePhysicalDamage: createMod("basePhysicalDamage", "Adds {} To {} Physical Damage", [
			createStat(statModNames.minPhysicalDamage, valueTypes.base),
			createStat(statModNames.maxPhysicalDamage, valueTypes.base),
		]),
		incPhysicalDamage: createMod("incPhysicalDamage", "{}% Increased Physical Damage", [createStat(statModNames.physicalDamage, valueTypes.inc)]),
		morePhysicalDamage: createMod("morePhysicalDamage", "{}% More Physical Damage", [createStat(statModNames.physicalDamage, valueTypes.more)]),
		baseHitChance: createMod("baseHitChance", "+{}% To Hit Chance", [createStat(statModNames.hitChance, valueTypes.base)]),
		incAttackSpeed: createMod("incAttackSpeed", "{}% Increased Attack Speed", [createStat(statModNames.attackSpeed, valueTypes.inc)]),
		moreAttackSpeed: createMod("moreAttackSpeed", "{}% More Attack Speed", [createStat(statModNames.attackSpeed, valueTypes.more)]),
		baseCritChance: createMod("baseCritChance", "+{}% To Critical Strike Chance", [createStat(statModNames.critChance, valueTypes.base)]),
		baseCritMulti: createMod("baseCritMulti", "+{}% To Critical Strike Multiplier", [createStat(statModNames.critMulti, valueTypes.base)]),
		//bleed
		baseBleedChance: createMod("baseBleedChance", "+{}% Chance To Bleed", [createStat(statModNames.bleedChance, valueTypes.base, { flags: statModFlags.Bleed })]),
		incBleedDamage: createMod("incBleedDamage", "+{}% Increaed Bleed Damage", [createStat(statModNames.physicalDamage, valueTypes.inc, { flags: statModFlags.Bleed })]),
		moreBleedDamage: createMod("moreBleedDamage", "{}% More Bleed Damage", [createStat(statModNames.physicalDamage, valueTypes.more, { flags: statModFlags.Bleed })]),
		baseBleedDuration: createMod("baseBleedDuration", "+{} To Bleed Duration", [createStat(statModNames.duration, valueTypes.base, { flags: statModFlags.Bleed })]),
		incBleedDuration: createMod("incBleedDuration", "+{}% Increased Bleed Duration", [createStat(statModNames.duration, valueTypes.inc, { flags: statModFlags.Bleed })]),
		baseBleedCount: createMod("baseBleedCount", "+{} To Number Of Bleed Instances", [createStat(statModNames.bleedCount, valueTypes.inc)]),
		//mana
		baseMaxMana: createMod("baseMaxMana", "+{} To Maximum Mana", [createStat(statModNames.mana, valueTypes.base)]),
		incMaxMana: createMod("incMaxMana", "+{}% Increased Maximum Mana", [createStat(statModNames.mana, valueTypes.inc)]),
		moreMaxMana: createMod("moreMaxMana", "+{}% More Maximum Mana", [createStat(statModNames.mana, valueTypes.more)]),
		baseManaRegen: createMod("baseManaRegen", "+{} To Mana Regeneration", [createStat(statModNames.manaRegen, valueTypes.base)]),
		incManaRegen: createMod("incManaRegen", "+{}% Increased Mana Regeneration", [createStat(statModNames.manaRegen, valueTypes.inc)]),
		moreManaRegen: createMod("moreManaRegen", "+{}% More Mana Regeneration", [createStat(statModNames.manaRegen, valueTypes.more)]),

		//attributes
		//strength
		baseStrength: createMod("baseStrength", "+{} To Strength", [createStat(statModNames.strength, valueTypes.base)]),
		incStrength: createMod("incStrength", "+{}% Increased Strength", [createStat(statModNames.strength, valueTypes.inc)]),
		moreStrength: createMod("moreStrength", "+{}% More Strength", [createStat(statModNames.strength, valueTypes.more)]),
		incPhysicalDamagePerBaseStrength: createMod("incPhysicalDamagePerBaseStrength", "{}% Increased Physical Damage Per {} Strength", [
			createStat(statModNames.physicalDamage, valueTypes.inc, { keyword: createStatKeyword(statModNames.strength, keywordTypes.perStat, 1) }),
		]),
		//dexterity
		baseDexterity: createMod("baseDexterity", "+{} To Dexterity", [createStat(statModNames.dexterity, valueTypes.base)]),
		incDexterity: createMod("incDexterity", "+{}% Increased Dexterity", [createStat(statModNames.dexterity, valueTypes.inc)]),
		moreDexterity: createMod("moreDexterity", "+{}% More Dexterity", [createStat(statModNames.dexterity, valueTypes.more)]),
		baseHitChancePerBaseDexterity: createMod("baseHitChancePerBaseDexterity", "+{}% To Hit Chance Per {} Dexterity", [
			createStat(statModNames.hitChance, valueTypes.base, { keyword: createStatKeyword(statModNames.dexterity, keywordTypes.perStat, 1) }),
		]),
		//intelligence
		baseIntelligence: createMod("baseIntelligence", "+{} To Intelligence", [createStat(statModNames.intelligence, valueTypes.base)]),
		incIntelligence: createMod("incIntelligence", "+{}% Increased Intelligence", [createStat(statModNames.intelligence, valueTypes.inc)]),
		moreIntelligence: createMod("moreIntelligence", "+{}% More Intelligence", [createStat(statModNames.intelligence, valueTypes.more)]),
		baseMaxManaPerBaseIntelligence: createMod("baseMaxManaPerBaseIntelligence", "+{}% To Maximum Mana Per {} Intelligence", [
			createStat(statModNames.mana, valueTypes.base, { keyword: createStatKeyword(statModNames.intelligence, keywordTypes.perStat, 1) }),
		]),
	};
}

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
 *
 * @param {string} id
 * @param {string} description
 * @param {StatModList} stats
 * @returns
 */
function createMod(id, description, stats) {
    const descriptor = {
        writable: false
    }
    return Object.defineProperties({id, description, stats}, {
        id: descriptor,
        description: descriptor,
        stats: descriptor,
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
        writable: false
    }
    return Object.defineProperties({name, valueType, flags, keyword}, {
        name: descriptor,
        valueType: descriptor,
        flags: descriptor,
        keyword: descriptor
    });
}

/**
 * @param {StatName} name
 * @param {StatModKeywordType} type
 * @param {number} index
 * @returns {StatModKeyword}
 */
function createStatKeyword(name, type, index) {
    const descriptor = {
        writable: false
    }
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
