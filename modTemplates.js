/**
 * @typedef ModTemplate
 * @property {string} id
 * @property {string} desc
 * @property {StatMod[]} stats
 */

/**
 * @param {string} id
 * @returns {ModTemplate}
 */
export function getModTemplate(id) {
	const template = templates.find((x) => x.id === id);
	if (!template) {
		console.error(`mod with id: ${id} does not exists`);
		return;
	}
	return JSON.parse(JSON.stringify(template));
}

/**
 * @returns {ModTemplate[]}
 */
export function getModTemplateList() {
	return JSON.parse(JSON.stringify(templates));
}

/**@type {StatMod[]} */
const templates = [];

//Damage
templates.push({ id: "incPhysicalDamage", desc: "#% Increased Physical Damage", stats: [{ name: "physicalDamage", valueType: "inc" }] });
templates.push({ id: "incElementalDamage", desc: "#% Increased Elemental Damage", stats: [{ name: "elementalDamage", valueType: "inc" }] });
templates.push({ id: "incChaosDamage", desc: "#% Increased Chaos Damage", stats: [{ name: "chaosDamage", valueType: "inc" }] });

templates.push({ id: "moreDamage", desc: "#% More Damage", stats: [{ name: "damage", valueType: "more" }] });

templates.push({
	id: "basePhysicalDamage",
	desc: "Adds # To # Physical Damage",
	stats: [
		{ name: "minPhysicalDamage", valueType: "base" },
		{ name: "maxPhysicalDamage", valueType: "base" },
	],
});
templates.push({
	id: "baseElementalDamage",
	desc: "Adds # To # Elemental Damage",
	stats: [
		{ name: "minElementalDamage", valueType: "base" },
		{ name: "maxElementalDamage", valueType: "base" },
	],
});
templates.push({
	id: "baseChaosDamage",
	desc: "Adds # To # Chaos Damage",
	stats: [
		{ name: "minChaosDamage", valueType: "base" },
		{ name: "maxChaosDamage", valueType: "base" },
	],
});

//Hit Chance
templates.push({ id: "baseHitChance", desc: "+#% To Hit Chance", stats: [{ name: "hitChance", valueType: "base" }] });

//Crit
templates.push({ id: "baseCritChance", desc: "+#% To Critical Strike Chance", stats: [{ name: "critChance", valueType: "base" }] });
templates.push({ id: "baseCritMulti", desc: "+#% To Critical Strike Multiplier", stats: [{ name: "critMulti", valueType: "base" }] });

//Bleed
templates.push({ id: "baseBleedChance", desc: "+#% To Bleed Chance", stats: [{ name: "bleedChance", valueType: "base" }] });
templates.push({ id: "incBleedDamage", desc: "#% Increased Bleed Damage", stats: [{ name: "damage", valueType: "inc", flags: ["bleed"] }] });
templates.push({ id: "moreBleedDamage", desc: "#% More Bleed Damage", stats: [{ name: "damage", valueType: "more", flags: ["bleed"] }] });
templates.push({ id: "baseBleedDuration", desc: "Base Bleed Duration Is # Seconds", stats: [{ name: "duration", valueType: "base", flags: ["bleed"] }] });
templates.push({ id: "incBleedDuration", desc: "+#% To Bleed Duration", stats: [{ name: "duration", valueType: "inc", flags: ["bleed"] }] });
templates.push({ id: "maxBleedCount", stats: [{ name: "maxBleedCount", valueType: "base" }] });

//Attack Speed
templates.push({ id: "baseAttackSpeed", stats: [{ name: "attackSpeed", valueType: "base" }] });
templates.push({ id: "incAttackSpeed", desc: "#% Increased Attack Speed", stats: [{ name: "attackSpeed", valueType: "inc" }] });
templates.push({ id: "moreAttackSpeed", desc: "#% More Attack Speed", stats: [{ name: "attackSpeed", valueType: "more" }] });

//Mana
templates.push({ id: "baseMana", desc: "+# To Maximum Mana", stats: [{ name: "mana", valueType: "base" }] });
templates.push({ id: "incMana", desc: "+#% Increased Maximum Mana", stats: [{ name: "mana", valueType: "inc" }] });

templates.push({ id: "baseManaRegen", desc: "+# To Mana Regeneration", stats: [{ name: "manaRegen", valueType: "base" }] });
templates.push({ id: "incManaRegen", desc: "#% Increased Mana Regeneration", stats: [{ name: "manaRegen", valueType: "inc" }] });

//Attributes
templates.push({ id: "baseStrength", desc: "+# To Strength", stats: [{ name: "strength", valueType: "base" }] });
templates.push({ id: "incStrength", desc: "+#% Increased Strength", stats: [{ name: "strength", valueType: "inc" }] });

templates.push({ id: "baseDexterity", desc: "+# To Dexterity", stats: [{ name: "dexterity", valueType: "base" }] });
templates.push({ id: "incDexterity", desc: "+#% Increased Dexterity", stats: [{ name: "dexterity", valueType: "inc" }] });

templates.push({ id: "baseIntelligence", desc: "+# To Intelligence", stats: [{ name: "intelligence", valueType: "base" }] });
templates.push({ id: "incIntelligence", desc: "+#% Increased Intelligence", stats: [{ name: "intelligence", valueType: "inc" }] });




