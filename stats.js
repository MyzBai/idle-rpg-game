import * as damageCalc from './damageCalc.js';
import * as player from './player.js';

const statsContainer = document.querySelector('body .p-game .s-stats .s-stats-container');
const statFieldTemplate = statsContainer.querySelector('template');

export function update() {
    var result = damageCalc.calcStats({modList: player.getModList(), modCache: player.getModCache(), conversionTable: player.getConversionTable()});

    statsContainer.replaceChildren();

    //dps
    createStatLabel('Dps:', `${result.dps.toFixed(2)}`);
    //chance to hit
    createStatLabel('Hit Chance:', `${(result.hitChance * 100).toFixed()}%`);
    //attacks per second
    createStatLabel('Attacks Per Second:', `${(result.attackSpeed).toFixed(2)}`);
    //max regen
    createStatLabel('Maximum Mana:', `${result.maxMana.toFixed()}`);
    //mana regen
    createStatLabel('Mana Regeneration Per Second:', `${(result.manaRegen).toFixed(1)}`);
    //total combined damage
    createStatLabel('Total Combined Damage:', `${result.minTotalCombinedDamage.toFixed()} - ${result.maxTotalCombinedDamage.toFixed()}`);
    //physical
    createStatLabel('Physical Damage:', `${result.minPhysicalDamage.toFixed()} - ${result.maxPhysicalDamage.toFixed()}`);
    //elemental
    if (result.minElementalDamage + result.maxElementalDamage > 0) {
        createStatLabel('Elemental Damage:', `${result.minElementalDamage.toFixed()} - ${result.maxElementalDamage.toFixed()}`);
    }
    //chaos
    if (result.minChaosDamage + result.maxChaosDamage > 0) {
        createStatLabel('Chaos Damage:', `${result.minChaosDamage.toFixed()} - ${result.maxChaosDamage.toFixed()}`);
    }
    //crit
    if (result.critChance > 0) {
        createStatLabel('Crit Chance:', `${(result.critChance * 100).toFixed()}%`);
        createStatLabel('Crit Multi:', `${(result.critMulti * 100).toFixed()}%`);
    }
    //bleed
    if (result.bleedChance > 0) {
        createStatLabel('Bleed Chance:', `${(result.bleedChance * 100).toFixed()}%`);
        createStatLabel('Bleed Damage:', `${result.minBleedDamage.toFixed()} - ${result.maxBleedDamage.toFixed()}`);
    }

    createStatLabel('Strength:', `${result.strength.toFixed()}`);
    createStatLabel('Dexterity:', `${result.dexterity.toFixed()}`);
    createStatLabel('Intelligence:', `${result.intelligence.toFixed()}`);
}

/**
 * @param {string} text
 * @param {string} valueText
 */
function createStatLabel(text, valueText) {
    
    const fieldElement = statFieldTemplate.content.cloneNode(true);
    //@ts-expect-error
    fieldElement.firstElementChild.children[0].textContent = text;
    //@ts-expect-error
    fieldElement.firstElementChild.children[1].textContent = valueText;
    statsContainer.appendChild(fieldElement);
}