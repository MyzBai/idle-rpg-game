import EventEmitter from "../../EventEmitter.js";
import { modTemplateList } from "../../mods.js";
import { hashCode, uuidv4 } from "../../helperFunctions.js";
import { onModuleChanged, module } from "../jsonEditor.js";

/**
 * @typedef ConfigSettings
 * @property {number} iterations
 */

/**
 * @typedef ModelData
 * @property {number} iterations
 * @property {Config[]} configs
 * @typedef Config
 * @property {string} name
 * @property {string[]} includes
 * @property {{attacks: string[], supports: {name: string, priority: boolean}[]}} skills
 * @property {{mods: {name: string, priority: boolean}[]}} items
 * @property {{nodes: {name: string, priority: boolean}}[]} modTree
 */

const page = document.querySelector(".p-sim");
const options = page.querySelector(".s-options");
/**@type {HTMLElement} */
const importButton = options.querySelector(".import-button");
/**@type {HTMLElement} */
const input = options.querySelector("input[type=file].import");
/**@type {HTMLElement} */
const compileButton = options.querySelector(".compile-button");

options.querySelector('.save-button').addEventListener('click', e => {
    sessionStorage.setItem('dste', editor.getModel().getValue());
});

{
	importButton.addEventListener("click", () => {
		input.click;
	});

	const changeEventCallback = async function (e) {
		if (editor && e.target.files.length !== 0) {
			try {
				const text = await e.target.files[0].text();
				editor.getModel().setValue(text);
			} catch (e) {
				console.error(e);
			}
		}
	};
	input.addEventListener("change", changeEventCallback);
	compileButton.addEventListener("click", (e) => {
		compile();
	});
}

/**@type {ModelData} */
export let modelData = undefined;

/**@type {monaco.editor.IStandaloneCodeEditor} */
var editor = undefined;

/**@type {EventEmitter<ModelData>} */
export const onConfigDataChanges = new EventEmitter();

export async function init() {
	editor = await createEditor();

	if (sessionStorage.getItem("dste")) {
		modelData = JSON.parse(sessionStorage.getItem("dste"));
		editor.setValue(JSON.stringify(modelData, null, 4));
	}
}

function compile() {
	console.log("Compile");
	try {
		const text = editor.getModel().getValue();

		/**@type {ModelData} */
		modelData = JSON.parse(text);

		sessionStorage.setItem("dste", JSON.stringify(modelData));
		onConfigDataChanges.invoke(modelData);
	} catch (e) {
		console.error(e);
	}
}

/**@returns {Promise<monaco.editor.IStandaloneCodeEditor>} */
async function createEditor() {
	//@ts-expect-error
	const configSchema = (await import("./config-schema.json", { assert: { type: "json" } })).default;
	// const modIdsEnum = modTemplateList.map((x) => x.id);
    let updateSchema = module => {
        const configProps = configSchema.properties.configs.items.properties;
        configProps.skills.properties.attacks.items.enum = module.skills.attackSkills.map(x => x.name);
        configProps.skills.properties.supports.items.properties.name.enum = module.skills.supportSkills.map(x => x.name);

        configProps.items.properties.modTables.items.properties.name.enum = module.items.modTables.map(x => x.id);

        configProps.modTree.properties.nodes.items.properties.name.enum = module.modTree.nodes.map(x => x.name);
        configSchema.properties.configs.items.properties = configProps;

    }
    updateSchema(module)
    onModuleChanged.listen(updateSchema);

	return new Promise((resolve) => {
		/**@type {HTMLElement} */
		const container = document.querySelector(".p-sim .text-editor");
		const uri = monaco.Uri.parse("sim.json");
		monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas.push({
			uri: "http://myserver/sim-schema.json",
			fileMatch: [uri.toString()],
			schema: configSchema,
		});
		const model = monaco.editor.createModel("", "json", uri);
		const editor = monaco.editor.create(container, {
			model,
			theme: "vs-dark",
			language: "json",
            fixedOverflowWidgets: true,

		});

		{
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

		{
			editor.addAction({
				id: "neat-format",
				label: "Format Document (Compact)",
				precondition: null,
				keybindingContext: null,
				contextMenuGroupId: "1_modification ",
				contextMenuOrder: 0,
				run: function (e) {
					let v = e.getModel().getValue();
					v = prettyCompactJson(JSON.parse(v), {indent: 4});
					e.getModel().setValue(v);
				},
			});
		}

        // {
        //     editor.onDidChangeModelContent(e => {
        //         console.log('test');
        //     });
        // }

		resolve(editor);
	});

	// return new Promise((resolve) => {
	// 	globalThis.require(["vs/editor/editor.main"], function () {
	// 		/**@type {HTMLElement} */
	// 		const editorElement = document.querySelector(".p-sim .text-editor");
	// 		const modelUri = monaco.Uri.parse("simTextEditor");
	// 		const model = monaco.editor.createModel("", "json", modelUri);

	//         monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas.push({
	//             uri: modelUri.toString(),
	// 			fileMatch: ['config-schema.json'],
	// 			schema,
	//         });

	// 		const editor = monaco.editor.create(editorElement, {
	// 			model,
	// 			language: "json",
	// 			theme: "vs-dark",
	// 			scrollBeyondLastLine: true,
	// 			wordWrap: "off",
	// 			minimap: {
	// 				enabled: true,
	// 			},
	// 			automaticLayout: false,
	// 			bracketPairColorization: { enabled: true },
	// 			suggest: { snippetsPreventQuickSuggestions: false },
	// 			quickSuggestions: { other: true, strings: true },
	// 			"semanticHighlighting.enabled": true,
	// 			trimAutoWhitespace: false,
	// 		});
	// 		{
	// 			const block = document.querySelector(".p-sim");
	// 			const resizewatcher = new ResizeObserver((entries) => {
	// 				for (const entry of entries) {
	// 					// console.log("Element", entry.target, entry.contentRect.width == 0 ? "is now hidden" : "is now visible");
	// 					if (entry.target === block) {
	// 						const editorParent = document.querySelector(".p-sim .text-editor");
	// 						const rect = editorParent.getBoundingClientRect();
	// 						editor.layout({ width: rect.width, height: rect.height });
	// 					}
	// 				}
	// 			});
	// 			resizewatcher.observe(block);
	// 		}

	// 		resolve(editor);
	// 	});
	// });

	// return new Promise((resolve) => {
	// 	globalThis.require(["vs/editor/editor.main"], function () {
	// 		monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
	// 			validate: true,
	// 			schemas: [
	// 				{
	// 					uri: "schema.json",
	// 					fileMatch: ["*"],
	// 					schema,
	// 				},
	// 			],
	// 		});

	// 		// const simConfigsModel = monaco.editor.createModel("", "json", monaco.Uri.parse("simTextEditor.js"));

	// 		const editor = monaco.editor.create(editorElement, {
	// 			language: "json",
	// 			theme: "vs-dark",
	// 			scrollBeyondLastLine: true,
	// 			wordWrap: "off",
	// 			minimap: {
	// 				enabled: true,
	// 			},
	// 			automaticLayout: false,
	// 			bracketPairColorization: { enabled: true },
	// 			suggest: { snippetsPreventQuickSuggestions: false },
	// 			quickSuggestions: { other: true, strings: true },
	// 			"semanticHighlighting.enabled": true,
	// 			trimAutoWhitespace: false,
	// 		});

	// 		{
	// 			const block = document.querySelector(".p-sim");
	// 			const resizewatcher = new ResizeObserver((entries) => {
	// 				for (const entry of entries) {
	// 					// console.log("Element", entry.target, entry.contentRect.width == 0 ? "is now hidden" : "is now visible");
	// 					if (entry.target === block) {
	// 						const editorParent = document.querySelector(".p-editor .text-editor");
	// 						const rect = editorParent.getBoundingClientRect();
	// 						editor.layout({ width: rect.width, height: rect.height });
	// 					}
	// 				}
	// 			});
	// 			resizewatcher.observe(block);
	// 		}

	// 		monaco.editor.onDidChangeMarkers((event) => {
	// 			const hasErrors = globalThis.monaco.editor.getModelMarkers({ owner: "json" }).length !== 0;
	// 			// compileButton.toggleAttribute("disabled", hasErrors);
	// 			console.log("has errors");
	// 		});
	// 		resolve(editor);
	// 	});
	// });
}

// The MIT License (MIT)

// Copyright (c) 2014, 2016, 2017, 2019, 2021, 2022 Simon Lydell

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
const stringOrChar = /("(?:[^\\"]|\\.)*")|[:,]/g;

function prettyCompactJson(passedObj, options = {}) {
	const indent = JSON.stringify([1], undefined, options.indent === undefined ? 2 : options.indent).slice(2, -3);

	const maxLength = indent === "" ? Infinity : options.maxLength === undefined ? 80 : options.maxLength;

	let { replacer } = options;

	return (function _stringify(obj, currentIndent, reserved) {
		if (obj && typeof obj.toJSON === "function") {
			obj = obj.toJSON();
		}

		const string = JSON.stringify(obj, replacer);

		if (string === undefined) {
			return string;
		}

		const length = maxLength - currentIndent.length - reserved;

		if (string.length <= length) {
			const prettified = string.replace(stringOrChar, (match, stringLiteral) => {
				return stringLiteral || `${match} `;
			});
			if (prettified.length <= length) {
				return prettified;
			}
		}

		if (replacer != null) {
			obj = JSON.parse(string);
			replacer = undefined;
		}

		if (typeof obj === "object" && obj !== null) {
			const nextIndent = currentIndent + indent;
			const items = [];
			let index = 0;
			let start;
			let end;

			if (Array.isArray(obj)) {
				start = "[";
				end = "]";
				const { length } = obj;
				for (; index < length; index++) {
					items.push(_stringify(obj[index], nextIndent, index === length - 1 ? 0 : 1) || "null");
				}
			} else {
				start = "{";
				end = "}";
				const keys = Object.keys(obj);
				const { length } = keys;
				for (; index < length; index++) {
					const key = keys[index];
					const keyPart = `${JSON.stringify(key)}: `;
					const value = _stringify(obj[key], nextIndent, keyPart.length + (index === length - 1 ? 0 : 1));
					if (value !== undefined) {
						items.push(keyPart + value);
					}
				}
			}

			if (items.length > 0) {
				return [start, indent + items.join(`,\n${nextIndent}`), end].join(`\n${currentIndent}`);
			}
		}

		return string;
	})(passedObj, "", 0);
}
