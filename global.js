
/**
 * @typedef Features
 * @property {boolean} LOAD_GITHUB_MODULES
 */

/**
 * @typedef Environment
 * @property {string} ENV_TYPE
 * @property {Features} features
 */


class Global{
    constructor(){
        /**@type {Environment} */
        this.env = undefined;
    }
}

export default (new Global());