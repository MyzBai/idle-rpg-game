interface ItemsModule{
    maxMods: number;
    items: {
        name: string;
        levelReq: number;
    }[];
    crafting: {
        basic: CraftingBasic;
    }[];
    modTables: ModTable[];
}

export interface ModTable{
    id: string;
    mods: ItemModifier[];
}

export interface ItemModifierTable{
    id: string;
    mods: ItemsModule[];
}

interface ItemModifier{
    id?: string;
    desc?: string;
    levelReq?: number;
    weight?: number;
    tableIndex?: number;
    stats: {min: number, max: number}[];
}

interface Crafting{
    basic?: BasicCrafting;
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
            cost: number;
        },
        remove: {
            cost: number;
        }
    }
}

interface CraftingTierTargets{
    random: {cost: number};
    lucky: {cost: number};
    maxTier: {cost: number};
}