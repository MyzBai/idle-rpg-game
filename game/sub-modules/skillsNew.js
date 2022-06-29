import { extractAttackSkillStats, parseModDescription } from "../../modUtils.js";
import EventEmitter from "../../EventEmitter.js";
import * as player from "../player.js";

/**@type {HTMLElement} */
const skillView = document.querySelector(".s-skills .s-skill-info");
skillView.querySelector(".g-button").addEventListener("click", (e) => {
	onSkillAction.invoke();
    onSkillViewChanged.invoke(activeSkillName);
});
/**@type {HTMLElement} */
const attackSkillContainer = document.querySelector(".s-skills .s-attack-skills");
/**@type {HTMLElement} */
const supportSkillContainer = document.querySelector(".s-skills .s-supports");

/**@type {EventEmitter<string>} */
let onSkillViewChanged = new EventEmitter();
let onSkillAction = new EventEmitter();

/**@type {EventEmitter<string>} */
let onSetSkillByName = new EventEmitter();

/**@type {string} */
var activeSkillName = undefined;

let maxSupports = undefined;

/**@type {Skills.AttackSkill} */
var attackSkill = undefined;

/**@type {Skills.SupportSkill[]} */
let supports = [];

/**@param {Modules.Skills} skillData */
export function init(skillData) {
	attackSkillContainer.replaceChildren();
	supportSkillContainer.replaceChildren();

	maxSupports = skillData.maxSupports;
	supports = [];

	{
		//Attack Skills
		if ([...new Set(skillData.attackSkills.map((x) => x.name))].length !== skillData.attackSkills.length) {
			throw new Error("This module is invalid");
		}
		const frag = document.createDocumentFragment();
		for (const skill of skillData.attackSkills) {
			const btn = document.createElement("div");
			btn.classList.add("attack-skill", "g-skill-button", "g-button");
			btn.textContent = skill.name;
			btn.addEventListener("click", () => {
				showAttackSkill(skill);
			});
			frag.appendChild(btn);
		}
		attackSkillContainer.appendChild(frag);

        const getDefaultAttackSkill = () => {
            const skill = skillData.attackSkills.find(x => x.name === 'Default Attack' || x.levelReq <= 0);
            if(!skill){
                throw new Error("This module is not valid");
            }
            return skill;
        }

        onSkillViewChanged.listen(skillName => {
            if(skillData.attackSkills.some(x => x.name === skillName)){
                const enabled = attackSkill.name === skillName;
                skillView.querySelector('.g-button').textContent = 'Enable';
                skillView.querySelector('.g-button').toggleAttribute('disabled', enabled);
            }
        });
		onSkillAction.listen(() => {
			//cannot toggle off attack skill
			if (activeSkillName === attackSkill.name) {
				return;
			}

			const skill = skillData.attackSkills.find((x) => x.name === activeSkillName);
			if (skill) {
				setAttackSkill(skill);
			}
		});

        onSetSkillByName.listen(skillName => {
            let skill = skillData.attackSkills.find(x => x.name === skillName) || getDefaultAttackSkill();
            setAttackSkill(skill);
        });

		attackSkill = getDefaultAttackSkill();
		setAttackSkill(attackSkill);
		activeSkillName = attackSkill.name;
		showAttackSkill(attackSkill);
	}

	if (skillData.supportSkills) {
		//Support Skills
		if ([...new Set(skillData.supportSkills.map((x) => x.name))].length !== skillData.supportSkills.length) {
			throw new Error("This module is invalid");
		}
		const frag = document.createDocumentFragment();
		for (const skill of skillData.supportSkills) {
			const btn = document.createElement("div");
			btn.classList.add("support-skill", "g-skill-button", "g-button");
			btn.textContent = skill.name;
			btn.addEventListener("click", () => {
				showSupportSkill(skill);
			});
			frag.appendChild(btn);
		}
		supportSkillContainer.appendChild(frag);

        onSkillViewChanged.listen(skillName => {
            if(skillData.supportSkills.some(x => x.name === skillName)){
                const enabled = supports.some(x => x.name === skillName);
                skillView.querySelector('.g-button').textContent = enabled ? 'Disable' : 'Enable';
                skillView.querySelector('.g-button').toggleAttribute('disabled', false);
            }
        });
		onSkillAction.listen(() => {
			const skill = skillData.supportSkills.find((x) => x.name === activeSkillName);
			if (skill) {
				toggleSupport(skill);
			}
		});

        onSetSkillByName.listen(skillName => {
            const skill = skillData.supportSkills.find(x => x.name === skillName);
            if(skill){
                toggleSupport(skill);
            }
        });
	}
}


/**@param {Skills.AttackSkill} skill */
function showAttackSkill(skill){
	activeSkillName = skill.name;

	skillView.querySelector(".name").textContent = skill.name;

	let statsText = "";
	/**@type {Skills.AttackSkillStats} */
	const stats = skill.stats;
	statsText += `Attack Speed: ${stats.attackSpeed} sec\n`;
	statsText += `Mana Cost: ${stats.manaCost || 0}\n`;
	statsText += `Base Damage Multiplier: ${stats.baseDamageMultiplier}%`;
	skillView.querySelector(".s-stats").textContent = statsText;
	//Mods
	let modsText = "";
	skill.mods.forEach((x) => {
		const description = parseModDescription(x.desc, x.stats);
		modsText += `${description}\n`;
	});
	modsText = modsText.substring(0, modsText.length - 1);
	skillView.querySelector(".s-mods").textContent = modsText;

	[...attackSkillContainer.children].forEach((x) => {
		let active = x.textContent === activeSkillName;
		x.classList.toggle("viewing", active);
	});

    onSkillViewChanged.invoke(skill.name);
}

function setAttackSkill(newSkill) {
	player.removeStatMods(attackSkill);
	attackSkill = newSkill;

	const statMods = extractAttackSkillStats(attackSkill.stats);
	player.addStatMods(statMods.attackSpeed, attackSkill);

	let manaCost = attackSkill.stats.manaCost || 0;
	{
		const multiplier = supports.reduce((a, c) => (a += c?.stats.manaMultiplier || 0), 0);
		manaCost *= 1 + multiplier / 100;
	}

	statMods.manaCost.value = manaCost;
	player.addStatMods(statMods.manaCost, attackSkill);

	player.addStatMods(
		attackSkill.mods.flatMap((x) => x.stats),
		attackSkill
	);

	[...attackSkillContainer.children].forEach((x) => x.classList.toggle("active", x.textContent === attackSkill.name));
}


/**@param {Skills.SupportSkill} skill */
function showSupportSkill(skill) {
	activeSkillName = skill.name;

	skillView.querySelector(".name").textContent = skill.name;

	let statsText = "";
	/**@type {Skills.SupportSkillStats} */
	const stats = skill.stats;
	statsText += `Mana Multiplier: ${stats.manaMultiplier} sec\n`;
	skillView.querySelector(".s-stats").textContent = statsText;
	//Mods
	let modsText = "";
	skill.mods.forEach((x) => {
		const description = parseModDescription(x.desc, x.stats);
		modsText += `${description}\n`;
	});
	modsText = modsText.substring(0, modsText.length - 1);
	skillView.querySelector(".s-mods").textContent = modsText;

	[...supportSkillContainer.children].forEach((x) => {
		let active = x.textContent === activeSkillName;
		x.classList.toggle("viewing", active);
	});

    onSkillViewChanged.invoke(skill.name);
};


/** @param {Skills.SupportSkill} skill */
function toggleSupport(skill){
    const index = supports.findIndex((x) => x === skill);
	if (index !== -1) {
		player.removeStatMods(skill);
		supports.splice(index, 1);
	} else if(supports.filter(x => x).length !== maxSupports) {
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
};


/**
 * @typedef SaveObj
 * @property {string} attackSkillName
 * @property {string[]} supportSkillNames
 */

/**@param {{skills: SaveObj}} obj*/
function save(obj) {
	obj.skills = {
		attackSkillName: attackSkill.name,
		supportSkillNames: supports.map((x) => x?.name),
	};
}

/**@param {{skills: SaveObj}} obj*/
function load(obj) {
	if (!obj.skills) {
		return;
	}

    onSetSkillByName.invoke(obj.skills.attackSkillName);
    

    supports = [];
    for (const support of obj.skills.supportSkillNames) {
        onSetSkillByName.invoke(support);
    }
}