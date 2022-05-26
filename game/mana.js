import { clamp } from '../helperFunctions.js';
import * as gameLoop from './gameLoop.js';

/**@type {HTMLElement} */
const manaBar = document.querySelector('.g-progress-bar-foreground.mana-bar');

var curMana = 0;
var maxMana = 0;
var manaRegen = 0;
var manaRatio = 1;

export function init() {
    console.log('init mana');

    curMana = 0;
    manaRegen = 0;
    
    setMana(0);
    updateManaBar();

    gameLoop.subscribe(regenerateMana);
}

/**@param {ModCache} modCache */
export function update(modCache){
    maxMana = modCache.maxMana;
    manaRegen = modCache.manaRegen;
    updateManaBar();
}

export function getCurMana() {
    return curMana;
}

export function getMaxMana() {
    return maxMana;
}

export function setMana(value){
    curMana = clamp(value, 0, maxMana);
    const ratio = curMana / maxMana;
    manaRatio = Number.isNaN(ratio) ? 0 : ratio;
    updateManaBar();
}

function updateManaBar() {
    // let pct = curMana / maxMana;
    manaBar.style.width = `${manaRatio * 100}%`;
}

function regenerateMana(dt){
    if(curMana < maxMana){
        const regen = (manaRegen * dt);
        setMana(curMana + regen);
    }
}