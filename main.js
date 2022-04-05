import Global from "./global.js";
import * as gameLoop from "./gameLoop.js";
import * as loadModule from './loadModule.js';
import { isLocalNetwork } from "./helperFunctions.js";
import * as save from "./save.js";
import { registerTabs } from "./helperFunctions.js";

const homeButton = document.querySelector("body .p-game .go-to-home-button");
const gameButton = document.querySelector("body .p-home .go-to-game-button");
const tabs = [homeButton, gameButton];
registerTabs(tabs);
tabs[0].click();

const startButton = document.querySelector(".start-game");
const stopButton = document.querySelector(".stop-game");
const resetButton = document.querySelector(".reset-game");
const statusSpan = document.querySelector(".status-game span");

document.querySelector("body .p-game .save-btn").addEventListener("click", (e) => {
	save.save();
});
document.querySelector("body .p-game .load-btn").addEventListener("click", (e) => {
	save.load();
});

init();
async function init() {
    await registerServiceWorker();
	await loadEnvironment();
	await loadModule.init();

	startButton.addEventListener("click", startGame);
	stopButton.addEventListener("click", stopGame);
	resetButton.addEventListener("click", resetGame);


}




function startGame() {
	startButton.classList.add("active");
	stopButton.classList.remove("active");
	statusSpan.style.color = "green";
	statusSpan.textContent = "running";
	gameLoop.start();
}

function stopGame() {
	stopButton.classList.add("active");
	startButton.classList.remove("active");
	statusSpan.style.color = "red";
	statusSpan.textContent = "stopped";
	gameLoop.stop();
}

function resetGame() {
	save.reset();
	location.reload();
}

async function registerServiceWorker(){
    if(!('serviceWorker' in navigator)){
        return;
    }
    try{
        const registration = await navigator.serviceWorker.register('./sw.js');
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
