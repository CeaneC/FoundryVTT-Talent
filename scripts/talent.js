import { KEY as MODULE_NAME, log, CUSTOM_SHEETS } from './module.js';
import { localise, getOrderName } from './utils.js';

const POWER_SPECIALTIES = [
    'Chronopathy',
    'Metamorphosis',
    'Pyrokinesis',
    'Resopathy',
    'Telekinesis',
    'Telepathy'
];

export const registerWithLibWrapper = function() {
    libWrapper.register(MODULE_NAME, 'game.dnd5e.applications.actor.ActorSheet5eCharacter.prototype._prepareSpellbook', getSpellbook, 'WRAPPER');
    libWrapper.register(MODULE_NAME, 'game.dnd5e.applications.item.AbilityUseDialog._createSpellSlotOptions', createSpellSlotOptions, 'WRAPPER');
};

export const setupPowerSpecialties = function() {
    CONFIG.DND5E.spellPreparationModes['talent'] = localise("SpellPrepTalent");
    CONFIG.DND5E.spellUpcastModes.push('talent');

    POWER_SPECIALTIES.forEach(s => {
        CONFIG.DND5E.spellSchools[s] = localise(`PowerSpecialty.${s}`);
    });
}

//#region Wrappers

function getSpellbook(wrapped, ...args) {
    let nonTalentData = getNonTalentSpells(...args);
    let book = wrapped(...nonTalentData);
    let talentBook = prepareTalentSpellbook(...args);
    book.push(...talentBook);
    return book;
}

function createSpellSlotOptions(wrapped, ...args) {
    log.debug("createSpellSlotOptions", ...args);
    let result = createPowerOrderOptions(...args).concat(wrapped(...args));
    log.debug("getPowerData result: ", result);
    return result;
}

//#endregion

//#region Spellbook

/**
 * @param {object} context  Sheet rendering context data being prepared for render.
 * @param {object[]} spells Spells to be included in the spellbook.
 * @returns {object[]}      Spellbook sections in the proper order.
 */
function getNonTalentSpells(context, spells) {
    let noPowers = spells.filter(s => s.system.preparation.mode != 'talent')
    return [ context, noPowers ];
}

/**
 * @param {object} context  Sheet rendering context data being prepared for render.
 * @param {object[]} spells Spells to be included in the spellbook.
 * @returns {object[]}      Spellbook sections in the proper order.
 */
function prepareTalentSpellbook(context, spells) {
    const levels = context.actor.system.spells;
    const powerbook = {}
    const infinite = "&infin;"

    const registerSection = (sl, lvl, label) => {
        powerbook[lvl] = {
            order: lvl,
            label: label,
            usesSlots: false,
            canCreate: true,
            canPrepare: false,
            spells: [],
            uses: infinite,
            slots: infinite,
            override: 0,
            dataset: { type: "spell", level: lvl, "preparation.mode": "talent"},
            prop: sl
        };
    };

    // Talents have power orders from 1 to 6.
    if (levels.talent) {
        const maxOrder = Array.fromRange(7).reduce((max, i) => {
            if ( i === 0 ) return max;
            const level = levels[`spell${i}`];
            if ( (level.max || level.override) && (i > max)) max = i;
            return max;
        }, 0);

        if (maxOrder > 0) {
            for (let lvl = 1; order <= maxOrder; lvl++) {
                const sl = `spell${lvl}`;
                registerSection(sl, lvl, getOrderName(lvl), levels[sl]);
            }
        }
    }

    spells.forEach(spell => {
        const mode = spell.system.preparation.mode || "prepared";
        let lvl = spell.system.level || 0;
        const sl = `spell${lvl}`

        if (mode === 'talent') {
            if (!powerbook[lvl]) {
                const l = levels[mode] || {};
                registerSection(sl, lvl, getOrderName(lvl));
            }
            powerbook[lvl].spells.push(spell);
        }
    });

    const sorted = Object.values(powerbook);
    sorted.sort((a, b) => a.order - b.order);
    return sorted;
}

export const renameSpellbookHeadings = function(sheet, html, actor) {
    const orderSuffix = localise("PowerOrderSuffix");
    const powerSpecialty = localise("PowerSpecialty.Header");
    const powerUsage = localise("PowerUsage");
    const powerTarget = localise("PowerTarget");

    if (sheet.constructor.name == CUSTOM_SHEETS.TIDY5E) {
        const powerRange = localise("PowerRange");
        const headerLabels = html.find(".tab.spellbook li.spellbook-header div.items-header-labels");
        headerLabels.children(".items-header-comps").hide();
        headerLabels.children(".items-header-school").prop("title", powerSpecialty);
        headerLabels.children(".items-header-target").prop("title", powerTarget);
        headerLabels.children(".items-header-range").prop("title", powerRange);
        headerLabels.children(".items-header-usage").prop("title", powerUsage);

        html.find(".tab.spellbook ul.item-list li.item div.spell-comps").hide()
    } else {
        let orderSections = html.find(`.tab.spellbook div.item-name h3:contains("${orderSuffix}")`).parent();
        orderSections.siblings('.spell-school').text(powerSpecialty);
        orderSections.siblings('.spell-action').text(powerUsage);
        orderSections.siblings('.spell-target').text(powerTarget);
    }
}
    

//#endregion

/**
 * 
 * @param {dnd5e.documents.Actor5e} actor   The actor with spell slots.
 * @param {number} order    The minimum order
 * @returns {object[]}      Array of spell slot select options.
 * @private
 */
function createPowerOrderOptions(actor, order) {
    if (actor.classes.talent === undefined || order === 1) {
        return [];
    }

    // Determine which orders are feasible
    let maxOrder = Math.ceil(actor.classes.talent.system.levels / 4) + 1;
    const powerOrders = Array.fromRange(maxOrder+1).reduce((arr, i) => {
        if (i < order) return arr;
        const label = getOrderName(i);
        arr.push({
            key: `power${i}`,
            level: i,
            label: label,
            canCast: true,
            hasSlots: true
        });
        return arr;
    }, []);

    return powerOrders;
}
