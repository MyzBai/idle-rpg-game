import * as player from './player.js';
import * as enemy from './sub-modules/enemy.js';
import * as skills from './sub-modules/skills.js';
import * as items from './sub-modules/items.js';
import * as modTree from './sub-modules/modTree.js';
import * as combat from './combat.js';
import * as save from './save.js';

initMenu();

/**
 * @param {import('./loadModule.js').ModuleData} data 
 */
export async function init(data) {
    console.log('init sub modules');
    
    //make sure we copy the data before distributing it to all the sub-modules
    data = JSON.parse(JSON.stringify(data));

    //player must be initialized first because it has no dependencies
    await player.init({ defaultStatMods: data.defaultStatMods });

    await enemy.init(data.enemy);
    await skills.init(data.skills);
    await items.init(data.items);
    await modTree.init(data.modTree);

    await combat.init();
    save.registerSave(savedObj => { savedObj.config = data.config });
}


function initMenu(){
    const tabs = document.querySelectorAll('.p-game [data-tab-target]');
    for (const tab of tabs) {
        tab.addEventListener('click', e => {
            for (const otherTab of tabs) {
                const target = document.querySelector(otherTab.dataset.tabTarget);
                otherTab.classList.toggle('active', otherTab === tab);
                if(!target){
                    continue;
                }
                const active = otherTab === tab;
                target.classList.toggle('active', active);
                
            }
        });
    }
    tabs[2].click();
}