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
 * @typedef StatMod
 * @property {string} name
 * @property {number} [value]
 * @property {string} valueType
 * @property {number | string[]} [flags]
 * @property {number | string[]} [conditions]
 * @property {StatKeyword[]} [keywords]
 * @property {object} [source]
 */