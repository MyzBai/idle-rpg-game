
var instances = [];
export const EventType = {
    LEVEL_UP: 1,
    ENEMY_KILLED: 2,
    ESSENCE_CHANGED: 3,
    ITEM_CHANGED: 4
}
Object.freeze(EventType)

/**@returns {function} remove function */
export function add(type, callback){
    const instance = {
        type,
        callback
    };
    instances.push(instance);
    return () => {
        instances = instances.filter(x => x !== instance);
    }
}

export function invoke(type, ...params){
    for (const instance of instances.filter(x => x.type === type)) {
        instance.callback(...params);
    }
 
}