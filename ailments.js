import * as gameLoop from "./gameLoop.js";
import * as player from './player.js';
import * as enemy from "./sub-modules/enemy.js";

var loopId = undefined;

class AbstractAilment{
    constructor(type){
        /**@type {string} */
        this.type = type;
        /**@type {Ailments.Instance[]} */
        this.instances = [];
        this.label = undefined;
        this.labelUpdateId = undefined;
    }

    tick(dt){};
    sort(){};
    get maxCount(){return 0;}
    /**@param {Ailments.Instance} instance */
    addInstance(instance){
        if(this.instances.length === 0){
            this.labelUpdateId = gameLoop.subscribe(this.updateLabel.bind(this), {intervalMS: 1000});
        }
        instance.time = instance.duration;
        this.instances.push(instance);
        this.sort();

    }
    updateLabel(){
        this.label.classList.toggle("visible", this.instances.length !== 0);
        const time = Math.ceil(Math.max(...this.instances.map(x => x.time)));
        this.label.querySelector("span").textContent = time.toString();
    }
}

class Bleed extends AbstractAilment{
    constructor(){
        super('bleed');
        this.label = document.querySelector('.s-combat .ailment.bleed');
    }
    get maxCount(){
        return player.getModCache().bleedCount;
    }
    tick(dt){
        dealDamage(this, dt);

    }
    sort(){
        sortByDamage(this.instances);
    }
}

const bleed = new Bleed();

/**
 * @param {AbstractAilment} ailment
 * @param {number} dt 
 */
function dealDamage(ailment, dt) {
    var damage = 0;
    const maxCount = ailment.maxCount;
    for(const [index, instance] of ailment.instances.entries()){
        if(index < maxCount){
            damage += instance.damage;
        }
        instance.time -= dt;
    }
    damage *= dt;
    ailment.instances = removeInstances(ailment.instances);
    if(ailment.instances.length === 0){
        gameLoop.unsubscribe(ailment.labelUpdateId);
    }
    enemy.takeDamageOverTime(damage);
}

function removeInstances(instances){
    return instances.filter(x => x.time > 0);
}

function sortByDamage(instances){
    instances.sort((a,b) => b.damage - a.damage);
}

function tick(dt){
    bleed.tick(dt);
}

/**@param {Ailments.Instance} instance */
export function applyAilment(instance){

    if (!loopId) {
		loopId = gameLoop.subscribe(tick);
	}
    if(instance.type === 'bleed'){
        bleed.addInstance(instance);
    }
}