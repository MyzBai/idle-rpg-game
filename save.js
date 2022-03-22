import { uuidv4 } from "./helperFunctions.js";
import Global from './global.js';


const saveInstances = [];
const loadInstances = [];

export function hasSave(){
    const item = localStorage.getItem(Global.env.SAVE_PATH);
    return item && item.length !== 0;
}

export function save() {
    const savedObj = {};
    for (const instance of saveInstances) {
        instance.callback(savedObj);
    }

    localStorage.setItem(Global.env.SAVE_PATH, JSON.stringify(savedObj));
    console.log('saved game');
}

/**
 * @param {object} key 
 */
export async function load() {
    const data = getSavedObj();
    if(data){
        console.log('data loaded', data);
        for (const instance of loadInstances) {
            instance.callback(data);
        }
    }
}

export function reset(){
    localStorage.removeItem(Global.env.SAVE_PATH);
}

/**
 * 
 * @param {function} callback 
 * @returns {string} key 
 */
 export function registerSave(callback) {
    var id = uuidv4();
    var instance = { id, callback };
    saveInstances.push(instance);
    return id;
}

/**
 * 
 * @param {function} callback 
 * @returns {string} key 
 */
export function registerLoad(callback) {
    var id = uuidv4();
    var instance = { id, callback };
    loadInstances.push(instance);
    return id;
}

// export function saveProperty(name, prop){
//     savedObj[name] = prop;
// }

export function getSavedObj(){
    const data = localStorage.getItem(Global.env.SAVE_PATH);
    if(data){
        return JSON.parse(data);
    }
}