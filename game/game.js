import { jsonCopy, registerTabs } from "../helperFunctions.js";
import Global from '../global.js';
import * as gameLoop from "./gameLoop.js";
import * as save from "./save.js";
import * as eventListener from '../eventListener.js';
import {convertModuleMods} from '../modUtils.js';

eventListener.add(eventListener.EventType.SAVE_GAME, (savedObj) => {
	savedObj.config = {
		name: cachedModule.config.name,
		src: cachedModule.config.src,
		id: cachedModule.config.id,
		lastSave: new Date().getTime(),
	};
});

const homeButton = document.querySelector("body .p-game .home-btn");
const gameButton = document.querySelector("body .p-home .game-btn");
const tabs = [homeButton, gameButton];
if(tabs.every(x => x)){
    gameButton.classList.remove('hide');
    //@ts-expect-error
    registerTabs(tabs);
}



/** @type {Modules.ModuleData} */
var cachedModule = undefined;

/**@param {Modules.ModuleData} module */
export async function init(module) {
	initMenu();

    gameLoop.clear();

    cachedModule = module = module ?? cachedModule;
    if(!module){
        module = cachedModule;
    } else{
        cachedModule = module;
    }
    //create a copy of the module to prevent any external changes to it
    module = jsonCopy(module);

    convertModuleMods(module);

    //Initialize
    const player = await import('./player.js');
    player.init(module.player);

    const enemy = await import('./sub-modules/enemy.js');
    enemy.init(module.enemies);

    const combat = await import('./combat.js');
    combat.init();
    
    const skills = await import('./sub-modules/skills.js');
    skills.init(module.skills);

    if(module.items){
        const items = await import('./sub-modules/items.js');
        items.init(module.items);
    }

    if(module.modTree){
        const modTree = await import('./sub-modules/modTree.js');
        modTree.init(module.modTree);
    }

    //Setup
    player.setup();

    console.log(Global.env.ENV_TYPE);
    if(Global.env.ENV_TYPE === 'production'){
        //auto save
        gameLoop.subscribe(save.save, {intervalMS: 10 * 1000});
        gameLoop.start();
    }

    document.querySelector('#game-page .home-btn').classList.toggle('hide', document.querySelector('.p-home') ? false : true);
}

function initMenu() {
	/**@type {NodeListOf<HTMLElement>} */
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
