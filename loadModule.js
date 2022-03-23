import global from "./global.js";
import { registerTabs } from "./helperFunctions.js";
import { getSaveItem } from "./save.js";
import { loadConfigs } from "./json/local-modules/module-exporter.js";
//#region Definitions

/**
 * @typedef ModuleConfig
 * @property {string} name
 * @property {string} [description]
 */

/**
 * @typedef ModuleFileContent
 * @property {string} [$schema]
 * @property {any} data
 */

/**
 * @typedef ModuleFile
 * @property {string} filename
 * @property {ModuleFileContent} content
 */

/**
 * @typedef SubModules
 * @property {ModuleConfig} config
 * @property {object} defaultStatMods
 * @property {object} enemy
 * @property {object} skills
 * @property {object} [items]
 * @property {object} [modTree]
 */

/**
 * @typedef LoadModuleResult
 * @property {string} success
 * @property {object} data
 */

//#endregion

//#region CONSTANTS
const SCHEMA_PATH = "./json/schemas";
const MODS_SCHEMA_PATH = `${SCHEMA_PATH}/mods-schema.json`;
//#endregion

const homePage = document.querySelector(".p-home");
const tabs = homePage.querySelectorAll(".s-buttons [data-tab-target]");
registerTabs(tabs);
tabs[2].click();

homePage.querySelector(".btn-go-to-game-page");

//#region Modules Tab
const modulesContainer = homePage.querySelector(".s-modules");
const moduleButtonsContainer = modulesContainer.querySelector(".s-container");
const moduleButtonTemplate = moduleButtonsContainer.querySelector("template");
//#endregion

//#region Upload Tab
/**@type {ModuleFile[]} */
var uploadFileContents = undefined;
const uploadContainer = homePage.querySelector(".s-upload");
const uploadDropArea = uploadContainer.querySelector(".s-drop-area");
uploadDropArea.addEventListener("dragenter", (e) => {
	e.target.classList.add("drag-over");
});
uploadDropArea.addEventListener("dragover", (e) => {
	e.preventDefault();
});
uploadDropArea.addEventListener("dragleave", (e) => {
	e.target.classList.remove("drag-over");
});
uploadDropArea.addEventListener("drop", (e) => {
	e.preventDefault();
	e.target.classList.remove("drag-over");
	/**@type {File[]} */
	const files = [...e.dataTransfer.files].filter((file) => file.type === "application/json" && moduleFileNames.includes(file.name.toLowerCase()));
	if (files.length > 0) {
		uploadFiles(files);
	}
});
uploadContainer.querySelector(".start-button").addEventListener("click", (e) => {
	if (!uploadFileContents || uploadFileContents.length === 0) {
		return;
	}

	/**@type {SubModules} */
	const moduleData = {};
	for (const uploadFile of uploadFileContents) {
		const propertyName = stringToCamelCase(uploadFile.filename);
		moduleData[propertyName] = uploadFile.content.data;
	}

	if (moduleData.config?.name) {
		setGlobalSavePath("upload", moduleData.config.name);
		if (localStorage.getItem(moduleData.config.name)) {
			const confirm = confirm("This will overwrite a previous save\nChange the name property in config.json if this is not desired");
			if (!confirm) {
				return;
			}
		}
	}

	selectModuleDefer(moduleData);
});
//#endregion

//#region Load Tab
const loadContainer = homePage.querySelector(".p-home .s-load");
const loadButtonsContainer = loadContainer.querySelector(".s-container");
const loadButtonTemplate = loadButtonsContainer.querySelector("template");
var loadModuleName = undefined;
//#endregion

const moduleFileNames = ["config.json", "default-stat-mods.json", "enemy.json", "items.json", "skills.json", "mod-tree.json"];
const ajv = new ajv7();
//call this to resolve load module for main.js to continue
/**@type {(param: SubModules) => {}} */
var selectModuleDefer = undefined;

var localConfigs = undefined;

export async function init() {
	await loadSchemas();

	{
		//Local
		// const localConfigs = await (await import("./json/local-modules/module-exporter.js")).loadConfigs();
        localConfigs = await loadConfigs();

		for (const config of localConfigs) {
			const errors = await validateFile("config.json", config);
			if (errors) {
				for (const error of errors) {
					console.error(errors);
				}
				continue;
			}
			const { name, desc } = config;
			const btn = getModuleButtonWithContent(name, desc, () => {
				startModule(name, "local", config);
			});
			moduleButtonsContainer.appendChild(btn);
		}
	}

	{
		//saves
		var hasSaves = false;
		loadButtonsContainer.replaceChildren([]);
		for (const [key, value] of Object.entries(localStorage)) {
			if (key.startsWith("game-")) {
				hasSaves = true;
				const name = JSON.parse(value).config.name;
				const btn = loadButtonTemplate.content.cloneNode("true").firstElementChild;
				btn.textContent = name;
				btn.addEventListener("click", (e) => {
					loadModuleName = name;
					const btns = [...loadButtonsContainer.querySelectorAll(".module-button")];
					btns.forEach((x) => {
						x.classList.toggle("active", x === btn);
					});
					console.log("select", loadModuleName, "module");
				});
				loadButtonsContainer.appendChild(btn);
			}
		}
		if (!hasSaves) {
			loadButtonsContainer.textContent = "You have no saved games";
		} else {
			// loadButtonsContainer.firstElementChild.click();
		}
		const startButton = loadContainer.querySelector(".start-button");
		startButton.toggleAttribute("disabled", !hasSaves);
		startButton.addEventListener("click", (e) => {
			if (!loadModuleName) return;
			console.log("start", loadModuleName, "module");
			startModule(loadModuleName, "load");
		});
	}

	//only load external modules if in production
	if (global.env.ENV_TYPE === "production") {
	}
}

/**@returns {Promise<SubModules>} */
export async function load() {
	const selectModulePromise = new Promise(async (resolve) => {
		selectModuleDefer = resolve;
	});
	return await selectModulePromise;
}

/**
 * @param {string} filename
 * @param {object} content
 * @returns {Promise<object[] | void>} */
async function validateFile(filename, content) {
	try {
		const validator = ajv.getSchema(filename);
		validator(content);
		return validator.errors;
	} catch (e) {
		console.error(e);
	}
	return undefined;
}

/**
 * @param {string} title
 * @param {string} contentDescription
 * @param {Function} startCallback
 * @returns {HTMLButtonElement}
 */
function getModuleButtonWithContent(title, contentDescription, startCallback) {
	const buttonElement = moduleButtonTemplate.content.cloneNode(true).firstElementChild;
	const titleElement = buttonElement.querySelector(".title");
	const contentElement = buttonElement.querySelector(".content");
	const playButton = buttonElement.querySelector(".start-button");
	titleElement.textContent = title;
	titleElement.addEventListener("click", (e) => {
		contentElement.classList.toggle("active");
	});
	contentElement.querySelector(".desc").textContent = contentDescription;
	playButton.addEventListener("click", startCallback);
	return buttonElement;
}

/**@param {File[]} files */
async function uploadFiles(files) {
	/**@type {{filename: string, content: ModuleFile}[]} */
	const moduleFiles = [];
	uploadDropArea.classList.remove("empty");
	//clear all file elements
	while (uploadDropArea.querySelector("div")) {
		uploadDropArea.removeChild(uploadDropArea.querySelector("div"));
	}
	for (const file of files) {
		let moduleFile = {};
		try {
			const text = await file.text();
			const content = JSON.parse(text);
			moduleFile = { filename: file.name.toLowerCase(), content };
		} catch (e) {
			console.error(e);
		} finally {
			if (moduleFile) {
				moduleFiles.push(moduleFile);
			}
		}
	}

	uploadFileContents = [];
	for (const moduleFile of moduleFiles) {
		const errors = await validateFile(moduleFile.filename, moduleFile.content);
		const element = document.createElement("div");
		element.textContent = moduleFile.filename;
		if (errors) {
			uploadFileContents = undefined;
			element.classList.add("error");
			let titleText = "";
			for (const error of errors) {
				console.log(error);
				if (error.instancePath) {
					titleText += `${error.instancePath} - ${error.message}\npath: ${error.schemaPath}`;
				} else {
					titleText += error.message;
				}
			}
			element.title = titleText;
		}
		if (uploadFileContents) {
			uploadFileContents.push(moduleFile);
		}
		uploadDropArea.appendChild(element);
	}

	// const name = uploadFileContents.find((x) => x.filename === "config.json")?.content.data.name;
	// uploadContainer.querySelector(".warning").classList.toggle("active", name === undefined);

	var valid = uploadFileContents !== undefined;
	const startButton = uploadContainer.querySelector(".start-button");
	startButton.toggleAttribute("disabled", !valid);
}

//load saved games

/**
 * @param {string} string
 * @returns {string}
 */
function stringToCamelCase(string) {
	const propertyName = string
		.substring(0, string.length - 5)
		.split("-")
		.map((x, i) => (i > 0 ? x.charAt(0).toUpperCase() + x.slice(1) : x))
		.join("");
	return propertyName;
}

async function loadSchemas() {
	const { default: modsSchema } = await import(`${MODS_SCHEMA_PATH}`, {
		assert: { type: "json" },
	});
	ajv.addSchema(modsSchema);
	for (const filename of moduleFileNames) {
		const path = `${SCHEMA_PATH}/${filename.substring(0, filename.length - 5)}-schema.json`;
		const { default: schema } = await import(path, {
			assert: { type: "json" },
		});
		ajv.addSchema(schema, filename);
	}
}

/**
 * @param {string} moduleName
 * @param {string} sourceTarget - local | load | github
 * @param {object} config
 */
async function startModule(moduleName, sourceTarget, config) {
	//if config exists, we already have all the necessary info
	//else, load config, based on name and type

	/**@type {SubModules} */
	var moduleData = undefined;
    var src = undefined;
	if (sourceTarget === "local") {
        if(!config){
            config = localConfigs.find(x => x.name === moduleName);
            if(!config){
                console.error('no local config with name', moduleName, 'was found');
                return;
            }
        }
		const filenames = config.include || moduleFileNames.filter((x) => x !== "config.json");
		const moduleExporter = await import("./json/local-modules/module-exporter.js");
		const files = await moduleExporter.loadModule(moduleName, filenames);

		moduleData = await getModuleDataFromFiles(files);
		src = "local";
	} else if (sourceTarget === "load") {
        const saveKey = `game-${moduleName}`;
        const saveData = getSaveItem(saveKey);
		const src = saveData.config.src;
		switch (src) {
			case "local":
                return startModule(moduleName, 'local');
			case "github":
                const {user, repo, name} = parseGithubPath(config.path);
                    // loadGithubModule(user, repo, name);
				break;
		}
		// if (src === "github") {
		//     const path = parseGithubPath(config.path);
		// 	loadModuleFromGithub(user, repo, name);
		// }
	} else if (sourceTarget === "github") {
	}

	if (sourceTarget === "github" && global.env.ENV_TYPE === "production") {
		//load modules from github
	}

	if (!moduleData) {
		console.error(sourceTarget, "is an invalid source type");
		return;
	}

	if (!moduleData.config) {
		console.error("config.json is missing");
		return;
	}
	if (!moduleData.defaultStatMods) {
		console.error("defaultStatMods.json is missing");
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
    
    moduleData.config = config;
    moduleData.config.src = src;
	setGlobalSavePath(moduleData.config.name);
	selectModuleDefer(moduleData);
}

/**
 * @param {ModuleFile} files
 * @returns {Promise<SubModules>}
 */
async function getModuleDataFromFiles(files) {
	const moduleData = {};
	for (const file of files) {
		const { name: filename, data: fileData } = file;
		const errors = await validateFile(filename, fileData);
		if (errors) {
			for (const error of errors) {
				console.error(error);
			}
		} else {
			const propertyName = stringToCamelCase(filename);
			moduleData[propertyName] = fileData.data;
		}
	}
	return moduleData;
}

/**
 *
 * @param {string} path
 * @returns {{user: string, repo: string, name: string}}
 */
function parseGithubPath(path) {
	return path.split("/").reduce((a, c, i) => {
		a[i] = c;
	}, {});
}

// /**
//  * Loads a module from github api
//  * @returns {Promise<LoadModuleResult>}
//  */
// async function loadGithubModule(username, repositoryName, foldername) {
//     console.log(`load external module in repo ${repo} at user ${user} in folder ${folderName}`);

//     moduleData.config.source = `${user}/${repo}/${folderName}`;

//     const data = {
//         config: {
//             source: 'github',
//             path: `${user}/${repo}/${folderName}`
//         }
//     }
//     // let res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents`);//.then(res => res.json()).then(data => { return data });
//     // let files = await res.json();

//     // let skillsData = files.find(x => x.name === 'skills.json');
//     // let skills = undefined;
//     // if (skillsData) {
//     //     console.log(skillsData.download_url);
//     //     let res = await fetch(skillsData.download_url);
//     //     skills = await res.json();
//     // }

//     // return { skills }
//     return { success: true, data };
// }

/**
 * @param {string} name - module name
 */
function setGlobalSavePath(name) {
	if (!name) {
		global.env.SAVE_PATH = undefined;
		return;
	}
	name = name.split(" ").join("-");
	global.env.SAVE_PATH = `game-${name.toLowerCase()}`;
}
