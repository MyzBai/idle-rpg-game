/**
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function avg(min, max) {
	return (min + max) / 2;
}

export function clamp(v, min, max) {
	return Math.min(Math.max(v, min), max);
}
export function clamp01(v) {
	return clamp(v, 0, 1);
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
export function toCamelCasePropertyName(...string) {
	return string
		.join(" ")
		.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
			return index === 0 ? word.toLowerCase() : word.toUpperCase();
		})
		.replace(/\W/g, "");
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

/**
 * @template T
 * @param {T} original
 * @param {...Object} freezeImmune
 * @returns {T}
 */
export function deepFreeze(original, ...freezeImmune) {

    return freeze(original);

    function freeze(obj){
        for (const key in obj) {
            if (Object.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                if(value === original){
                    continue;
                }
                if (freezeImmune.some((x) => x === value)) {
                    continue;
                }
                if (value && typeof value === "object") {
                    freeze(value);
                }
            }
        }
        return Object.freeze(obj);
    }
}

/**@returns {string} */
export function uuidv4() {
	// return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
		var r = (Math.random() * 16) | 0,
			v = c == "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

/**
 * @param {string} str 
 * @returns {string}
 */
export function hashCode (str){
    var hash = 0;
    if (str.length == 0) {
        return "";
    }
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

export function isLocalNetwork(hostname = window.location.hostname) {
	return ["localhost", "127.0.0.1", "", "::1"].includes(hostname) || hostname.startsWith("192.168.") || hostname.startsWith("10.0.") || hostname.endsWith(".local");
}

/**
 * @param {HTMLElement[]} btns
 * @param {number} index click btn at index
 */
export function registerTabs(btns, index = -1) {
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
    if(index !== -1){
        btns[index].click();
    }

}

/**
 *
 * @param {HTMLElement[]} btns
 * @param {(btn: HTMLElement, active: boolean) => void} callback
 */
export function registerToggles(btns, callback) {
	for (const btn of btns) {
		btn.addEventListener("click", (e) => {
			const active = btn.classList.toggle("toggled");
			callback(btn, active);
		});
	}
}

/**
 * @template T
 * @param {T} obj - A generic parameter that flows through to the return type
 * @return {T}
 */
export function jsonCopy(obj) {
	try {
		return JSON.parse(JSON.stringify(obj));
	} catch (error) {
		console.error(error);
	}
}

/**@returns {Uint8Array} */
export function strToUint8Array(str){
    return new Uint8Array([...str].map(x => x.charCodeAt(0)));
}