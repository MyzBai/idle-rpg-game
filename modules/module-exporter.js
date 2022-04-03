
/**@typedef {import('../type-definitions.js')} ModuleConfig */
/**@typedef {import('../loadModule.js')} ModuleFile */

/**@returns {Promise<ModuleConfig[]>} */
export async function loadConfigs(){
    const configs = [];
    const demoConfig = await loadConfig('demo');
    if(demoConfig){
        configs.push(demoConfig);
    }
    return configs;
}

/**
 * @param {string} foldername
 * @param {string[]} includes - files to include
 * @returns {Promise<ModuleFile>} */
export async function loadModule(foldername, includes) {
    const files = [];
    for (const filename of includes) {
        try {
            const { default: data } = await import(`./${foldername.toLowerCase()}/${filename.toLowerCase()}`, { assert: { type: 'json' } });
            files.push({ name: filename, content: data });
        } catch (e) {
            console.error(e);
        }
    }
    return files;
}

/**@returns {Promise<import('@root/type-definitions.js').ModuleConfig} */
async function loadConfig(name){
    try{
        return await import(`./${name}/config.json`, { assert: { type: 'json' } });
    } catch(e){
        console.error(e);
    }
}

