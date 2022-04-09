import * as player from './player.js';
import * as gameLoop from './gameLoop.js';

/**@type {HTMLElement} */
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