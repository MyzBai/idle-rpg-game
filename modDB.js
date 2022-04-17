import { getModTemplate } from "./modTemplates.js";
import { ModFlags, Conditions } from "./damageCalc.js";
import { deepFreeze } from "./helperFunctions.js";

const modDescRegex = /{(?<v1>[0-9]+(?:\.[0-9]+)?)(?:-(?<v2>[0-9]+(?:\.[0-9]+)?))?}/g;
const templateDescRegex = /{[^}]*}/g; //finds the stat values
const keywordRegex = /{(?:([a-z])=([0-9,]+))?}/g; //[(key)=(indices)] only applies to a keyword string

/**
 * @param {Modifiers.Mod | Modifiers.Mod[]} mods
 * @param {any} source
 * @returns {Modifiers.StatMod[]}
 */
export function convertModToStatMods(mods, source = undefined) {
	if (Array.isArray(mods)) {
		let statMods = [];
		for (const mod of mods) {
			statMods.push(...convertModToStatMods(mod, source));
		}
		return statMods;
	}
	const mod = mods;
	const template = getModTemplate(mod.id);
	const templateDesc = template.desc;
	const modDesc = mod.desc;
	const modDescStats = [...modDesc.matchAll(modDescRegex)];
	const templateDescStats = [...templateDesc.matchAll(templateDescRegex)];

	if (modDescStats.length !== templateDescStats.length) {
		//TODO: Add a check in config to ignore errors and continue anyways
        const proceed = confirm('An error has occured!\nIf you continue, things may not work as intended');
        if(!proceed){
            throw new Error(`A Modifier with id: '${mod.id}' contains the wrong number of stat values. ${modDesc} must match with ${templateDesc}`)
        }
	}

	// const cleanTemplateDesc = templateDesc.replaceAll(/{[^}]*}/g, '{}');

	//run through the mod desc stats to get the values
    /**@type {{min: number, max?: number, value: number}[]} */
	const statValues = [];
	for (let i = 0; i < modDescStats.length; i++) {
		const min = parseFloat(modDescStats[i].groups.v1);
		const max = parseFloat(modDescStats[i].groups.v2) || undefined;
		const value = mod.stats?.[i].value ?? max ?? min;
		statValues[i] = { min, max, value };
	}

	const statMods = [];
	for (let i = 0; i < statValues.length; i++) {
        const statValue = statValues[i];
		const templateStat = template.stats[i];

        const statMod = Object.assign({}, templateStat, statValue);
        statMod.source = source;

        if(statMod.keyword?.index){
            const index = statMod.keyword.index;
            const keywordValue = statValues[index];
            Object.assign(statMod.keyword, keywordValue);
        }

		statMods.push(statMod);
	}
	deepFreeze(statMods);

	return statMods;
}

export class ModDB {
	constructor() {
		/**@type {Modifiers.StatMod[]} */
		let modList = [];

		/**@param {...Modifiers.StatMod} statModifiers */
		this.add = function (...statModifiers) {
			modList.push(...statModifiers);
		};

		this.removeBySource = function (source) {
			if (source) {
				modList = modList.filter((x) => x.source !== source);
			}
		};

		this.getModList = function () {
			return modList;
		};
	}
}
