
/**
 * @param {DamageCalc.StatsOutput} stats
 * @returns {DocumentFragment}
 */
export function getFormattedTableFragment(stats) {
	const formattedStats = getFormattedStats(stats);
	const frag = document.createDocumentFragment();
    const container = document.createElement('table');
    container.classList.add('g-formatted-stats');
    frag.appendChild(container);
	for (const stat of Object.values(formattedStats)) {
		const tr = document.createElement("tr");
        /**@type {string[]} */
        const split = stat.split(':');
		tr.insertAdjacentHTML("beforeend", `<td>${split[0].trim()}</td><td>${split[1].trim()}</td>`);
		container.appendChild(tr);
	}
	return frag;
}

/**
 * @param {DamageCalc.StatsOutput} stats
 * @returns {Stats.FormattedTextOutput}
 */
export function getFormattedStats(stats) {
    return {
        dps: `DPS :${(stats.dps).toFixed()}`,
        hitChance: `Hit Chance: ${(stats.hitChance * 100).toFixed()}%`,
        attackSpeed: `Attacks Per Second: ${stats.attackSpeed.toFixed(2)}`,
        physicalAttackDps: `Physical Attack Dps: ${stats.physicalAttackDps.toFixed(2)}`,
        physicalAttackDamage: `Physical Attack Damage: ${stats.minPhysicalAttackDamage.toFixed()}-${stats.maxPhysicalAttackDamage.toFixed()}`,
        critChance: `Crit Chance: ${(stats.critChance * 100).toFixed()}%`,
        critMulti: `Crit Multiplier: ${(stats.critMulti * 100).toFixed()}%`,
        bleedDps: `Bleed Dps: ${stats.bleedDps.toFixed(2)}`,
        bleedChance: `Bleed Chance: ${(stats.bleedChance * 100).toFixed()}%`,
        bleedStacks: `Maximum Bleed Stacks: ${(stats.bleedCount).toFixed()}`,
        mana: `Mana: ${stats.mana.toFixed()}`,
        manaRegen: `Mana Regeneration: ${stats.manaRegen.toFixed(2)}`,
        strength: `Strength: ${stats.strength.toFixed()}`,
        dexterity: `Dexterity: ${stats.dexterity.toFixed()}`,
        intelligence: `Intelligence: ${stats.intelligence.toFixed()}`,
    }
}
