import { uuidv4 } from "./helperFunctions.js";

var instances = [];
export const EventType = {
	LEVEL_UP: 1,
	ENEMY_KILLED: 2,
	ESSENCE_CHANGED: 3,
	ITEM_CHANGED: 4,
    SAVE_GAME: 5,
    SAVE_GAME_DONE: 6,
    LOAD_GAME: 7,
    LOAD_GAME_DONE: 8,
    RESET: 9
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
