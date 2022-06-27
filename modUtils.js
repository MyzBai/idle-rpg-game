import { convertRawMods } from "./mods.js";

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