/**@param {monaco.editor.IModel} model */
export default function parseModel(model) {
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