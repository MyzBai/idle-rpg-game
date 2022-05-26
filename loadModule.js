import { registerTabs } from "./helperFunctions.js";
import { getLocalModule, getLocalModulesInfo } from "./modules/module-exporter.js";
import Global from "./global.js";
import * as save from "./game/save.js";

/** import ('./types') */

/**
 * @typedef Repository
 * @property {string} name
 * @property {number} id
 * @property {string} full_name username/repo
 * @property {string} description
 * @property {string} url api path to repo
 * @property {{login: string}} owner
 */


const homePage = document.querySelector("body > .p-home");
/**@type {NodeListOf<HTMLElement>} */
const tabs = homePage.querySelectorAll(".s-buttons [data-tab-target]");
registerTabs(tabs);
tabs[0].click();

//@ts-ignore
const ajv = new ajv7({ allowUnionTypes: true });
var ajvValidator = undefined;

export async function init() {
	//@ts-expect-error
	const { default: schema } = await import("./modules/module-schema.json", { assert: { type: "json" } });
	ajvValidator = ajv.compile(schema);

	//new module
	{
		let startModuleCallback = undefined;
		const moduleListContainer = homePage.querySelector(".s-new-modules .s-module-list .s-container");
		const moduleInfoContainer = homePage.querySelector(".s-new-modules .s-module-info");
		const filterInput = homePage.querySelector(".s-new-modules .s-module-list .s-filter input");
		filterInput.addEventListener("input", (e) => {
			if (!e.target.delayUpdate) {
				e.target.delayUpdate = true;
				setTimeout(() => {
					const filter = e.target.value;
					e.target.delayUpdate = false;
					/**@type {NodeListOf<HTMLElement>} */
					const moduleButtons = moduleListContainer.querySelectorAll(".module-button");
					moduleButtons.forEach((x) => {
						const hide = !x.textContent.toLowerCase().startsWith(filter) && filter.length > 0 && !x.classList.contains("active");
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

		if (Global.env.features.LOAD_GITHUB_MODULES) {
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
			btn.textContent = moduleInfo.name;
			btn.addEventListener("click", () => {
				moduleInfoContainer.querySelector(".name").textContent = moduleInfo.name;
				moduleInfoContainer.querySelector(".description").textContent = moduleInfo.description;
				moduleInfoContainer.querySelector(".start-button").removeEventListener("click", startModuleCallback);
				startModuleCallback = async () => {
					const module = await moduleInfo.getModuleCallback();
					const errors = validateModule(module);
					if (errors) {
						printErrors(errors);
						return;
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
		//@ts-ignore
		moduleListContainer.firstElementChild.click();
	}

	//load module
	{
		let startModuleCallback = undefined;
		const moduleListContainer = homePage.querySelector(".s-load-modules .s-module-list .s-container");
		/**@type {HTMLElement} */
		const moduleInfoContainer = homePage.querySelector(".s-load-modules .s-module-info");
		const buttonTemplate = moduleListContainer.querySelector("template");

		const saves = save.getAllSaves().sort((a, b) => {
			return b.config.lastSave - a.config.lastSave;
		});
		for (const savedModule of saves) {
			const { name, description, src, id, lastSave } = savedModule.config;
			//@ts-expect-error
			const btn = buttonTemplate.content.cloneNode(true).firstElementChild;
			btn.querySelector(".title").textContent = name;
			/**@type {Intl.DateTimeFormatOptions} */
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
			btn.querySelector(".date").textContent = date;

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
			btn.addEventListener("click", () => {
				moduleInfoContainer.querySelector(".name").textContent = name;
				moduleInfoContainer.querySelector(".description").textContent = description;
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
		// const input = homePage.querySelector(".s-upload input");
		// const startButton = homePage.querySelector(".s-upload .start-button");
		// let startCallback = undefined;
		// input.addEventListener("change", async (e) => {
		// 	let content = undefined;
		// 	try {
		// 		content = JSON.parse(await e.target.files[0].text());
		// 	} catch (e) {
		// 		console.error(e);
		// 	}
		// 	const errors = validateModule(content);
		// 	startButton.toggleAttribute("disabled", errors !== null);
		// 	if (errors) {
		// 		alert(`Errors detected.\nCheck the console in devtools for more info`);
		// 		console.error(errors);
		// 		return;
		// 	}
		// 	startCallback = async () => {
		// 		/**@type {module.} */
		// 		const module = content;
		// 		module.config.id = module.config.id || module.config.name || "upload";
		// 		module.config.src = "upload";
		// 		startModule(module);
		// 	};
		// 	startButton.removeEventListener("click", startCallback);
		// 	startButton.addEventListener("click", startCallback);
		// });
	}
}

/**@param {Modules.ModuleData} module*/
async function startModule(module) {
	switch (module.config.src) {
		case "local":
			save.setSaveKey(`local-${module.config.name}`);
			break;
		case "github":
			save.setSaveKey(`${module.config.src}-${module.config.id}`);
			break;
		case "upload":
			save.setSaveKey(`temp`); //temp save
			break;
	}

    if(!document.querySelector('#game-page')){
        const response = await fetch('./game/game.html');
        const result = await response.text();
        const doc = new DOMParser().parseFromString(result, 'text/html');
        const gamePage = doc.querySelector('#game-page');
        homePage.insertAdjacentElement('afterend', gamePage);
    }

    const game = await import('./game/game.js');
	game.init(module);

	const btn = document.querySelector(".p-home .game-btn");
	btn.classList.remove("hide");
	//@ts-ignore
	btn.click();
}

function printErrors(errors) {
	for (const error of errors) {
		console.error(error);
	}
}

/**
 * @param {number} id
 * @returns {Promise<Modules.ModuleData>}
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
