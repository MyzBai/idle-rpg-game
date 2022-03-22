import * as player from '../player.js';
import * as eventListener from '../eventListener.js';
import { parseModDescription } from '../helperFunctions.js';
import { getStatModifierTemplate } from '../modTemplates.js';
import { convertStatMods } from '../modDB.js';
import { registerSave, registerLoad } from '../save.js';

/**
 * @typedef GroupConfig
 * @property {number} reqPoints
 */
/**
 * @typedef NodeConfig
 * @property {string} name
 * @property {number} max
 * @property {number} [curPoints]
 */

/**
 * @typedef NodeMod
 * @property {number} id
 * @property {{value: number}[]} stats
 */

/**
 * @typedef GroupNode
 * @property {NodeConfig} config
 * @property {NodeMod[]} mods
 * @property {HTMLElement} [element]
 */

/**
 * @typedef TreeGroup
 * @property {GroupConfig} config
 * @property {GroupNode[]} nodes
 * @property {HTMLElement} [element]
 */

const pointsRemainingSpan = document.querySelector('.p-mod-tree .remaining-points span');
const pointsSpentSpan = document.querySelector('.p-mod-tree .spent-points span');
const groupContainer = document.querySelector('.p-mod-tree .s-group-container');
const nodeTemplate = groupContainer.querySelector('template');
const tooltip = document.querySelector('.p-mod-tree .s-tooltip');

var assignClickEvent = undefined;
var unassignClickEvent = undefined;


/**@type {TreeGroup[]} */
const treeGroups = [];
var selectedNode = undefined;


export async function init(data) {

    console.log('init mod-tree');

    /**@type {TreeGroup[]} */
    const groups = data.groups;

    for (const group of groups) {
        createGroupElement(group);
        if (!group.element) {
            console.log('Error');
            break;
        }

        groupContainer.append(group.element);

        treeGroups.push(group);
    }

    eventListener.add(eventListener.EventType.LEVEL_UP, level => {
        console.log('player leveled up observed in modTree.js', level);
        calcPoints();
        updateGroups();
        selectNode(selectedNode);
    });

    selectNode(treeGroups[0].nodes[0]);

    updateGroups();

    registerSave(save);
    registerLoad(load);
}

function calcPoints() {
    var pointsRemaining = player.getLevel() - 1;
    var pointsSpent = getSpentPoints();
    pointsRemaining -= pointsSpent;
    if (pointsRemaining < 0) {
        console.error("Too many points spent. This is not allowed");
        return;
    }
    pointsRemainingSpan.textContent = pointsRemaining.toString();
    pointsSpentSpan.textContent = pointsSpent.toString();
}

/**
 * @param {TreeGroup} group
 * @returns {HTMLElement} container
 */
function createGroupElement(group) {
    group.element = document.createElement('div');
    if(group.config.reqPoints > 0){
        const pointsLabel = document.createElement('div');
        pointsLabel.textContent = "Required Points Spent: " + group.config.reqPoints;
        pointsLabel.classList.add("req-points-label");
        group.element.appendChild(pointsLabel);
    }

    group.element.classList.add('s-group', 'g-menu-container');
    for (const node of group.nodes) {
        createNodeElement(node);
        group.element.appendChild(node.element);
    }
}

/**
 * @param {GroupNode} node
 * @returns {HTMLElement} container
 */
function createNodeElement(node) {
    const { config } = node;
    node.element = nodeTemplate.content.cloneNode(true).firstElementChild;
    node.element.querySelector('.name').textContent = config.name;
    config.curPoints = 0;
    setNodePoints(node);
    node.element.addEventListener('click', e => {
        selectNode(node);
    });

}

function selectNode(node) {
    treeGroups.flatMap(x => x.nodes).forEach(x => x.element.classList.toggle('active', x.element === node.element));
    setTooltip(node);
    selectedNode = node;
}

function updateGroups(){
    const pointsSpent = getSpentPoints();
    for (const group of treeGroups) {
        group.element.classList.toggle("active", group?.config?.reqPoints || 0 <= pointsSpent);
    }
}

function setTooltip(node) {
    tooltip.querySelector('.name').textContent = node.config.name;
    var modsText = '';
    node.mods.forEach(x => {
        var values = x.stats.map(x => x.value);
        var desc = getStatModifierTemplate(x.id).desc;
        desc = parseModDescription(desc, values);
        modsText += `${desc}\n`;
    });
    tooltip.querySelector('.content').textContent = modsText;
    const assignButton = tooltip.querySelector('.assign');
    const unassignButton = tooltip.querySelector('.unassign');
    assignButton.removeEventListener('click', assignClickEvent);
    unassignButton.removeEventListener('click', unassignClickEvent);
    assignClickEvent = () => {
        allocate(node.config.name);
    };
    unassignClickEvent = () => {
        unallocate(node.config.name);
    };
    assignButton.disabled = !validateAssign(node);
    unassignButton.disabled = !validateUnassign(node);
    assignButton.addEventListener('click', assignClickEvent);
    unassignButton.addEventListener('click', unassignClickEvent);
}

function getNodeByName(name) {
    var node = treeGroups.flatMap(x => x.nodes).find(x => x.config.name === name);
    return node;
}

function calcGroupPointsSpent(group){
    var pointsSpent = 0;
    for (const node of group.nodes) {
        pointsSpent += node.config.curPoints;
    }
    return pointsSpent;
}

function getSpentPoints() {
    var spentPoints = 0;
    for (const group of treeGroups) {
        for (const node of group.nodes) {
            spentPoints += node.config.curPoints;
        }
    }
    return spentPoints;
}

function getRemainingPoints() {
    var spentPoints = getSpentPoints();
    var pointsFromLevel = player.getLevel() - 1;
    return pointsFromLevel - spentPoints;
}

function validateAssign(node) {
    if (getRemainingPoints() <= 0)
        return false;

    return node.config.curPoints < node.config.max;
}

function validateUnassign(node) {
    if (node.config.curPoints <= 0)
        return false;

    const spentPoints = getSpentPoints() - 1;
    for (const group of treeGroups) {
        if (calcGroupPointsSpent(group) > 0) {
            if (spentPoints < group.config.reqPoints)
                return false;
        }
    }
    return true;
}

function allocate(name) {
    var node = getNodeByName(name);
    if (!validateAssign(node))
        return;

    node.config.curPoints++;
    setNodePoints(node);
    calcPoints();
    selectNode(node);
    updateGroups();

    updateStatMods(node);
}

function unallocate(name) {
    var node = getNodeByName(name);
    if (!validateUnassign(node))
        return;

    node.config.curPoints--;
    setNodePoints(node);
    calcPoints();
    selectNode(node);

    updateStatMods(node);
}

/**@param {GroupNode} node */
function updateStatMods(node){
    player.removeModifiersBySource(node);
    
    const tempStatMods = [];
    for (const mod of node.mods) {
        const modTemplate = getStatModifierTemplate(mod.id);
        if(mod.stats.length !== modTemplate.stats.length){
            console.error("@modTree - node stats array length does not match mod template stats array length", "id:", mod.id);
            continue;
        }
        for(let i = 0; i < mod.stats.length; i++){
            const statValue = mod.stats[i].value * node.config.curPoints;
            modTemplate.stats[i].value = statValue;
            tempStatMods.push(modTemplate.stats[i]);
        }

    }

    const statMods = convertStatMods(tempStatMods, node);
    player.addStatModifier(statMods);
}

function setNodePoints(node) {
    node.element.querySelector('.points').textContent = `${node.config.curPoints}/${node.config.max}`;
}

function save(savedObj) {
    if(savedObj.hasOwnProperty('modTree')){
        console.error('savedObj already contains modTree property');
        return;
    }
    savedObj.modTree = {
        nodes: []
    };
    treeGroups.flatMap(x => x.nodes).forEach(x => {
        if(savedObj.modTree.hasOwnProperty(x.config.name)){
            console.error('savedObj.modTree already contains node name:', x.config.name);
            return;
        }
        if(x.config.curPoints > 0){
            savedObj.modTree.nodes.push({name: x.config.name, value: x.config.curPoints});
        }
    });
}

function load(savedObj) {
    const { modTree } = savedObj;
    if (!modTree) {
        return;
    }

    treeGroups.flatMap(x => x.nodes).forEach(x => {
        player.removeModifiersBySource(x);
        x.config.curPoints = 0;
        setNodePoints(x);
    });

    var nodes = modTree.nodes;
    for (const node of nodes) {
        for(let i = 0; i < node.value; i++){
            allocate(node.name);
        }
    }
    calcPoints();
    //check if spentPoints is equal to saved nodes total points
    //if not, then allocation failed and this should trigger a full respec
}