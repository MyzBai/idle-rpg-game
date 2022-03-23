import { uuidv4 } from "./helperFunctions.js";
import Global from './global.js';


const saveInstances = [];
const loadInstances = [];

export function hasSave(){
    try {
        const item = localStorage.getItem(Global.env.SAVE_PATH);
        return item && item.length !== 0;
    } catch (e) {
        console.error(e);
    }
    return false;
}

export function save() {
    if(Global.env.SAVE_PATH === undefined){
        return;
    }
    const savedObj = {};
    for (const instance of saveInstances) {
        instance.callback(savedObj);
    }

    try {
        localStorage.setItem(Global.env.SAVE_PATH, JSON.stringify(savedObj));
    } catch (e) {
        console.error(e);
    }
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
    try {
        localStorage.removeItem(Global.env.SAVE_PATH);
    } catch (e) {
        console.error(e);
    }
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

export function getSavedObj(){
    try {
        const data = localStorage.getItem(Global.env.SAVE_PATH);
        if(data){
            return JSON.parse(data);
        }
    } catch (e) {
        console.error(e);        
    }
}

/**@param {string} key */
export function getSaveItem(key){
    try {
        const data = localStorage.getItem(key.toLowerCase());
        if(data){
            return JSON.parse(data);
        }
    } catch (e) {
        console.error(e);
    }
}