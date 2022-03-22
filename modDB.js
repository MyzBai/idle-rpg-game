import { ModFlags } from "./damageCalc.js";

/**
 * @typedef StatKeyword
 * @property {string} name
 * @property {string} type
 */

/**
 * Raw stat modifier with flags/conditions as string arrays
 * @typedef RawStatMod
 * @property {string} name
 * @property {number} [value]
 * @property {string} valueType
 * @property {string[]} [flags]
 * @property {string[]} [conditions]
 * @property {StatKeyword[]} [keywords]
 */

/**
 * Final stat modifier with flags/conditions as a number
 * @typedef StatMod
 * @property {number} value
 * @property {string} valueType
 * @property {string} name
 * @property {number} flags
 * @property {number} conditions
 * @property {StatKeyword[]} [keywords]
 * @property {object} [source]
 */

/**
 * @param {RawStatMod | RawStatMod[]} rawStatMods
 * @returns {StatMod[]}
 */
export function convertStatMods(rawStatMods, source = undefined) {

    const statMods = [];
    if (Array.isArray(rawStatMods)) {
        for (const rawStatMod of rawStatMods) {
            statMods.push(...convertStatMods(rawStatMod, source));
        }
        return statMods;
    }


    var flags = rawStatMods.flags ? rawStatMods.flags.reduce((a, b) => a | ModFlags[b], 0) : 0;
    const conditions = 0;
    // var conditions = mod.conditions ? mod.conditions.reduce((a, b) => b ? a | ConditionFlags[b] : 0, 0) : 0;
    /**@type {StatMod} */
    var newMod = {
        name: rawStatMods.name,
        value: rawStatMods.value,
        valueType: rawStatMods.valueType,
        flags,
        conditions,
        keywords: rawStatMods.keywords,
        source
    }
    Object.freeze(newMod);
    statMods.push(newMod);
    return statMods;
}


/**
 * @typedef StatModifier
 * @property {string} name
 * @property {number} value
 * @property {string} valueType
 * @property {number} [flags]
 * @property {number} [conditions]
 * @property {object} [source]
 * @property {object[]} [keywords]
 */


export class ModDB {
    constructor() {
        let modList = [];

        /**@param {StatModifier | StatModifier[]} statModifiers */
        this.add = function (statModifiers) {
            modList.push(...statModifiers);
        };

        this.removeBySource = function (source) {
            modList = modList.filter(x => x.source !== source);
        };

        this.getModList = function () {
            return modList;
        };
    }
}