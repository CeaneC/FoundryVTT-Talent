import { KEY as MODULE_NAME } from "./module.js";

export const spellLevelToOrder = (spellLevelString) => {
    if (spellLevelString == localise("SpellLevel0", "DND5E")) {
        return localise("PowerOrder0");
    }
    let level = spellLevelString.match(/\d/g);
    return getOrderName(level);
}

export const getOrderName = (order) => {
    return localise(`PowerOrder${order}`);
}

export const localise = (key, namespace = MODULE_NAME) => {
    return game.i18n.localize(`${namespace}.${key}`);
};


