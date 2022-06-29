// import * as jsonEditor from "./jsonEditor.js";
import * as sim from "./sim/sim.js";
import * as helperFunctions from "../helperFunctions.js";
import { initEnvironment } from "../global.js";
import * as monacoEditor from "./monacoEditor.js";

const topContainer = document.querySelector("body > .s-top");

//Page Nav Buttons
const editorTab = topContainer.querySelector("[data-tab-target].editor");
const gameTab = topContainer.querySelector("[data-tab-target].game");

//Run Sim Button
const runSimButton = topContainer.querySelector(".s-sim-buttons .run-sim-button");
init();

async function init() {
	{
		const monacoUrls = [
			"https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0-dev.20220620/min/vs/loader.min.js",
			"https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0-dev.20220620/min/vs/editor/editor.main.nls.js",
			"https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0-dev.20220620/min/vs/editor/editor.main.js",
		];
		globalThis.require = { paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0-dev.20220620/min/vs" } };
		for (const url of monacoUrls) {
			await addScript(url);
		}
	}

	await initEnvironment();
	await monacoEditor.createEditor();

	setupDOMElements();
}

function setupDOMElements() {
	helperFunctions.registerTabs([editorTab, gameTab], 0);

	runSimButton.addEventListener("click", (e) => {
		sim.run();
	});
}

async function initGame(module) {
	if (!document.querySelector("#game-page")) {
		const response = await fetch("../game/game.html");
		const result = await response.text();
		const doc = new DOMParser().parseFromString(result, "text/html");
		const gamePage = doc.body.querySelector("#game-page");
		document.body.insertAdjacentElement("beforeend", gamePage);
	}

	const initGameFile = await import("../game/game.js");
	initGameFile.init(module);

	const dev = await import("./dev.js");
	dev.init();
}

async function addScript(url) {
	return new Promise((resolve) => {
		// console.log('download', url);
		const script = document.createElement("script");
		script.type = "text/javascript";
		script.onload = function () {
			// console.log('download done', url);
			resolve(1);
		};

		script.src = url;
		document.querySelector("head").appendChild(script);
	});
}