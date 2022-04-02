import Global from "./global.js";
import { init as subModulesInit } from "./init-game.js";
import * as gameLoop from "./gameLoop.js";
import * as loadModule from "./loadModule.js";
import { isLocalNetwork } from "./helperFunctions.js";
import * as save from "./save.js";
import { registerTabs } from "./helperFunctions.js";

const homeButton = document.querySelector("body .p-game .go-to-home-button");
const gameButton = document.querySelector("body .p-home .go-to-game-button");
const tabs = [homeButton, gameButton];
registerTabs(tabs);
tabs[1].click();

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
	await loadEnvironment();
	await loadModule.init();

	startButton.addEventListener("click", startGame);
	stopButton.addEventListener("click", stopGame);
	resetButton.addEventListener("click", resetGame);

	// const moduleData = await loadModule.load();
	// console.log('save path', Global.env.SAVE_PATH);
	// subModulesInit(moduleData);
	// save.load();

	// tabs[1].click();
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

async function loadEnvironment() {
	const isLocal = isLocalNetwork(window.location.hostname);
	const envFilePath = `./env/${isLocal ? "development" : "production"}.env.js`;
	const env = await import(envFilePath);
	Global.env = env.default;
}
