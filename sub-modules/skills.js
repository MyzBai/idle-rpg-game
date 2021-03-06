import * as player from "../player.js";
import { convertModToStatMods } from "../modDB.js";
import { parseModDescription, deepFreeze } from "../helperFunctions.js";
import { getModTemplate } from "../modTemplates.js";
import * as eventListener from '../eventListener.js';

/**
 * @typedef SkillMod
 * @property {string} id
 * @property {Stat[]} stats
 */
/**
 * @typedef SkillsAttack
 * @property {string} name
 * @property {number} attackSpeed
 * @property {number} manaCost
 * @property {number} baseDamageMultiplier
 * @property {SkillMod[]} mods
 */

/**
 * @typedef SkillsSupport
 * @property {string} name
 * @property {number} manaMultiplier
 * @property {SkillMod[]} mods
 */

/**
 * @typedef Skills
 * @property {number} maxSupports
 * @property {SkillsAttack} attacks
 * @property {SkillsSupport} supports
 */

const skillView = document.querySelector(".s-skills .s-skill-info");
const attackSkillContainer = document.querySelector(".s-skills .s-attack-skills");
const supportSkillContainer = document.querySelector(".s-skills .s-supports");

var skillViewButtonCallback = undefined;

var maxSupports = undefined;

/**@type {SkillsAttack[]} */
export var attackSkillsCollection = [];

/**@type {SkillsSupport[]} */
export var supportsCollection = [];

/**@param {Skills} data */
export async function init(data = {}) {
	console.log("init skills");

	attackSkillContainer.replaceChildren();
	supportSkillContainer.replaceChildren();

	maxSupports = data.maxSupports || 0;

	const attackSkills = data.attacks || [];
	attackSkillsCollection = [...attackSkills];
	if (new Set(attackSkillsCollection.map((x) => x.name)).size !== attackSkillsCollection.length) {
		console.error("duplicated skill names were found");
		return;
	}
	Object.freeze(attackSkillsCollection);
	const supportSkills = data.supports || [];
	supportsCollection = [...supportSkills];
	Object.freeze(supportsCollection);

	for (const data of attackSkillsCollection) {
		createSkillButton(data.name, "attack");
	}
	if (supportsCollection) {
		for (const data of supportsCollection) {
			createSkillButton(data.name, "support");
		}
	} else {
		supportSkillContainer.style.display = "none";
	}

    const defaultAttackSkill = attackSkillsCollection[0];
    if(defaultAttackSkill){
        setActiveAttackSkill(defaultAttackSkill.name);
    }
	viewSkill(defaultAttackSkill.name, "attack");
	updateSkillButtons();

    eventListener.add(eventListener.EventType.SAVE_GAME, save);
    eventListener.add(eventListener.EventType.LOAD_GAME, load);
}

/**@param {string} name skill name */
function setActiveAttackSkill(name) {
	var data = attackSkillsCollection.find((x) => x.name === name);
	if (!data) {
		window.alert(
			`could not find attack skill with name ${name}. please contact the developer if you suspect this to be a bug`
		);
		return;
	}
	var attackSkill = new AttackSkill(JSON.parse(JSON.stringify(data)));
	Object.freeze(attackSkill);
	player.setAttackSkill(attackSkill);
	viewSkill(name, "attack");
}

/**
 * @param {string} name support name
 */
function toggleSupport(name) {
	var attackSkill = player.getAttackSkill();
	if (!attackSkill) {
		return;
	}
	var supports = attackSkill.getSupports();
	var remove = supports.some((x) => x && x.name === name);
	if (remove) {
		attackSkill.removeSupports(name);
	} else {
		attackSkill.addSupports(name);
	}
	player.updateModList();

	updateSkillButtons();
}

//UI

/**@param {string} name */
function createSkillButton(name, type) {
	var btn = document.createElement("div");
	btn.textContent = name;
	btn.classList.add(`${type}-skill`, 'skill-button', 'g-button');
	btn.addEventListener("click", (e) => {
		viewSkill(name, type);
	});

	const skillContainer = type === "attack" ? attackSkillContainer : supportSkillContainer;
	skillContainer.appendChild(btn);
}

/** @param {string} name */
function viewSkill(name, type) {
	/**@type {SkillsAttack} skill */
	let skill =
		type === "attack"
			? attackSkillsCollection.find((x) => x.name === name)
			: supportsCollection.find((x) => x.name === name);
	if (!skill) {
		console.error(`Could not find skill by name ${name}`);
		return;
	}
	//Name
	skillView.querySelector(".name").textContent = name;

	//Stats
	let statsText = "";
	if (type === "attack") {
		statsText += `Attack Speed: ${skill.attackSpeed} sec\n`;
		statsText += `Mana Cost: ${skill.manaCost}\n`;
		statsText += `Base Damage Multiplier: ${skill.baseDamageMultiplier}%`;
		skillView.querySelector(".s-stats").textContent = statsText;
	} else {
		statsText += `Mana Multiplier: ${skill.manaMultiplier}%\n`;
	}

	//Mods
	let modsText = "";
	skill.mods.forEach((x) => {
		var values = x.stats.map((x) => x.value);
		var desc = getModTemplate(x.id).desc;
		desc = parseModDescription(desc, values);
		modsText += `${desc}\n`;
	});
	modsText = modsText.substring(0, modsText.length - 1);
	skillView.querySelector(".s-mods").textContent = modsText;

	//button
	let button = skillView.querySelector(".g-button");
	let isActive = false;
	if (type === "attack") {
		isActive = isAttackSkillActive(name);
		button.textContent = "Activate";
		button.classList.toggle("active", isActive);
	} else {
		isActive = isSupportActive(name);
		button.textContent = isActive ? "Deactivate" : "Activate";
		button.classList.toggle("active", isActive);
	}

	button.removeEventListener("click", skillViewButtonCallback);
	skillViewButtonCallback = () => {
		if (!isActive && type === "attack") {
			setActiveAttackSkill(name);
		} else {
			toggleSupport(name);
		}
		viewSkill(name, type);
	};
	if (!isActive || type === "support") {
		button.addEventListener("click", skillViewButtonCallback);
	}
	[...attackSkillContainer.children, ...supportSkillContainer.children].forEach((x) => {
		let active = x.textContent === name;
		x.classList.toggle("viewing", active);
	});
	updateSkillButtons();
}

function updateSkillButtons() {
	[...attackSkillContainer.children].forEach((x) => {
		let isActive = isAttackSkillActive(x.textContent);
		x.classList.toggle("active", isActive);
	});

	[...supportSkillContainer.children].forEach((x) => {
		let isActive = isSupportActive(x.textContent);
		x.classList.toggle("active", isActive);
	});
}

function isAttackSkillActive(name) {
	const attackSkill = player.getAttackSkill();
	return attackSkill ? attackSkill.getName() === name : false;
}
function isSupportActive(name) {
	const attackSkill = player.getAttackSkill();
	if (!attackSkill) {
		return false;
	}
	const supports = attackSkill.getSupports();
	return supports.some((x) => x && x.name === name);
}

export class AttackSkill {
	/**@param {SkillsAttack} skillJson */
	constructor(skillJson) {
		const { name, mods, manaCost, attackSpeed, baseDamageMultiplier } = skillJson;
		const supports = Array.from({ length: maxSupports });
		Object.seal(supports);

		var modList = [];

		this.getName = () => name;
		this.getManaCost = () => manaCost;
		this.getAttackSpeed = () => attackSpeed;
		this.getBaseDamageMultiplier = () => baseDamageMultiplier;

		this.getSupports = () => {
			return supports.filter((x) => x);
		};
		this.clearSupports = () => {
			for (let i = 0; i < supports.length; i++) {
				supports[i] = undefined;
			}
		};

		this.getModList = () => {
			return [...modList];
		};

		const rebuildModList = () => {
			modList = [];

            for (const mod of mods) {
                const statMods = convertModToStatMods(mod, this);
                modList.push(...statMods);
            }

			for (const support of supports) {
                if(!support){
                    continue;
                }
                for (const mod of support.mods) {
                    const statMods = convertModToStatMods(mod, this);
                    modList.push(...statMods);
                }
			}
		};

		/**@param {string | string[]} names */
		this.addSupports = (names) => {
			if (Array.isArray(names)) {
				for (const name of names) {
					this.addSupports(name);
				}
				return;
			}

			const slotIndex = supports.findIndex((x) => x === undefined);
			if (slotIndex !== -1) {
				let supportData = supportsCollection.find((x) => x.name === names);
				if (supportData) {
					const support = JSON.parse(JSON.stringify(supportData));
					deepFreeze(support);
					supports[slotIndex] = support;
				}
			}
			rebuildModList();
		};

		this.removeSupports = (names) => {
			if (Array.isArray(names)) {
				for (const name of names) {
					this.removeSupports(name);
				}
				return;
			}

			const index = supports.filter((x) => x).findIndex((x) => x.name === names);
			if (index !== -1) {
				supports[index] = undefined;
			}

			rebuildModList();
		};

		rebuildModList();
	}
}

function save(obj) {
	let attackSkill = player.getAttackSkill();
	let supportNames = attackSkill
		.getSupports()
		.filter((x) => x)
		.map((x) => x.name);
	obj.skills = {
		attackSkill: {
			name: attackSkill.getName(),
			supportNames,
		},
	};
}

function load(obj) {
	if (!obj.skills) {
		return;
	}
	const { attackSkill } = obj.skills;

	setActiveAttackSkill(attackSkill.name);

	const supportNames = attackSkill.supportNames;
	player.getAttackSkill().clearSupports();
	if (supportNames) {
		for (const supportName of supportNames) {
			toggleSupport(supportName);
		}
	}

	viewSkill(attackSkill.name, "attack");
	updateSkillButtons();
}
