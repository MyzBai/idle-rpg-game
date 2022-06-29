import * as player from "../player.js";
import { deepFreeze } from "../../helperFunctions.js";
import { convertRawMods, createBaseStatMod, statModNames } from "../../mods.js";
import * as modUtils from '../../modUtils.js';
import * as eventListener from "../../eventListener.js";

eventListener.add(eventListener.EventType.SAVE_GAME, save);
eventListener.add(eventListener.EventType.LOAD_GAME, load);

/**
 * @typedef SaveObj
 * @property {string} attackSkill
 * @property {string[]} supports
 */

/**@type {HTMLElement} */
const skillView = document.querySelector(".s-skills .s-skill-info");
/**@type {HTMLElement} */
const attackSkillContainer = document.querySelector(".s-skills .s-attack-skills");
/**@type {HTMLElement} */
const supportSkillContainer = document.querySelector(".s-skills .s-supports");

var skillViewButtonCallback = undefined;

/**@type {number} */
var maxSupports = undefined;

/**@type {Skills.AttackSkill} */
var attackSkill = undefined;

/**@type {Skills.SupportSkill[]} */
var supports = [];

/**@type {Skills.AttackSkill[]} */
export var attackSkillsCollection = [];

/**@type {Skills.SupportSkill[]} */
export var supportsCollection = [];

/**@param {Modules.Skills} data */
export async function init(data) {
	console.log("init skills");

	attackSkillContainer.replaceChildren();
	supportSkillContainer.replaceChildren();

	skillsModule = data;

	maxSupports = data.maxSupports;

	supports = [];
	//set and validate attack skills
	{
		attackSkillsCollection = [...data.attackSkills];
        deepFreeze(attackSkillsCollection);

        //check for duplicates
		const duplicates = new Set();
		attackSkillsCollection.every((x) => {
			if (duplicates.has(x.name)) {
				console.error(`The attack skill ${x.name} already exists. Two skills of the same type cannot have the same name.`);
				return false;
			}
			duplicates.add(x.name);
		});

		//create attack skill buttons
		const frag = document.createDocumentFragment();
		for (const attackSkill of attackSkillsCollection) {
			const btn = createSkillButton(attackSkill, "attack");
			frag.appendChild(btn);
		}
		attackSkillContainer.appendChild(frag);

		setAttackSkill(attackSkillsCollection[0]);
	}

	//set and validate support skills
	{
		supportsCollection = [...data.supportSkills];
        deepFreeze(supportsCollection)

		const duplicates = new Set();
		supportsCollection.every((x) => {
			if (duplicates.has(x.name)) {
				console.error(`The support skill ${x.name} already exists. Two skills of the same type cannot have the same name.`);
				return false;
			}
			duplicates.add(x.name);
		});

		//create support skill buttons
		if (supportsCollection) {
			const frag = document.createDocumentFragment();
			for (const support of supportsCollection) {
				const btn = createSkillButton(support, "support");
				frag.appendChild(btn);
			}
			supportSkillContainer.appendChild(frag);
		} else {
			supportSkillContainer.style.display = "none";
		}
	}
}

/** @param {Skills.AttackSkill} skill */
function setAttackSkill(skill) {
	player.removeStatMods(attackSkill);
	attackSkill = skill;

    const statMods = modUtils.extractAttackSkillStats(attackSkill.stats);
    player.addStatMods(statMods.attackSpeed, attackSkill);

	let manaCost = attackSkill.stats.manaCost || 0;
	{
		const multiplier = supports.reduce((a, c) => (a += c?.stats.manaMultiplier || 0), 0);
		manaCost *= 1 + multiplier / 100;
	}

    statMods.manaCost.value = manaCost;
    player.addStatMods(statMods.manaCost, attackSkill);

    player.addStatMods(attackSkill.mods.flatMap(x => x.stats), attackSkill);

	[...attackSkillContainer.children].forEach((x) => x.classList.toggle("active", x.textContent === attackSkill.name));
	showSkill(attackSkill, "attack");
}

/** @param {Skills.SupportSkill} skill */
function toggleSupport(skill) {
	const index = supports.findIndex((x) => x === skill);
	if (index !== -1) {
		player.removeStatMods(skill);
		supports.splice(index, 1);
	} else {
		supports.push(skill);
		player.addStatMods(
			skill.mods.flatMap((x) => x.stats),
			skill
		);
	}
	[...supportSkillContainer.children].forEach((x) =>
		x.classList.toggle(
			"active",
			supports.some((y) => y?.name === x.textContent)
		)
	);
}

/**
 * @param {Skills.AbstractSkill} skill
 * */
function createSkillButton(skill, type) {
	var btn = document.createElement("div");
	btn.textContent = skill.name;
	btn.classList.add(`${type}-skill`, "skill-button", "g-button");
	btn.addEventListener("click", (e) => {
		showSkill(skill, type);
	});
	return btn;
}

/**
 * @param {Skills.AbstractSkill} skill
 * @param {string} type
 */
function showSkill(skill, type) {
	skillView.querySelector(".name").textContent = skill.name;

	//Stats
	let statsText = "";
	if (type === "attack") {
		/**@type {Skills.AttackSkillStats} */
		const stats = skill.stats;
		statsText += `Attack Speed: ${stats.attackSpeed} sec\n`;
		statsText += `Mana Cost: ${stats.manaCost || 0}\n`;
		statsText += `Base Damage Multiplier: ${stats.baseDamageMultiplier}%`;
		skillView.querySelector(".s-stats").textContent = statsText;
	} else {
		/**@type {Skills.SupportSkillStats} */
		const stats = skill.stats;
		statsText += `Mana Multiplier: ${stats.manaMultiplier}%\n`;
	}

	//Mods
	let modsText = "";
	skill.mods.forEach((x) => {
		const description = modUtils.parseModDescription(x.desc, x.stats);
		modsText += `${description}\n`;
	});
	modsText = modsText.substring(0, modsText.length - 1);
	skillView.querySelector(".s-mods").textContent = modsText;

	//activate/deactive button
	let button = skillView.querySelector(".g-button");
	let isActive = false;
	if (type === "attack") {
		isActive = isAttackSkillActive(skill);
		button.textContent = "Activate";
		button.classList.toggle("active", isActive);
	} else if (type === "support") {
		isActive = isSupportActive(skill);
		button.textContent = isActive ? "Deactivate" : "Activate";
		button.classList.toggle("active", isActive);
	}

	button.removeEventListener("click", skillViewButtonCallback);
	skillViewButtonCallback = () => {
		if (!isActive && type === "attack") {
			setAttackSkill(skill);
		} else {
			toggleSupport(skill);
		}
		showSkill(skill, type);
	};
	if (!isActive || type === "support") {
		button.addEventListener("click", skillViewButtonCallback);
	}
	[...attackSkillContainer.children, ...supportSkillContainer.children].forEach((x) => {
		let active = x.textContent === skill.name;
		x.classList.toggle("viewing", active);
	});
}

/**@param {Skills.AbstractSkill} skill */
function isAttackSkillActive(skill) {
	return attackSkill ? attackSkill.name === skill.name : false;
}

/**@param {Skills.SupportSkill} support */
function isSupportActive(support) {
	return supports.some((x) => x?.name === support.name);
}



export { maxSupports, attackSkill, supports };