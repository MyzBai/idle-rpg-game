import { randomRange, deepFreeze } from "../../helperFunctions.js";
import { convertRawMods, modTemplateList, parseModDescription } from "../../mods.js";
import * as player from "../player.js";
import * as eventListener from "../../eventListener.js";
import { getLevel } from "../player.js";

eventListener.add(eventListener.EventType.SAVE_GAME, save);
eventListener.add(eventListener.EventType.LOAD_GAME, load);

const itemList = document.querySelector(".s-items .s-item-list");
const craftingContainer = document.querySelector(".s-items .s-item-options");
const itemTable = document.querySelector(".s-items .s-item");

/**@type {Item[]} */
var items = [];

/**@type {Item} */
var selectedItem = undefined;

/**@type {Items.ModTable[]} */
var modTables = [];

/**@type {Items.ItemModifier[]} */
var modCollection = [];

var maxMods = 6;

/**@param {Modules.Items} module */
export async function init(module) {
	if (!module) {
		return;
	}
	console.log("init items");

	maxMods = module.maxMods;

    const s = module.modTables[0][0];

    modCollection = [];
    for (const table of module.modTables) {
        const tableSize = table.length;
        for(let i = 0; i < tableSize; i++){

            let itemMod = table[i];
            const mod = /**@type {Mod} */(itemMod.mod);
            // const itemMod = table[i];
            /**@type {TypedPropertyDescriptor} */
            const propDescriptor = {
                writable: false,
                enumerable: true,
                configurable: false
            };

            /**@type {Items.ItemModifier} */
            const newItemMod = Object.defineProperties({...mod }, {
                levelReq: {
                    value: itemMod.levelReq,
                    ...propDescriptor
                },
                weight: {
                    value: itemMod.weight,
                    ...propDescriptor
                },
                tier: {
                    enumerable: propDescriptor.enumerable,
                    configurable: propDescriptor.configurable,
                    get: function(){
                        const playerLevel = getLevel();
                        const validModsCount = table.map(x => x.levelReq <= playerLevel).length;
                        return validModsCount - i;
                    }
                }
            });

            modCollection.push(newItemMod);
        }
    }
    Object.freeze(modCollection);

	createItems(module.items);

	selectedItem = undefined;
	showItem(items[0]);

	if (module.crafting.basic) {
		setupBasicCrafting(module.crafting.basic);
	}

	eventListener.add(eventListener.EventType.ITEM_CHANGED, (item) => {
		applyItemModifiers(item);
	});
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
	const btn = document.createElement("div");
	btn.classList.add("g-button");
	btn.textContent = item.name;
	btn.addEventListener("click", (e) => {
		showItem(item);
	});
	itemList.appendChild(btn);
}

/**@param {Item} item */
function showItem(item) {
	itemList.querySelectorAll("div").forEach((btn) => {
		btn.classList.toggle("active", btn.textContent === item.name);
	});
	selectedItem = item;

	itemTable.replaceChildren();
	const frag = document.createDocumentFragment();
	for (const mod of item.getMods()) {
		let tier = mod.tier;
		const parsedDesc = parseModDescription(mod.desc, mod.stats);
		const tr = document.createElement("tr");
		tr.insertAdjacentHTML("beforeend", `<td>T${tier}</td><td class="description">${parsedDesc}</td><td style="visibility: hidden">T${tier}</td>`);
		frag.appendChild(tr);
	}
	itemTable.appendChild(frag);
	eventListener.invoke(eventListener.EventType.ITEM_CHANGED, item);
}

/**@param {Items.Crafting.Basic} basicCraftings */
function setupBasicCrafting(basicCraftings) {
	const { actions } = basicCraftings;
	const basicCraftingElement = craftingContainer.querySelector(".s-basic");
	basicCraftingElement.classList.add("active");

	if (actions.rollMods) {
		const element = basicCraftingElement.querySelector(".s-roll-mods");
		element.classList.add("active");
		const costSpan = element.querySelector(".cost span");
		const cost = actions.rollMods.cost || 0;
		costSpan.textContent = cost.toFixed(2);
		const craftButton = element.querySelector(".craft-button");
		craftButton.addEventListener("click", (e) => {
			rollModifiers(selectedItem);
			showItem(selectedItem);
			player.setEssenceAmount(player.getEssenceAmount() - cost);
		});

		const validateCraft = () => {
			const canAfford = player.getEssenceAmount() >= cost;
			return canAfford;
		};
		craftButton.toggleAttribute("disabled", !validateCraft());
		eventListener.add(eventListener.EventType.ESSENCE_CHANGED, (item) => {
			craftButton.toggleAttribute("disabled", !validateCraft());
		});
		eventListener.add(eventListener.EventType.ITEM_CHANGED, (item) => {
			craftButton.toggleAttribute("disabled", !validateCraft());
		});
	}
	if (actions.addMod) {
		const element = basicCraftingElement.querySelector(".s-add-mod");
		element.classList.add("active");
		const costSpan = element.querySelector(".cost span");
		let cost = actions.addMod.cost || 0;
		costSpan.textContent = cost.toFixed(2);
		const craftButton = element.querySelector(".craft-button");

		craftButton.addEventListener("click", (e) => {
			addModifier(selectedItem);
			showItem(selectedItem);
			player.setEssenceAmount(player.getEssenceAmount() - cost);
		});

		const validateCraft = () => {
			const canAfford = player.getEssenceAmount() >= cost;
			const hasMaxMods = selectedItem.getMods().length >= maxMods;
			return canAfford && !hasMaxMods;
		};
		craftButton.toggleAttribute("disabled", !validateCraft());
		eventListener.add(eventListener.EventType.ESSENCE_CHANGED, (amount) => {
			craftButton.toggleAttribute("disabled", !validateCraft());
		});
		eventListener.add(eventListener.EventType.ITEM_CHANGED, (item) => {
			craftButton.toggleAttribute("disabled", !validateCraft());
		});
	}
	if (actions.rollValues) {
		const element = basicCraftingElement.querySelector(".s-roll-values");
		element.classList.add("active");
		const costSpan = element.querySelector(".cost span");
		let cost = actions.rollValues.cost || 0;
		costSpan.textContent = cost.toFixed(2);
		const craftButton = element.querySelector(".craft-button");

		craftButton.addEventListener("click", (e) => {
			rollValues(selectedItem);
			showItem(selectedItem);
			player.setEssenceAmount(player.getEssenceAmount() - cost);
		});

		const validateCraft = () => {
			return player.getEssenceAmount() >= cost;
		};
		craftButton.toggleAttribute("disabled", !validateCraft());
		eventListener.add(eventListener.EventType.ESSENCE_CHANGED, () => {
			craftButton.toggleAttribute("disabled", !validateCraft());
		});
		eventListener.add(eventListener.EventType.ITEM_CHANGED, () => {
			craftButton.toggleAttribute("disabled", !validateCraft());
		});
	}
	if (actions.remove) {
		const element = basicCraftingElement.querySelector(".s-remove");
		element.classList.add("active");
		const costSpan = element.querySelector(".cost span");
		let cost = actions.rollValues.cost || 0;
		costSpan.textContent = cost.toFixed(2);
		const craftButton = element.querySelector(".craft-button");

		craftButton.addEventListener("click", (e) => {
			removeRandom(selectedItem);
			showItem(selectedItem);
			player.setEssenceAmount(player.getEssenceAmount() - cost);
		});
		const validateCraft = () => {
			const hasMods = selectedItem.getMods().length != 0;
			const canAfford = player.getEssenceAmount() >= cost;
			return hasMods && canAfford;
		};
		craftButton.toggleAttribute("disabled", !validateCraft());
		eventListener.add(eventListener.EventType.ESSENCE_CHANGED, () => {
			craftButton.toggleAttribute("disabled", !validateCraft());
		});
		eventListener.add(eventListener.EventType.ITEM_CHANGED, () => {
			craftButton.toggleAttribute("disabled", !validateCraft());
		});
	}
}

/**
 * @param {Item} item
 */
function rollModifiers(item) {
	let mods = item.getMods();
	for (const mod of mods) {
		item.removeModifier(mod);
	}

	let numMods = Math.floor(randomRange(0, maxMods) + 1);
	for (let i = 0; i < numMods; i++) {
		addModifier(item);
	}
}
/**
 * @param {Item} item
 */
function addModifier(item) {
	if (item.getMods().length >= maxMods) {
		console.error("item already at max mods");
		return;
	}
	const level = player.getLevel();
	const mod = generateModifiers(level, 1, item.getMods())[0];
	if (!mod) {
		console.error("No modifier available");
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
 * @param {Items.ItemModifier[]} existingMods
 * */
function generateModifiers(level, amount, existingMods = []) {
	const out = [];
	for (let i = 0; i < amount; i++) {
		let validMods = [];
		validMods.push(...modCollection.filter((x) => x.levelReq <= level && !out.some((y) => y.id === x.id) && !existingMods.some((y) => y.id === x.id)));

		const mod = validMods.splice(Math.floor(randomRange(0, validMods.length)), 1)[0];

		if (!mod) {
			break;
		}

		for (const stat of mod.stats) {
			stat.value = randomRange(stat.min, stat.max);
		}
		out.push(mod);
	}
	return out;
}

/**@param {Item} item */
function applyItemModifiers(item) {
	player.removeStatMods(item);
    const statMods = item.getMods().flatMap(x => x.stats);
	player.addStatMods(statMods, item);
}

class Item {
	constructor(name) {
		/**@type {Items.ItemModifier[]} */
		const mods = [];

		this.name = name;

		/**@returns {Items.ItemModifier[]} */
		this.getMods = function () {
			return [...mods];
		};
        /**@param {Items.ItemModifier} mod */
		this.addModifier = function (mod) {
			mods.push(mod);
			let modTemplates = modTemplateList;
			mods.sort((a, b) => {
				let i0 = modTemplates.findIndex((x) => x.id === a.id);
				let i1 = modTemplates.findIndex((x) => x.id === b.id);
				return i0 - i1;
			});
		};

		this.removeModifier = function (mod) {
			mods.splice(
				mods.findIndex((x) => x === mod),
				1
			);
		};

		this.clear = function () {
			mods.splice(0, mods.length);
		};
	}
}

function save(savedObj) {
	savedObj.items = {
		items: [],
	};

	for (let i = 0; i < items.length; i++) {
		const mods = items[i].getMods();
		const savedItem = {
			index: i,
			mods: [],
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
		const savedItem = savedItems.find((x) => x.index === i);
		if (!savedItem) {
			continue;
		}
		const savedMods = savedItem.mods;
		for (const savedMod of savedMods) {
			const { id, values: savedValues } = savedMod;
			let mod = modCollection.find((x) => x.id === id);
			if (mod) {
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
