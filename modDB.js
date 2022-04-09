import { getModTemplate } from "./modTemplates.js";
import { ModFlags, Conditions } from "./damageCalc.js";
/**
 * @param {Modifiers.Mod | Modifiers.Mod[]} mods
 * @param {any} source
 * @returns {Modifiers.StatMod[]}
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
        //@ts-expect-error
		statMod.flags = statMod.flags ? statMod.flags.reduce((a, c) => a | ModFlags[c], 0) : 0;
        //@ts-expect-error
		statMod.conditions = statMod.flags ? statMod.flags.reduce((a, c) => a | Conditions[c], 0) : 0;
		Object.freeze(statMod);
		statMods.push(statMod);
	}
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
            if(source){
                modList = modList.filter((x) => x.source !== source);
            }
		};

		this.getModList = function () {
			return modList;
		};
	}
}
