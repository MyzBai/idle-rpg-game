import { ModDB, convertModToStatMods } from "./modDB.js";
import { calcStats, calcModTotal, createConversionTable, ModFlags } from "./damageCalc.js";
import * as mana from "./mana.js";
import * as stats from "./stats.js";
import { deepFreeze } from "./helperFunctions.js";
import * as eventListener from "./eventListener.js";
import * as gameLoop from "./gameLoop.js";

/**@type {HTMLSpanElement} */
const levelSpan = document.querySelector(".s-level span");
/**@type {HTMLSpanElement} */
const essenceSpan = document.querySelector(".s-essence span");

var level = 1;
var essence = 0;

eventListener.add(eventListener.EventType.ENEMY_KILLED, () => {
	setLevel(++level);
});
eventListener.add(eventListener.EventType.SAVE_GAME, save);
eventListener.add(eventListener.EventType.LOAD_GAME, load);

/**@type {Modifiers.StatMod[]} */
var modList = [];

/**@type {Modifiers.ModCache} */
var modCache = undefined;

/**@type {ModDB} */
var modDB = undefined;

/**@type {DamageCalc.ConversionTable} */
var conversionTable = undefined;

export const listeners = [];

/**@param {Modules.Player} data */
export async function init(data) {
	console.log("init player");

	modDB = new ModDB();
    addStatModifier(...convertModToStatMods(data.defaultMods));

	Object.freeze(modDB);

	updateModList();
	mana.init();

	setEssenceAmount(1);
	setLevel(1);

	gameLoop.subscribe(
		(dt) => {
			setEssenceAmount(++essence);
		},
		{ intervalMS: 1000 }
	);
}

export function getModCache() {
	return modCache;
}

export function getConversionTable() {
	return conversionTable;
}

export function getLevel() {
	return level;
}

export function getEssenceAmount() {
	return essence;
}

/**@param {number} value */
export function setEssenceAmount(value) {
	essence = value;
	essenceSpan.textContent = value.toString();
	eventListener.invoke(eventListener.EventType.ESSENCE_CHANGED, essence);
}

function setLevel(newLevel) {
	level = Math.min(100, Math.max(0, newLevel));
	levelSpan.textContent = level.toString();
	eventListener.invoke(eventListener.EventType.LEVEL_UP, level);
}

/**@param {...Modifiers.StatMod} statModifiers */
export function addStatModifier(...statModifiers) {
    modDB.add(...statModifiers);
	updateModList();
}

export function removeModifiersBySource(source) {
	modDB.removeBySource(source);
	updateModList();
}

export function updateModList() {
	modList = modDB.getModList();
	conversionTable = createConversionTable(modList);
	updateModCache();
	mana.update();
	stats.update();
}

export function getModList() {
	return modList;
}

function updateModCache() {
	modCache = {
		strength: calcModTotal(modList, "strength"),
		dexterity: calcModTotal(modList, "dexterity"),
		intelligence: calcModTotal(modList, "intelligence"),
		attackSpeed: calcModTotal(modList, "attackSpeed"),
		attackCost: calcModTotal(modList, "manaCost", { flags: ModFlags.Attack }),
		manaRegen: calcModTotal(modList, "manaRegen"),
		maxMana: calcModTotal(modList, "mana"),
		bleedCount: calcModTotal(modList, "bleedCount"),
	};

	deepFreeze(modCache);
}

function save(savedObj) {
	savedObj.player = {
		level,
		essence,
	};
}

function load(savedObj) {
	const { player } = savedObj;
	if (!player) {
		return;
	}
	const level = player.level;
	setLevel(level);
	setEssenceAmount(player.essence);
	updateModList();
	console.log("loaded player");
}
