import { registerTabs } from "./helperFunctions.js";
import { getLocalModule, getLocalModulesInfo } from "./modules/module-exporter.js";
import { init as subModulesInit } from "./init-game.js";
import Global from "./global.js";

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

const moduleListContainer = homePage.querySelector(".s-modules .s-container");
const moduleInfoContainer = homePage.querySelector(".s-modules .s-module-info");
var startModuleCallback = undefined;

const ajv = new ajv7({ allowUnionTypes: true });
var ajvValidator = undefined;
export async function init() {
	await loadSchemas();

	{
		//load local module
		const localModules = getLocalModulesInfo();
		for (const info of localModules) {
			createModuleButton(info.name, info.description, async () => {
				const module = await getLocalModule(info.name);
				const errors = validateModule(module);
				if (errors) {
					printErrors(errors);
					return;
				}
				module.config.name = info.name;
				module.config.src = "local";
				module.config.id = info.name;
				startModule(module);
			});
		}
	}

	{
		if (Global.env.ENV_TYPE === "production" || true) {
			//load configs
			const repos = await loadGithubRepositories();
			for (const repo of repos) {
				const { full_name: fullName, description, id } = repo;
				createModuleButton(fullName, description, async () => {
					const module = await getGithubModule(repo.id);
					const errors = validateModule(module);
					if (errors) {
						printErrors(errors);
						return;
					}
					module.config.name = module.config.name || fullName;
					module.config.src = "github";
					module.config.id = id;
					startModule(module);
				});
			}
		}
	}
	{
		//saved games

		const loadContainer = homePage.querySelector(".s-load");
		const moduleListContainer = loadContainer.querySelector(".s-module-list");
		const moduleInfoContainer = loadContainer.querySelector(".s-module-info");
		const buttonTemplate = moduleListContainer.querySelector("template");

		for (const [key, value] of Object.entries(localStorage)) {
			if (key.startsWith("g-")) {
				const content = JSON.parse(value);
				if (!content.config) {
					continue;
				}
				const { src, id, name, lastSave, description } = content.config;
				const btn = buttonTemplate.content.cloneNode(true).firstElementChild;
				btn.querySelector(".title").innerText = name;
                const dateOptions = {
                    year: 'numeric', month: 'short', day: 'numeric',
                    hour: 'numeric', minute: 'numeric', second: 'numeric',
                    hour12: false
                  };
				const date = new Intl.DateTimeFormat("ban", dateOptions).format(new Date(lastSave) || Date.now()).split(",").join(' ');
				btn.querySelector(".date").innerText = date;
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
					startModule(module);
				};
				btn.addEventListener("click", (e) => {
					moduleInfoContainer.querySelector(".name").innerText = name;
					moduleInfoContainer.querySelector(".description").innerText = description;
					moduleInfoContainer.querySelector(".start-button").addEventListener("click", startCallback);
				});
				moduleListContainer.appendChild(btn);
			}
		}
	}

	if (moduleListContainer.children.length > 0) {
		moduleListContainer.firstElementChild.click();
	}
}

/**@param {Module} module*/
function startModule(module) {
	Global.env.SAVE_PATH = `g-${module.config.src}-${module.config.id}`.toLowerCase();
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

async function createModuleButton(title, desc, startCallback) {
	const btn = document.createElement("div");
	btn.classList.add("module-button", "g-button");
	btn.innerText = title;
	btn.addEventListener("click", (e) => {
		showModuleInfo(title, desc, startCallback);
		moduleListContainer.querySelectorAll(".module-button").forEach((x) => {
			x.classList.toggle("active", x === btn);
		});
	});

	moduleListContainer.appendChild(btn);
}

function showModuleInfo(name, desc, startCallback) {
	moduleInfoContainer.querySelector(".name").textContent = name;
	moduleInfoContainer.querySelector(".description").textContent = desc;
	moduleInfoContainer.querySelector(".start-button").addEventListener("click", startCallback);
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
