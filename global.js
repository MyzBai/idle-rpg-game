import { isLocalNetwork } from "./helperFunctions.js";

class Global{
    constructor(){
        /**@type {env.Environment} */
        this.env = undefined;
    }
}

export async function initEnvironment(){
    let isLocal = false;
    if(isLocalNetwork(window.location.hostname)){
        isLocal = true;
    }
    if(window.location.pathname.includes('/dev')){
        isLocal = true;
    } else {
        if(window.location.search.includes('production')){
            isLocal = false;
        }
    }
	const envFilePath = `./env/${isLocal ? "development" : "production"}.env.js`;
	const env = await import(envFilePath);
	global.env = env.default;
}
const global = new Global();
export default global;