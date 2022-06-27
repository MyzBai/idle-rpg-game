import * as jsonEditor from "./jsonEditor.js";
import * as sim from "./sim/sim.js";
import { registerTabs } from "../helperFunctions.js";
import * as eventListener from "../eventListener.js";
import { initEnvironment } from "../global.js";
import * as save from "../game/save.js";
import * as mods from '../mods.js';


const editorTab = document.querySelector(".s-top .editor");
const simTab = document.querySelector(".s-top .sim");
const gameTab = document.querySelector(".s-top .game");

//@ts-expect-error
registerTabs([editorTab, simTab, gameTab], 0);
[simTab, gameTab].forEach((x) => {
	x.toggleAttribute("disabled", true);
});

jsonEditor.onModuleChanged.listen((module) => {
	const disabled = module === undefined;
	[simTab, gameTab].forEach((x) => {
		x.toggleAttribute("disabled", disabled);
	});

	if (module) {
		initGame(module);
	}
});

init();

async function init() {

	await initEnvironment();

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

	await jsonEditor.init();
	// await sim.init();

	// save.setSaveKey(`temp-dev`);
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
