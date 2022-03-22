import { ModFlags } from "./damageCalc.js";

/**
 * @typedef {import('./type-definitions.js').StatMod} StatMod
 * @typedef {import('./type-definitions.js').RawStatMod} RawStatMod
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

export class ModDB {
    constructor() {
        let modList = [];

        /**@param {StatMod | StatMod[]} statModifiers */
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