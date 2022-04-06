import { ModFlags, Conditions } from "./damageCalc.js";
import { getModTemplate } from "./modTemplates.js";

/**
 * @typedef {import('./modTemplates.js').ModTemplate} ModTemplate
 */

/**
 * @typedef Mod
 * @property {string} id
 * @property {{value: number}[]} stats
 */

/**
 * @param {Mod | Mod[]} mods
 * @returns {StatMod[]}
 */
export function convertModToStatMods(mods, source = undefined) {

    if(Array.isArray(mods)){
        let statMods = [];
        for (const mod of mods) {
            statMods.push(...convertModToStatMods(mod, source));
        }
        return statMods;
    }
    const mod = mods;

	const template = getModTemplate(mod.id);
	if (template.stats.length !== mod.stats.length) {
		console.error("mod does not match template");
		return [];
	}

	const statMods = [];
	for (let i = 0; i < template.stats.length; i++) {
		const statValue = mod.stats[i].value;
		const statMod = template.stats[i];
		statMod.value = statValue;
		statMod.source = source;
		statMod.flags = statMod.flags ? statMod.flags.reduce((a, c) => a | ModFlags[c], 0) : 0;
		statMod.conditions = statMod.flags ? statMod.flags.reduce((a, c) => a | Conditions[c], 0) : 0;
		Object.freeze(statMod);
		statMods.push(statMod);
	}
	return statMods;
}

export class ModDB {
	constructor() {
		let modList = [];

		/**@param {StatMod | StatMod[]} statModifiers */
		this.add = function (statModifiers) {
			if (!Array.isArray(statModifiers)) {
				statModifiers = [statModifiers];
			}
			modList.push(...statModifiers);
		};

		this.removeBySource = function (source) {
			modList = modList.filter((x) => x.source !== source);
		};

		this.getModList = function () {
			return modList;
		};
	}
}
