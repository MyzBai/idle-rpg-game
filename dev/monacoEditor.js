import EventEmitter from "../EventEmitter.js";
import * as pako from "../libs/pako.js";
import { convertModuleMods } from "../modUtils.js";
import { modTemplateList } from "../mods.js";
import parseModel from "./parseModel.js";
import * as helperFunctions from "../helperFunctions.js";

/**
 * @typedef ConfigData
 * @property {number} iterations
 * @property {Config[]} configs
 * @typedef Config
 * @property {string} name
 * @property {string[]} includes
 * @property {{attackSkills: string[], supportSkills: {name: string, priority: boolean}[]}} skills
 * @property {{mods: {name: string, priority: boolean}[]}} items
 * @property {{nodes: {name: string, priority: boolean}}[]} modTree
 */

//Text Editor Model Buttons
/**@type {HTMLElement} */
const moduleButton = document.querySelector('.s-top [data-model-uri-path="/module.json"]');
/**@type {HTMLElement} */
const configButton = document.querySelector('.s-top [data-model-uri-path="/config.json"]');

/**@type {monaco.editor.ITextModel[]} */
const models = [];

/**@type {monaco.editor.IStandaloneCodeEditor} */
export let editor = undefined;

/**@type {EventEmitter<{module: Modules.ModuleData, config: ConfigData}>} */
export const onCompile = new EventEmitter();

/**@type {Modules.ModuleData} */
export let module = undefined;

/**@type {ConfigData} */
export let config = undefined;

/**
 * Creates and adds the model to this editor
 * @param {string} value
 * @param {string} language
 * @param {string} name
 * @returns
 */
export function createModel(value, language, name) {
	const model = monaco.editor.createModel(value, language, monaco.Uri.parse(name));
	models.push(model);
	return model;
}

export function getModel(name) {
	const path = "/" + name;
	return models.find((x) => x.uri.path === path);
}

/**
 * @param {monaco.editor.ITextModel | string} model model or uri.path
 */
export function setModel(model) {
	if (typeof model === "string") {
		model = models.find((x) => x.uri.path === model);
	}
    const lastModel = editor.getModel();
    //@ts-expect-error
    lastModel.viewState = editor.saveViewState();
	if (model) {
		editor.setModel(model);
        //@ts-expect-error
        editor.restoreViewState(model.viewState);
	}
}

export async function createEditor() {
	/**@type {HTMLElement} */
	const container = document.querySelector("#monaco-editor");

	/**@type {monaco.editor.IStandaloneEditorConstructionOptions} */
	const options = {
		theme: "vs-dark",
		fixedOverflowWidgets: true,
	};

	editor = monaco.editor.create(container, options);

	createModel("", "json", "module.json");
	createModel("", "json", "config.json");

	await setupEditor();
	moduleButton.click();

	{
		const moduleData = sessionStorage.getItem("dev-module");
		if (moduleData) {
			getModel("module.json").setValue(JSON.stringify(JSON.parse(moduleData), null, 4));
		}
		const configData = sessionStorage.getItem("dev-config");
		if (configData) {
			getModel("config.json").setValue(JSON.stringify(JSON.parse(configData), null, 4));
		}
	}

	compile();
	return editor;
}

async function setupEditor() {
	{
		const container = editor.getContainerDomNode();
		const resizewatcher = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === container) {
					const rect = container.getBoundingClientRect();
					editor.layout({ width: rect.width, height: rect.height });
				}
			}
		});
		resizewatcher.observe(container);
	}

	/**@type {monaco.languages.json.DiagnosticsOptions} */
	const diagnosticOptions = {
		validate: true,
		schemas: [],
	};

	//Setup Config Schema
	//@ts-expect-error
	const configSchema = (await import("./sim/config-schema.json", { assert: { type: "json" } })).default;
	{
		//update config schema dynamically based on module.json
		const updateConfigSchema = () => {
			const schema = diagnosticOptions.schemas.find((x) => x.schema === configSchema);
			const configProps = schema.schema.properties.configs.items.properties;
			configProps.skills.properties.attackSkills.items.enum = module.skills.attackSkills.map((x) => x.name);
			configProps.skills.properties.supportSkills.items.properties.name.enum = module.skills.supportSkills?.map((x) => x.name);
			//@ts-expect-error
			configProps.items.properties.mods.items.properties.name.enum = [...new Set(module.items?.modTables.flatMap((x) => x.flatMap((y) => y.mod.id)))];
			configProps.modTree.properties.nodes.items.properties.name.enum = module.modTree.nodes.map((x) => x.name);
			configSchema.properties.configs.items.properties = configProps;

			monaco.languages.json.jsonDefaults.setDiagnosticsOptions(diagnosticOptions);
		};
		onCompile.listen(updateConfigSchema);
	}

	//Setup Module Schema
	//@ts-expect-error
	const moduleSchema = (await import("../modules/module-schema.json", { assert: { type: "json" } })).default;
	{
		const bracketPattern = "{([0-9]+(?:\\.[0-9]+)?)(?:-([0-9]+(?:\\.[0-9]+)?))?}";
		const patterns = [];
		for (const template of helperFunctions.jsonCopy(modTemplateList)) {
			template.desc = template.desc.replaceAll("+", "\\+");
			const pattern = `${template.id}\\|${template.desc.replaceAll("{}", bracketPattern)}`;
			patterns.push({ pattern });
		}

		moduleSchema.definitions.mod.anyOf = [{ enum: modTemplateList.map((x) => `${x.id}|${x.desc.replaceAll("{}", "{0}")}`) }, ...patterns];
	}

	diagnosticOptions.schemas.push({
		uri: "http://example.com/config-schema.json",
		fileMatch: [getModel("config.json").uri.toString()],
		schema: configSchema,
	});
	diagnosticOptions.schemas.push({
		uri: "http://example.com/module-schema.json",
		fileMatch: [getModel("module.json").uri.toString()],
		schema: moduleSchema,
	});
	monaco.languages.json.jsonDefaults.setDiagnosticsOptions(diagnosticOptions);

	editor.onDidChangeModel((e) => {
		const modelButtons = [moduleButton, configButton];
		modelButtons.forEach((x) => x.classList.remove("active"));
		if (e.newModelUrl.path.includes("module.js")) {
			const tab = modelButtons.find((x) => x.getAttribute("data-model-uri-path") === "/module.json");
			tab.classList.add("active");
		} else if (e.newModelUrl.path.includes("config.json")) {
			const tab = modelButtons.find((x) => x.getAttribute("data-model-uri-path") === "/config.json");
			tab.classList.add("active");
		}
	});

	[moduleButton, configButton].forEach((btn) => {
		btn.addEventListener("click", (e) => {
			//@ts-expect-error
			const uri = e.target.getAttribute("data-model-uri-path");
			setModel(uri);
		});
	});

    let getAllMarkers = () => {
        const markers = models.flatMap((model) => monaco.editor.getModelMarkers({ resource: model.uri }));
        return markers;
    }
	//Markers
	monaco.editor.onDidChangeMarkers((x) => {
        const errors = getAllMarkers().length !== 0;
		if (!errors) {
			compile();
		}
	});

	//Custom markers
	{
		const tempObj = {
			delayUpdate: false,
		};
		editor.onDidChangeModelContent((e) => {
            if(!tempObj.delayUpdate){
                tempObj.delayUpdate = true;
                setTimeout(() => {
                    tempObj.delayUpdate = false;
                    if (getAllMarkers().length === 0) {
                        const model = editor.getModel();
                        const obj = parseModel(model);
                        if (model.uri.path === "/module.json") {
                            handleCustomMarkersInModule(obj);
                        } else if (model.uri.path === "/config.json") {
                            handleCustomMarkersInConfig(obj);
                        }
                    }
                }, 1000);
            }

		});
	}

	monaco.languages.registerHoverProvider("json", {
		provideHover: function (model, position) {
			if (model.uri.path === "/config.json") {
				const start = model.findPreviousMatch('"', position, false, true, null, false);
				const end = model.findNextMatch('"', position, false, true, null, false);
				if (start && end) {
					/**@type {monaco.IRange} */
					const range = {
						startLineNumber: start.range.startLineNumber,
						startColumn: start.range.startColumn,
						endLineNumber: end.range.endLineNumber,
						endColumn: end.range.endColumn,
					};
					const hoverText = model.getValueInRange(range).replaceAll('"', "");

					//Attack skill name
					const attackSkill = module.skills.attackSkills.find((x) => x.name === hoverText);
					if (attackSkill) {
						const modList = /**@type {ModList}*/ (attackSkill.mods).reduce((a, c) => {
							a.push({ value: c.rawDesc });
							return a;
						}, []);
						return {
							range,
							contents: [
								{
									value: `**${attackSkill.name}**`,
								},
								{
									supportHtml: true,
									value: `<table>
                                                <tr>
                                                    <td>Level Req:</td>
                                                    <td>${attackSkill.levelReq}</td>
                                                </tr>
                                                <tr>
                                                    <td>Attack Speed:</td>
                                                    <td>${attackSkill.stats.attackSpeed}</td>
                                                </tr>
                                                <tr>
                                                    <td>Mana Cost:</td>
                                                    <td>${attackSkill.stats.manaCost}</td>
                                                </tr>
                                                <tr>
                                                    <td>Damage Multiplier:</td>
                                                    <td>${attackSkill.stats.baseDamageMultiplier}</td>
                                                </tr>
                                            </table>`,
								},
								...modList,
							],
						};
					} else {
						const supportSkill = module.skills.supportSkills?.find((x) => x.name === hoverText);

						if (supportSkill) {
							const modList = /**@type {ModList}*/ (supportSkill.mods).reduce((a, c) => {
								a.push({ value: c.rawDesc });
								return a;
							}, []);

							return {
								range,
								contents: [
									{
										value: `**${supportSkill.name}**`,
									},
									{
										supportHtml: true,
										value: `<table>
                                                    <tr>
                                                        <td>Level Req:</td>
                                                        <td>${supportSkill.levelReq}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Mana Multiplier:</td>
                                                        <td>${supportSkill.stats.manaMultiplier}</td>
                                                    </tr>
                                                </table>`,
									},
									...modList,
								],
							};
						}
					}
				}
			}
			return {
				range: null,
				contents: null,
			};
		},
	});

	createActions();
}

/**
 *
 * @param {monaco.editor.ITextModel} model
 * @param {monaco.IRange} range
 * @param {string} message
 * @param {monaco.MarkerSeverity} severity
 */
function createMarker(model, range, message, severity) {
	/**@type {monaco.editor.IMarker} */
	return {
		severity,
		startLineNumber: range.startLineNumber,
		startColumn: range.startColumn,
		endLineNumber: range.endLineNumber,
		endColumn: range.endColumn,
		message,
		owner: "",
		resource: model.uri,
	};
}

/**@param {Modules.ModuleData} moduleData */
function handleCustomMarkersInModule(moduleData) {
	//objects also contains a property called modelRange typeof monaco.IRange
	const markers = [];

	const model = getModel("module.json");

	//ensure same mods in modtable, warn if table contains different mods
	const modTables = moduleData.items.modTables;
	for (const table of modTables) {
		let mods = [];
		for (const mod of table) {
			//@ts-expect-error
			let id = mod.mod.match(/^[^\|]+/)[0];
			mods.push({ mod, id });
		}
		if (new Set(mods.map((x) => x.id)).size !== 1) {
			//@ts-expect-error
			const ranges = mods.map((x) => x.mod.modelRange);
			const searchString = `"mod"\\s*:\\s*"[^"]+"`;
			for (const range of ranges) {
				const searchStart = { lineNumber: range.startLineNumber, column: range.startColumn };
				const match = model.findNextMatch(searchString, searchStart, true, true, null, false);
				markers.push(createMarker(model, match.range, "Mod Ids must match", monaco.MarkerSeverity.Warning));
			}
		}
	}

	//ensure mod array contains unique mods
	{
		const matches = model.findMatches(`"mods"\\s*:\\s*(\\[\\n*[^\\]]*\\n*\\])`, true, true, true, null, true);
		for (const match of matches) {
			const arr = JSON.parse(match.matches[1]);
			const mods = arr.map((x) => x.match(/^\w*[^|]/)[0]);
			if (new Set(mods).size !== mods.length) {
				//must have unique ids
				let range = {
					lineNumber: match.range.startLineNumber,
					column: match.range.startColumn,
				};
				for (const mod of mods) {
					const nextMatch = model.findNextMatch(mod, range, false, true, null, false);
					range.lineNumber = nextMatch.range.endLineNumber;
					range.column = nextMatch.range.endColumn;
					markers.push(createMarker(model, nextMatch.range, "Mods must be unique", monaco.MarkerSeverity.Warning));
				}
			}
		}
	}

	//ensure unique skill names
	{
		const getDuplicates = function (arr) {
			const lookup = arr.reduce((a, c) => {
				a[c] = ++a[c] || 0;
				return a;
			}, {});
			return [...new Set(arr.filter((x) => lookup[x]))];
		};

		/**@param {{name: string}[]} targetArray */
		const process = function (targetArray) {
			const duplicateNames = getDuplicates(targetArray.map((x) => x.name));
			const duplicateObjects = targetArray.filter((x) => duplicateNames.some((y) => x.name === y));

			for (const duplicateObj of duplicateObjects) {
				//@ts-expect-error
				const range = duplicateObj.modelRange;
				const searchString = `"name"\\s*:\\s*"${duplicateObj.name}"`;
				const match = model.findNextMatch(searchString, { lineNumber: range.startLineNumber, column: range.startColumn }, true, true, null, false);
				markers.push(createMarker(model, match.range, "Skills must have unique names", monaco.MarkerSeverity.Warning));
			}
		};

		process(moduleData.skills.attackSkills);
		process(moduleData.skills.supportSkills);
	}
    monaco.editor.setModelMarkers(model, "json", markers);
}

/**@param {ConfigData} configData */
function handleCustomMarkersInConfig(configData) {
	const model = getModel("config.json");
	const markers = [];
	const configs = configData.configs;
	for (const config of configs) {
		{
			const supportSkills = config.skills.supportSkills;
			const duplicatedSupportSkillNames = helperFunctions.getDuplicateObjectsByPropertyNameInArray(supportSkills, "name");
			for (const duplicatedSupportSkill of duplicatedSupportSkillNames) {
				//@ts-expect-error
				const range = duplicatedSupportSkill.modelRange;
				const searchString = `"name"\\s*:\\s*"${duplicatedSupportSkill.name}"`;
				const match = model.findNextMatch(searchString, { lineNumber: range.startLineNumber, column: range.startColumn }, true, true, null, false);
				markers.push(createMarker(model, match.range, "Skills must have unique names", monaco.MarkerSeverity.Warning));
			}
		}

		{
			const mods = config.items.mods;
			const duplicatedModNames = helperFunctions.getDuplicateObjectsByPropertyNameInArray(mods, "name");
			for (const duplicatedModName of duplicatedModNames) {
				//@ts-expect-error
				const range = duplicatedModName.modelRange;
				const searchString = `"name"\\s*:\\s*"${duplicatedModName.name}"`;
				const match = model.findNextMatch(searchString, { lineNumber: range.startLineNumber, column: range.startColumn }, true, true, null, false);
				markers.push(createMarker(model, match.range, "Mods must have unique ids", monaco.MarkerSeverity.Warning));
			}
		}
	}
	monaco.editor.setModelMarkers(model, "json", markers);
}

/**@param {File} file */
async function importData(file) {
	const value = await file.text();
	const model = models.find((x) => x.uri.path.endsWith(file.name));
	if (model) {
		model.setValue(value);
	}
}

/**
 * @param {string} content
 */
async function exportData(content, options) {
	if (options.compress) {
		//@ts-expect-error
		content = pako.gzip(content);
	}
	if (options.minify) {
		content = content.replace(/[ \n\t\r]/g, "");
	}

	const blob = new Blob([content], { type: "application/json" });
	const href = URL.createObjectURL(blob);
	const a = Object.assign(document.createElement("a"), { href, style: "display:none", download: options.filename });
	document.body.appendChild(a);
	a.click();
	URL.revokeObjectURL(href);
	a.remove();
}

function createActions() {
	editor.addAction({
		id: "export",
		label: "Export",
		contextMenuGroupId: "export",
		contextMenuOrder: 1,
		run: async () => {
			const model = editor.getModel();
			const name = model.uri.path.substring(1);
			exportData(model.getValue(), { filename: name });
		},
	});

	editor.addAction({
		id: "export-minified",
		label: "Export (minified)",
		contextMenuGroupId: "export",
		contextMenuOrder: 2,
		run: async () => {
			const model = editor.getModel();
			const name = model.uri.path.substring(1);
			exportData(model.getValue(), { filename: name, minify: true });
		},
	});

	editor.addAction({
		id: "export-compressed",
		label: "Export (compressed)",
		contextMenuGroupId: "export",
		contextMenuOrder: 3,
		run: async () => {
			const model = editor.getModel();
			const name = model.uri.path.substring(1);
			exportData(model.getValue(), { filename: name, compress: true });
		},
	});

	editor.addAction({
		id: "import",
		label: "Import",
		contextMenuGroupId: "import",
		contextMenuOrder: 1,
		run: async () => {
			const input = document.createElement("input");
			input.setAttribute("type", "file");
			input.setAttribute("accept", ".json");
			input.style.visibility = "hidden";
			document.body.appendChild(input);
			input.addEventListener("change", (e) => {
				/**@type {File} */
				const file = input.files[0];
				const validName = ["module.json", "config.json"].some((x) => x === file.name);
				if (!validName) {
					console.warn("Invalid filename. Valid filenames: module.json, config.json");
					return;
				}
				importData(file);
			});
			input.click();

			input.remove();
		},
	});
}

async function compile() {
	if (models.some((model) => monaco.editor.getModelMarkers({ resource: model.uri }).length !== 0)) {
		return;
	}
	if (models.some((x) => x.getValueLength() === 0)) {
		return;
	}

	try {
		const moduleStr = getModel("module.json").getValue();
		const configStr = getModel("config.json").getValue();
		const moduleData = JSON.parse(moduleStr);
		const configData = JSON.parse(configStr);
		module = moduleData;
		config = configData;

		convertModuleMods(module);

		onCompile.invoke({ module, config });
		sessionStorage.setItem("dev-module", moduleStr);
		sessionStorage.setItem("dev-config", configStr);
	} catch (error) {
		console.error(error);
		alert("Compilation failed! This should not happen");
	}
}

function getStringWithinBrackets(str = "{}", brackets = ["{", "}"]) {
	let closePos = 0;
	let counter = 1;
	let isString = false;
	while (counter > 0) {
		let c = str[++closePos];
		if (c === '"') {
			isString = !isString;
		}
		if (isString) {
			continue;
		}

		if (c === brackets[0]) {
			counter++;
		} else if (c === brackets[1]) {
			counter--;
		}
	}
	return closePos;
}
