import { KEY as MODULE_NAME, log } from './module.js';

const CUSTOM_SHEETS = {
    DEFAULT: "ActorSheet5eCharacter",
    TIDY5E: "Tidy5eSheet"
};

export const STRAIN_TYPES = [
    "body",
    "mind",
    "soul"
];

const POWER_SPECIALTIES = [
    'Chronopathy',
    'Metamorphosis',
    'Pyrokinesis',
    'Resopathy',
    'Telekinesis',
    'Telepathy'
];

const STRAIN_FLAG = "strain";

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

//#region Use Power dialog popup

export const renderUsePowerDialog = function(dialog, html) {
    //log.debug('renderUsePowerDialog', dialog, html);

    if (dialog.item.system.preparation.mode !== 'talent') {
        return dialog;
    }

    let castLevel = localise(".SpellCastUpcast", "DND5E");
    const checkboxRegex = /class="checkbox/g;
    const consumeSlotRegex = /(?<=consumeSpellSlot" )checked/g;
    let manifestAtOrder = localise("PowerManifestIncreaseOrder");
    let castSpell = localise("AbilityUseCast", "DND5E");
    let manifestPower = localise(`AbilityUseManifest`);

    html.find(`form div label:contains('${castLevel}')`).map((i, e) => {
        let newText = $(e).text().replace(castLevel, manifestAtOrder);
        return $(e).text(newText);
    });

    // Tidy5e Sheet: Remove icons for available spell slots
    html.find("form div span.available-slots").hide();

    html.find("form div label.checkbox input[name='consumeSpellSlot']").removeAttr("checked").parent().hide();
    let useButton = html.find("div button.dialog-button.use");
    useButton.children("i").removeClass("fa-magic").addClass("fa-brain");
    let manifestPowerText = useButton.html().replace(castSpell, manifestPower);
    useButton.html(manifestPowerText);

    let newContent = dialog.data.content.replace(castLevel, manifestAtOrder).replace(checkboxRegex, "$& hidden").replace(consumeSlotRegex, '');

    let orderLabel = spellLevelToOrder(dialog.item.labels.level);

    let newObject = foundry.utils.mergeObject(dialog, {
        data: {
            buttons: {
                use: {
                    icon: '<i class="fas fa-brain"></i>',
                    label: manifestPower
                }
            },
            content: newContent
        },
        item: {
            labels: {
                level: orderLabel
            }
        }
    });

    return newObject;
}

export const preDisplayPowerCard = function(item, chatData) {
    if (item.system.preparation.mode !== 'talent') {
        return;
    }

    let spellLevel = item.labels.level;
    let powerOrder = spellLevelToOrder(item.labels.level);
    let newContent = chatData.content.replace(spellLevel, powerOrder);
    foundry.utils.mergeObject(chatData, {
        content: newContent
    });
}

export const renderRsr5ePower = function(quickRoll) {
    let item = quickRoll.item;

    log.debug("renderRsr5ePower", quickRoll);

    if (item.system.preparation.mode !== 'talent') {
        return;
    }

    let spellLevel = item.labels.level;
    let powerOrder = spellLevelToOrder(item.labels.level);    

    for (let i = 0; i < quickRoll.templates.length; i++) {
        let newTemplate = quickRoll.templates[i].replace(spellLevel, powerOrder);
        quickRoll.templates[i] = newTemplate;
    }
}

export const renderPowerChatMessage = function(html) {
    let levelFooter = html.find("footer.card-footer span:contains(' Level')")
    levelFooter.text(spellLevelToOrder(levelFooter.text()))
}

//#endregion

//#region Strain Tab

export const addStrainTab = async function(sheet, html, actor) {
    if (actor.classes.talent === undefined) {
        return;
    }

    if (actor.flags[MODULE_NAME] === undefined) {
        await seedStrain(actor);
    }

    const strainTab = $("<a>")
        .addClass("item")
        .attr("data-tab", "strain")
        .text(game.settings.get(MODULE_NAME, `strainName.strain`));

    let resources = {};
    let totalStrain = 0;
    let maxStrain = getMaxStrain(actor);

    STRAIN_TYPES.forEach(type => {
        let value = Number(actor.getFlag(MODULE_NAME, `${STRAIN_FLAG}.${type}`));
        let label = game.settings.get(MODULE_NAME, `strainName.${type}`);
        resources[type] = {
            type: type,
            value: value,
            label: label
        };
        totalStrain += value;
    });

    let remainingStrain = Number(maxStrain - totalStrain);

    let rows = [];
    let strainTypes = ['strain'].concat(STRAIN_TYPES);

    for (let i = 0; i < 9; i++) {
        let cells = [];
        for (let j = 0; j < 4; j++) {
            let type = strainTypes[j];
            let header;

            if (j === 0) {
                header = game.settings.get(MODULE_NAME, `strainName.${type}`);
            } else {
                header = `${game.settings.get(MODULE_NAME, `strainName.${type}`)} ${localise("StrainTable.HeaderSuffix")}`;
            }

            cells.push({
                type: type,
                header: header,
                label: localise(`StrainTable.${type}.${i}`),
                enabled: i <= resources[type]?.value,
                disabled: i > (resources[type]?.value + remainingStrain)
            });
        }
        rows.push({
            cells: cells,
            i: i,
        });
    }

    const template_data = {
        total_strain_label: game.settings.get(MODULE_NAME, 'strainName.total'),
        total_strain: totalStrain,
        max_strain: maxStrain,
        remaining_strain: remainingStrain,
        resources: resources,
        rows: rows
    };

    let template = `/modules/${MODULE_NAME}/templates/`;

    if (isTidy5eSheet(sheet)) {
        template += "actor-strain-t5e.hbs";
    } else {
        template += "actor-strain.hbs";
    }

    let strainBody = await renderTemplate(template, template_data);

    html.find("nav.tabs").append(strainTab);
    html.find("section.sheet-body").append($(strainBody));
    // html.find(".tab.spellbook").append($(strainInnerBody));
    html.find("a.strain-toggle:not(.disabled)").click(toggleOnClick.bind(actor))
}

async function toggleOnClick(event) {
    const field = event.currentTarget.previousElementSibling;
    const strain = this.getFlag(MODULE_NAME, STRAIN_FLAG);
    const currentValue = strain[field.name];
    let newValue = Number(field.value);

    if (currentValue == newValue) {
        newValue -= 1;
    }

    strain[field.name] = newValue;

    let totalStrain = 0;

    STRAIN_TYPES.forEach(type => {
        totalStrain += strain[type]
    });

    let newStrain = {
        [field.name]: newValue,
        total: totalStrain,
        max: calculateMaxStrain(this)
    };
    
    await this.setFlag(MODULE_NAME, STRAIN_FLAG, newStrain);
}

function isTidy5eSheet(sheet) {
    return sheet.constructor.name === CUSTOM_SHEETS.TIDY5E;
}

async function seedStrain(actor) {
    let strainTable = {
        body: 0,
        mind: 0,
        soul: 0,
        total: 0,
        max: calculateMaxStrain(actor)
    };

    await actor.setFlag(MODULE_NAME, STRAIN_FLAG, strainTable);
}

function getMaxStrain(actor) {
    let maxStrain = actor.getFlag(MODULE_NAME, `${STRAIN_FLAG}.max`);

    if (maxStrain === undefined)
        return calculateMaxStrain(actor);
    else
        return maxStrain;
}

function calculateMaxStrain(actor) {
    return actor.classes.talent.system.levels + 4;
}

//#endregion

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
