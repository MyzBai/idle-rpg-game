namespace Modifiers{
    type ModList = StatMod[];
    interface Mod{
        id: string;
        stats: {name: string, value?: number, min?: number, max?: number}[];
    }
    interface ModTemplate{
        id: string;
        desc?: string;
        stats: StatMod[];
    }
    interface ItemModifier extends ModTemplate{
        levelReq: number;
        tableIndex: number;
        table: ItemModifier[];
    }
    type StatKeyword = {
        name: string;
        type: string;
    };
    interface StatMod{
        name: string;
        valueType: string;
        value?: number;
        min?: number;
        max?: number;
        flags?: number | string[];
        conditions?: number | string[];
        keywords?: StatKeyword[];
        source?: any;
    }

    interface ModCache{
        strength: number;
        dexterity: number;
        intelligence: number;
        attackSpeed: number;
        attackCost: number;
        maxMana: number;
        manaRegen: number;
        bleedCount: number;
    }
}

namespace Modules{
    
    interface ModuleCollection{
        config: Config;
        player: Player;
        skills: Skills;
        enemies: Enemies;
        items?: Items;
        modTree?: ModTree;
    }
    interface Config{
        name?: string;
        description?: string;
        id: number | string;
        src: string;
        include?: string[];
        exclude?: string[];
    }
    interface Player{
        defaultMods: Modifiers.Mod[];
    }
    interface Skills{
        maxSupports: number;
        attacks: Skills.AttackSkill[];
        supports: Skills.SupportSkill[];
    }
    interface Items{
        maxMods: number;
        items: {
            name: string;
            levelReq: number;
        }[];
        crafting: {
            basic: CraftingBasic;
        };
        modTables: Items.ModTable[];
    }
    interface Enemies{
        enemyList: {health: number}[]
    }
    
    interface ModTree{

    }
}

namespace Skills{
    interface AbstractSkill{
        name: string;
        type: string;
        stats: any;
        mods?: Mod[];
    }
    interface AttackSkill extends AbstractSkill{
        override stats: AttackSkillStats;
    }
    interface SupportSkill extends AbstractSkill{
        override stats: SupportSkillStats;
    }

    interface AttackSkillStats{
        attackSpeed: number;
        manaCost: number;
        baseDamageMultiplier: number;
    }
    interface SupportSkillStats{
        manaMultiplier: number;
    }
}

namespace Items{
    interface ModTable{
        id: string;
        mods: ItemModifier[];
    }
    interface ItemModifier{
        id?: string;
        desc?: string;
        levelReq?: number;
        weight?: number;
        tableIndex?: number;
        stats: Modifiers.StatMod[];
    }

    interface Crafting{
        basic?: BasicCrafting;
    }
    
    interface CraftingTierTargets{
        random?: {cost: number};
        lucky?: {cost: number};
        maxTier?: {cost: number};
    }
    interface CraftingBasic{
        actions: {
            rollMods?: {
                weights: number[];
                tierTargets: CraftingTierTargets;
            },
            addMod?: {
                tierTargets: CraftingTierTargets;
            },
            rollValues?: {
                cost?: number;
            },
            remove?: {
                cost?: number;
            }
        }
    }

}

namespace ModTree{
    interface NodeMod{
        id: number;
        stats: {value: number}[];
    }

    interface Node{
        name: string;
        curPoints?: number;
        maxPoints: number;
        mods: NodeMod[];
        element?: HTMLElement;
    }
}

namespace DamageCalc{

    type DamageType = string;
    type Physical = number;
    type Elemental = number;
    type Chaos = number;
    
    interface Player{
        modList: Modifiers.StatMod[];
        attackSkill?: AttackSkill;
    }
    
    interface ConversionValues{
        physical?: Physical;
        elemental?: Elemental;
        chaos?: Chaos;
        multi: number;
    }
    interface ConversionTable{
        physical?: ConversionValues;
        elemental?: ConversionValues;
        chaos?: ConversionValues;
    }

    interface Configuration{
        self?: any;
        other?: any;
        calcMinMax?: (min: number, max: number) => number;
        flags?: number;
        conditions?: number;
        modCache?: Modifiers.ModCache;
    }
    interface BaseDamage{
        min: number;
        max: number;
        value: number;
    }
    interface BaseDamageOutput{
        physical?: BaseDamage;
        elemental?: BaseDamage;
        chaos?: BaseDamage;
    }

    interface AttackOutput{
        totalDamage: number;
        wasHit?: boolean;
        wasCrit?: boolean;
        ailments?: Ailments.Instance[];
    }

    interface StatsOutput{
        dps: number;
        avgDamage: number;
        minPhysicalDamage: number;
        maxPhysicalDamage: number;
        minElementalDamage: number;
        maxElementalDamage: number;
        minChaosDamage: number;
        maxChaosDamage: number;
        minTotalCombinedDamage: number;
        maxTotalCombinedDamage: number;
        hitChance: number;
        attackSpeed: number;
        maxMana: number;
        manaRegen: number;
        critChance: number;
        critMulti: number;
        bleedChance: number;
        minBleedDamage: number;
        maxBleedDamage: number;
        strength: number;
        dexterity: number;
        intelligence: number;
    }
}



namespace Ailments{
    interface Instance{
        duration: number;
        time?: number;
        type: string;
        damage?: number;
    }
}