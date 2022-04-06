
interface Mod{
    id: string;
    stats: {value?: number, min?: number, max?: number}[];
}

interface StatMod{
    name: string;
    valueType: string;
    value: number;
    flags: number | string[];
    conditions: number | string[];
    keywords?: {name: string, type: string}[];
    source?: any;
}

interface ConfigModule{
    name?: string;
    description?: string;
    id: number | string;
    src: string;
    include?: string[];
    exclude?: string[];
}
interface DefaultModsModule{
    player: Mod[];
    enemies: Mod[];
}
interface SkillsModule{
    maxSupports: number;
    attacks: {
        name: string;
        attackSpeed: number;
        manaCost: number;
        baseDamageMultiplier: number;
        mods?: Mod[];
    }[];
    supports: {
        name: string;
        manaMultiplier: number;
        mods: Mod[];
    }
}

interface EnemiesModule{
    enemies: {health: number}[];
}

interface ModTreeModule{

}

interface Module{
    config: ConfigModule;
    defaultMods: DefaultModsModule;
    skills: SkillsModule;
    enemies: EnemiesModule;
    items?: ItemsModule;
    modTree?: ModTreeModule;
}