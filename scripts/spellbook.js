import { CUSTOM_SHEETS } from './module.js';
import { getOrderName, localise } from './utils.js';

export function getSpellbook(wrapped, ...args) {
    let nonTalentData = getNonTalentSpells(...args);
    let book = wrapped(...nonTalentData);
    let talentBook = prepareTalentSpellbook(...args);
    book.push(...talentBook);
    return book;
}

/**
 * @param {object} context  Sheet rendering context data being prepared for render.
 * @param {object[]} spells Spells to be included in the spellbook.
 * @returns {object[]}      Spellbook sections in the proper order.
 */
function getNonTalentSpells(context, spells) {
    let noPowers = spells.filter(s => s.system.preparation.mode != 'talent');
    return [context, noPowers];
}

/**
 * @param {object} context  Sheet rendering context data being prepared for render.
 * @param {object[]} spells Spells to be included in the spellbook.
 * @returns {object[]}      Spellbook sections in the proper order.
 */
function prepareTalentSpellbook(context, spells) {
    const levels = context.actor.system.spells;
    const powerbook = {};
    const infinite = "&infin;";

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
            dataset: { type: "spell", level: lvl, "preparation.mode": "talent" },
            prop: sl
        };
    };

    // Talents have power orders from 1 to 6.
    if (levels.talent) {
        const maxOrder = Array.fromRange(7).reduce((max, i) => {
            if (i === 0) return max;
            const level = levels[`spell${i}`];
            if ((level.max || level.override) && (i > max)) max = i;
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
        const sl = `spell${lvl}`;

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

export const renameSpellbookHeadings = function (sheet, html, actor) {
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

        html.find(".tab.spellbook ul.item-list li.item div.spell-comps").hide();
    } else {
        let orderSections = html.find(`.tab.spellbook div.item-name h3:contains("${orderSuffix}")`).parent();
        orderSections.siblings('.spell-school').text(powerSpecialty);
        orderSections.siblings('.spell-action').text(powerUsage);
        orderSections.siblings('.spell-target').text(powerTarget);
    }
};
