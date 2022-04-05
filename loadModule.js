import { registerTabs } from "./helperFunctions.js";
import { getLocalModule, getLocalModulesInfo } from "./modules/module-exporter.js";
import { init as subModulesInit } from "./init-game.js";
import Global from "./global.js";
import * as save from './save.js';

/**
 * @typedef ModuleConfig
 * @property {string} name
 * @property {string} [description]
 * @property {any} [id]
 * @property {string} [src]
 */

/**
 * @typedef ModuleFile
 * @property {string} filename
 * @property {ModuleFileContent} content
 */

/**
 * @typedef Module
 * @property {ModuleConfig} config
 * @property {object} defaultMods
 * @property {object} enemy
 * @property {object} skills
 * @property {object} [items]
 * @property {object} [modTree]
 */

/**
 * @typedef Repository
 * @property {string} full_name username/repo
 * @property {string} description about
 * @property {string} url api path to repo
 */

// const moduleFilenames = ["config.json", "default-stat-mods.json", "enemy.json", "skills.json", "items.json", "mod-tree.json"];
// const requiredModuleFilenames = ["config.json", "default-stat-mods.json", "enemy.json", "skills.json"];
const moduleNames = ["config", "default-mods", "enemies", "skills", "items", "mod-tree"];

const homePage = document.querySelector("body > .p-home");
const tabs = homePage.querySelectorAll(".s-buttons [data-tab-target]");
registerTabs(tabs);
tabs[1].click();

const ajv = new ajv7({ allowUnionTypes: true });
var ajvValidator = undefined;

export async function init() {
	await loadSchemas();

    var startModuleCallback = undefined;
	{
        const moduleListContainer = homePage.querySelector(".s-new-modules .s-module-list .s-container");
		const moduleInfoContainer = homePage.querySelector(".s-new-modules .s-module-info");
		const moduleInfos = [];

        { //Local Modules
            const localModules = getLocalModulesInfo();
            for (const info of localModules) {
                moduleInfos.push({
                    name: info.name,
                    description: info.description,
                    src: 'local',
                    id: info.name,
                    getModuleCallback: async () => {
                        return await getLocalModule(info.name);
                    },
                });
            }
    
        }

        { //Github Modules
            const repos = await loadGithubRepositories();
            for (const repo of repos) {
                const username = repo.owner.login;
                const repositoryName = repo.name;
                const id = repo.id;
                const description = repo.description;
                moduleInfos.push({
                    name: `${username} | ${repositoryName}`,
                    description: description,
                    src: 'github',
                    id,
                    getModuleCallback: async () => {
                        return await getGithubModule(id);
                    },
                });
            }
    
        }

        for (const moduleInfo of moduleInfos) {
            const btn = document.createElement('div');
            btn.classList.add('module-button', 'g-button');
            btn.innerText = moduleInfo.name;
            btn.addEventListener('click', () => {
                moduleInfoContainer.querySelector(".name").innerText = moduleInfo.name;
                moduleInfoContainer.querySelector(".description").innerText = moduleInfo.description;
                moduleInfoContainer.querySelector('.start-button').removeEventListener('click', startModuleCallback);
                startModuleCallback = async () => {
                    const module = await moduleInfo.getModuleCallback();
                    const errors = validateModule(module);
                    if(errors){
                        printErrors(errors);
                        return;
                    }
                    module.config.name = moduleInfo.name;
                    module.config.src = moduleInfo.src;
                    module.config.id = moduleInfo.id;
                    startModule(module, true);
                };
                moduleInfoContainer.querySelector(".start-button").addEventListener("click", startModuleCallback);
                moduleListContainer.querySelectorAll(".module-button").forEach((x) => {
                    x.classList.toggle("active", x === btn);
                });
            });
            moduleListContainer.appendChild(btn);
        }

		moduleListContainer.firstElementChild.click();
	}

    {
        const moduleListContainer = homePage.querySelector(".s-load-modules .s-module-list .s-container");
		const moduleInfoContainer = homePage.querySelector(".s-load-modules .s-module-info");
        const buttonTemplate = moduleListContainer.querySelector("template");

        const saves = save.getAllSaves();
        console.log(saves);
        for (const save of saves) {
            const {name, description, src, id, lastSave} = save.config;
            const btn = buttonTemplate.content.cloneNode(true).firstElementChild;
            btn.querySelector('.title').innerText = name;
            const dateOptions = {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric",
                hour12: false,
            };
            const date = new Intl.DateTimeFormat("ban", dateOptions)
                .format(new Date(lastSave || Date.now()))
                .split(",")
                .join(" ");
            btn.querySelector('.date').innerText = date;

            const startCallback = async () => {
                let module = undefined;
                if (src === "local") {
                    module = await getLocalModule(name);
                } else if (src === "github") {
                    module = await getGithubModule(id);
                }
                const errors = validateModule(module);
                if (errors) {
                    printErrors(errors);
                    return;
                }
                module.config.name = name;
                module.config.src = src;
                module.config.id = id;
                startModule(module, false);
            };
            btn.addEventListener('click', () => {
                moduleInfoContainer.querySelector(".name").innerText = name;
                moduleInfoContainer.querySelector(".description").innerText = description;
                moduleInfoContainer.querySelector(".start-button").addEventListener("click", startModuleCallback);
                startModuleCallback = startCallback;
                moduleInfoContainer.querySelector(".start-button").addEventListener("click", startModuleCallback);
                moduleListContainer.querySelectorAll(".module-button").forEach((x) => {
                    x.classList.toggle("active", x === btn);
                });
            });

            moduleListContainer.appendChild(btn);
        }
    }
}

/**@param {Module} module*/
function startModule(module, isNew) {
    save.setSaveKey(`${module.config.src}-${module.config.id}`);
    if(isNew && save.hasSave()){
        if(!confirm('This will overwrite an existing save. Are you sure you want to proceed?')){
            return;
        }
        save.reset();
    }
	subModulesInit(module);

	const btn = document.querySelector(".p-home .go-to-game-button");
	btn.classList.remove("hide");
	btn.click();
}

async function loadSchemas() {
	const names = moduleNames.concat("mods", "module");
	try {
		for (const name of names) {
			const schemaFilename = name + "-schema.json";
			const { default: data } = await import(`./json/schemas/${schemaFilename}`, { assert: { type: "json" } });
			ajv.addSchema(data, schemaFilename);
		}
		ajvValidator = ajv.getSchema("module-schema.json");
	} catch (e) {
		console.log(e);
	}
}

function printErrors(errors) {
	for (const error of errors) {
		console.error(error);
	}
}

/**
 * @param {string} url
 * @returns {Promise<Module>}
 */
async function getGithubModule(id) {
	try {
		const response = await fetch(`https://api.github.com/repositories/${id}/contents/module.json`);
		if (response.ok) {
			const result = await response.json();
			const data = JSON.parse(window.atob(result.content));
			return data;
		}
	} catch (e) {
		console.error(e);
	}
}

/**
 * @param {ModuleFile} files
 * @returns {Promise<Module>}
 */
async function getModuleData(files) {
	const missingRequiredFiles = getMissingRequiredFilenames(files.map((x) => x.name));
	if (missingRequiredFiles.length !== 0) {
		console.error("Missing files", missingRequiredFiles);
		return;
	}
	const moduleData = {};
	for (const file of files) {
		const { name: filename, content: fileContent } = file;
		const errors = await validateFile(filename, fileContent);
		if (errors) {
			printErrors(errors);
			continue;
		}

		const propertyName = filenameToCamelCase(filename);
		moduleData[propertyName] = fileContent.data || fileContent;
	}

	if (!moduleData.defaultMods) {
		console.error("defaultMods.json is missing");
		return;
	}
	if (!moduleData.enemy) {
		console.error("enemy.json is missing");
		return;
	}
	if (!moduleData.skills) {
		console.error("skills.json is missing");
		return;
	}
	return moduleData;
}

function validateModule(content) {
	try {
		ajvValidator(content);
		return ajvValidator.errors;
	} catch (e) {
		console.error(e);
	}
}

/**
 * @returns {Promise<Repository[]>}
 */
async function loadGithubRepositories() {
	const url = "https://api.github.com/search/repositories?q=key:529d32e203fb53700710d725ad75c820+in:readme&sort=updated&order=desc";
	try {
		const response = await fetch(url);
		if (response.ok) {
			const data = await response.json();
			return data.items;
		}
	} catch (e) {
		console.error(e);
	}
}
