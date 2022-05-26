import { createConversionTable, calcStats } from "../damageCalc.js";
import * as mana from "./mana.js";
import * as stats from "../stats.js";
import * as eventListener from "../eventListener.js";
import * as gameLoop from "./gameLoop.js";
import { ModDB, getStatModsFromDefaultStatValues, createModCache } from "../mods.js";

eventListener.add(eventListener.EventType.ENEMY_KILLED, () => {
	setLevel(++level);
});
eventListener.add(eventListener.EventType.SAVE_GAME, save);
eventListener.add(eventListener.EventType.LOAD_GAME, load);

//Necessary for it to work in dev mode with gameloop turned off
(function delayedModsUpdate(){
    requestAnimationFrame(() => {
        if(modListDirty){
            console.log('Update Mods');
            updateModList();
        }
        delayedModsUpdate();
    });
})();

/**@type {HTMLSpanElement} */
const levelSpan = document.querySelector(".s-level span");
/**@type {HTMLSpanElement} */
const essenceSpan = document.querySelector(".s-essence span");

const statTable = document.querySelector(".p-game aside.s-stats table");

var level = 1;
var essence = 0;

var modListDirty = false;

/**@type {StatMod[]} */
var statModList = [];

/**@type {ModCache} */
var modCache = undefined;

/**@type {ModDB} */
var modDB = undefined;

/**@type {DamageCalc.ConversionTable} */
var conversionTable = undefined;

/**@param {Modules.Player} data */
export async function init(data) {
	console.log("init player");

	modDB = new ModDB();
    if(data?.defaultStatValues){
        modDB.add(getStatModsFromDefaultStatValues(data.defaultStatValues));
    }
	Object.freeze(modDB);

    setEssenceAmount(0);
	mana.init();

	gameLoop.subscribe(
		(dt) => {
			setEssenceAmount(++essence);
		},
		{ intervalMS: 1000 }
	);
}

export async function setup(){
    updateModList();
    setLevel(1);
    mana.setMana(mana.getMaxMana());
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

/**
 * @param {StatMod | StatMod[]} statMods
 * @param {object} [source]
 */
export function addStatMods(statMods, source) {
	if (!Array.isArray(statMods)) {
		statMods = [statMods];
	}
    modDB.add(statMods, source);
    modListDirty = true;
}

export function removeStatMods(source) {
	modDB.removeBySource(source);
	modListDirty = true;
}

export function updateModList() {
	statModList = modDB.getModList();
	conversionTable = createConversionTable(statModList);
    modCache = createModCache(statModList);
	mana.update(modCache);

	statTable.replaceChildren();
	const statsOutput = calcStats({ modCache, conversionTable, statModList: statModList });
	const frag = stats.getFormattedTableFragment(statsOutput);
	statTable.appendChild(frag);

	modListDirty = false;
    
}

export function getModList() {
	return statModList;
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
	modListDirty = true;
	console.log("loaded player");
}
