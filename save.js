import Global from "./global.js";
import * as eventListener from "./eventListener.js";

var saveKey = `g-temp`;
export function setSaveKey(name){
    saveKey = `g-${name.toLowerCase()}`;
}

export function hasSave() {
	try {
		const item = localStorage.getItem(saveKey);
		return item && item.length !== 0;
	} catch (e) {
		console.error(e);
	}
	return false;
}

export function save() {
	try {
        const savedObj = {};
        eventListener.invoke(eventListener.EventType.SAVE_GAME, savedObj);
		localStorage.setItem(saveKey, JSON.stringify(savedObj));
        eventListener.invoke(eventListener.EventType.SAVE_GAME_DONE, savedObj);
	} catch (e) {
		console.error(e);
	}
}

/**
 * @param {object} key
 */
export async function load() {
	const data = getSavedObj();
    eventListener.invoke(eventListener.EventType.LOAD_GAME, data);
    eventListener.invoke(eventListener.EventType.LOAD_GAME_DONE, data);
    console.log("data loaded", data);
}

/**
 * Removes saves and loads with an empty save object
 */
export function reset() {
	try {
		localStorage.removeItem(saveKey);
        load();
	} catch (e) {
		console.error(e);
	}
}

export function getSavedObj() {
	try {
		const data = localStorage.getItem(saveKey);
        if(data){
            return JSON.parse(data);
        }
	} catch (e) {
		console.error(e);
	}
    return {};
}

/**@param {string} key */
export function getSaveItem(key) {
	try {
		const data = localStorage.getItem(key.toLowerCase());
		if (data) {
			return JSON.parse(data);
		}
	} catch (e) {
		console.error(e);
	}
    return {};
}

/**Removes with current save key*/
export function removeItem(){
    try {
        localStorage.removeItem(saveKey);
    } catch (e) {
        console.error(e);
    }
}

export function removeWithKey(key) {
	try {
		localStorage.removeItem(key.toLowerCase());
	} catch (e) {
		console.error(e);
	}
}

export function getAllSaves(){
    const saves = [];
    try {
        for (const [key, value] of Object.entries(localStorage)){
            if(key.startsWith('g-')){
                const content = JSON.parse(value);
                if(!content.config){
                    continue;
                }
                saves.push(content);
            }
        }
    } catch (e) {
        console.error(e);
    }
    return saves;
}