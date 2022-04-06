import * as enemy from "./sub-modules/enemy.js";
import * as gameLoop from "./gameLoop.js";
import { getModCache } from "./player.js";

/**
 * @typedef Instance
 * @property {string} [baseDamage] readonly
 * @property {string} duration
 * @property {string} [time]
 */

const labels = {
	bleed: document.querySelector(".s-combat .ailment.bleed"),
};

var loopId = undefined;

class Ailment {
	constructor(type) {
		this.type = type;
		/**@type {Instance[]} */
		this.instances = [];
	}
	updateLabel() {
		if (this.instances.length === 1) {
			this.updateLabelUpdateId = gameLoop.subscribe(
				() => {
					updateLabel(this.type);
				},
				{ intervalMS: 1000 }
			);
            updateLabel(this.type);
		}
	}
	tick(dt) {}
	sort() {}
	get numMaxActiveInstances() {
		return 0;
	}
}

class Bleed extends Ailment {
	constructor() {
		super("bleed");
	}
    updateLabel(){
        super.updateLabel();
    }
	tick(dt) {
		const damage = calcDamage(this, dt);
		enemy.takeDamageOverTime({ type: "bleed", damage });
	}
	sort() {
		this.instances.sort((a, b) => b.baseDamage - a.baseDamage);
	}
	get numMaxActiveInstances() {
		return getModCache().maxBleedCount;
	}
}
/**@type {{bleed: Bleed}} */
const ailments = {
	bleed: new Bleed(),
};

/**@param {Ailment} ailment */
function calcDamage(ailment, dt) {
	let damage = 0;
	let maxNumActiveInstances = ailment.numMaxActiveInstances;
	let instances = ailment.instances;
	for (const [index, instance] of instances.entries()) {
		if (index < maxNumActiveInstances) {
			damage += instance.baseDamage;
		}
		instance.time -= dt;
	}
	damage *= dt;
	instances = instances.filter((x) => x.time > 0);
    if(instances.length === 0){
        gameLoop.unsubscribe(ailment.updateLabelUpdateId);
    }
	return damage;
}

/**@param {number} type */
function updateLabel(type) {
    console.log('update label');
	const label = labels[type];
	label.classList.toggle("visible", ailments[type].instances.length !== 0);
	const time = ailments[type].instances.map((x) => x.time).sort((a, b) => b - a)[0];
    label.querySelector("span").innerText = Math.ceil(time);
}

/**
 * @param {Ailment} instance
 */
export function applyAilment(instance) {
	//first time applying an ailment, start tick loop
	//in cases where you'll never apply any ailments,
	//the loop will never start, thus saving an extra function call in the game loop
	if (!loopId) {
		loopId = gameLoop.subscribe(tick);
	}
	const ailment = ailments[instance.type];
	ailment.instances.push({ ...instance, time: instance.duration });
	ailment.sort();
	if (ailment.instances.length === 1) {
		ailment.updateLabel();
	}
}

function tick(dt) {
	// console.log('tick ailments', dt.toFixed(4));

	ailments.bleed.tick(dt);

	// if (bleedInstances.length > 0) {
	// 	var activeInstance = bleedInstances.reduce((max, cur) => (max.baseDamage > cur.baseDamage ? max : cur));
	// 	enemy.takeDamage(activeInstance.baseDamage * dt);
	// 	bleedSpan.textContent = Math.ceil(Math.max(...bleedInstances.map((x) => x.time))).toFixed();

	// 	for (const bleedInstance of bleedInstances) {
	// 		bleedInstance.time -= dt;
	// 	}
	// 	bleedInstances = bleedInstances.filter((x) => x.time > 0);
	// 	bleedElement.classList.toggle("visible", bleedInstances.length > 0);
	// }
}
