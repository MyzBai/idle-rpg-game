import { ModDB, convertModToStatMods } from "./modDB.js";
import { calcStats, calcModTotal, createConversionTable } from "./damageCalc.js";
import * as mana from "./mana.js";
import * as stats from "./stats.js";
import { deepFreeze } from "./helperFunctions.js";
import * as eventListener from "./eventListener.js";
import * as gameLoop from "./gameLoop.js";

/**
 * @typedef {import('./sub-modules/skills.js').AttackSkill} AttackSkill
 */

/**
 * @typedef ModCache
 * @property {number} strength
 * @property {number} dexterity
 * @property {number} intelligence
 * @property {number} attackSpeed
 * @property {number} attackCost
 * @property {number} maxMana
 * @property {number} manaRegen
 */

const levelSpan = document.querySelector(".s-level span");
const essenceSpan = document.querySelector(".s-essence span");

var level = 1;
var essence = 0;

eventListener.add(eventListener.EventType.ENEMY_KILLED, () => {
    setLevel(++level);
});
eventListener.add(eventListener.EventType.SAVE_GAME, save);
eventListener.add(eventListener.EventType.LOAD_GAME, load);

var modList = [];
/**@type {AttackSkill} */
var attackSkill = undefined;

/**@type {ModCache} */
var modCache = undefined;

/**@type {ModDB} */
var modDB = undefined;

/**@type {import('./damageCalc.js').ConversionTable} */
var conversionTable = undefined;

export const listeners = [];

/**@param {{defaultMods: Mod[]}} */
export async function init(data) {
	console.log("init player");

	attackSkill = undefined;
	modCache = {};
	modDB = new ModDB();

	const statMods = [];
	for (const defaultMod of data.defaultMods) {
        statMods.push(...convertModToStatMods(defaultMod));
	}
	modDB.add(statMods);
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

export function getAttackSkill() {
	return attackSkill;
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
    essenceSpan.innerText = value;
	eventListener.invoke(eventListener.EventType.ESSENCE_CHANGED, essence);
}

function setLevel(newLevel) {
	level = Math.min(100, Math.max(0, newLevel));
	levelSpan.textContent = level;
    eventListener.invoke(eventListener.EventType.LEVEL_UP, level);
}

/**@param {...StatMod} statModifiers */
export function addStatModifier(...statModifiers) {
	for (const statModifier of statModifiers) {
		modDB.add(statModifier);
	}
	updateModList();
}

export function removeModifiersBySource(source) {
	modDB.removeBySource(source);
	updateModList();
}

export function updateModList() {
	modList = modDB.getModList();
	if (attackSkill) {
		//combine modlist with attackSkill modlist
		const attackSkillModList = attackSkill.getModList();
		if (attackSkillModList) {
			modList = modList.concat(attackSkillModList);
			conversionTable = createConversionTable(modList);
		}
	}
	updateModCache();
	mana.update();
	stats.update();
}

export function getModList() {
	return modList;
}

/** @param {AttackSkill} newAttackSkill */
export function setAttackSkill(newAttackSkill) {
	if (attackSkill) {
		modDB.removeBySource(attackSkill);
		newAttackSkill.addSupports(
			attackSkill
				.getSupports()
				.filter((x) => x)
				.map((x) => x.name)
		);
	}
	attackSkill = newAttackSkill;
    const baseAttackSpeedStatMod = convertModToStatMods({id: 'baseAttackSpeed', stats: [{value: attackSkill.getAttackSpeed()}]}, attackSkill);
	modDB.add(...baseAttackSpeedStatMod);
	updateModList();
}

function updateModCache() {
	modCache = {};
	modCache.strength = calcModTotal(modList, "strength");
	modCache.dexterity = calcModTotal(modList, "dexterity");
	modCache.intelligence = calcModTotal(modList, "intelligence");

	modCache.attackSpeed = calcModTotal(modList, "attackSpeed");
	modCache.manaRegen = calcModTotal(modList, "manaRegen");
	modCache.maxMana = calcModTotal(modList, "mana");

    modCache.maxBleedCount = calcModTotal(modList, 'maxBleedCount');

	modCache.attackCost = mana.calcAttackCost();

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
