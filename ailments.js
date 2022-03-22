import * as player from './player.js'
import * as enemy from './sub-modules/enemy.js'
import * as gameLoop from './gameLoop.js'

/**
 * @typedef BleedAilment
 * @property {string} type
 * @property {number} damageFactor
 * @property {number} baseDamage
 * @property {number} duration
 * @property {number} time
 */

var bleedElement = document.querySelector('.s-enemy .ailment.bleed');
var bleedSpan = bleedElement.querySelector('span');

var tickId = -1;

/**@type {BleedAilment[]} */
var bleedInstances = [];

var gameLoopId = gameLoop.subscribe(tick);

/**
 * @param {{type: string, baseDamage: number, duration: number}} instance 
 */
export function applyAilment(instance) {
    if (instance.type.toLocaleLowerCase() === 'bleed') {
        let bleedInstance = Object.assign({}, instance);
        bleedInstance.time = instance.duration;
        bleedInstances.push(bleedInstance);
        bleedElement.classList.add('visible');
    }
}

function tick(dt) {
    // console.log('tick ailments', dt.toFixed(4));
    if(bleedInstances.length > 0){
        var activeInstance = bleedInstances.reduce((max, cur) => (max.baseDamage > cur.baseDamage ? max : cur));
        enemy.takeDamage(activeInstance.baseDamage * dt);
        bleedSpan.textContent = Math.ceil(Math.max(...bleedInstances.map(x => x.time))).toFixed();

        for (const bleedInstance of bleedInstances) {
            bleedInstance.time -= dt;
        }
        bleedInstances = bleedInstances.filter(x => x.time > 0);
        bleedElement.classList.toggle('visible', bleedInstances.length > 0);
    }

}