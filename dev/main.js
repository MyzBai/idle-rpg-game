import * as jsonEditor from "./jsonEditor.js";
import * as sim from "./simNew.js";
import { registerTabs } from "../helperFunctions.js";
import * as eventListener from "../eventListener.js";
import { initEnvironment } from "../global.js";
import * as save from "../game/save.js";

const editorTab = document.querySelector('.s-top .editor');
const simTab = document.querySelector('.s-top .sim');
const gameTab = document.querySelector('.s-top .game');

//@ts-expect-error
registerTabs([editorTab, simTab, gameTab], 1);
[simTab, gameTab].forEach((x) => {
	x.toggleAttribute("disabled", true);
});

eventListener.add(eventListener.EventType.MODULE_CHANGED, (module) => {
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

	await jsonEditor.init();
	await sim.init();
    
    jsonEditor.compile();

	save.setSaveKey(`temp-dev`);
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

    const dev = await import('./dev.js');
    dev.init();
}
