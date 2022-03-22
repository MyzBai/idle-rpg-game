import { avg, randomRange } from './helperFunctions.js'


/**@typedef {import('./type-definitions.js').StatMod} StatMod */
/**@typedef {import('./sub-modules/skills.js').AttackSkill} AttackSkill */
/**@typedef {import('./player.js').ModCache} ModCache */


/**
 * @typedef ConversionTable
 * @property {ConversionValues} [Physical]
 * @property {ConversionValues} [Elemental]
 * @property {ConversionValues} [Chaos]
 */

/**
 * @typedef ConversionValues
 * @property {number} [Physical]
 * @property {number} [Elemental]
 * @property {number} [Chaos]
 * @property {number} multi
 */


/**
 * @typedef Player
 * @property {StatMod[]} modList
 * @property {AttackSkill} attackSkill
 * @property {ConversionTable} conversionTable
 * @property {Attributes} attributes
 */

/**
 * @typedef DamageCalcConfiguration
 * @property {object} self
 * @property {object} other
 * @property {function} calcMinMax
 * @property {number} [flags]
 * @property {number} [conditions]
 * @property {ModCache} modCache
 */

/**
 * @typedef BaseDamage
 * @property {number} minDamage
 * @property {number} maxDamage
 * @property {number} baseDamage
 */

/**
 * @typedef BaseDamageOutput
 * @property {BaseDamage} physicalDamage
 * @property {BaseDamage} elementalDamage
 * @property {BaseDamage} chaosDamage
 * 
 */

/**
 * @typedef DamageAttackOutput
 * @property {number} totalDamage
 * @property {boolean} wasHit
 * @property {boolean} wasCrit
 * @property {{type: string, baseDamage: number, duration: number}[]} ailments
 */

/**
 * @typedef DamageStatsOutput
 * @property {number} dps
 * @property {number} avgDamage
 * @property {number} minPhysicalDamage
 * @property {number} maxPhysicalDamage
 * @property {number} minElementalDamage
 * @property {number} maxElementalDamage
 * @property {number} minChaosDamage
 * @property {number} maxChaosDamage
 * @property {number} minTotalCombinedDamage
 * @property {number} maxTotalCombinedDamage
 * @property {number} hitChance
 * @property {number} attackSpeed
 * @property {number} maxMana
 * @property {number} manaRegen
 * @property {number} critChance
 * @property {number} critMulti
 * @property {number} bleedChance
 * @property {number} minBleedDamage
 * @property {number} maxBleedDamage
 * @property {number} strength
 * @property {number} dexterity
 * @property {number} intelligence
 */

export const DamageTypes = ['Physical', 'Elemental', 'Chaos'];

export const DamageTypeFlags = {
    Physical: 1 << 0,
    Elemental: 1 << 1,
    Chaos: 1 << 2,
}

export const ModFlags = {
    Attack: 1 << 0,
    Ailment: 1 << 1,
    Bleed: 1 << 2,
    Ignite: 1 << 3,
    Poison: 1 << 4,
    DamageOverTime: 1 << 5,
}

export const Conditions = {

}

//Generates an array of arrays containing the mod names for each flag
//value of 3 are the 2 first bits, meaning physical and elemental damage
const damageNamesMetaTable = (() => {
    const names = [];
    const length = Object.values(DamageTypeFlags).reduce((a, v) => a + v);
    for (let i = 0; i <= length; i++) {
        const flagList = ['damage'];
        for (const [type, flag] of Object.entries(DamageTypeFlags)) {
            if (flag & i) {
                flagList.push(`${type.toLowerCase()}Damage`);
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
 * @returns {DamageAttackOutput} damage
 */
export function calcAttack(player) {

    /**@type {DamageAttackOutput} */
    var output = {
        totalDamage: 0,
        ailments: []
    };

    var config = {
        flags: ModFlags.Attack,
        self: player,
        calcMinMax: randomRange
    }

    var modList = player.modList;
    var conversionTable = player.conversionTable;
    var hitChance = calcModTotal(modList, ['hitChance'], config) / 100;

    output.wasHit = randomRange(0, 1) < hitChance;
    if (!output.wasHit) {
        return output;
    }

    var baseDamageResult = calcBaseDamage(modList, conversionTable, config);
    var totalBasePhysicalDamage = baseDamageResult.physicalDamage.baseDamage;
    var totalBaseElementalDamage = baseDamageResult.elementalDamage.baseDamage;
    var totalBaseChaosDamage = baseDamageResult.chaosDamage.baseDamage;
    var totalBaseDamage = totalBasePhysicalDamage + totalBaseElementalDamage + totalBaseChaosDamage;

    var critChance = calcModTotal(modList, ['critChance'], config) / 100;
    if (randomRange(0, 1) < critChance) {
        output.wasCrit = true;
        let critMulti = 1 + (calcModTotal(modList, ['critMulti']) / 100);
        totalBaseDamage *= critMulti;
    }

    //Bleed
    var bleedChance = calcModTotal(modList, ['bleedChance'], config) / 100;
    if (randomRange(0, 1) < bleedChance) {
        let { min, max, duration } = calcBleedDamage(player);
        let baseDamage = randomRange(min, max);
        output.ailments.push({ type: 'bleed', baseDamage, duration });
    }

    //Ignite

    //Poison

    output.totalDamage = totalBaseDamage;
    return output;
}

/**
 * @param {Player} player
 * @returns {DamageStatsOutput} output
 */
export function calcStats(player) {

    /**@type {DamageCalcConfiguration} */
    var config = {
        flags: attackFlags,
        self: player,
        calcMinMax: avg,
        modCache: player.modCache
    }

    /**@type {DamageStatsOutput} */
    const output = {};

    var modList = player.modList;
    output.hitChance = calcModTotal(modList, 'hitChance', config) / 100;
    output.hitChance = Math.min(100, Math.max(0, output.hitChance));
    output.attackSpeed = config.modCache.attackSpeed;
    output.maxMana = config.modCache.maxMana;
    output.manaRegen = config.modCache.manaRegen;
    output.critChance = calcModTotal(modList, 'critChance', config) / 100;
    output.critMulti = calcModTotal(modList, 'critMulti') / 100;
    output.strength = config.modCache.strength;
    output.dexterity = config.modCache.dexterity;
    output.intelligence = config.modCache.intelligence;

    let baseDamageResult = calcBaseDamage(modList, player.conversionTable, config);
    output.minPhysicalDamage = baseDamageResult.physicalDamage.minDamage;
    output.maxPhysicalDamage = baseDamageResult.physicalDamage.maxDamage;
    output.minElementalDamage = baseDamageResult.elementalDamage.minDamage;
    output.maxElementalDamage = baseDamageResult.elementalDamage.maxDamage;
    output.minChaosDamage = baseDamageResult.chaosDamage.minDamage;
    output.maxChaosDamage = baseDamageResult.chaosDamage.maxDamage;
    output.minTotalCombinedDamage = output.minPhysicalDamage + output.minElementalDamage + output.minChaosDamage;
    output.maxTotalCombinedDamage = output.maxPhysicalDamage + output.maxElementalDamage + output.maxChaosDamage;
    //dps
    {
        let avgDamage = avg(output.minTotalCombinedDamage, output.maxTotalCombinedDamage);
        let critDamage = avgDamage * (output.critChance * output.critMulti);
        output.dps = (avgDamage + critDamage) * output.attackSpeed * output.hitChance;
    }

    config.flags = bleedFlags;
    output.bleedChance = calcModTotal(modList, ['bleedChance'], config) / 100;
    var baseBleedDamage = calcAilmentBaseDamage(modList, player.attackSkill.conversionTable, 'Physical', config);
    output.minBleedDamage = baseBleedDamage.min;
    output.maxBleedDamage = baseBleedDamage.max;
    return output;
}

/**
 * @param {StatMod[]} modList 
 * @param {ConversionTable} conversionTable 
 * @param {DamageCalcConfiguration} config
 * @returns {BaseDamageOutput} output
 */
function calcBaseDamage(modList, conversionTable, config) {

    const output = {};
    let totalBaseDamage = 0;
    for (const damageType of DamageTypes) {
        var { min, max } = calcDamage(modList, conversionTable, damageType, config);
        const convMulti = conversionTable[damageType].multi;
        min *= convMulti;
        max *= convMulti;

        // output[`min${damageType}Damage`] = min;
        // output[`max${damageType}Damage`] = max;
        output[`${damageType.toLowerCase()}Damage`] = {}
        output[`${damageType.toLowerCase()}Damage`].minDamage = min;
        output[`${damageType.toLowerCase()}Damage`].maxDamage = max;
        let baseDamage = config.calcMinMax(min, max);
        output[`${damageType.toLowerCase()}Damage`].baseDamage = baseDamage;
        // output[`base${damageType}Damage`] = baseDamage;
        totalBaseDamage += baseDamage;
    }
    output.totalBaseDamage = totalBaseDamage;
    return output;
}

/**
 * @param {Player} player 
 */
function calcAttributes(player) {
    let attributes = {};
    attributes.strength = calcModTotal(player.modList, ['strength']);
    attributes.dexterity = calcModTotal(player.modList, ['dexterity']);
    attributes.intelligence = calcModTotal(player.modList, ['intelligence']);
    return attributes;
}

/**
 * @param {StatMod[]} modList 
 * @param {ConversionTable} conversionTable 
 * @param {string} damageType which damage type to calculate damage for
 * @param {DamageCalcConfiguration} config
 * @param {string} typeFlags used as index in damageNamesMetaTable
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

    if (addMin !== 0 && addMax !== 0){
        addMin = Math.ceil(addMin);
        addMax = Math.ceil(addMax);
    }

    const baseMin = calcModSum(modList, 'base', [`min${damageType}Damage`], config);
    const baseMax = calcModSum(modList, 'base', [`max${damageType}Damage`], config);

    const modNames = damageNamesMetaTable[typeFlags];
    const min = Math.round(calcModIncMore(modList, modNames, baseMin, config) + addMin);
    const max = Math.round(calcModIncMore(modList, modNames, baseMax, config) + addMax);
    return { min, max };
}


/**
 * @param {Player} player
 * @param {string} damageType
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
 * @param {boolean} calcDuration
 * @returns {{min: number, max: number, duration?: number}}
 */
export function calcBleedDamage(player) {
    var modList = player.modList;
    var config = { self: player, flags: bleedFlags };
    var { min, max } = calcAilmentBaseDamage(modList, undefined, 'Physical', config, 0);
    var output = { min, max }
    var bleedDuration = calcModTotal(modList, 'duration', config);
    output.duration = bleedDuration;
    return output;
}

/**
 * @param {StatMod[]} modList
 * @returns {ConversionTable}
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
            globalConv[otherDamageType] = calcModSum(modList, 'base', `${damageType.toLowerCase()}ConvertedTo${otherDamageType}`);
            globalTotal += globalConv[otherDamageType];
            skillConv[otherDamageType] = calcModSum(modList, 'base', `skill${damageType}ConvertedTo${otherDamageType}`);
            skillTotal += skillConv[otherDamageType];
            add[otherDamageType] = calcModSum(modList, 'base', `${damageType.toLowerCase()}GainAs${otherDamageType}`);
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
    conversionTable['Chaos'] = { multi: 1 };
    return conversionTable;
}

/**
 * @param {StatMod[]} modList 
 * @param {string | string[]} modNames
 * @param {DamageCalcConfiguration} [config] 
 */
export function calcModTotal(modList, modNames, config) {
    var base = calcModSum(modList, 'base', modNames, config);
    var total = calcModIncMore(modList, modNames, base, config);
    return total;
}

/**
 * @param {StatMod[]} modList 
 * @param {string | string[]} modNames 
 * @param {number} baseValue 
 * @param {DamageCalcConfiguration} config 
 */
export function calcModIncMore(modList, modNames, baseValue, config) {
    if (baseValue <= 0)
        return 0;
    var inc = 1 + (calcModSum(modList, 'inc', modNames, config) / 100); //divide by 100 because it's a multiplier, eg. 10% is 1 + 0.1 not 1 + 10
    var more = calcModSum(modList, 'more', modNames, config);
    return baseValue * inc * more;
}

/**
 * @param {StatMod[]} modList 
 * @param {string} valueType 
 * @param {string | string[]} modNames
 * @param {DamageCalcConfiguration} [config] 
 */
export function calcModSum(modList, valueType, modNames, config) {
    config = config || {};
    let flags = config.flags || 0;
    let result = valueType === 'more' ? 1 : 0;

    if (!Array.isArray(modNames)) {
        modNames = [modNames];
    }

    for (const modName of modNames) {
        const filteredModList = modList.filter(mod => {
            var modFlags = mod.flags || 0;
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
            if (filteredMod.keywords && config.modCache) {
                value = handleModKeywords(filteredMod, config);
            }
            if (valueType === 'more') {
                result *= (1 + (value / 100));
            } else {
                result += value;
            }
        }
    }

    if(Number.isNaN(result)){
        console.error("damageCalc.js/calcModSum returned a NAN. Expected a number", {valueType, modNames});
        return 0;
    }
    return result;
}

/**
 * @param {StatMod} mod
 * @param {DamageCalcConfiguration} [config]
 */
function handleModKeywords(mod, config) {
    let keywords = mod.keywords;
    for (const keyword of keywords) {
        if (keyword.type === 'perStat') {
            let statValue = config.modCache[keyword.name];
            let value = statValue * mod.value;
            return value;
        }
    }

}