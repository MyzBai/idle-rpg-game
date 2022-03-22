import { uuidv4 } from "./helperFunctions.js";
const FramesPerSecond = 25;
const FrameTime = 1000 / FramesPerSecond;

/**
 * @type {{id: string, callback: (dt: number)}[]}
 */
var instances = [];
var isRunning = false;
var loopId = undefined;
var now = undefined;
var remainder = 0;
/**
 * @param {Function} callback
 * @returns {string} id
 */
export function subscribe(callback){
    var id = uuidv4();
    var instance = {id, callback};
    instances.push(instance);
    return id;
}

/**
 * @param {string} id 
 */
export function unsubscribe(id){
    if(typeof id !== "string"){
        console.error("expected a string as id");
        return;
    }
    instances.splice(x => x.id === id);
}

export function start(){
    isRunning = true;
    now = performance.now();
    remainder = 0;
    clearTimeout(loopId);
    loop();
}

export function stop(){
    isRunning = false;
    clearTimeout(loopId);
}

function loop(){
    
    loopId = setTimeout(() => {
        var diff = performance.now() - now + remainder;
        now = performance.now();
        while(diff > FrameTime){
            var dt = Math.min(diff, FrameTime) / 1000;
            diff -= FrameTime;
            for (const instance of instances) {
                instance.callback(dt);
            }
        }
        remainder = diff;
        loop();
    }, FrameTime);
}

