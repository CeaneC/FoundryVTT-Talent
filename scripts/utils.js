import { NAME, debugEnabled } from "./module.js";
import { KEY as MODULE_NAME } from './module.js';
import { LOG_PREFIX } from "./utils.js";

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

const LOG_PREFIX = `%c${NAME}`;

const _log = (logFN, ...args) => {
    logFN.apply(console, [LOG_PREFIX, 'background-color: #4f0104; color: #fff; padding: 0.1em 0.5em;', ...args]);
};

export const log = {
    dir: (label, ...args) => {
        const group = `${NAME} | ${label}`;
        console.group(group);
        console.dir(...args);
        console.groupEnd(group);
    },
    debug: (...args) => {
        debugEnabled && _log(console.debug, ...args);
    },
    info: (...args) => {
        _log(console.info, ...args);
    },
    error: (...args) => {
        _log(console.error, ...args);
    }
};
