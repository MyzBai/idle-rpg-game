import pako from "../libs/pako.js";
import { hashCode, strToUint8Array, uuidv4, registerTabs } from "../helperFunctions.js";
import { modTemplateList, getModTemplateById } from "../mods.js";

/**@typedef {import('./sim.js').SimData} SimData */

/**
 * @typedef Config
 * @property {string} id - used for saving
 * @property {string} label
 * @property {string[]} targetIds
 * @property {string[]} modPriorities
 * @property {boolean} [disabled]
 * @property {StatModList} [statModList]
 */

const configPage = document.querySelector(".p-sim .p-configs");
const modTableContainer = configPage.querySelector(".s-mod-table-container");
configPage.querySelector(".s-options .remove").addEventListener("click", (e) => {
	const remove = confirm("Are you sure you want to remove this configuration?");
	if (remove) {
		removeConfig(activeConfig);
	}
});
const nameInput = configPage.querySelector(".s-options input.name");
nameInput.addEventListener("change", (e) => {
	activeConfig.label = e.target.value;
	saveConfig(activeConfig);
	updateTabs(configs.indexOf(activeConfig));
});
const tableFilterInput = configPage.querySelector(".s-mod-table input.table-filter");
tableFilterInput.addEventListener("change", filterModTable);

/**@type {Config[]} */
export var configs = [];

configPage.querySelector(".new-config").addEventListener("click", createConfig);
/**@type {Config} */
var activeConfig = undefined;

export function init() {
	updateConfigs();
}

export function getConfigs(){
    return configs;
}

function updateConfigs() {
	configs = loadConfigs();
	displayConfig(configs[0]);
	updateTabs();
}

function createConfig() {
	/**@type {Config} */
	const config = {
		id: uuidv4(),
		label: "New Config",
		targetIds: modTemplateList.map((x) => x.id),
		modPriorities: [],
	};
	configs.push(config);
	saveConfig(config);
	displayConfig(config);
	updateTabs(configs.length - 1);
}

function updateTabs(selectionIndex = 0) {
	const tabsContainer = configPage.querySelector(".s-tabs");
	tabsContainer.replaceChildren();
	const frag = document.createDocumentFragment();
	for (const config of configs) {
		const btn = document.createElement("div");
		btn.classList.add("g-button");
		btn.textContent = config.label;
		btn.addEventListener("click", (e) => {
			displayConfig(config);
		});
		frag.appendChild(btn);
	}
	tabsContainer.appendChild(frag);

	if (configs.length > 0) {
		registerTabs(Array.from(tabsContainer.querySelectorAll(".g-button")), selectionIndex);
	}
}

/**@param {Config} config */
function displayConfig(config) {
	//@ts-expect-error
	configPage.querySelector(".s-config").style.display = config ? 'block' : 'none';
    activeConfig = config;
    if(!config){
        return;
    }
	//@ts-expect-error
	nameInput.value = config.label;
	// const nameInput = configPage.querySelector('.s-options input.name').value = config.label;

	modTableContainer.replaceChildren();

	const table = document.createElement("table");
	table.insertAdjacentHTML("afterbegin", "<tr><th>Id</th><th>Description</th><th>Enabled</th><th>Priority</th></tr>");
	for (const mod of modTemplateList) {
		const target = config.targetIds.some((x) => x === mod.id);
		const priority = config.modPriorities.some((x) => x === mod.id);
		table.insertAdjacentHTML(
			"beforeend",
			`<tr>
        <td>${mod.id}</td><td>${mod.description}</td>
        <td><input type="checkbox" ${target ? "checked" : ""} data-target="${mod.id}"}></td>
        <td><input type="checkbox" ${priority ? "checked" : ""} data-priority="${mod.id}"></td>
        </tr>`
		);
	}

	table.querySelectorAll("input[data-target]").forEach((x) =>
		x.addEventListener("click", (e) => {
			const checked = e.target.checked;
			const id = e.target.getAttribute("data-target");
			if (checked) {
				config.targetIds.push(id);
			} else {
				config.targetIds = config.targetIds.filter((x) => x !== id);
			}
			saveConfig(config);
		})
	);
	table.querySelectorAll("input[data-priority]").forEach((x) =>
		x.addEventListener("click", (e) => {
			const checked = e.target.checked;
			const id = e.target.getAttribute("data-priority");
			if (checked) {
				config.modPriorities.push(id);
			} else {
				config.modPriorities = config.modPriorities.filter((x) => x !== id);
			}
			saveConfig(config);
		})
	);
	modTableContainer.appendChild(table);
}

function filterModTable(e) {
	const rows = Array.from(modTableContainer.querySelectorAll("tr")).slice(1);
	const filterStr = e.target.value.toLowerCase();
	for (const row of rows) {
		const id = row.firstElementChild.textContent;
		console.log(id);
		const show = id.toLowerCase().includes(filterStr);
		row.classList.toggle("hide", !show);
	}
}

function getStorageKey(config){
    return "dc" + hashCode(config.id);
}

/**@param {Config} config */
function saveConfig(config) {
	const key = getStorageKey(config);
	const str = JSON.stringify(config);
	let uint8array = pako.gzip(str);
	const ascii = btoa(String.fromCharCode(...uint8array));
	localStorage.setItem(key, ascii);
}

/**@returns {Config[]} */
function loadConfigs() {
	const configItems = Object.entries(localStorage).filter((x) => x[0].startsWith("dc"));
	const configs = [];
	for (const item of configItems) {
		const value = item[1];
		const uint8array = strToUint8Array(atob(value));
		const decompressed = pako.ungzip(uint8array, { to: "string" });
		//@ts-expect-error
		configs.push(JSON.parse(decompressed));
	}
	return configs;
}

function removeConfig(config) {
	localStorage.removeItem(getStorageKey(config));
	updateConfigs();
}