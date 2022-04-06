import { registerTabs } from "./helperFunctions.js";
import { getLocalModule, getLocalModulesInfo } from "./modules/module-exporter.js";
import { init as subModulesInit } from "./init-game.js";
import Global from "./global.js";
import * as save from "./save.js";

/**
 * @typedef ModuleConfig
 * @property {string} name
 * @property {string} src - is set before module starting
 * @property {any} id - can be either name or unique id from repository
 * @property {string} [description]
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
tabs[0].click();

const ajv = new ajv7({ allowUnionTypes: true });
var ajvValidator = undefined;

export async function init() {
	await loadSchemas();

	//new module
	{
		let startModuleCallback = undefined;
		const moduleListContainer = homePage.querySelector(".s-new-modules .s-module-list .s-container");
		const moduleInfoContainer = homePage.querySelector(".s-new-modules .s-module-info");
		/**@type {HTMLInputElement} */
		const filterInput = homePage.querySelector(".s-new-modules .s-module-list .s-filter input");
		filterInput.addEventListener("input", (e) => {
			if (!e.target.delayUpdate) {
				e.target.delayUpdate = true;
				setTimeout(() => {
					const filter = e.target.value;
					e.target.delayUpdate = false;
					moduleListContainer.querySelectorAll(".module-button").forEach((x) => {
						const hide = !x.innerText.toLowerCase().startsWith(filter) && filter.length > 0 && !x.classList.contains("active");
						x.toggleAttribute("data-hidden", hide);
					});
				}, 500);
			}
		});
		const moduleInfos = [];

		{
			//Local Modules
			const localModules = getLocalModulesInfo();
			for (const info of localModules) {
				moduleInfos.push({
					name: info.name,
					description: info.description,
					src: "local",
					id: info.name,
					getModuleCallback: async () => {
						return await getLocalModule(info.name);
					},
				});
			}
		}

		{
			//Github Modules
			const repos = await loadGithubRepositories();
			for (const repo of repos) {
				const username = repo.owner.login;
				const repositoryName = repo.name;
				const id = repo.id;
				const description = repo.description;
				moduleInfos.push({
					name: `${username} | ${repositoryName}`,
					description: description,
					src: "github",
					id,
					getModuleCallback: async () => {
						return await getGithubModule(id);
					},
				});
			}
		}

		for (const moduleInfo of moduleInfos) {
			const btn = document.createElement("div");
			btn.classList.add("module-button", "g-button");
			btn.innerText = moduleInfo.name;
			btn.addEventListener("click", () => {
				moduleInfoContainer.querySelector(".name").innerText = moduleInfo.name;
				moduleInfoContainer.querySelector(".description").innerText = moduleInfo.description;
				moduleInfoContainer.querySelector(".start-button").removeEventListener("click", startModuleCallback);
				startModuleCallback = async () => {
					const module = await moduleInfo.getModuleCallback();
					const errors = validateModule(module);
					if (errors) {
						printErrors(errors);
						return;
					}
					if (moduleInfo.src === "local") {
						save.setSaveKey(`local-${moduleInfo.name}`);
					} else {
						save.setSaveKey(`${moduleInfo.src}-${moduleInfo.name}-${moduleInfo.id}`);
					}
					if (save.hasSave()) {
						if (!confirm("This will overwrite an existing save. Are you sure you want to proceed?")) {
							return;
						}
						save.removeItem();
					}
					module.config.name = moduleInfo.name;
					module.config.src = moduleInfo.src;
					module.config.id = moduleInfo.id;
					startModule(module);
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

	//load module
	{
		let startModuleCallback = undefined;
		const moduleListContainer = homePage.querySelector(".s-load-modules .s-module-list .s-container");
		const moduleInfoContainer = homePage.querySelector(".s-load-modules .s-module-info");
		const buttonTemplate = moduleListContainer.querySelector("template");

		const saves = save.getAllSaves().sort((a, b) => {
			return b.config.lastSave - a.config.lastSave;
		});
		for (const savedModule of saves) {
			const { name, description, src, id, lastSave } = savedModule.config;
			const btn = buttonTemplate.content.cloneNode(true).firstElementChild;
			btn.querySelector(".title").innerText = name;
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
				save.setSaveKey(`${name}-${id}`);
				startModule(module, "load");
			};
			btn.addEventListener("click", () => {
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

	//upload module
	{
		const input = homePage.querySelector(".s-upload input");
		const startButton = homePage.querySelector(".s-upload .start-button");
		let startCallback = undefined;
		input.addEventListener("change", async (e) => {
			let content = undefined;
			try {
				content = JSON.parse(await e.target.files[0].text());
			} catch (e) {
				console.error(e);
			}
			const errors = validateModule(content);
			startButton.toggleAttribute("disabled", errors !== null);
			if (errors) {
				alert(`Errors detected.\nCheck the console in devtools for more info`);
				console.error(errors);
				return;
			}
			startCallback = async () => {
				/**@type {Module} */
				const module = content;
				module.config.id = module.config.id || module.config.name || "upload";
				module.config.src = "upload";
				save.setSaveKey("temp");
				startModule(module);
			};
			startButton.removeEventListener("click", startCallback);
			startButton.addEventListener("click", startCallback);
		});
	}
}

/**@param {Module} module*/
function startModule(module) {
	subModulesInit(module);

	const btn = document.querySelector(".p-home .go-to-game-button");
	btn.classList.remove("hide");
	btn.click();

    save.save();
}

async function loadSchemas() {
	const names = moduleNames.concat("mods", "module");
	try {
		for (const name of names) {
			const schemaFilename = name + "-schema.json";
			const { default: data } = await import(`./json/schemas/${schemaFilename}`, { assert: { type: "json" } });
			ajv.addSchema(data, schemaFilename);
		}
		console.log("test");
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

/**@returns {any[] | null} */
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
