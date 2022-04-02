import { uuidv4 } from "./helperFunctions.js";

var instances = [];
export const EventType = {
	LEVEL_UP: 1,
	ENEMY_KILLED: 2,
	ESSENCE_CHANGED: 3,
	ITEM_CHANGED: 4,
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

export function invoke(type, ...params) {
	for (const instance of instances.filter((x) => x.type === type)) {
		instance.callback(...params);
	}
}
