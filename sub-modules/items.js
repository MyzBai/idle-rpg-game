import { randomRange, parseModDescription, weightedRandom, deepFreeze } from "../helperFunctions.js";
import { getStatModifierTemplate, getModTemplateList } from '../modTemplates.js';
import * as player from '../player.js';
import { convertStatMods } from "../modDB.js";
import { registerSave, registerLoad } from '../save.js';
import * as eventListener from '../eventListener.js';

/**@typedef {import('../type-definitions.js').RawStatMod} RawStatModifier */

/**
 * @typedef ConfigItems
 * @property {string} name
 * @property {number} levelReq
 */

/**
 * @typedef Config
 * @property {ConfigItems} items
 * @property {object} [basic]
 */

/**
 * @typedef ItemsJson
 * @property {Config} config
 * @property {Mods} mods
 */

/**
 * @typedef Modifier
 * @property {string} id
 * @property {string} desc
 * @property {number} levelReq
 * @property {number} weight
 * @property {number} tableIndex
 * @property {number} tableSize
 * @property {RawStatModifier[]} stats
 */


const itemList = document.querySelector('.s-items .s-item-list');
const craftingContainer = document.querySelector('.s-items .s-item-options');
const itemElement = document.querySelector('.s-items .s-item');

/**@type {Item[]} */
var items = [];

/**@type {Item} */
var selectedItem = undefined;

/**@type {Modifier[]} */
var modCollection = [];

var maxMods = 6;

export async function init(data) {
    if (!data) {
        return;
    }

    console.log('init items');
    var config = data.config;
    maxMods = config.maxMods || maxMods;

    modCollection = [];
    modCollection.push(...data.mods.reduce((a, c) => {
        const { id, table } = c;
        const tableSize = table.length;
        let tableIndex = 0;
        for (const mod of table) {
            let { levelReq, weight, stats } = mod;
            levelReq = levelReq || 1;
            let modTemplate = getStatModifierTemplate(id);
            for (let i = 0; i < stats.length; i++) {
                let statTemplate = modTemplate.stats[i];
                stats[i].name = statTemplate.name;
                stats[i].valueType = statTemplate.valueType;
                stats[i].flags = statTemplate.flags;
                stats[i].conditions = statTemplate.conditions;
                stats[i].keywords = statTemplate.keywords;
            }
            a.push({
                id,
                desc: modTemplate.desc,
                levelReq,
                weight,
                stats,
                tableSize,
                tableIndex
            });
            tableIndex++;
        }
        return a;
    }, []));
    deepFreeze(modCollection);

    createItems(data.items);

    selectedItem = undefined;
    showItem(items[0]);

    if (data.crafting.basic) {
        setupBasicCrafting(data.crafting.basic);
    }

    eventListener.add(eventListener.EventType.ITEM_CHANGED, item => {
        applyItemModifiers(item);
    });

    registerSave(save);
    registerLoad(load);
}

function createItems(itemsFromjson) {
    items = [];
    itemList.replaceChildren();
    for (const itemData of itemsFromjson) {
        const item = new Item(itemData.name);
        items.push(item);
        createItemButton(item);
    }
}

/**@param {Item} item */
function createItemButton(item) {
    const btn = document.createElement('div');
    btn.textContent = item.name;
    btn.addEventListener('click', e => { showItem(item); })
    itemList.appendChild(btn);
}

/**@param {Item} item */
function showItem(item) {

    itemList.querySelectorAll('div').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === item.name);
    });
    selectedItem = item;

    itemElement.replaceChildren();
    for (const mod of item.getMods()) {
        const el = document.createElement('label');
        el.textContent = parseModDescription(mod.desc, mod.stats.map(x => x.value));
        itemElement.appendChild(el);
    }
    eventListener.invoke(eventListener.EventType.ITEM_CHANGED, item);
}

//Crafting
function setupBasicCrafting(basicCraftings) {

    const { config, actions } = basicCraftings;
    const basicCraftingElement = craftingContainer.querySelector('.s-basic');
    basicCraftingElement.classList.add('active');

    if (actions.rollMods) {
        const { weights, tierTargets } = actions.rollMods;
        const element = basicCraftingElement.querySelector('.s-roll-mods');
        element.classList.add('active');
        
        const tierSelectElement = element.querySelector('.tier');
        const tierTargetOptions = createTierTargetOptions(tierTargets, tierSelectElement);
        let tierTarget = tierTargetOptions[0].name;
        let cost = tierTargetOptions[0].cost;
        const costSpan = element.querySelector('.cost span');
        costSpan.textContent = cost;
        tierSelectElement.addEventListener('change', e => {
            const selectedIndex = e.target.selectedIndex;
            cost = tierTargetOptions[selectedIndex].cost;
            costSpan.textContent = cost;
            tierTarget = tierTargetOptions[selectedIndex].name;
            if (player.getEssenceAmount() < cost) {
                craftButton.disabled = true;
            }
        });
        const craftButton = element.querySelector('button');
        craftButton.addEventListener('click', e => {
            rollModifiers(selectedItem, weights, tierTarget);
            showItem(selectedItem);
            player.changeEssenceAmount(-cost);
        });

        const validateCraft = () => {
            const canAfford = player.getEssenceAmount() >= cost;
            return canAfford;
        }
        craftButton.disabled = !validateCraft();
        eventListener.add(eventListener.EventType.ESSENCE_CHANGED, item => {
            craftButton.disabled = !validateCraft();
        });
        eventListener.add(eventListener.EventType.ITEM_CHANGED, item => {
            craftButton.disabled = !validateCraft();
        });
    }
    if (actions.addMod) {
        const { tierTargets } = actions.addMod;
        const element = basicCraftingElement.querySelector('.s-add-mod');
        element.classList.add('active');

        const tierSelectElement = element.querySelector('.tier');
        const tierTargetOptions = createTierTargetOptions(tierTargets, tierSelectElement);
        let tierTarget = tierTargetOptions[0].name;
        const costSpan = element.querySelector('.cost span');
        let cost = tierTargetOptions[0].cost;
        costSpan.textContent = cost;
        tierSelectElement.addEventListener('change', e => {
            const selectedIndex = e.target.selectedIndex;
            cost = tierTargetOptions[selectedIndex].cost;
            costSpan.textContent = cost;
            tierTarget = tierTargetOptions[selectedIndex].name;
            if (player.getEssenceAmount() < cost) {
                craftButton.disabled = true;
            }
        });

        const craftButton = element.querySelector('button');

        craftButton.addEventListener('click', e => {
            addModifier(selectedItem, tierTarget);
            showItem(selectedItem);
            player.changeEssenceAmount(-cost);
        });

        const validateCraft = () => {
            const canAfford = player.getEssenceAmount() >= cost;
            const hasMaxMods = selectedItem.getMods().length >= maxMods;
            return canAfford && !hasMaxMods;
        }
        craftButton.disabled = !validateCraft();
        eventListener.add(eventListener.EventType.ESSENCE_CHANGED, amount => {
            craftButton.disabled = !validateCraft();
        });
        eventListener.add(eventListener.EventType.ITEM_CHANGED, item => {
            craftButton.disabled =!validateCraft();
        });

    }
    if (actions.rollValues) {
        const element = basicCraftingElement.querySelector('.s-roll-values');
        element.classList.add('active');

        const costSpan = element.querySelector('.cost span');
        let cost = actions.rollValues.cost;
        costSpan.textContent = cost;

        const craftButton = element.querySelector('button');

        craftButton.addEventListener('click', e => {
            rollValues(selectedItem);
            showItem(selectedItem);
            player.changeEssenceAmount(-cost);
        });

        const validateCraft = () => {
            return player.getEssenceAmount() >= cost;
        }
        craftButton.disabled = !validateCraft();
        eventListener.add(eventListener.EventType.ESSENCE_CHANGED, () => {
            craftButton.disabled = !validateCraft();
        });
        eventListener.add(eventListener.EventType.ITEM_CHANGED, () => {
            craftButton.disabled = !validateCraft();
        });
    }
    if(actions.remove){
        const element = basicCraftingElement.querySelector('.s-remove');
        element.classList.add('active');

        const costSpan = element.querySelector('.cost span');
        let cost = actions.rollValues.cost;
        costSpan.textContent = cost;

        const craftButton = element.querySelector('button');

        craftButton.addEventListener('click', e => {
            removeRandom(selectedItem);
            showItem(selectedItem);
            player.changeEssenceAmount(-cost);
        });
        const validateCraft = () => {
            const hasMods = selectedItem.getMods().length != 0;
            const canAfford = player.getEssenceAmount() >= cost;
            return hasMods && canAfford;
        }
        craftButton.disabled = !validateCraft();
        eventListener.add(eventListener.EventType.ESSENCE_CHANGED, () => {
            craftButton.disabled = !validateCraft();
        });
        eventListener.add(eventListener.EventType.ITEM_CHANGED, () => {
            craftButton.disabled = !validateCraft();
        });
    }
}

function createTierTargetOptions(tierTargets, element) {
    const tierTargetOptions = [];
    if(tierTargets.random){
        tierTargetOptions.push({ name: "random", cost: tierTargets.random.cost });
        const option = document.createElement('option');
        option.textContent = "Random Tier";
        element.appendChild(option);
    }
    if(tierTargets.lucky){
        tierTargetOptions.push({ name: "lucky", cost: tierTargets.lucky.cost });
        const option = document.createElement('option');
        option.textContent = "Lucky Tier";
        element.appendChild(option);
    }
    if(tierTargets.max){
        tierTargetOptions.push({ name: "max", cost: tierTargets.max.cost });
        const option = document.createElement('option');
        option.textContent = "Max Tier";
        element.appendChild(option);
    }
    return tierTargetOptions;
}

/**
 * @param {Item} item 
 * @param {number[]} weights
 * @param {string} tierTarget
*/
function rollModifiers(item, weights, tierTarget) {
    let mods = item.getMods();
    for (const mod of mods) {
        item.removeModifier(mod);
    }

    if (weights.length != maxMods) {
        console.error("weights.length not equal to max mods");
        return;
    }
    let numMods = weightedRandom(weights) + 1;
    for (let i = 0; i < numMods; i++) {
        addModifier(item, tierTarget);
    }
}
/** 
 * @param {Item} item
 * @param {string} tierTarget  
 */
function addModifier(item, tierTarget) {
    if (item.getMods().length >= maxMods) {
        console.error("item already at max mods");
        return;
    }
    const level = player.getLevel();
    const mod = generateModifiers(level, 1, tierTarget, item.getMods())[0];
    if (!mod) {
        console.error('No modifier available');
        return;
    }
    item.addModifier(mod);

}
/** @param {Item} item  */
function rollValues(item) {
    const mods = item.getMods();
    for (const mod of mods) {
        for (const stat of mod.stats) {
            stat.value = randomRange(stat.min, stat.max);
        }
    }
}
/** @param {Item} item  */
function removeRandom(item) {
    const mods = item.getMods();
    if (mods.length === 0) {
        console.error("no modifiers can be removed. expected more than 1 modifier on the item");
        return;
    }
    let index = Math.floor(randomRange(0, mods.length));
    console.log(index);
    let modToRemove = mods[index];
    item.removeModifier(modToRemove);
}
/** 
 * @param {number} level  
 * @param {number} amount
 * @param {string} tierTarget
 * @param {Modifier[]} existingMods  
 * */
function generateModifiers(level, amount, tierTarget, existingMods = []) {

    const out = [];
    for (let i = 0; i < amount; i++) {
        let validMods = [];
        validMods.push(...modCollection.filter(x => x.levelReq <= level && !out.some(y => y.id === x.id) && !existingMods.some(y => y.id === x.id)));

        if (tierTarget === "maxTier") {
            const highestTierMods = validMods.reduce((a, c) => {
                a[c.id] = (a[c.id] && a[c.id] > c.tableIndex) ? a[c.id] : c;
                return a;
            }, {});
            validMods = [];
            for (const key in highestTierMods) {
                if (Object.hasOwnProperty.call(highestTierMods, key)) {
                    const element = highestTierMods[key];
                    validMods.push(element);
                }
            }
        }

        let mod = validMods.splice(Math.floor(randomRange(0, validMods.length)), 1)[0];
        if (tierTarget === "lucky") {
            let luckyMod = validMods.splice(Math.floor(randomRange(0, validMods.length)), 1)[0];
            if (luckyMod) {
                if (luckyMod.tableIndex > mod.tableIndex) {
                    mod = luckyMod;
                }
            }
        }
        if (!mod) {
            break;
        }
        //it's ok to use stringify here because the data came from json originally anyways
        mod = JSON.parse(JSON.stringify(mod));
        for (const stat of mod.stats) {
            stat.value = randomRange(stat.min, stat.max);
        }
        out.push(mod);
    }
    return out;
}

/**@param {Item} item */
function applyItemModifiers(item){
    player.removeModifiersBySource(item);
    const rawStatMods = item.getMods().flatMap(x => x.stats);
    const statMods = convertStatMods(rawStatMods, item);
    player.addStatModifier(statMods);
}

class Item {

    constructor(name) {
        /**@type {Modifier} */
        const mods = [];

        this.name = name;

        /**@returns {Modifier[]} */
        this.getMods = function () {
            return [...mods];
        }
        this.addModifier = function (mod) {
            mods.push(mod);
            let modTemplates = getModTemplateList();
            mods.sort((a, b) => {
                let i0 = modTemplates.findIndex(x => x.id === a.id);
                let i1 = modTemplates.findIndex(x => x.id === b.id);
                return i0 - i1;
            });
        }


        this.removeModifier = function (mod) {
            mods.splice(mods.findIndex(x => x === mod), 1);
        }

        this.clear = function () {
            mods.splice(0, mods.length);
        }
    }
}


function save(savedObj) {
    savedObj.items = {
        items: []
    }

    for (let i = 0; i < items.length; i++) {
        const mods = items[i].getMods();
        const savedItem = {
            index: i,
            mods: []
        };
        for (const mod of mods) {
            const { id, stats } = mod;
            const savedMod = { id, values: [] };
            for (const stat of stats) {
                savedMod.values.push(stat.value);
            }
            savedItem.mods.push(savedMod);
        }
        if (savedItem.mods.length !== 0) {
            savedObj.items.items.push(savedItem);
        }
    }
}

function load(obj) {
    if (!obj.items) {
        return;
    }
    const savedItems = obj.items.items;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        item.clear();
        const savedItem = savedItems.find(x => x.index === i);
        if (!savedItem) {
            continue;
        }
        const savedMods = savedItem.mods;
        for (const savedMod of savedMods) {
            const { id, values: savedValues } = savedMod;
            let mod = modCollection.find(x => x.id === id);
            if (mod) {
                mod = JSON.parse(JSON.stringify(mod));
                for (let j = 0; j < mod.stats.length; j++) {
                    const stat = mod.stats[j];
                    stat.value = savedValues[j];
                }
                item.addModifier(mod);
            }
        }
    }
    for (const item of items) {
        applyItemModifiers(item);
    }
    selectedItem = undefined;
    showItem(items[0]);
}