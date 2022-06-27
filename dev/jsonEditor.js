import * as eventListener from "../eventListener.js";
import { jsonCopy } from "../helperFunctions.js";
import { getLocalModule } from "../modules/module-exporter.js";
import { modTemplateList } from "../mods.js";
import EventEmitter from "../EventEmitter.js";

const options = document.querySelector(".p-editor .s-options");
/**@type {HTMLElement} */
const importButton = options.querySelector(".import-button");
/**@type {HTMLElement} */
const input = options.querySelector("input[type=file].import");
/**@type {HTMLElement} */
const compileButton = options.querySelector(".compile-button");

{
	importButton.addEventListener("click", () => {
		input.click();
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

/**@type {monaco.editor.IStandaloneCodeEditor} */
var editor = undefined;

/**@type {Modules.ModuleData} */
export var module = undefined;

/**
 * @type {EventEmitter<Modules.ModuleData>}
 */
export const onModuleChanged = new EventEmitter();

export async function init() {
	editor = await createEditor();
	const demoModule = await getLocalModule("demo");
	editor.setValue(JSON.stringify(demoModule, null, 4));

	compile();
}

function compile() {
	try {
		module = JSON.parse(editor.getValue());
		onModuleChanged.invoke(module);
	} catch (e) {
		console.error(e);
	}
}

/**@returns {Promise<monaco.editor.IStandaloneCodeEditor>} */
async function createEditor() {
	//@ts-expect-error
	const schema = (await import("../modules/module-schema.json", { assert: { type: "json" } })).default;

	{
		const bracketPattern = "{([0-9]+(?:\\.[0-9]+)?)(?:-([0-9]+(?:\\.[0-9]+)?))?}";
		const patterns = [];
		for (const template of jsonCopy(modTemplateList)) {
			template.desc = template.desc.replaceAll("+", "\\+");
			const pattern = `${template.id}\\|${template.desc.replaceAll("{}", bracketPattern)}`;
			patterns.push({ pattern });
		}

		schema.definitions.mod.anyOf = [{ enum: modTemplateList.map((x) => `${x.id}|${x.desc.replaceAll("{}", "{0}")}`) }, ...patterns];
	}

	/**@type {HTMLElement} */
	const container = document.querySelector(".p-editor .text-editor");
	const uri = monaco.Uri.parse("module.json");
	monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas.push({
		uri: "http://example.com/module-schema.json",
		fileMatch: [uri.toString()],
		schema,
	});
	const model = monaco.editor.createModel("", "json", uri);
	const editor = monaco.editor.create(container, {
		model,
		theme: "vs-dark",
		language: "json",
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
		/**@type {monaco.editor.IMarker[]} */
		let markers = [];
		const tempObj = {
			ok: true,
		};
		editor.onDidChangeModelContent((e) => {
			setTimeout(() => {
				if (tempObj.ok) {
					const obj = parseModel(model);
					handleCustomMarkers(obj);
				}
			}, 1000);
		});

		monaco.editor.onDidChangeMarkers((e) => {
			if (e.some((x) => x === model.uri)) {
				const markers = monaco.editor.getModelMarkers({ resource: model.uri });
				tempObj.ok = markers.length === 0;
			}
		});

		function handleCustomMarkers(obj) {
			markers = [];
			const modTables = obj.items.modTables;
			for (const table of modTables) {
				let mods = [];
				for (const mod of table) {
					let id = mod.mod.match(/^[^\|]+/)[0];
					mods.push({ mod, id });
				}
				if (new Set(mods.map((x) => x.id)).size !== 1) {
					const ranges = mods.map((x) => x.mod.modelRange);
                    const searchString = `"mod"\\s*:\\s*"[^"]+"`;
					for (const range of ranges) {
						const searchStart = { lineNumber: range.startLineNumber, column: range.startColumn };
						const match = model.findNextMatch(searchString, searchStart, true, true, null, false);
						setMarker(match.range, "Mod Ids must match", monaco.MarkerSeverity.Warning);
					}
				}
			}

            {
                const matches = model.findMatches(`"mods"\\s*:\\s*(\\[\\n*[^\\]]*\\n*\\])`, true, true, true, null, true);
                for (const match of matches) {
                    const arr = JSON.parse(match.matches[1]);
                    const mods = arr.map(x => x.match(/^\w*[^|]/)[0]);
                    if(new Set(mods).size !== mods.length){
                        //must have unique ids
                        let range = {
                            lineNumber: match.range.startLineNumber,
                            column: match.range.startColumn
                        };
                        for (const mod of mods) {
                            const m = model.findNextMatch(mod, range, false, true, null, false);
                            range.lineNumber = m.range.endLineNumber;
                            range.column = m.range.endColumn;
                            setMarker(m.range, 'Mods must be unique', monaco.MarkerSeverity.Warning);
                        }
                    }
                }

            }

			monaco.editor.setModelMarkers(model, "json", markers);
		}

		function setMarker(range, message, severity) {
			/**@type {monaco.editor.IMarker} */
			const marker = {
				severity,
				startLineNumber: range.startLineNumber,
				startColumn: range.startColumn,
				endLineNumber: range.endLineNumber,
				endColumn: range.endColumn,
				message,
				owner: "",
				resource: model.uri,
			};
			markers.push(marker);
		}
	}

	return editor;
	// return new Promise((resolve) => {
	// 	globalThis.require(["vs/editor/editor.main"], function () {
	// 		const modelUri = monaco.Uri.parse("ModuleEditor");
	// 		// monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
	// 		// 	schemas: [],
	// 		// });

	//         monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas.push({
	//             uri: modelUri.toString(),
	// 			fileMatch: ['module-schema.json'],
	// 			schema,
	//         });

	// 		/**@type {HTMLElement} */
	// 		const editorElement = document.querySelector(".p-editor .text-editor");
	// 		const model = monaco.editor.createModel("", "json", modelUri);
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
	// 			suggest: {
	// 				snippetsPreventQuickSuggestions: false,
	// 			},
	// 			quickSuggestions: { other: true, strings: true },
	// 			"semanticHighlighting.enabled": true,
	// 			trimAutoWhitespace: false,
	// 		});

	// 		editor.onDidChangeModelContent(function (e) {
	// 			// updateCustomMarkers(0, 5);
	// 		});

	// 		{
	// 			const block = document.querySelector(".p-editor");
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
	// 			compileButton.toggleAttribute("disabled", hasErrors);
	// 			console.log("has errors");
	// 		});

	// 		// var markers = [];
	// 		// {
	// 		// 	//services
	// 		// 	const getService = function (editorInstance, serviceName) {
	// 		// 		const entries = editorInstance._instantiationService._parent._services._entries;
	// 		// 		for (const entry of entries) {
	// 		// 			const name = entry[0].toString();
	// 		// 			if (name === serviceName) {
	// 		// 				return entry[1];
	// 		// 			}
	// 		// 		}
	// 		// 	};
	// 		// 	const markerService = getService(editor, "markerDecorationsService");

	// 		// 	// console.log(testService);
	// 		// 	// console.log(testService);
	// 		// 	markerService._onDidChangeMarker.event(function () {
	// 		// 		// Callback function which is getting called after decorations
	// 		// 		console.log("markers changed");
	// 		// 		markers = globalThis.monaco.editor.getModelMarkers(editor.getModel().id);
	// 		// 	});

	// 		// 	// modelService._onDidChangeContent.event(function(){
	// 		// 	//     console.log('test');
	// 		// 	// });
	// 		// }

	// 		// editor.getModel().onDidChangeContent((e) => {
	// 		// 	newDecorations = []; //remove decorations
	// 		// 	updateDecorations();
	// 		// });

	// 		// {
	// 		// 	let timerId = undefined;
	// 		// 	editor.onDidChangeModelContent((e) => {
	// 		//         console.log(markers);
	// 		// 		if (timerId) {
	// 		// 			clearTimeout(timerId);
	// 		// 			timerId = undefined;
	// 		// 		}
	// 		// 		if (!timerId) {
	// 		// 			editor.contentChangeDelay = true;
	// 		// 			timerId = setTimeout(() => {
	// 		// 				timerId;
	// 		//                 console.log(markers);
	// 		// 				if (markers.length === 0) {
	// 		// 					updateCustomWhenNoMarkers();
	// 		// 				}
	// 		// 			}, 1000);
	// 		// 		}

	// 		// 		// console.log('onDidChangeModelContent', ...e.changes.reduce((aggr, c) => [...aggr, c.text, c.rangeOffset, c.rangeLength], []));
	// 		// 	});
	// 		// }

	// 		// function updateCustomMarkers(start, end) {
	// 		// 	monaco.editor.setModelMarkers(editor.getModel(), null, [
	// 		// 		{
	// 		// 			message: "Hello",
	// 		// 			startLineNumber: start,
	// 		// 			endLineNumber: end,
	// 		//             startColumn: 0,
	// 		// 			endColumn: 1000,
	// 		// 			severity: globalThis.monaco.MarkerSeverity.Error,
	// 		// 		},
	// 		// 	]);
	// 		// }

	// 		function updateCustomWhenNoMarkers() {
	// 			console.log("delayed update");
	// 			//this will get called when markers have been updated and there are none
	// 			//reason being that an invalid object literal cannot be parsed
	// 			//so we only ever parse the content when there are no errors
	// 			// console.log('test');
	// 			const allContent = editor.getValue();
	// 			const moduleIds = new Set();
	// 			/**@type {Modules.ModuleData} */
	// 			const asObj = JSON.parse(allContent);
	// 			const duplicateIds = new Set();
	// 			if (asObj.items && asObj.items.modTables) {
	// 				const idsInModTables = asObj.items.modTables.flatMap((x) => x.id);
	// 				for (const id of idsInModTables) {
	// 					if (moduleIds.has(id)) {
	// 						duplicateIds.add(id);
	// 					}
	// 					moduleIds.add(id);
	// 				}
	// 			}

	// 			if (duplicateIds.size !== 0) {
	// 				const lines = editor.getModel().getLinesContent();
	// 				const visibleRanges = editor.getVisibleRanges();
	// 				for (const visibleRange of visibleRanges) {
	// 					const startIndex = visibleRange.startLineNumber - 1;
	// 					const endIndex = visibleRange.endLineNumber - 1;
	// 					for (let i = startIndex; i <= endIndex; i++) {
	// 						for (const duplicateId of duplicateIds) {
	// 							const pattern = new RegExp(`"id"\\s*:\\s*"${duplicateId}"`, "g");
	// 							const text = lines[i];
	// 							const matches = text.matchAll(pattern);
	// 							for (const match of matches) {
	// 								// markers.push({
	// 								// 	message: "Duplicate id detected",
	// 								// 	startLineNumber: i,
	// 								// 	endColumn: 1000,
	// 								// 	endLineNumber: i,
	// 								// 	severity: globalThis.monaco.MarkerSeverity.Error,
	// 								// });
	// 								console.log(`Added Duplicate id detected marker at line number ${i}`);
	// 							}
	// 						}
	// 					}
	// 				}
	// 			}
	// 		}

	// 		// editor.addAction({
	// 		//     id: 'simplify',
	// 		//     label: 'Format - Simplify',
	// 		//     precondition: null,
	// 		//     contextMenuGroupId: 'format',
	// 		//     contextMenuOrder: 2,
	// 		//     run: function(e){
	// 		//         e.getModel().setValue(JSON.stringify(JSON.parse(e.getModel().getValue()), null, 0));
	// 		//     }
	// 		// });

	// 		{
	// 			//Completion provider
	// 			const modTemplates = modTemplateList;
	// 			const modRegex = /(?<=[^{]"mods"\s*: \[\s*{\s*"id"\s*:\s*")[^"]*$/g;
	// 			const modTableRegex = /(?<="modTables"[\s\S]+"id"[\s\S]+"mods"[\s\S]+"description"\s*:\s*")$/g;

	// 			monaco.languages.registerCompletionItemProvider("json", {
	// 				provideCompletionItems: function (model, position) {
	// 					// find out if we are completing a property in the 'dependencies' object.
	// 					var textUntilPosition = model.getValueInRange({
	// 						startLineNumber: 1,
	// 						startColumn: 1,
	// 						endLineNumber: position.lineNumber,
	// 						endColumn: position.column,
	// 					});

	// 					const modsCheck = textUntilPosition.match(modRegex);
	// 					const modTableCheck = textUntilPosition.match(modTableRegex);

	// 					const suggestions = [];
	// 					if (!modsCheck && !modTableCheck) {
	// 						return { suggestions };
	// 					}

	// 					var word = model.getWordUntilPosition(position);
	// 					var range = {
	// 						startLineNumber: position.lineNumber,
	// 						endLineNumber: position.lineNumber,
	// 						startColumn: word.startColumn,
	// 						endColumn: word.endColumn,
	// 					};

	// 					if (modsCheck) {
	// 						suggestions.push(...createModNameSuggestions(range));
	// 					} else if (modTableCheck) {
	// 						//@ts-expect-error
	// 						const result = model.findPreviousMatch(/"id"\s*:\s*"(\w+)"/, position, true, true, null, true);
	// 						const id = result.matches?.[1];
	// 						if (!id) {
	// 							console.error("Something is not quite right");
	// 							return;
	// 						}
	// 						suggestions.push(...createModDescriptionSuggestions(id, range));
	// 					}
	// 					return {
	// 						suggestions,
	// 					};
	// 				},
	// 			});

	// 			/**@returns {object[]} */
	// 			function createModNameSuggestions(range) {
	// 				const suggestions = [];
	// 				for (const template of Object.values(modTemplates)) {
	// 					const suggestion = {
	// 						label: `${template.id}`,
	// 						kind: globalThis.monaco.languages.CompletionItemKind.Property,
	// 						insertText: `${template.id}",\n"description": "${template.description}`,
	// 						range,
	// 					};
	// 					suggestions.push(suggestion);
	// 				}
	// 				return suggestions;
	// 			}
	// 			/**@returns {object[]} */
	// 			function createModDescriptionSuggestions(id, range) {
	// 				const suggestions = [];
	// 				const description = modTemplates[id]?.description;
	// 				const suggestion = {
	// 					label: `${description}`,
	// 					kind: globalThis.monaco.languages.CompletionItemKind.Property,
	// 					insertText: description,
	// 					range,
	// 				};
	// 				suggestions.push(suggestion);
	// 				return suggestions;
	// 			}
	// 		}

	// 		{
	// 			//Semantic tokens provider
	// 			globalThis.monaco.languages.registerDocumentSemanticTokensProvider("json", {
	// 				getLegend: function () {
	// 					return {
	// 						tokenTypes: ["number"],
	// 						tokenModifiers: ["declaration"],
	// 					};
	// 				},
	// 				provideDocumentSemanticTokens: function (model, lastResultId, token) {
	// 					const lines = model.getLinesContent();

	// 					/** @type {number[]} */
	// 					const data = [];
	// 					let prevLine = 0;
	// 					let prevChar = 0;

	// 					for (let i = 0; i < lines.length; i++) {
	// 						const line = lines[i];

	// 						const matches = [...line.matchAll(/"description"\s*:\s*"[^"]+"/g)];
	// 						for (const match of matches) {
	// 							const bracketMatches = [...match[0].matchAll(/{[0-9.-]*}/g)];
	// 							var charOffset = match.index;
	// 							for (const bracketMatch of bracketMatches) {
	// 								const lineIndex = i - prevLine;
	// 								const columnIndex = prevLine === i ? bracketMatch.index - prevChar : bracketMatch.index;
	// 								const matchLength = bracketMatch[0].length;
	// 								const typeIndex = 0;
	// 								const modifierIndex = -1;
	// 								data.push(lineIndex, columnIndex + charOffset, matchLength, typeIndex, modifierIndex);
	// 								prevLine = i;
	// 								prevChar = bracketMatch.index;
	// 								charOffset = 0;
	// 							}
	// 						}
	// 					}
	// 					return {
	// 						data: new Uint32Array(data),
	// 						resultId: null,
	// 					};
	// 				},
	// 				releaseDocumentSemanticTokens: function (resultId) {},
	// 			});
	// 		}

	// 		resolve(editor);
	// 	});
	// });
}

/**@param {monaco.editor.IModel} model */
function parseModel(model) {
	const json = model.getValue();
	var at = 0;
	var ch = json.charAt(at);

	var insertModelRangeStart = function (obj) {
		const range = model.getPositionAt(at);
		obj.modelRange = {
			startLineNumber: range.lineNumber,
			startColumn: range.column,
		};
	};
	var insertModelRangeEnd = function (obj) {
		const range = model.getPositionAt(at);
		obj.modelRange.endLineNumber = range.lineNumber;
		obj.modelRange.endColumn = range.column;
	};

	var isWhitespace = function (c) {
		return c === " " || c === "\n" || c === "\t" || c === "\r";
	};

	var next = function (removeWhiteSpace = true) {
		at += 1;
		ch = json.charAt(at);
		if (removeWhiteSpace && isWhitespace(ch)) {
			return next();
		}
		return ch;
	};

	var error = function (message) {
		console.log(message);
		throw undefined;
	};

	var value = function () {
		switch (ch) {
			case "{":
				return object();
			case "[":
				return array();
			case '"':
				return string();
			case "t":
			case "f":
				return bool();
			case "n":
				return nully();
			default:
				let v = Number(ch);
				if (ch === "-" || (ch && v >= 0 && v <= 9)) {
					return number();
				} else {
					error("bad JSON");
				}
				break;
		}
	};

	var nully = function () {
		var nully = "";
		if (ch === "n") {
			for (let i = 0; i < 4; i++) {
				nully += ch;
				next();
			}
			if (nully === "null") {
				return null;
			} else {
				error("bad null");
			}
		}
		error("bad null");
	};

	var bool = function () {
		var bool = "";
		if (ch === "t") {
			for (let i = 0; i < 4; i++) {
				bool += ch;
				next();
			}
			if (bool === "true") {
				return true;
			} else {
				error("bad bool");
			}
		} else if (ch === "f") {
			for (let i = 0; i < 5; i++) {
				bool += ch;
				next();
			}
			if (bool === "false") {
				return false;
			} else {
				error("bad bool");
			}
		}
		error("bad bool");
	};

	var number = function () {
		var number = "";
		function getDigits() {
			while (ch && Number(ch) >= 0 && Number(ch) <= 9) {
				number += ch;
				next();
			}
		}

		if (ch === "-") {
			number += ch;
			next();
		}

		getDigits();

		if (ch === ".") {
			number += ch;
			next();
			getDigits();
		}

		if (!isNaN(Number(number))) {
			return Number(number);
		} else {
			error("bad number");
		}
	};

	var escapes = {
		// helper variable
		b: "\b",
		n: "\n",
		t: "\t",
		r: "\r",
		f: "\f",
		'"': '"',
		"\\": "\\",
	};

	var string = function () {
		var string = "";
		if (ch !== '"') {
			error('string should start with "');
		}
		next(false);
		while (ch) {
			if (ch === '"') {
				next();
				return string;
			}
			if (ch === "\\") {
				next(false);
				if (escapes.hasOwnProperty(ch)) {
					string += escapes[ch];
				} else {
					// if not a proper escape code, ignore escape and just add char
					// NOTE: this should never be called if proper stringified JSON provided
					string += ch;
				}
			} else {
				// anything other than \ and " => just add character to string
				string += ch;
			}
			next(false);
		}
		error("bad string");
	};

	var array = function () {
		var array = [];
		if (ch !== "[") {
			error("array should start with [");
		}
		if (next() === "]") {
			next();
			return array;
		}

		do {
			array.push(value());
			if (ch === "]") {
				next();
				return array;
			}
		} while (ch && ch === "," && next());

		error("bad array");
	};

	var object = function () {
		var object = {};
		if (ch !== "{") {
			error("object should start with {");
		}
		insertModelRangeStart(object);
		if (next() === "}") {
			return object;
		}

		do {
			var key = string();
			if (ch !== ":") {
				error('object property expecting ":"');
			}
			next();
			object[key] = value();
			if (ch === "}") {
				insertModelRangeEnd(object);
				next();
				return object;
			}
		} while (ch && ch === "," && next());

		error("bad object");
	};
	return value();
}
