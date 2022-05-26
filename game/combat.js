import * as player from "./player.js";
import * as mana from "./mana.js";
import * as enemy from "./sub-modules/enemy.js";
import { calcAttack } from "../damageCalc.js";
import * as ailments from "./ailments.js";
import * as gameLoop from "./gameLoop.js";

/**
 * @typedef EnemyData
 * @property {{health: number}[]} enemies
 */

export async function init() {
	console.log("init combat");
	autoAttackLoop();
}

function autoAttackLoop() {
	let deltaTotal = 0;

	gameLoop.subscribe((dt) => {
		const attackSpeed = player.getModCache().attackSpeed;
		deltaTotal += dt * attackSpeed;
		if (deltaTotal >= 1) {
			const manaCost = player.getModCache().attackCost;
			if (mana.getCurMana() > manaCost) {
				deltaTotal -= attackSpeed;
				mana.setMana(mana.getCurMana() - manaCost);
				performAttack();
			} else {
				console.log("not enough mana");
			}
		}
	});
}

function performAttack() {
	const result = calcAttack({ statModList: player.getModList(), modCache: player.getModCache(), conversionTable: player.getConversionTable() });

	if (!result.wasHit) {
		console.log("Attack missed");
		return;
	} else {
		// console.log(`you dealt ${result.totalDamage.toFixed()} to the enemy`);
	}

	enemy.takeAttackDamage(result.totalDamage);

	if (result.wasCrit) {
		const healthbarBackground = document.querySelector(".g-progress-bar-background");
		const isShaking = healthbarBackground.classList.contains("shake");
		if (!isShaking) {
			healthbarBackground.classList.add("shake");
			setTimeout(() => {
				healthbarBackground.classList.remove("shake");
			}, 500);
		}
	}

	for (const ailment of result.ailments) {
		ailments.applyAilment(ailment);
	}

	if (enemy.getCurHealth() <= 0) {
		enemy.die();
	}
}
