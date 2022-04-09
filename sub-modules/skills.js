import * as player from "../player.js";
import { convertModToStatMods } from "../modDB.js";
import { parseModDescription, deepFreeze } from "../helperFunctions.js";
import { getModTemplate } from "../modTemplates.js";
import * as eventListener from "../eventListener.js";
import { calcModTotal, ModFlags } from "../damageCalc.js";

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

	maxSupports = data.maxSupports || 0;
    supports = new Array(maxSupports).fill();
    Object.seal(supports);
	//set and validate attack skills
	{
		attackSkillsCollection = data.attacks || [];
		const duplicates = new Set();
		attackSkillsCollection.every((x) => {
			if (duplicates.has(x.name)) {
				console.error(`The attack skill ${x.name} already exists. Two skills of the same type cannot have the same name.`);
				return false;
			}
			duplicates.add(x.name);
		});
		deepFreeze(attackSkillsCollection);
	}

	//set and validate support skills
	{
		supportsCollection = data.supports || [];
		const duplicates = new Set();
		supportsCollection.every((x) => {
			if (duplicates.has(x.name)) {
				console.error(`The support skill ${x.name} already exists. Two skills of the same type cannot have the same name.`);
				return false;
			}
			duplicates.add(x.name);
		});
		deepFreeze(supportsCollection);
	}

	//create attack skill buttons
	{
		const frag = document.createDocumentFragment();
		for (const attackSkill of attackSkillsCollection) {
			const btn = createSkillButton(attackSkill, 'attack');
			frag.appendChild(btn);
		}
		attackSkillContainer.appendChild(frag);
	}

	//create support skill buttons
	{
		if (supportsCollection) {
			const frag = document.createDocumentFragment();
			for (const support of supportsCollection) {
				const btn = createSkillButton(support, 'support');
				frag.appendChild(btn);
			}
			supportSkillContainer.appendChild(frag);
		} else {
			supportSkillContainer.style.display = "none";
		}
	}

	const defaultAttackSkill = attackSkillsCollection[0];
	if (defaultAttackSkill) {
		setAttackSkill(defaultAttackSkill);
	}
	showSkill(attackSkillsCollection[0], "attack");
}

/** @param {Skills.AttackSkill} skill */
function setAttackSkill(skill) {
	player.removeModifiersBySource(attackSkill);
	attackSkill = skill;

    const attackSpeedMod = {name: 'attackSpeed', valueType: 'base', value: skill.stats.attackSpeed, source: attackSkill};

    let manaCost = attackSkill.stats.manaCost;
    {
        const multiplier = supports.reduce((a, c) => a += c?.stats.manaMultiplier || 0, 0);
        manaCost *= 1 + multiplier/100;
    }
	const manaCostMod = { name: "manaCost", valueType: "base", value: manaCost, flags: ModFlags.Attack, source: attackSkill };

	player.addStatModifier(...convertModToStatMods(skill.mods, attackSkill), manaCostMod, attackSpeedMod);
    [...attackSkillContainer.children].forEach(x => x.classList.toggle('active', x.textContent === attackSkill.name));
	showSkill(attackSkill, "attack");
}

/** @param {Skills.SupportSkill} skill */
function toggleSupport(skill) {
    for(let i = 0; i < supports.length; i++){
        if(!supports[i]){
            supports[i] = skill;
            player.addStatModifier(...convertModToStatMods(skill.mods, skill));
            break;
        } else if(supports[i].name === skill.name){
            supports[i] = undefined;
            player.removeModifiersBySource(skill);
            break;
        }
    }
    [...supportSkillContainer.children].forEach(x => x.classList.toggle('active', supports.some(y => y?.name === x.textContent)));
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
		statsText += `Mana Cost: ${stats.manaCost}\n`;
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
		var values = x.stats.map((x) => x.value);
		var desc = getModTemplate(x.id).desc;
		desc = parseModDescription(desc, values);
		modsText += `${desc}\n`;
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

/**@param {{skills: SaveObj}} obj*/
function save(obj) {
	obj.skills = {
		attackSkill: attackSkill.name,
		supports: supports.map((x) => x?.name),
	};
}

/**@param {{skills: SaveObj}} obj*/
function load(obj) {
	if (!obj.skills) {
		return;
	}

	const skill = attackSkillsCollection.find((x) => x.name === obj.skills.attackSkill);
	setAttackSkill(skill);
	showSkill(skill, "attack");

	supports = [];
	const supportNames = obj.skills.supports || [];
	for (let i = 0; i < supportNames.length; i++) {
		const support = supportsCollection.find((x) => x.name === supportNames[i]);
		toggleSupport(support);
	}

	//@ts-expect-error
	attackSkillContainer.firstElementChild.click();
}
