import { uuidv4 } from "./helperFunctions.js";

var instances = [];
export const EventType = {
	LEVEL_UP: 'LEVEL_UP',
	ENEMY_KILLED: 'ENEMY_KILLED',
	ESSENCE_CHANGED: 'ESSENCE_CHANGED',
	ITEM_CHANGED: 'ITEM_CHANGED',
    MODULE_CHANGED: 'MODULE_CHANGED',
    SAVE_GAME: 'SAVE_GAME',
    SAVE_GAME_DONE: 'SAVE_GAME_DONE',
    LOAD_GAME: 'LOAD_GAME',
    LOAD_GAME_DONE: 'LOAD_GAME_DONE',
    RESET: 'RESET',
};
Object.freeze(EventType);

/**@returns {string} id */
export function add(type, callback) {
	const instance = {
		type,
		callback,
	};
    const id = uuidv4();
    instance.id = id;
	instances.push(instance);
    return id;
}

/**@param {string} id */
export function remove(id){
    instances = instances.filter(x => x.id !== id);
}

export function clear(){
    instances = [];
}

export function invoke(type, ...params) {
	for (const instance of instances.filter((x) => x.type === type)) {
		instance.callback(...params);
	}
}
