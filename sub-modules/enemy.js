import { getLevel as getPlayerLevel } from '../player.js';
import { registerSave, registerLoad } from '../save.js';

/**@type {HTMLElement} */
var healthbar = document.querySelector('.g-progress-bar-foreground.health-bar');

/**@type {number[]} */
var healthList = undefined;

var curHealth = 0;
var maxHealth = 0;

export async function init(data) {
    if (!data) {
        return;
    }
    console.log('init enemy');

    healthList = data.enemies.flatmap(x => x.health);
    maxHealth = healthList[0];
    curHealth = maxHealth;
    console.log(`Enemy initialized with %c${maxHealth}%c max health`, 'color: red', 'color: default');
    updateHealthbar();

    registerSave(save);
    registerLoad(load);
}

/**@param {number} damage */
export function takeDamage(damage) {
    if (Number.isNaN(damage)) {
        console.log(damage);
        console.error("An invalid argument has been passed into enemy.js/takeDamage(damage: number)");
        return;
    }
    curHealth -= damage;

    updateHealthbar();

    if (curHealth <= 0) {
        curHealth = 0;
    }
}

export function getCurHealth() {
    return curHealth;
}

export function die() {
    let index = getPlayerLevel() - 1;
    if(index >= healthList.length)
        index = healthList.length-1;
        
    maxHealth = healthList[index];
    curHealth = maxHealth;
    updateHealthbar();
}

function updateHealthbar() {
    var pct = (curHealth / maxHealth * 100).toString();
    healthbar.style.width = pct + '%';
}


function save(savedObj) {
    savedObj.enemy = {
        healthRatio: curHealth / maxHealth
    };
}

function load(savedObj) {
    const { enemy } = savedObj;
    if(!enemy){
        return;
    }
    maxHealth = healthList[getPlayerLevel() - 1];
    curHealth = enemy.healthRatio * maxHealth;
    updateHealthbar();
}