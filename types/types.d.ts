type BitFlag = number;

type StatModList = StatMod[];
type ModList = Mod[];
type StatName = string;
type StatModKeywordType = string;

interface Mod {
    id: string;
    description: string;
    stats: StatModList;
}

type StatModKeyword = {
    name: StatName;
    value?: number;
    type: StatModKeywordType;
    index: number;
};
interface StatMod {
    name: string;
    valueType: string;
    value?: number;
    min?: number;
    max?: number;
    flags?: number;
    conditions?: number | string[];
    keyword?: StatModKeyword;
}
interface ModCache {
    strength: number;
    dexterity: number;
    intelligence: number;
    attackSpeed: number;
    attackCost: number;
    maxMana: number;
    manaRegen: number;
    bleedCount: number;
    bleedDuration: number;
}

namespace Modules {

    interface ModuleData {
        config: Config;
        player: Player;
        enemies: Enemies;
        skills: Skills;
        items?: Items;
        modTree?: ModTree;
    }

    interface Config {
        name?: string;
        description?: string;
        id: number | string;
        src: string;
        include?: string[];
        exclude?: string[];
    }

    interface PlayerDefaultStatValues {
        hitChance: number;
        attackSpeed: number;
        critChance: number;
        critMulti: number;
        mana: number;
        manaRegen: number;
        bleedDuration: number;
        bleedCount: number;
        strength: number;
        dexterity: number;
        intelligence: number;
    }

    interface Player {
        defaultStatValues: PlayerDefaultStatValues;
    }

    interface Enemies {
        enemyList: { health: number }[]
    }

    type AttackSkill = Omit<Skills.AttackSkill, 'mods'> & {
        mods: ModList;
    }
    type SupportSkill = Omit<Skills.SupportSkill, 'mods'> & {
        mods: ModList;
    }
    interface Skills {
        maxSupports: number;
        attackSkills: AttackSkill[];
        supportSkills?: SupportSkill[];
    }

    interface Items {
        maxMods: number;
        items: {
            name: string;
            levelReq: number;
        }[];
        crafting: Items.Crafting;
        modTables: Items.ModTable[];
    }

    interface ModTree {
        numPointsPerLevel: number;
        unassignCost: number;
        nodes: ModTree.Node[];
    }
}

namespace Skills {
    interface AbstractSkill {
        name: string;
        levelReq?: number;
        type: string;
        stats: any;
        mods?: ModList;
    }

    interface AttackSkill extends AbstractSkill {
        override stats: AttackSkillStats;
    }

    interface SupportSkill extends AbstractSkill {
        override stats: SupportSkillStats;
    }

    interface AttackSkillStats {
        attackSpeed: number;
        manaCost: number;
        baseDamageMultiplier: number;
    }

    interface SupportSkillStats {
        manaMultiplier: number;
    }
}

namespace Items {
    interface ModTable {
        id: string;
        mods: ItemModifier[];
    }
    interface ItemModifier extends Mod {
        levelReq?: number;
        weight?: number;
        tableIndex: number;
        tier: number;
    }
    namespace Crafting {
        interface Crafs {
            basic: Basic;
        }
        interface Action {
            cost?: number;
        }
        interface Basic {
            actions: {
                rollMods?: Action;
                addMod?: Action;
                rollValues?: Action;
                remove?: Action;
            }
        }
    }
}

namespace ModTree {
    interface Node {
        name: string;
        levelReq: number;
        curPoints?: number;
        maxPoints: number;
        mods: ModList;
        element?: HTMLElement;
    }
}

namespace DamageCalc {

    type DamageType = string;
    type Physical = number;
    type Elemental = number;
    type Chaos = number;

    interface Player {
        modList: StatModList;
        attackSkill?: AttackSkill;
    }

    interface DamageTypes {
        physical: DamageType;
        elemental: DamageType;
        chaos: DamageType;
    }

    interface ConversionValues {
        physical?: Physical;
        elemental?: Elemental;
        chaos?: Chaos;
        multi: number;
    }
    interface ConversionTable {
        physical?: ConversionValues;
        elemental?: ConversionValues;
        chaos?: ConversionValues;
    }

    interface Configuration {
        calcMinMax?: (min: number, max: number) => number;
        flags?: BitFlag;
        conditions?: BitFlag;
        modCache?: ModCache;
    }
    interface BaseDamage {
        min: number;
        max: number;
        value: number;
    }
    interface BaseDamageOutput {
        physical?: BaseDamage;
        elemental?: BaseDamage;
        chaos?: BaseDamage;
    }

    interface AttackOutput {
        totalDamage: number;
        wasHit?: boolean;
        wasCrit?: boolean;
        ailments?: Ailments.Instance[];
    }

    interface StatsInput {
        statModList: StatModList;
        modCache: ModCache;
        conversionTable: ConversionTable;
        calcMinMax?: (min: number, max: number) => number;

    }

    interface StatsOutput {

        dps: number;
        //Physical
        physicalAttackDps: number;
        minPhysicalAttackDamage: number;
        maxPhysicalAttackDamage: number;
        //Bleed
        bleedDps: number;
        bleedChance: number;
        bleedCount: number;
        bleedDuration: number;

        minTotalAttackDamage: number;
        maxTotalAttackDamage: number;

        //General
        hitChance: number;
        attackSpeed: number;
        mana: number;
        manaRegen: number;
        //Crit
        critChance: number;
        critMulti: number;

        //Attributes
        strength: number;
        dexterity: number;
        intelligence: number;

        attackCost: number;
    }
}

interface StatModFlags{
    None: number;
    Attack: number;
    Bleed: number;
}

interface StatFlags {
    dps: number;
    //Physical
    physicalAttackDps: number;
    physicalAttackDamage: number;
    //Bleed
    bleedDps: number;
    bleedChance: number;
    bleedDuration: number;
    bleedCount: number;

    //General
    hitChance: number;
    attackSpeed: number;
    mana: number;
    manaRegen: number;
    //Crit
    critChance: number;
    critMulti: number;

    //Attributes
    strength: number;
    dexterity: number;
    intelligence: number;
}

namespace Ailments {
    interface Instance {
        duration: number;
        time?: number;
        type: string;
        damage?: number;
    }
}

namespace Stats{
    type FormattedText = string;
    interface FormattedTextOutput{
        dps: FormattedText;
        physicalAttackDps: FormattedText;
        physicalAttackDamage: FormattedText;
        attackSpeed: FormattedText;
        hitChance: FormattedText;
        critChance: FormattedText;
        critMulti: FormattedText;
        mana: FormattedText;
        manaRegen: FormattedText;
        bleedDps: FormattedText;
        bleedChance: FormattedText;
        bleedStacks: FormattedText;
        strength: FormattedText;
        dexterity: FormattedText;
        intelligence: FormattedText;
    }
}
