import global from "./global.js";
import { registerTabs } from "./helperFunctions.js";
import { getSaveItem, removeSaveItem } from "./save.js";
import { loadConfigs as loadLocalConfigs, loadModule as loadLocalModule } from "./modules/module-exporter.js";
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
 * @typedef Module
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
tabs[0].click();

homePage.querySelector(".btn-go-to-game-page");

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

	/**@type {Module} */
	const moduleData = {};
	for (const uploadFile of uploadFileContents) {
		const propertyName = filenameToCamelCase(uploadFile.filename);
		const prop = uploadFile.content;
		delete prop.$schema;
		moduleData[propertyName] = uploadFile.content.data || uploadFile.content;
	}

	moduleData.config.src = "upload";

	if (moduleData.config?.name) {
		setGlobalSavePath(moduleData.config.name);
		if (localStorage.getItem(moduleData.config.name)) {
			const confirm = confirm("This will overwrite a previous save\nChange the name property in config.json if this is not desired");
			if (!confirm) {
				return;
			}
		}
	}
	loadModuleDefer(moduleData);
});
//#endregion

//#region Load Tab
const loadContainer = homePage.querySelector(".p-home .s-load");
const loadButtonsContainer = loadContainer.querySelector(".s-container");
const loadButtonTemplate = loadButtonsContainer.querySelector("template");
var loadModuleName = undefined;
//#endregion

const moduleFileNames = ["config.json", "default-stat-mods.json", "enemy.json", "skills.json", "items.json", "mod-tree.json"];
const requiredModuleFileNames = ["config.json", "default-stat-mods.json", "enemy.json", "skills.json"];
const ajv = new ajv7();
//call this to resolve load module for main.js to continue
/**@type {(param: Module) => {}} */
var loadModuleDefer = undefined;

var localConfigs = undefined;

//#region Modules Tab

const moduleSearchInput = homePage.querySelector(".s-modules .s-search input");
const moduleButtonsContainer = homePage.querySelector(".s-modules .s-container");
const moduleButtonTemplate = moduleButtonsContainer.querySelector("template");

//#endregion

export async function init() {
	await loadSchemas();

	{
		//Local
		// const localConfigs = await (await import("./json/local-modules/module-exporter.js")).loadConfigs();
		localConfigs = await loadLocalConfigs();

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
				const module = getLocalModule(name);
				if (module) {
					const saveKey = `game-${name.toLowerCase()}`;
					if (getSaveItem(saveKey)) {
						const overrideSave = confirm("You have a save with this module name\nSave file will be overwritten.\nContinue?");
						if (!overrideSave) {
							return;
						}
						removeSaveItem(saveKey);
					}
					loadModuleDefer(module);
				}
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
				const content = JSON.parse(value);
				if (content.config.src === "upload") {
					continue;
				}
				hasSaves = true;
				const name = content.config.name;
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
		startButton.addEventListener("click", async (e) => {
			if (!loadModuleName) {
				return;
			}
			console.log("start", loadModuleName, "module");
			const module = await getLocalModule(loadModuleName, "load");
			if (module) {
				loadModuleDefer(module);
			}
		});
	}
    
	{
		//github
		await getReposBySearchAPI();
	}
}

/**@returns {Promise<Module>} */
export async function load() {
	const selectModulePromise = new Promise(async (resolve) => {
		loadModuleDefer = resolve;
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

	var valid = true;
	if (!uploadFileContents) {
		valid = false;
	} else {
		const missingRequiredFiles = getMissingRequiredFilenames(uploadFileContents.map((x) => x.filename));

		let errorText = "";
		for (const missingFile of missingRequiredFiles) {
			errorText += "Missing: " + missingFile + "\n";
		}
		const warningElement = uploadContainer.querySelector(".warning");
		const hasMissingFiles = errorText.length > 0;
		warningElement.classList.toggle("active", hasMissingFiles);
		if (hasMissingFiles) {
			warningElement.textContent = errorText;
		}
	}
	const startButton = uploadContainer.querySelector(".start-button");
	startButton.toggleAttribute("disabled", !valid);
}

//load saved games

/**
 * @param {string} string
 * @returns {string}
 */
function filenameToCamelCase(string) {
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

async function getSavedModule(moduleName) {
	const saveKey = `game-${name}`;
	const saveData = getsaveItem(moduleName);
	const { src, path } = saveData.config;
    switch (src) {
        case "local":
            return await getLocalModule(moduleName);
        case "github":
            const { user, repo, name } = parseGithubPath(config.path);
            // loadGithubModule(user, repo, name);
            break;
    }
}

/**
 * @param {string} moduleName
 * @param {string} sourceTarget - local | load | github
 * @param {object} config
 * @returns {Promise<Module>}
 */
async function getLocalModule(moduleName) {
	/**@type {Module} */
	var moduleData = undefined;
    
    const config = localConfigs.find(x => x.name === moduleName);
    config.src = 'local';

    const filenames = config.include || moduleFileNames.filter((x) => x !== "config.json");
    const files = await loadLocalModule(moduleName, filenames);
    files.push({name: 'config.json', content: config});
    moduleData = await getModuleData(files);

	if (!moduleData) {
		console.error(sourceTarget, "is an invalid source type");
		return;
	}

	setGlobalSavePath(moduleData.config.name);
	return moduleData;
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
			for (const error of errors) {
				console.error(error);
			}
		} else {
			const propertyName = filenameToCamelCase(filename);
			moduleData[propertyName] = fileContent.data || fileContent;
		}
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
	return moduleData;
}

function getMissingRequiredFilenames(filenames) {
	const filesMissing = requiredModuleFileNames.reduce((a, c) => {
		if (!filenames.some((x) => x === c)) {
			a.push(c);
		}
		return a;
	}, []);
	return filesMissing;
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

async function getReposBySearchAPI() {
	const repoQueryString = "https://api.github.com/search/repositories?q=key:529d32e203fb53700710d725ad75c820+in:readme&sort=updated&order=desc";
	const repos = await getFileContent(repoQueryString);
	//1. look for a folder called modules
	//2. for each folder in modules, find a file called config.json
	const requests = repos.items.map((x) => getFileContent(`${x.url}/contents`));
	const results = await Promise.all(requests);
	for (const result of results) {
		if (Array.isArray(result)) {
			for (const file of result) {
				if (file.type === "dir" && file.name === "modules") {
					const moduleFiles = await getFileContent(file.url);
					if (Array.isArray(moduleFiles)) {
						for (const moduleFile of moduleFiles) {
							if (moduleFile.type === "dir") {
								const moduleContent = await getFileContent(moduleFile.url);
								if (Array.isArray(moduleContent)) {
									var config = moduleContent.find((x) => x.name === "config.json" && x.type === "file");
									if (config) {
										var configData = await getFileContent(config.download_url);
										if (configData) {
											configData = {
												name: configData.name,
												description: configData.description,
												moduleUrl: moduleFile.url,
											};
											createModuleButton(configData);
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
}

function createModuleButton(configData) {
	const { name, description } = configData;

	const callback = async () => {
		const data = await getModuleByUrl(configData.moduleUrl);
		if (data) {
			const saveKey = `game-${name.toLowerCase()}`;
			if (getSaveItem(saveKey)) {
				const overrideSave = confirm("You have a save with this module name\nSave file will be overwritten.\nContinue?");
				if (!overrideSave) {
					return;
				}
				removeSaveItem(saveKey);
			}
			loadModuleDefer(data);
		}
	};
	const btn = getModuleButtonWithContent(name, description, callback);
	moduleButtonsContainer.appendChild(btn);
}

async function getModuleByUrl(url) {
	const moduleFiles = [];
	const githubFiles = await getFileContent(url);
	if (Array.isArray(githubFiles)) {
		for (const file of githubFiles) {
			if (file.type === "file") {
				const { name } = file;
				if (moduleFileNames.includes(name)) {
					const data = await getFileContent(file.download_url);
					moduleFiles.push({ name: file.name, data });
				}
			}
		}
	}

	const moduleData = getModuleData(moduleFiles);
	return moduleData;
}

async function getFileContent(url) {
	try {
		const response = await fetch(url);
		const data = await response.json();
		return data;
	} catch (e) {
		console.error(e);
	}
}
