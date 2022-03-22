import * as player from "../player.js";
import { convertStatMods } from "../modDB.js";
import { parseModDescription, deepFreeze } from "../helperFunctions.js";
import { registerSave, registerLoad } from "../save.js";
import { getStatModifierTemplate } from "../modTemplates.js";

/**
 * @typedef SkillsConfig
 * @property {boolean} maxSupports
 */
/**
 * @typedef SkillMod
 * @property {string} id
 * @property {string} [desc]
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
 * @property {SkillsConfig} config
 * @property {SkillsAttack} attacks
 * @property {SkillsSupport} supports
 */

const defaultAttackSkill = {
	name: "Default Attack",
	attackSpeed: 1,
	manaCost: 0,
	baseDamageMultiplier: 100,
	mods: [
		{
			id: "hitChance",
			desc: "+#% To Hit Chance",
			stats: [
				{
					name: "hitChance",
					value: 100,
					valueType: "base",
				},
			],
		},
	],
};

const skillView = document.querySelector(".s-skills .s-skill-view");
const attackSkillContainer = document.querySelector(".s-skills .s-attack-skill-container");
const supportSkillContainer = document.querySelector(".s-skills .s-support-skill-container");

var skillViewButtonCallback = undefined;

/**@type {SkillsConfig} */
var skillsConfig = undefined;

/**@type {SkillsAttack[]} */
export var attackSkillsCollection = [];

/**@type {SkillsSupport[]} */
export var supportsCollection = [];

/**@param {Skills} data */
export async function init(data) {
	if (!data) {
		console.error("skills data is mandatory. This should never be called");
		return;
	}
	console.log("init skills");

	attackSkillContainer.replaceChildren();
	supportSkillContainer.replaceChildren();

	skillsConfig = data.config;
	Object.freeze(skillsConfig);
	attackSkillsCollection = [...data.attacks];
	attackSkillsCollection.unshift(defaultAttackSkill);
	if (new Set(attackSkillsCollection.map((x) => x.name)).size !== attackSkillsCollection.length) {
		console.error("duplicated skill names were found");
		return;
	}
	Object.freeze(attackSkillsCollection);
	supportsCollection = data.supports;
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

	setActiveAttackSkill(defaultAttackSkill.name);
	viewSkill(defaultAttackSkill.name, "attack");
	updateSkillButtons();

	registerSave(save);
	registerLoad(load);
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
	btn.classList.add(`${type}-skill`, "skill-button");
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
		var desc = getStatModifierTemplate(x.id).desc;
		desc = parseModDescription(desc, values);
		modsText += `${desc}\n`;
	});
	modsText = modsText.substring(0, modsText.length - 1);
	skillView.querySelector(".s-mods").textContent = modsText;

	//button
	let button = skillView.querySelector("button");
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
		const supports = Array.from({ length: skillsConfig ? skillsConfig.numSupports : 0 });
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

			let statMods = mods.flatMap((x) => x.stats);
			modList.push(...convertStatMods(statMods, this));

			for (const support of supports.filter((x) => x)) {
				const statMods = convertStatMods(
					support.mods.flatMap((x) => x.stats),
					support
				);
				modList.push(...statMods);
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

function load(savedObj) {
	const { skills: savedSkills } = savedObj;
	if (!savedSkills) {
		return;
	}
	const { attackSkill } = savedSkills;

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
