/**
 *
 * @param {string} description
 * @param {number[]} values
 */
export function parseModDescription(description, values) {
	var matches = description.match(/[#\.]+|\.(#+)/g);
	var result = description;
	var i = 0;
	for (const match of matches) {
		let decimals = match.split(".");
		let numDecimals = decimals.length > 1 ? decimals[1].length : 0;
		result = result.replace(match, values[i++].toFixed(numDecimals));
		// if(match.includes('.')){
		// } else{
		//     result = result.replace('#', values[i++]).toFixed();
		// }
	}
	return result;
}

/**
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function avg(min, max) {
	return (min + max) / 2;
}

/**
 * @param {number} min
 * @param {number} max
 * @returns {number} value between min(inclusive) and max(exclusive)
 */
export function randomRange(min, max) {
	return Math.random() * (max - min) + min;
}

/**
 * @param {...string} string 
 */
export function toCamelCasePropertyName(...string){
    return string.join(' ').replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index){
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      }).replace(/\W/g, '');
}

/**
 * @param {number[]} weights
 * @returns {number} index
 */
export function weightedRandom(weights) {
	let sum = weights.reduce((a, c) => c + a, 0);

	let rand = randomRange(0, sum);
	for (let i = 0; i < weights.length; i++) {
		const weight = weights[i];
		if (rand > weight) {
			rand -= weight;
			continue;
		}

		return i;
	}
}

export function deepFreeze(obj) {
	for (const key in obj) {
		if (Object.hasOwnProperty.call(obj, key)) {
			const value = obj[key];
			if (value && typeof value === "object") {
				deepFreeze(value);
			}
		}
	}
	// let propertyNames = Object.getOwnPropertyNames(obj);
	// for (const name of propertyNames) {
	//     const value = obj[name];
	//     if(value && typeof value === 'object'){
	//         deepFreeze(value);
	//     }
	// }
	return Object.freeze(obj);
}

/**@returns {string} */
export function uuidv4() {
	// return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
}

export function isLocalNetwork(hostname = window.location.hostname) {
	return ["localhost", "127.0.0.1", "", "::1"].includes(hostname) || hostname.startsWith("192.168.") || hostname.startsWith("10.0.") || hostname.endsWith(".local");
}

export function registerTabs(btns) {
	for (const btn of btns) {
		btn.addEventListener("click", (e) => {
			for (const otherBtn of btns) {
				const target = document.querySelector(otherBtn.dataset.tabTarget);
				otherBtn.classList.toggle("active", otherBtn === btn);
				if (!target) {
					continue;
				}
				const active = otherBtn === btn;
				target.classList.toggle("active", active);
			}
		});
	}
}
