import * as eventListener from "../eventListener.js";
import { jsonCopy } from "../helperFunctions.js";
import { getLocalModule } from "../modules/module-exporter.js";
import { modTemplateList } from '../mods.js';
//@ts-nocheck
export {};

const options = document.querySelector(".p-editor .s-options");
/**@type {HTMLElement} */
const importButton = options.querySelector(".import-button");
/**@type {HTMLElement} */
const input = options.querySelector("input[type=file].import");
/**@type {HTMLElement} */
const compileButton = options.querySelector(".compile-button");

var editor = undefined;

/**@type {Modules.ModuleData} */
var module = undefined;

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
		const text = editor.getModel().getValue();
		setModuleFromText(text);
	});
}

export async function init() {
	const schema = await loadSchema();

	editor = await loadEditor(schema);
	const demoModule = await getLocalModule("demo");
	editor.setValue(JSON.stringify(demoModule, null, "\t"));
}

export function compile(){
    compileButton.click();
}

export function getModule() {
	return jsonCopy(module);
}

function setModuleFromText(text) {
	try {
		module = JSON.parse(text);
		eventListener.invoke(eventListener.EventType.MODULE_CHANGED, module);
	} catch (e) {
		console.error(e);
	}
}

async function loadSchema() {
	//@ts-expect-error
	const { default: schema } = await import("../modules/module-schema.json", {
		assert: {
			type: "json",
		},
	});
	return schema;
}

/**@returns {Promise<monaco.editor.IStandaloneCodeEditor>} */
async function loadEditor(schema) {
	globalThis.require.config({
		paths: {
			vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.34.0-dev.20220414/min/vs",
		},
	});
    
	return new Promise((resolve) => {
		globalThis.require(["vs/editor/editor.main"], function () {
			monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
				validate: true,
				schemas: [
					{
						uri: "schema.json",
						fileMatch: ["*"],
						schema,
					},
				],
			});
            /**@type {HTMLElement} */
			const editorElement = document.querySelector(".p-editor .text-editor");
			const editor = monaco.editor.create(editorElement, {
				language: "json",
				theme: "vs-dark",
				scrollBeyondLastLine: true,
				wordWrap: "off",
				minimap: {
					enabled: true,
				},
                automaticLayout: false,
                bracketPairColorization: {enabled: true},
				suggest: {
					snippetsPreventQuickSuggestions: false,
				},
				quickSuggestions: { other: true, strings: true },
				"semanticHighlighting.enabled": true,
				trimAutoWhitespace: false,
			});

            editor.onDidChangeModelContent(function(e){
                // updateCustomMarkers(0, 5);
            });

			{
				const block = document.querySelector(".p-editor");
				const resizewatcher = new ResizeObserver((entries) => {
					for (const entry of entries) {
						// console.log("Element", entry.target, entry.contentRect.width == 0 ? "is now hidden" : "is now visible");
						if (entry.target === block) {
							const editorParent = document.querySelector(".p-editor .text-editor");
							const rect = editorParent.getBoundingClientRect();
							editor.layout({ width: rect.width, height: rect.height });
						}
					}
				});
				resizewatcher.observe(block);
			}

			monaco.editor.onDidChangeMarkers((event) => {
				const hasErrors = globalThis.monaco.editor.getModelMarkers({ owner: "json" }).length !== 0;
				compileButton.toggleAttribute("disabled", hasErrors);
                console.log('has errors');
			});

			// var markers = [];
			// {
			// 	//services
			// 	const getService = function (editorInstance, serviceName) {
			// 		const entries = editorInstance._instantiationService._parent._services._entries;
			// 		for (const entry of entries) {
			// 			const name = entry[0].toString();
			// 			if (name === serviceName) {
			// 				return entry[1];
			// 			}
			// 		}
			// 	};
			// 	const markerService = getService(editor, "markerDecorationsService");

			// 	// console.log(testService);
			// 	// console.log(testService);
			// 	markerService._onDidChangeMarker.event(function () {
			// 		// Callback function which is getting called after decorations
			// 		console.log("markers changed");
			// 		markers = globalThis.monaco.editor.getModelMarkers(editor.getModel().id);
			// 	});

			// 	// modelService._onDidChangeContent.event(function(){
			// 	//     console.log('test');
			// 	// });
			// }

			// editor.getModel().onDidChangeContent((e) => {
			// 	newDecorations = []; //remove decorations
			// 	updateDecorations();
			// });

			// {
			// 	let timerId = undefined;
			// 	editor.onDidChangeModelContent((e) => {
            //         console.log(markers);
			// 		if (timerId) {
			// 			clearTimeout(timerId);
			// 			timerId = undefined;
			// 		}
			// 		if (!timerId) {
			// 			editor.contentChangeDelay = true;
			// 			timerId = setTimeout(() => {
			// 				timerId;
            //                 console.log(markers);
			// 				if (markers.length === 0) {
			// 					updateCustomWhenNoMarkers();
			// 				}
			// 			}, 1000);
			// 		}

			// 		// console.log('onDidChangeModelContent', ...e.changes.reduce((aggr, c) => [...aggr, c.text, c.rangeOffset, c.rangeLength], []));
			// 	});
			// }
			
			// function updateCustomMarkers(start, end) {
			// 	monaco.editor.setModelMarkers(editor.getModel(), null, [
			// 		{
			// 			message: "Hello",
			// 			startLineNumber: start,
			// 			endLineNumber: end,
            //             startColumn: 0,
			// 			endColumn: 1000,
			// 			severity: globalThis.monaco.MarkerSeverity.Error,
			// 		},
			// 	]);
			// }
 
			function updateCustomWhenNoMarkers() {
                console.log('delayed update');
				//this will get called when markers have been updated and there are none
				//reason being that an invalid object literal cannot be parsed
				//so we only ever parse the content when there are no errors
				// console.log('test');
				const allContent = editor.getValue();
				const moduleIds = new Set();
				/**@type {Modules.ModuleData} */
				const asObj = JSON.parse(allContent);
				const duplicateIds = new Set();
				if (asObj.items && asObj.items.modTables) {
					const idsInModTables = asObj.items.modTables.flatMap((x) => x.id);
					for (const id of idsInModTables) {
						if (moduleIds.has(id)) {
							duplicateIds.add(id);
						}
						moduleIds.add(id);
					}
				}

				if (duplicateIds.size !== 0) {
					const lines = editor.getModel().getLinesContent();
					const visibleRanges = editor.getVisibleRanges();
					for (const visibleRange of visibleRanges) {
						const startIndex = visibleRange.startLineNumber - 1;
						const endIndex = visibleRange.endLineNumber - 1;
						for (let i = startIndex; i <= endIndex; i++) {
							for (const duplicateId of duplicateIds) {
								const pattern = new RegExp(`"id"\\s*:\\s*"${duplicateId}"`, "g");
								const text = lines[i];
								const matches = text.matchAll(pattern);
								for (const match of matches) {
									// markers.push({
									// 	message: "Duplicate id detected",
									// 	startLineNumber: i,
									// 	endColumn: 1000,
									// 	endLineNumber: i,
									// 	severity: globalThis.monaco.MarkerSeverity.Error,
									// });
                                    console.log(`Added Duplicate id detected marker at line number ${i}`);
								}
							}
						}
					}
				}
			}

			// editor.addAction({
			//     id: 'simplify',
			//     label: 'Format - Simplify',
			//     precondition: null,
			//     contextMenuGroupId: 'format',
			//     contextMenuOrder: 2,
			//     run: function(e){
			//         e.getModel().setValue(JSON.stringify(JSON.parse(e.getModel().getValue()), null, 0));
			//     }
			// });

			{
				//Completion provider
				const modTemplates = modTemplateList;
				const modRegex = /(?<=[^{]"mods"\s*: \[\s*{\s*"id"\s*:\s*")[^"]*$/g;
				const modTableRegex = /(?<="modTables"[\s\S]+"id"[\s\S]+"mods"[\s\S]+"description"\s*:\s*")$/g;

				monaco.languages.registerCompletionItemProvider("json", {
					provideCompletionItems: function (model, position) {
						// find out if we are completing a property in the 'dependencies' object.
						var textUntilPosition = model.getValueInRange({
							startLineNumber: 1,
							startColumn: 1,
							endLineNumber: position.lineNumber,
							endColumn: position.column,
						});

						const modsCheck = textUntilPosition.match(modRegex);
						const modTableCheck = textUntilPosition.match(modTableRegex);

						const suggestions = [];
						if (!modsCheck && !modTableCheck) {
							return { suggestions };
						}

						var word = model.getWordUntilPosition(position);
						var range = {
							startLineNumber: position.lineNumber,
							endLineNumber: position.lineNumber,
							startColumn: word.startColumn,
							endColumn: word.endColumn,
						};

						if (modsCheck) {
							suggestions.push(...createModNameSuggestions(range));
						} else if (modTableCheck) {
                            //@ts-expect-error
							const result = model.findPreviousMatch(/"id"\s*:\s*"(\w+)"/, position, true, true, null, true);
							const id = result.matches?.[1];
							if (!id) {
								console.error("Something is not quite right");
								return;
							}
							suggestions.push(...createModDescriptionSuggestions(id, range));
						}
						return {
							suggestions,
						};
					},
				});

				/**@returns {object[]} */
				function createModNameSuggestions(range) {
					const suggestions = [];
					for (const template of Object.values(modTemplates)) {
						const suggestion = {
							label: `${template.id}`,
							kind: globalThis.monaco.languages.CompletionItemKind.Property,
							insertText: `${template.id}",\n"description": "${template.description}`,
							range,
						};
						suggestions.push(suggestion);
					}
					return suggestions;
				}
				/**@returns {object[]} */
				function createModDescriptionSuggestions(id, range) {
					const suggestions = [];
					const description = modTemplates[id]?.description;
					const suggestion = {
						label: `${description}`,
						kind: globalThis.monaco.languages.CompletionItemKind.Property,
						insertText: description,
						range,
					};
					suggestions.push(suggestion);
					return suggestions;
				}
			}

			{
				//Semantic tokens provider
				globalThis.monaco.languages.registerDocumentSemanticTokensProvider("json", {
					getLegend: function () {
						return {
							tokenTypes: ["number"],
							tokenModifiers: ["declaration"],
						};
					},
					provideDocumentSemanticTokens: function (model, lastResultId, token) {
						const lines = model.getLinesContent();

						/** @type {number[]} */
						const data = [];
						let prevLine = 0;
						let prevChar = 0;

						for (let i = 0; i < lines.length; i++) {
							const line = lines[i];

							const matches = [...line.matchAll(/"description"\s*:\s*"[^"]+"/g)];
							for (const match of matches) {
								const bracketMatches = [...match[0].matchAll(/{[0-9.-]*}/g)];
								var charOffset = match.index;
								for (const bracketMatch of bracketMatches) {
									const lineIndex = i - prevLine;
									const columnIndex = prevLine === i ? bracketMatch.index - prevChar : bracketMatch.index;
									const matchLength = bracketMatch[0].length;
									const typeIndex = 0;
									const modifierIndex = -1;
									data.push(lineIndex, columnIndex + charOffset, matchLength, typeIndex, modifierIndex);
									prevLine = i;
									prevChar = bracketMatch.index;
									charOffset = 0;
								}
							}
						}
						return {
							data: new Uint32Array(data),
							resultId: null,
						};
					},
					releaseDocumentSemanticTokens: function (resultId) {},
				});
			}

			resolve(editor);
		});
	});
}
