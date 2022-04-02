import * as player from "../player.js";
import * as eventListener from "../eventListener.js";
import { parseModDescription } from "../helperFunctions.js";
import { getStatModifierTemplate } from "../modTemplates.js";
import { convertStatMods } from "../modDB.js";
// import { registerSave, registerLoad } from "../save.js";

/**
 * @typedef NodeMod
 * @property {number} id
 * @property {{value: number}[]} stats
 */

/**
 * @typedef Node
 * @property {string} name
 * @property {number} curPoints
 * @property {number} maxPoints
 * @property {NodeMod[]} mods
 * @property {HTMLElement} element
 */

const modTreeElement = document.querySelector(".p-game .s-mod-tree");
const pointsSpan = modTreeElement.querySelector(".points span");
const nodeContainer = modTreeElement.querySelector(".s-list");
const nodeTemplate = nodeContainer.querySelector("template");
const nodeInfoContainer = modTreeElement.querySelector(".s-node-info");

/**@type {Node[]} */
var nodes = [];

var selectedNode = undefined;
var assignClickEvent = undefined;
var unassignClickEvent = undefined;
var levelUpEvtId = undefined;
var numPointsPerLevel = undefined;
var unassignCost = undefined;

export async function init(data) {
	console.log("init mod-tree");

	unassignCost = data.unassignCost || 0;
	numPointsPerLevel = data.numPointsPerLevel || 0;

	nodes = [];
	nodeContainer.replaceChildren([]);
	for (const nodeData of data.nodes) {
		const { name, maxPoints, reqLevel, mods } = nodeData;
		const node = {
			name,
			maxPoints,
			reqLevel: reqLevel || 0,
			mods: mods.map((x) => {
				return {
					id: x.id,
					stats: x.stats.map((y) => {
						return { value: y.value };
					}),
				};
			}),
		};
		createNodeElement(node);
		nodes.push(node);
	}

	eventListener.add(eventListener.EventType.LEVEL_UP, (level) => {
		console.log("player leveled up observed in modTree.js", level);
		updatePoints();
		updateNodes();
		selectNode(selectedNode);
	});

    eventListener.add(eventListener.EventType.ESSENCE_CHANGED, () => {
        const unassignButton = nodeInfoContainer.querySelector(".unassign");
        unassignButton.toggleAttribute('disabled', !validateUnassign(selectedNode));
    });

	selectNode(nodes[0]);

	updateNodes();

    eventListener.add(eventListener.EventType.SAVE_GAME, save);
    eventListener.add(eventListener.EventType.LOAD_GAME, load);
}

function updatePoints() {
	var points = (player.getLevel() - 1) * numPointsPerLevel;
	var pointsSpent = getSpentPoints();
	points -= pointsSpent;
	pointsSpan.textContent = points.toString();
}

/**@param {Node} node */
function selectNode(node) {
	if (!node) {
		return;
	}

	nodes.forEach((x) => x.element.classList.toggle("active", x.element === node.element));
	setNodeInfo(node);
	selectedNode = node;
}

function updateNodes() {
	for (const node of nodes) {
		setNodePoints(node);
	}
}

/**
 * @param {Node} node
 * @returns {HTMLElement} container
 */
function createNodeElement(node) {
	node.element = nodeTemplate.content.cloneNode(true).firstElementChild;
	node.element.querySelector(".name").textContent = node.name;
	node.curPoints = 0;
	setNodePoints(node);
	node.element.addEventListener("click", (e) => {
		selectNode(node);
	});
	nodeContainer.appendChild(node.element);
}

function setNodeInfo(node) {
	nodeInfoContainer.querySelector(".name").textContent = node.name;
	var modsText = "";
	node.mods.forEach((x) => {
		var values = x.stats.map((x) => x.value);
		var desc = getStatModifierTemplate(x.id).desc;
		desc = parseModDescription(desc, values);
		modsText += `${desc}\n`;
	});
	nodeInfoContainer.querySelector(".content").textContent = modsText;
	const assignButton = nodeInfoContainer.querySelector(".assign");
	const unassignButton = nodeInfoContainer.querySelector(".unassign");
	assignButton.removeEventListener("click", assignClickEvent);
	unassignButton.removeEventListener("click", unassignClickEvent);
	assignClickEvent = () => {
		allocate(node);
	};
	unassignClickEvent = () => {
		unallocate(node);
        player.changeEssenceAmount(-unassignCost);
	};
	assignButton.toggleAttribute("disabled", !validateAssign(node));
	unassignButton.toggleAttribute("disabled", !validateUnassign(node));
	unassignButton.querySelector("span").innerText = unassignCost;
	assignButton.addEventListener("click", assignClickEvent);
	unassignButton.addEventListener("click", unassignClickEvent);
}

function getSpentPoints() {
	return nodes.reduce((a, c) => (a += c.curPoints), 0);
}

function getMaxPoints() {
	return (player.getLevel() - 1) * numPointsPerLevel;
}

function getRemainingPoints() {
	var spentPoints = getSpentPoints();
	return getMaxPoints() - spentPoints;
}

/** @param {Node} node */
function validateAssign(node) {
	return node.curPoints < node.maxPoints && getRemainingPoints() > 0;
}

/** @param {Node} node */
function validateUnassign(node) {
	return node.curPoints > 0 && player.getEssenceAmount() >= unassignCost;
}

/** @param {Node} node */
function allocate(node) {
	node.curPoints++;
	setNodePoints(node);
	updatePoints();
	selectNode(node);
	updateNodes();

	updateStatMods(node);
}

/** @param {Node} node */
function unallocate(node) {
	node.curPoints--;
	setNodePoints(node);
	updatePoints();
	selectNode(node);

	updateStatMods(node);
}

/**@param {Node} node */
function updateStatMods(node) {
	player.removeModifiersBySource(node);

	const tempStatMods = [];
	for (const mod of node.mods) {
		const modTemplate = getStatModifierTemplate(mod.id);
		if (mod.stats.length !== modTemplate.stats.length) {
			console.error("@modTree - node stats array length does not match mod template stats array length", "id:", mod.id);
			continue;
		}
		for (let i = 0; i < mod.stats.length; i++) {
			const statValue = mod.stats[i].value * node.curPoints;
			modTemplate.stats[i].value = statValue;
			tempStatMods.push(modTemplate.stats[i]);
		}
	}

	const statMods = convertStatMods(tempStatMods, node);
	player.addStatModifier(statMods);
}

function setNodePoints(node) {
	node.element.querySelector(".points").textContent = `${node.curPoints}/${node.maxPoints}`;
}

function save(savedObj) {
	if (savedObj.hasOwnProperty("modTree")) {
		console.error("savedObj already contains modTree property");
		return;
	}
	savedObj.modTree = {
		nodes: [],
	};
    nodes.forEach(x => {
        if(x.curPoints > 0){
            savedObj.modTree.nodes.push({name: x.name, value: x.curPoints});
        }
    });
}

function load(savedObj) {
	if (!savedObj.modTree) {
		return;
	}

    //reset nodes
    nodes.forEach(x => {
        player.removeModifiersBySource(x);
        x.curPoints = 0;
    });
    updateNodes();

	for (const node of savedObj.modTree.nodes) {
		for (let i = 0; i < node.value; i++) {
			allocate(node.name);
		}
	}
	updatePoints();
	//check if spentPoints is equal to saved nodes total points
	//if not, then allocation failed and this should trigger a full respec
}
