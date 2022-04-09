import * as player from './player.js';
import * as mana from './mana.js';
import * as enemy from './sub-modules/enemy.js';
import { calcAttack } from './damageCalc.js';
import * as ailments from './ailments.js';
import * as gameLoop from './gameLoop.js';

/**
 * @typedef EnemyData
 * @property {{health: number}[]} enemies
 */

var attackLoopId = undefined;

export async function init() {
    console.log("init combat");
    autoAttackLoop();
}

function autoAttackLoop() {
    var deltaTotal = 0;

    if(attackLoopId){
        gameLoop.unsubscribe(attackLoopId);
    }

    attackLoopId = gameLoop.subscribe((dt) => {
        var attackSpeed = player.getModCache().attackSpeed;
        deltaTotal += (dt) * (1 / attackSpeed);
        if (deltaTotal >= attackSpeed) {
            let manaCost = player.getModCache().attackCost;
            if(mana.getCurMana() > manaCost){
                deltaTotal -= attackSpeed;
                mana.subtractMana(manaCost)
                performAttack();
            }
        }
    });
}

function performAttack() {
    
    var result = calcAttack({modList: player.getModList(), modCache: player.getModCache(), conversionTable: player.getConversionTable()});

    if(!result.wasHit){
        console.log('Attack missed');
        return;
    } else{
        console.log(`you dealt ${result.totalDamage.toFixed()} to the enemy`);
    }

    enemy.takeAttackDamage(result.totalDamage);

    if (result.wasCrit) {
        var healthbarBackground = document.querySelector('.g-progress-bar-background');
        let isShaking = healthbarBackground.classList.contains('shake');
        if (!isShaking) {
            healthbarBackground.classList.add('shake');
            setTimeout(() => {
                healthbarBackground.classList.remove('shake');
            }, 500);
        }
    }

    for (const ailment of result.ailments) {
        ailments.applyAilment(ailment);
    }

    if(enemy.getCurHealth() <= 0){
        enemy.die();
    }
}