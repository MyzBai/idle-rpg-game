import global from "./global.js";
import { registerTabs } from "./helperFunctions.js";

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
tabs[1].click();

homePage.querySelector(".btn-go-to-game-page");

//#region Modules Tab
const moduleButtonContainer = document.querySelector(".p-home .s-module-container");
const moduleButtonTemplate = moduleButtonContainer.querySelector("template");
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
	const files = [...e.dataTransfer.files].filter(
		(file) => file.type === "application/json" && moduleFileNames.includes(file.name.toLowerCase())
	);
	if(files.length > 0){
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
		const propertyName = filenameToPropertyName(uploadFile.filename);
		moduleData[propertyName] = uploadFile.content.data;
	}

	const name = moduleData.config.name;
	if(moduleData.config.name){
		setGlobalSavePath('upload', moduleData.config.name);
		if (localStorage.getItem(moduleData.config.name)) {
			const confirm = confirm(
				"This will overwrite a previous save\nChange the name property in config.json if this is not desired"
			);
			if (!confirm) {
				return;
			}
		}
	}


    selectModuleDefer(moduleData);
});
//#endregion

//save tab

const moduleFileNames = [
	"config.json",
	"default-stat-mods.json",
	"enemy.json",
	"items.json",
	"skills.json",
	"mod-tree.json",
];
const ajv = new ajv7();
//call this to resolve load module for main.js to continue
/**@type {(param: SubModules) => {}} */
var selectModuleDefer = undefined;

export async function init() {
	await loadSchemas();

	const localConfigs = await (await import("./json/local-modules/module-exporter.js")).loadConfigs();

	for (const config of localConfigs) {
		const { name, desc } = config;
		createModuleButton(name, desc, () => {
			selectModule('local');
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

// /**
//  * Loads a module from github api
//  * @returns {Promise<LoadModuleResult>}
//  */
// async function loadExternalModule(user, repo, folderName) {
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

/**@returns {Promise<object[] | void>} */
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

function createModuleButton(name, desc, callback) {
	const moduleButton = moduleButtonTemplate.content.cloneNode(true).firstElementChild;
	const title = moduleButton.querySelector(".title");
	const content = moduleButton.querySelector(".content");
	const playButton = moduleButton.querySelector(".start-button");
	playButton.addEventListener("click", callback);
	title.textContent = name;
	title.addEventListener("click", (e) => {
		content.classList.toggle("active");
	});
	content.firstElementChild.textContent = desc;
	moduleButtonContainer.appendChild(moduleButton);
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
		if(uploadFileContents){
			uploadFileContents.push(moduleFile);
		}
		uploadDropArea.appendChild(element);
	}

	// const name = uploadFileContents.find((x) => x.filename === "config.json")?.content.data.name;
	// uploadContainer.querySelector(".warning").classList.toggle("active", name === undefined);

	const name = uploadFileContents.find(x => x.filename === 'config.json')?.content.data.name;
	var valid = uploadFileContents !== undefined && name !== undefined;
	const startButton = uploadContainer.querySelector(".start-button");
	startButton.toggleAttribute("disabled", !valid);
}

//load saved games

/**
 * @param {string} filename
 * @returns {string}
 */
function filenameToPropertyName(filename) {
	const propertyName = filename
		.substring(0, filename.length - 5)
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

/**@param {string} type */
async function selectModule(type) {

	/**@type {SubModules} */
	const moduleData = {};

	if (type === "local") {
		
        moduleData.config.source = "local";
        const files = await (await import("./json/local-modules/module-exporter.js")).loadModule(config);
        for (const file of files) {
            const { name: filename, data: fileData } = file;
            const valid = await validateFile(filename, fileData);
            if (valid) {
                const propertyName = filenameToPropertyName(filename);
                moduleData[propertyName] = fileData.data;
            }
        }
		setGlobalSavePath('local', moduleData.config.name);
	}
	selectModuleDefer(moduleData);
}

/**
 * @param {string} type - e.g local
 * @param {string} name - module name
 */
function setGlobalSavePath(type, name){
	if(!name){
		global.env.SAVE_PATH = undefined;
		return;
	}
	name = name.split(' ').join('-');
	global.env.SAVE_PATH = `game-${global.env.ENV_TYPE}/${type}/${name}`;
}

