import * as player from "./player.js";
import * as enemy from "./sub-modules/enemy.js";
import * as skills from "./sub-modules/skills.js";
import * as items from "./sub-modules/items.js";
import * as modTree from "./sub-modules/modTree.js";
import * as combat from "./combat.js";
import * as save from "./save.js";
import * as eventListener from "./eventListener.js";
import Global from "./global.js";
import * as gameLoop from "./gameLoop.js";

initMenu();
var saveGameEventId = undefined;
/**
 * @param {import('./loadModule.js').ModuleData} data
 */
export function init(data) {
	console.log("init sub modules");

	gameLoop.clear();
	gameLoop.stop();
	//make sure we copy the data before distributing it to all the sub-modules
	data = JSON.parse(JSON.stringify(data));

	//player must be initialized first because it has no dependencies
	//without default statmods,
	player.init({ defaultMods: data.defaultMods });

	enemy.init(data.enemies);
	skills.init(data.skills);
	items.init(data.items);
	modTree.init(data.modTree);
	combat.init();
    
    eventListener.remove(saveGameEventId);
    saveGameEventId = eventListener.add(eventListener.EventType.SAVE_GAME, savedObj => {
        savedObj.config = {
            name: data.config.name,
            src: data.config.src,
            id: data.config.id,
            lastSave: new Date().getTime()
		};
    });

	save.load();

	const isProduction = Global.env.ENV_TYPE === "production";
	document.querySelector(".p-game .s-dev-tools").classList.toggle("hide", isProduction);
	gameLoop.stop();
	if (isProduction) {
		gameLoop.start();

        //auto save
		gameLoop.subscribe(
			() => {
				save.save();
                console.log('auto saved');
			},
			{ intervalMS: 10 * 1000 }
		);
	}
}

function initMenu() {
	const tabs = document.querySelectorAll("body .p-game .s-menu [data-tab-target]");
	for (const tab of tabs) {
		tab.addEventListener("click", (e) => {
			for (const otherTab of tabs) {
				const target = document.querySelector(otherTab.dataset.tabTarget);
				otherTab.classList.toggle("active", otherTab === tab);
				if (!target) {
					continue;
				}
				const active = otherTab === tab;
				target.classList.toggle("active", active);
			}
		});
	}
	tabs[0].click();
}
