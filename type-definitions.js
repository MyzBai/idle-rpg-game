export {};

//Environment
/**
 * @typedef Environment
 * @property {string} LOCAL_STORAGE_KEY
 * @property {string} ENV_TYPE
 * @property {string} SAVE_PATH
 */

/**
 * @typedef StatKeyword
 * @property {string} name
 * @property {string} type
 */

/**
 * Raw stat modifier with flags/conditions as string arrays
 * @typedef RawStatMod
 * @property {string} name
 * @property {number} [value]
 * @property {number} [min]
 * @property {number} [max]
 * @property {string} [valueType]
 * @property {string[]} [flags]
 * @property {string[]} [conditions]
 * @property {StatKeyword[]} [keywords]
 */

/**
 * Final stat modifier with flags/conditions as a number
 * @typedef StatMod
 * @property {number} value
 * @property {string} valueType
 * @property {string} name
 * @property {number} flags
 * @property {number} conditions
 * @property {StatKeyword[]} [keywords]
 * @property {object} [source]
 */