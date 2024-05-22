import { renderUsePowerDialog } from "./power-use-dialog.js";
import { preDisplayPowerCard, renderRsr5ePower } from "./chat-card.js";
import { addStrainTab, STRAIN_TYPES } from "./strain-tab.js";
import { getSpellbook, renameSpellbookHeadings } from './spellbook.js';
import { localise } from "./utils.js";

export const KEY = 'ceane-talent';
export const NAME = "Ceane's Talent";
export const CSS_PREFIX = `${KEY}--`;

export const CUSTOM_SHEETS = {
    LEGACY: "ActorSheet5eCharacter",
    DEFAULT: "ActorSheet5eCharacter2",
    TIDY5E: "Tidy5eSheet"
};

const POWER_SPECIALTIES = {
    'chr': {
        fullKey: "chronopathy",
        icon: `modules/${KEY}/icons/duration.svg`,
        label: 'Chronopathy'
    },
    'met': {
        fullKey: "metamorphosis",
        icon: `modules/${KEY}/icons/body-swapping.svg`,
        label: 'Metamorphosis'
    },
    'pyr': {
        fullKey: "pyrokinesis",
        icon: `modules/${KEY}/icons/flamer.svg`,
        label: 'Pyrokinesis'
    },
    'res': {
        fullKey: "resopathy",
        icon: `modules/${KEY}/icons/moebius-trefoil.svg`,
        label: 'Resopathy'
    },
    'tlk': {
        fullKey: "telekinesis",
        icon: `modules/${KEY}/icons/juggler.svg`,
        label: 'Telekinesis'
    },
    'tlp': {
        fullKey: "telepathy",
        icon: `modules/${KEY}/icons/psychic-waves.svg`,
        label: 'Telepathy'
    }
};

const SETTING_DEBUG = 'debug';
export let debugEnabled = false;
const updateDebug = () => {
    debugEnabled = !!game.settings.get(KEY, SETTING_DEBUG);
};

let renderAbilityUseDialogHookId = Hooks.on("renderAbilityUseDialog", (dialog, html, formData) => {
    renderUsePowerDialog(dialog, html, formData);
});

Hooks.once('init', () => {
    console.log(`${NAME} | Initialising ${KEY}`);
    CONFIG.DND5E.featureTypes.class.subtypes['psionicExertion'] = `${KEY}.PsionicExertion`;
});

Hooks.once('i18nInit', () => {
    console.log(`${NAME} | Initialising Internationalisation ${KEY}`);
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

    game.settings.register(KEY, 'strainName.maximum', {
        name: game.i18n.localize(`${KEY}.Settings.StrainName.maximum`),
        hint: game.i18n.localize(`${KEY}.Settings.StrainName.maximumHint`),
        scope: 'world',
        config: true,
        type: String,
        default: game.i18n.localize(`${KEY}.StrainLabels.maximum`),
    });
}

const setupPowerSpecialties = function () {
    // Add a spellcasting type for each power order. Need a blank string to create the computeTalentProgression and prepareTalentSlots hooks.
    ["", 2, 3, 4, 5, 6].forEach(l => {
        let key = `talent${l}`;
        CONFIG.DND5E.spellcastingTypes[key] = { label: localise("SpellPrepTalent") };
    });
    CONFIG.DND5E.spellProgression.talent = localise("Talent");
    CONFIG.DND5E.spellPreparationModes.talent = {
        label: localise("SpellPrepTalent"),
        upcast: true,
        cantrips: true
    };
    CONFIG.DND5E.talentCastingProgression = {
        1: [
            { slots: 1, level: 2 }
        ],
        5: [
            { slots: 1, level: 2 },
            { slots: 1, level: 3 }
        ],
        9: [
            { slots: 1, level: 2 },
            { slots: 1, level: 3 },
            { slots: 1, level: 4 }
        ],
        13: [
            { slots: 1, level: 2 },
            { slots: 1, level: 3 },
            { slots: 1, level: 4 },
            { slots: 1, level: 5 }
        ],
        17: [
            { slots: 1, level: 2 },
            { slots: 1, level: 3 },
            { slots: 1, level: 4 },
            { slots: 1, level: 5 },
            { slots: 1, level: 6 }
        ]
    };

    for (const [key, value] of Object.entries(POWER_SPECIALTIES)) {
        console.log("Power specialty", key, value);
        CONFIG.DND5E.spellSchools[key] = value;
    }
};

Hooks.on('dnd5e.computeTalentProgression', (progression, actor, cls, spellcasting, count) => {
    progression.talent ??= 0;
    progression.talent += cls.system.levels;
});


Hooks.on('dnd5e.buildTalentSpellcastingTable', (table, item, spellcasting) => {
    table.headers ??= [""];
    table.cols ??= [ { class: 'spellcasting', span: 0 } ]
});

Hooks.on('dnd5e.prepareTalentSlots', (spells, actor, progression) => {
    let talentLevel = Math.clamped(progression.talent, 0, CONFIG.DND5E.maxLevel);

    if (talentLevel === 0 && actor.type === 'npc')
        talentLevel = actor.system.details.spellLevel;

    const [, talentConfig] = Object.entries(CONFIG.DND5E.talentCastingProgression).reverse().find(([l]) => Number(l) <= talentLevel) ?? [];

    if (talentConfig) {
        talentConfig.forEach(power => {
            let key = `talent${power.level}`
            spells[key] ??= {};
            spells[key].level = power.level;
            spells[key].max = power.slots;
            spells[key].value = 1;
        });
    }

    log.debug("dnd5e.prepareTalentSlots completed. New spells:", spells);
});

Hooks.once('ready', () => {
    console.log(`${NAME} | Readying ${KEY}`);
    if (!game.modules.get('lib-wrapper')?.active && game.user.isGM) {
        ui.notifications.error(`Module ${KEY} requires the 'libWrapper' module. Please install and activate it.`);
    } else {
        libWrapper.register(KEY, 'game.dnd5e.applications.actor.ActorSheet5eCharacter.prototype._prepareSpellbook', getSpellbook, 'WRAPPER');
    }

    // Run this module's renderAbilityUseDialog hook after any other modules'
    const events = Hooks.events.renderAbilityUseDialog
    let index = events.findIndex(h => h.id == renderAbilityUseDialogHookId);
    let renderAbilityUseDialogHook = events.splice(index, 1)[0];
    events.push(renderAbilityUseDialogHook);
});

let setupComplete = false;

Hooks.on('setup', () => {
    console.log(`${NAME} | Setting up ${KEY}`);
    setupPowerSpecialties();
    setupComplete = true;
});

let lastUpdatedStrainActorId = null;

Hooks.on("renderActorSheet5eCharacter", async (sheet, html, data) => {
    log.debug("renderActorSheet5eCharacter. sheet:", sheet, "html:", html, "data:", data);
    await addStrainTab(sheet, html, data.actor);
    renameSpellbookHeadings(sheet, html, data.actor);

    if (lastUpdatedStrainActorId == data.actor.id) {
        log.debug("last updated strain actor is this actor. sheet:", sheet, "html:", html, "data:", data)
        
        if (sheet.constructor.name === CUSTOM_SHEETS.DEFAULT && html.is("form") && !html.is("form.tab-strain")) {
            // Edit mode was toggled, so don't change the tab unless they were already on the strain tab
            // When toggling edit mode, the html variable focuses the current form, rather than the whole sheet
            return;
        }

        const strainTab = sheet.element.find("a.item[data-tab='strain']")
        if (strainTab.length > 0) {
            strainTab[0].click();
        }

        sheet.element.find("section.sheet-body .tab.active").removeClass("active");
        sheet.element.find("section.sheet-body .tab.strain").addClass("active");
    }
})

Hooks.on("updateActor", (actor, data, options, id) => {
    saveActorIdOnStrainTab(actor);
})

Hooks.on("dnd5e.prepareLeveledSlots", (spells, actor, slots) => {
    if (!setupComplete) return;
    saveActorIdOnStrainTab(actor);
})

function saveActorIdOnStrainTab(actor) {
    if (!actor) return;

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
