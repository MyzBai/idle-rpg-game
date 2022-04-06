import * as player from './player.js';
import * as gameLoop from './gameLoop.js';

const manaBar = document.querySelector('.g-progress-bar-foreground.mana-bar');

var curMana = 0;
var maxMana = 0;
var manaRegen = 0;

export function init() {
    console.log('init mana');

    maxMana = player.getModCache().maxMana;
    manaRegen = player.getModCache().manaRegen;
    curMana = maxMana;
    updateManaBar();

    gameLoop.subscribe(regenerateMana);
}

export function update(){
    maxMana = player.getModCache().maxMana;
    manaRegen = player.getModCache().manaRegen;
    updateManaBar();
}

export function getCurMana() {
    return curMana;
}

export function getMaxMana() {
    return maxMana;
}

export function addMana(amount) {
    let newMana = curMana + amount;
    setCurMana(newMana);
}

export function subtractMana(amount) {
    let newMana = curMana - amount;
    setCurMana(newMana);
}

export function calcAttackCost() {
    // let modList = player.getModList();
    let attackSkill = player.getAttackSkill();
    if(!attackSkill){
        // console.error('cannot calc attack cost. player must have an attack skill');
        return Math.max;
    }
    let baseCost = attackSkill.getManaCost();
    let costMultiplier = 1;
    for (const support of attackSkill.getSupports()) {
        costMultiplier += support ? (1 - support.manaMultiplier) : 0;
    }
    // let incCost = calcModSum(modList, 'inc', 'manaCost');
    return baseCost * costMultiplier;
}

function setCurMana(mana) {
    mana = Math.max(0, Math.min(mana, maxMana));
    curMana = mana;
    updateManaBar();
}

function updateManaBar() {
    let pct = curMana / maxMana;
    manaBar.style.width = `${pct * 100}%`;
}

function regenerateMana(dt){
    if(curMana < maxMana){
        addMana(manaRegen * dt);
    }
}