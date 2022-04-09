import Global from "./global.js";
import * as loadModule from './loadModule.js';
import { isLocalNetwork } from "./helperFunctions.js";
import { registerTabs } from "./helperFunctions.js";

const homeButton = document.querySelector("body .p-game .go-to-home-button");
const gameButton = document.querySelector("body .p-home .go-to-game-button");
const tabs = [homeButton, gameButton];
registerTabs(tabs);
//@ts-expect-error
tabs[0].click();

init();
async function init() {
    await loadEnvironment();

    if(Global.env.ENV_TYPE === 'development'){
        await import('./dev.js');
    }

    await registerServiceWorker();
	await loadModule.init();
}


async function registerServiceWorker(){
    if(!('serviceWorker' in navigator)){
        return;
    }
    try{
        await navigator.serviceWorker.register('./sw.js');
    } catch(e){
        console.error(e);
    }
}


async function loadEnvironment() {
	const isLocal = window.location.search.includes('production') ? false : isLocalNetwork(window.location.hostname);
	const envFilePath = `./env/${isLocal ? "development" : "production"}.env.js`;
	const env = await import(envFilePath);
	Global.env = env.default;
}