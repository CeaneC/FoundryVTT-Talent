import { registerWithLibWrapper, renderUsePowerDialog, addStrainTab, renameSpellbookHeadings, preDisplayPowerCard, renderRsr5ePower, setupPowerSpecialties } from "./talent.js";

export const KEY = 'ceane-talent';
export const NAME = "Ceane's Talent";
export const CSS_PREFIX = `${KEY}--`;

const SETTING_DEBUG = 'debug';
let debugEnabled = false;
const updateDebug = () => {
    debugEnabled = !!game.settings.get(KEY, SETTING_DEBUG);
};

let renderAbilityUseDialogHookId = Hooks.on("renderAbilityUseDialog", (dialog, html, formData) => {
    renderUsePowerDialog(dialog, html);
});

Hooks.once('init', () => {
    console.log(`${NAME} | Initialising ${KEY}`);
    game.settings.register(KEY, SETTING_DEBUG, {
        name: game.i18n.localize(`${KEY}.debug`),
        hint: game.i18n.localize(`${KEY}.debugHunt`),
        scope: 'client',
        config: true,
        default: false,
        type: Boolean,
        onChange: updateDebug,
    });
    updateDebug();
    setupPowerSpecialties();
});

Hooks.once('ready', () => {
    console.log(`${NAME} | Readying ${KEY}`);
    if (!game.modules.get('lib-wrapper')?.active && game.user.isGM) {
        ui.notifications.error(`Module ${KEY} requires the 'libWrapper' module. Please install and activate it.`);
    } else {
        registerWithLibWrapper();
    }

    const events = Hooks.events.renderAbilityUseDialog
    let index = events.findIndex(h => h.id == renderAbilityUseDialogHookId);
    let renderAbilityUseDialogHook = events.splice(index, 1)[0];
    events.push(renderAbilityUseDialogHook);
})

Hooks.on('setup', () => {
    console.log(`${NAME} | Setting up ${KEY}`);
    setupPowerSpecialties();
});

let lastUpdatedStrainActorId = null;

Hooks.on("renderActorSheet5eCharacter", async (sheet, html, data) => {
    log.debug("renderActorSheet5eCharacter");
    await addStrainTab(sheet, html, data.actor);
    renameSpellbookHeadings(sheet, html, data.actor);

    if (lastUpdatedStrainActorId == data.actor.id) {
        html.find("a.item[data-tab='strain']")[0].click();
    }
})

Hooks.on("updateActor", (actor, data, options, id) => {
    saveActorIdOnStrainTab(actor);
})

Hooks.on("dnd5e.prepareLeveledSlots", (spells, actor, slots) => {
    saveActorIdOnStrainTab(actor);
})

function saveActorIdOnStrainTab(actor) {
    if (actor.sheet._tabs[0]?.active == 'strain') {
        lastUpdatedStrainActorId = actor._id;
    } else {
        lastUpdatedStrainActorId = null;
    }
}

Hooks.on("dnd5e.preDisplayCard", (item, chatData, config) => {
    preDisplayPowerCard(item, chatData);
})

Hooks.on("rsr5e.render", (quickRoll) => {
    renderRsr5ePower(quickRoll);
})

Handlebars.registerHelper('plus', function (a, b) {
    return Number(a) + Number(b);
})

const LOG_PREFIX = `%c${NAME}`
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
