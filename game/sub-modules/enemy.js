import { getLevel as getPlayerLevel } from "../player.js";
import * as eventListener from "../../eventListener.js";

eventListener.add(eventListener.EventType.SAVE_GAME, save);
eventListener.add(eventListener.EventType.LOAD_GAME, load);

/**@type {HTMLElement} */
var healthbar = document.querySelector(".g-progress-bar-foreground.health-bar");

/**@type {number[]} */
var healthList = undefined;

var curHealth = 0;
var maxHealth = 0;

/**@param {Modules.Enemies} data */
export async function init(data) {
	if (!data) {
		return;
	}
	console.log("init enemy");
    healthList = data.enemyList.map(x => x.health);
    Object.freeze(healthList);
	maxHealth = healthList[0];
	curHealth = maxHealth;
	console.log(`Enemy initialized with %c${maxHealth}%c max health`, "color: red", "color: default");
	updateHealthbar();
}

/**@param {number} damage */
export function takeAttackDamage(damage) {
	curHealth -= damage;

	updateHealthbar();

	if (curHealth <= 0) {
		curHealth = 0;
	}
}

/**@param {number} damage */
export function takeDamageOverTime(damage){

    curHealth -= damage;
    updateHealthbar();

    if(curHealth <= 0){
        curHealth = 0;
    }
}

export function getCurHealth() {
	return curHealth;
}

export function die() {
    eventListener.invoke(eventListener.EventType.ENEMY_KILLED);
	let index = getPlayerLevel() - 1;
	if (index >= healthList.length) {
		index = healthList.length - 1;
	}

	maxHealth = healthList[index];
	curHealth = maxHealth;
	updateHealthbar();
}

function updateHealthbar() {
	var pct = ((curHealth / maxHealth) * 100).toString();
	healthbar.style.width = pct + "%";
}

function save(savedObj) {
	savedObj.enemy = {
		healthRatio: curHealth / maxHealth,
	};
}

function load(obj) {
    if(!obj.enemies){
        return;
    }
	maxHealth = healthList[getPlayerLevel() - 1];
	curHealth = maxHealth * obj.enemy?.healthRatio;
	updateHealthbar();
}
