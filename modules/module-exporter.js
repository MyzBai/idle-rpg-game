
/**@returns {{name: string, description: string}[]} */
export function getLocalModulesInfo(){
    const localModules = [];
    localModules.push({name: 'Demo', description: `This demo is a proof of concept.\nIt's short and simple.\nEnjoy!`});
    return localModules;
}


/**
 * @param {string} name
 * @returns {Promise<Modules.ModuleCollection>} 
 */
export async function getLocalModule(name) {
	try {
		const { default: data } = await import(`./${name.toLowerCase()}/module.json`, { assert: { type: "json" } });
        return data;
	} catch (e) {
        console.error(e);
	}
}
