
/**@typedef {import('./type-definitions.js').RawStatMod} RawStatModifier */



/**
 * @param {string} id
 * @returns {RawStatModifier} 
 */
export function getStatModifierTemplate(id) {
    const template = templates.find(x => x.id === id);
    if (!template) {
        console.error(`mod with id: ${id} does not exists`);
        return;
    }
    return JSON.parse(JSON.stringify(template));
}

export function getModTemplateList(){
    return JSON.parse(JSON.stringify(templates));
}

const templates = [];

//Damage
templates.push({ id: "incPhysicalDamage", desc: "#% Increased Physical Damage", stats: [{ name: "physicalDamage", valueType: "inc" }] });
templates.push({ id: "incElementalDamage", desc: "#% Increased Elemental Damage", stats: [{ name: "elementalDamage", valueType: "inc" }] });
templates.push({ id: "incChaosDamage", desc: "#% Increased Chaos Damage", stats: [{ name: "chaosDamage", valueType: "inc" }] });

templates.push({ id: "moreDamage", desc: "#% More Damage", stats: [{ name: "damage", valueType: "inc" }] });


templates.push({ id: "basePhysicalDamage", desc: "Adds # To # Physical Damage", stats: [{ name: "minPhysicalDamage", valueType: "base" }, { name: "maxPhysicalDamage", valueType: "base" }] });
templates.push({ id: "baseElementalDamage", desc: "Adds # To # Elemental Damage", stats: [{ name: "minElementalDamage", valueType: "base" }, { name: "maxElementalDamage", valueType: "base" }] });
templates.push({ id: "baseChaosDamage", desc: "Adds # To # Chaos Damage", stats: [{ name: "minChaosDamage", valueType: "base" }, { name: "maxChaosDamage", valueType: "base" }] });


//Hit Chance
templates.push({ id: "hitChance", desc: "+#% To Hit Chance", stats: [{ name: "hitChance", valueType: "base" }] });

//Crit
templates.push({ id: "critChance", desc: "+#% To Critical Strike Chance", stats: [{ name: "critChance", valueType: "base" }] });
templates.push({ id: "critMulti", desc: "+#% To Critical Strike Multiplier", stats: [{ name: "critMulti", valueType: "base" }] });

//Bleed
templates.push({ id: "bleedChance", desc: "+#% To Bleed Chance", stats: [{ name: "bleedChance", valueType: "base" }] });
templates.push({ id: "incBleedDamage", desc: "#% Increased Bleed Damage", stats: [{ name: "damage", valueType: "inc", flags: ['Bleed'] }] });
templates.push({ id: "moreBleedDamage", desc: "#% More Bleed Damage", stats: [{ name: "damage", valueType: "more", flags: ['Bleed'] }] });

//Attack Speed
templates.push({ id: "incAttackSpeed", desc: "#% Increased Attack Speed", stats: [{ name: "attackSpeed", valueType: "inc" }] });
templates.push({ id: "moreAttackSpeed", desc: "#% More Attack Speed", stats: [{ name: "attackSpeed", valueType: "more" }] });

//Mana
templates.push({ id: "baseMana", desc: "+# To Maximum Mana", stats: [{ name: "mana", valueType: "base" }] });
templates.push({ id: "incMana", desc: "+#% Increased Maximum Mana", stats: [{ name: "mana", valueType: "inc" }] });

templates.push({ id: "baseManaRegen", desc: "+# To Maximum Mana", stats: [{ name: "mana", valueType: "base" }] });
templates.push({ id: "incManaRegen", desc: "#% Increased Mana Regeneration", stats: [{ name: "manaRegen", valueType: "inc" }] });

//Attributes
templates.push({ id: "baseStrength", desc: "+# To Strength", stats: [{ name: "strength", valueType: "base" }] });
templates.push({ id: "incStrength", desc: "+#% Increased Strength", stats: [{ name: "strength", valueType: "inc" }] });

templates.push({ id: "baseDexterity", desc: "+# To Dexterity", stats: [{ name: "dexterity", valueType: "base" }] });
templates.push({ id: "incDexterity", desc: "+#% Increased Dexterity", stats: [{ name: "dexterity", valueType: "inc" }] });

templates.push({ id: "baseIntelligence", desc: "+# To Intelligence", stats: [{ name: "intelligence", valueType: "base" }] });
templates.push({ id: "incIntelligence", desc: "+#% Increased Intelligence", stats: [{ name: "intelligence", valueType: "inc" }] });