import Global from "./global.js";
import * as loadModule from "./loadModule.js";
import { isLocalNetwork } from "./helperFunctions.js";


window.addEventListener("keyup", (e) => {
    if(document.activeElement !== document.body){
        return;
    }
    if(e.key === 'D'){
        location.href = location.href + 'dev';
    }
});

init();

async function init() {
	await loadEnvironment();
	await registerServiceWorker();

	await loadModule.init();
}

async function registerServiceWorker() {
	if (!("serviceWorker" in navigator)) {
		return;
	}
	try {
		await navigator.serviceWorker.register("./sw.js");
	} catch (e) {
		console.error(e);
	}
}

async function loadEnvironment() {
	const isLocal = window.location.search.includes("production") ? false : isLocalNetwork(window.location.hostname);
	const envFilePath = `./env/${isLocal ? "development" : "production"}.env.js`;
	const env = await import(envFilePath);
	Global.env = env.default;
}
