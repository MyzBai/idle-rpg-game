import Global from "./global.js";
import * as loadModule from './loadModule.js';
import { isLocalNetwork } from "./helperFunctions.js";
import { registerTabs } from "./helperFunctions.js";

const homeButton = document.querySelector("body .p-game .go-to-home-button");
const gameButton = document.querySelector("body .p-home .go-to-game-button");
const tabs = [homeButton, gameButton];
registerTabs(tabs);
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
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });
        console.log('service worker registered');

        if(navigator.serviceWorker.controller){
            console.log(navigator.serviceWorker.controller.state);
        }

        navigator.serviceWorker.addEventListener('controllerchange', e => {
            console.log('new service worker activated');
        });
    } catch(e){
        console.error(e);
    }
}


async function loadEnvironment() {
	const isLocal = isLocalNetwork(window.location.hostname);
	const envFilePath = `./env/${isLocal ? "development" : "production"}.env.js`;
	const env = await import(envFilePath);
	Global.env = env.default;
}
