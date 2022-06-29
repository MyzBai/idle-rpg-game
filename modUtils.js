import { convertRawMods, modRegexes } from "./mods.js";

/**
 * @param {Skills.AttackSkillStats} stats
 * @returns {{attackSpeed: StatMod, manaCost: StatMod, baseDamageMultiplier: StatMod}} */
export function extractAttackSkillStats(stats){
    return {
        attackSpeed: {name: 'attackSpeed', valueType: 'base', value: stats.attackSpeed},
        manaCost: {name: 'manaCost', valueType: 'base', value: stats.manaCost},
        baseDamageMultiplier: {name: 'baseDamageMultiplier', valueType: 'base', value: stats.baseDamageMultiplier},
    };
}

/**@param {Modules.ModuleData} module */
export function convertModuleMods(module) {
	{
		for (const skill of module.skills.attackSkills) {
			skill.mods = convertRawMods(skill.mods);
		}
		for (const skill of module.skills.supportSkills) {
			skill.mods = convertRawMods(skill.mods);
		}
	}

	if (module.items) {
        for (const table of module.items.modTables) {
            for (let i = 0; i < table.length; i++) {
                let mod = table[i].mod;
                table[i].mod = convertRawMods(mod)[0];
            }
        }
	}

    if(module.modTree){
        for (const node of module.modTree.nodes) {
            node.mods = convertRawMods(node.mods);
        }
    }
}

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