
/**@returns {Promise<import('../../type-definitions.js').ModuleConfig[]>} */
export async function loadConfigs(){
    const configs = [];
    const demoConfig = await loadConfig('demo');
    configs.push(demoConfig);
    return configs;
}

/**
 * @param {string} foldername
 * @param {string[]} includes - files to include
 * @returns {Promise<{name: string, data: object}[]>} */
export async function loadModule(foldername, includes) {
    const files = [];
    for (const filename of includes) {
        try {
            const { default: data } = await import(`./${foldername.toLowerCase()}/${filename.toLowerCase()}`, { assert: { type: 'json' } });
            files.push({ name: filename, data: data });
        } catch (e) {
            console.error(e);
        }
    }
    return files;
}

/**@returns {Promise<import('@root/type-definitions.js').ModuleConfig} */
async function loadConfig(name){
    const { default: config } = await import(`./${name}/config.json`, { assert: { type: 'json' } });
    return config;
}

