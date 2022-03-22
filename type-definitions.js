export {}
/**
 * @typedef Environment
 * @property {string} LOCAL_STORAGE_KEY
 * @property {string} ENV_TYPE
 * @property {string} SAVE_PATH
 */

/**
 * @typedef ModuleFileContent
 * @property {string} [$schema]
 * @property {any} data
 */

/**
 * @typedef ModuleFile
 * @property {string} filename
 * @property {ModuleFileContent} content
 */


/**
 * @typedef ModuleConfig
 * @property {string} name
 * @property {string} [description]
 * @property {string} source
 * @property {boolean} [overrideSave]
 */

/**
 * @typedef SubModules
 * @property {object} defaultStatMods 
 * @property {object} enemy 
 * @property {object} skills 
 * @property {object} [items] 
 * @property {object} [modTree] 
 */
/**
 * @typedef ModuleData
 * @property {ModuleConfig} config
 * @property {SubModules} data
 */