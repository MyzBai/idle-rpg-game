import * as player from '../player.js';
import * as mana from '../mana.js';
import * as enemy from '../enemy.js';
import { calcAttack } from '../damageCalc.js';
import * as ailments from '../ailments.js';
import * as gameLoop from '../gameLoop.js';
import * as eventListener from '../eventListener.js';

var attackLoopId = undefined;

document.querySelector('.kill-enemy').addEventListener('click', e => {
    eventListener.invoke(eventListener.EventType.ENEMY_KILLED);
    enemy.die();
});

export async function init(enemyData) {
    if(!enemyData){
        console.error("enemy data is mandatory. This should never be called");
        return;
    }
    console.log("init combat");

    await enemy.init(enemyData.enemies);

    autoAttackLoop();
}

function autoAttackLoop() {
    var deltaTotal = 0;
    var attackSkill = player.getAttackSkill();

    if(attackLoopId){
        gameLoop.unsubscribe(attackLoopId);
    }
    attackLoopId = gameLoop.subscribe((dt) => {
        if (player.getAttackSkill() !== attackSkill) {
            attackSkill = player.getAttackSkill();
            deltaTotal = 0;
        }
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
    
    var playerObj = { 
        attackSkill: player.getAttackSkill(),
        conversionTable: player.getConversionTable(),
        modList: player.getModList() 
    };

    var result = calcAttack(playerObj);

    if(!result.wasHit){
        console.log('Attack missed');
        return;
    } else{
        console.log(`you dealt ${result.totalDamage.toFixed()} to the enemy`);
    }

    enemy.takeDamage(result.totalDamage);

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
        eventListener.invoke(eventListener.EventType.ENEMY_KILLED);
        enemy.die();
    }
}