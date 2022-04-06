import { uuidv4 } from "./helperFunctions.js";
const FramesPerSecond = 25;
const FrameTime = 1000 / FramesPerSecond;

/**
 * @typedef Instance
 * @property {string} id
 * @property {(dt: number) => any} callback
 * @property {Options} options
 * @property {number} time
 */

/**
 * @typedef Options
 * @property {number} intervalMS
 */

/**
 * @type {Instance[]}
 */
var instances = [];

var isRunning = false;
var loopId = undefined;
var now = undefined;
var remainder = 0;

/**
 * @param {Function} callback
 * @param {Options} options
 * @returns {string} id
 */
export function subscribe(callback, options = {}) {
	var id = uuidv4();
	var instance = {
		id,
		callback,
        options,
        time: 0
	};
	instances.push(instance);
	return id;
}

/**
 * @param {string} id
 */
export function unsubscribe(id) {
	if (typeof id !== "string") {
		console.error("expected a string as id");
		return;
	}
    instances = instances.filter(x => x.id !== id);
}

export function start() {
	isRunning = true;
	now = performance.now();
	remainder = 0;
	clearTimeout(loopId);
	loop();
}

export function stop() {
	isRunning = false;
	clearTimeout(loopId);
}

export function clear(){
    instances = [];
}

function loop() {
	loopId = setTimeout(() => {
		var diff = performance.now() - now + remainder;
		now = performance.now();
		while (diff > FrameTime) {
			var dt = Math.min(diff, FrameTime) / 1000;
			diff -= FrameTime;
			for (const instance of instances) {
                instance.time += dt * 1000;
                let intervalMS = instance.options.intervalMS || 0;
                if(instance.time > intervalMS){
                    instance.callback(dt);
                    instance.time = instance.time - (intervalMS || instance.time);
                }
			}
		}
		remainder = diff;
		loop();
	}, FrameTime);
}
