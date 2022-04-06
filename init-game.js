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

 /** @type {Module} */
var cachedModule = undefined;
eventListener.add(eventListener.EventType.SAVE_GAME, savedObj => {
    savedObj.config = {
        name: cachedModule.config.name,
        src: cachedModule.config.src,
        id: cachedModule.config.id,
        lastSave: new Date().getTime()
    };
});

 /** @param {Module} module */
export function init(module) {
    if(!module){
        module = JSON.parse(JSON.stringify(cachedModule));
    } else{
        cachedModule = JSON.parse(JSON.stringify(module));
    }
    
	console.log("init sub modules");

	gameLoop.clear();
	gameLoop.stop();

	player.init({ defaultMods: module.defaultMods.player });

	enemy.init(module.enemies);
	skills.init(module.skills);
	items.init(module.items);
	modTree.init(module.modTree);
	combat.init();
    
	save.load();

	const isProduction = Global.env.ENV_TYPE === "production";
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
