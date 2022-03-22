
/**@returns {Promise<import('../../type-definitions.js').ModuleConfig[]>} */
export async function loadConfigs(){
    const configs = [];
    const demoConfig = await loadConfig('demo');
    configs.push(demoConfig);
    return configs;
}

/**@returns {Promise<{name: string, data: object}[]>} */
export async function loadModule(config) {
    const files = [];
    for (const filename of config.include) {
        try {
            const { default: data } = await import(`./${config.name}/${filename}`, { assert: { type: 'json' } });
            files.push({ name: filename, data: data });
        } catch (e) {
            console.error(e);
        }
    }
    return files;
}

/**@returns {Promise<import('@root/type-definitions.js').ModuleConfig} */
async function loadConfig(name){
    const { default: config } = await import(`./${name}/module-config.json`, { assert: { type: 'json' } });
    return config;
}

