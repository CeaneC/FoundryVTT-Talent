import { createSpellSlotOptions, renderUsePowerDialog } from "./power-use-dialog.js";
import { preDisplayPowerCard, renderRsr5ePower } from "./chat-card.js";
import { addStrainTab, STRAIN_TYPES } from "./strain-tab.js";
import { getSpellbook, renameSpellbookHeadings } from './spellbook.js';
import { localise } from "./utils.js";

export const KEY = 'ceane-talent';
export const NAME = "Ceane's Talent";
export const CSS_PREFIX = `${KEY}--`;

export const CUSTOM_SHEETS = {
    DEFAULT: "ActorSheet5eCharacter",
    TIDY5E: "Tidy5eSheet"
};

const POWER_SPECIALTIES = [
    'Chronopathy',
    'Metamorphosis',
    'Pyrokinesis',
    'Resopathy',
    'Telekinesis',
    'Telepathy'
];

const SETTING_DEBUG = 'debug';
export let debugEnabled = false;
const updateDebug = () => {
    debugEnabled = !!game.settings.get(KEY, SETTING_DEBUG);
};

let renderAbilityUseDialogHookId = Hooks.on("renderAbilityUseDialog", (dialog, html, formData) => {
    renderUsePowerDialog(dialog, html);
});

Hooks.once('i18nInit', () => {
    console.log(`${NAME} | Initialising ${KEY}`);
    registerSettings();
    updateDebug();
    setupPowerSpecialties();
});

function registerSettings() {
    game.settings.register(KEY, SETTING_DEBUG, {
        name: game.i18n.localize(`${KEY}.Settings.Debug`),
        hint: game.i18n.localize(`${KEY}.Settings.DebugHint`),
        scope: 'client',
        config: true,
        default: false,
        type: Boolean,
        onChange: updateDebug,
    });

    game.settings.register(KEY, 'strainName.strain', {
        name: game.i18n.localize(`${KEY}.Settings.StrainName.strain`),
        hint: game.i18n.localize(`${KEY}.Settings.StrainName.strainHint`),
        scope: 'world',
        config: true,
        type: String,
        default: game.i18n.localize(`${KEY}.Strain`),
    });

    STRAIN_TYPES.forEach(type => {
        game.settings.register(KEY, `strainName.${type}`, {
            name: game.i18n.localize(`${KEY}.Settings.StrainName.${type}`),
            hint: game.i18n.localize(`${KEY}.Settings.StrainName.${type}Hint`),
            scope: 'world',
            config: true,
            type: String,
            default: game.i18n.localize(`${KEY}.StrainLabels.${type}`),
        });
    });

    game.settings.register(KEY, 'strainName.total', {
        name: game.i18n.localize(`${KEY}.Settings.StrainName.total`),
        hint: game.i18n.localize(`${KEY}.Settings.StrainName.totalHint`),
        scope: 'world',
        config: true,
        type: String,
        default: game.i18n.localize(`${KEY}.StrainLabels.total`),
    });


}

const setupPowerSpecialties = function () {
    CONFIG.DND5E.spellPreparationModes['talent'] = localise("SpellPrepTalent");
    CONFIG.DND5E.spellUpcastModes.push('talent');

    POWER_SPECIALTIES.forEach(s => {
        CONFIG.DND5E.spellSchools[s] = localise(`PowerSpecialty.${s}`);
    });
};

Hooks.once('ready', () => {
    console.log(`${NAME} | Readying ${KEY}`);
    if (!game.modules.get('lib-wrapper')?.active && game.user.isGM) {
        ui.notifications.error(`Module ${KEY} requires the 'libWrapper' module. Please install and activate it.`);
    } else {
        libWrapper.register(KEY, 'game.dnd5e.applications.actor.ActorSheet5eCharacter.prototype._prepareSpellbook', getSpellbook, 'WRAPPER');
        libWrapper.register(KEY, 'game.dnd5e.applications.item.AbilityUseDialog._createSpellSlotOptions', createSpellSlotOptions, 'WRAPPER');
    }

    // Run this module's renderAbilityUseDialog hook after any other modules'
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
});

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
