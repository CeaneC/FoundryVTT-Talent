import { KEY as MODULE_NAME, log } from './module.js';

const CUSTOM_SHEETS = {
    DEFAULT: "ActorSheet5eCharacter",
    TIDY5E: "Tidy5eSheet"
};

const STRAIN_TYPES = [
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

export const registerWithLibWrapper = function() {
    libWrapper.register(MODULE_NAME, 'game.dnd5e.applications.actor.ActorSheet5eCharacter.prototype._prepareSpellbook', getSpellbook, 'WRAPPER');
    libWrapper.register(MODULE_NAME, 'game.dnd5e.applications.item.AbilityUseDialog._getSpellData', getSpellData, 'MIXED');
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

    const strainTab = $("<a>")
        .addClass("item")
        .attr("data-tab", "strain")
        .text(localise("StrainTab.title"));


    let resources = {};
    let totalStrain = 0;
    let maxStrain = getMaxStrain(actor);

    STRAIN_TYPES.forEach(type => {
        let value = Number(actor.getFlag(MODULE_NAME, `strain.${type}`))
        resources[type] = value;
        totalStrain += value;
    });

    let remainingStrain = Number(maxStrain - totalStrain);

    let rows = [];
    let strainTypes = ['strain'].concat(STRAIN_TYPES);

    for (let i = 0; i < 9; i++) {
        let cells = [];
        for (let j = 0; j < 4; j++) {
            let type = strainTypes[j];
            cells.push({
                type: type,
                enabled: i <= resources[type],
                disabled: i > (resources[type] + remainingStrain)
            });
        }
        rows.push({
            cells: cells,
            i: i,
        });
    }

    const template_data = {
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

    if (actor.flags[MODULE_NAME] === undefined) {
        seedStrain(actor);
    }
}

async function toggleOnClick(event) {
    let field = event.currentTarget.previousElementSibling;
    let currentValue = this.getFlag(MODULE_NAME, field.name);
    let newValue = field.value;

    if (currentValue == newValue) {
        newValue -= 1;
    }
    
    await this.setFlag(MODULE_NAME, field.name, newValue);
}

function isTidy5eSheet(sheet) {
    return sheet.constructor.name === CUSTOM_SHEETS.TIDY5E;
}

function seedStrain(actor) {
    let strainTable = {
        body: 0,
        mind: 0,
        soul: 0
    };

    actor.setFlag(MODULE_NAME, "strain", strainTable);
}

function getMaxStrain(actor) {
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

function getSpellData(wrapped, ...args) {
    let result = getPowerData(...args);
    if (result == null) result = wrapped(...args);
    return result;
}

//#endregion

//#region Spellbook

function getNonTalentSpells(context, spells) {
    let noPowers = spells.filter(s => s.system.preparation.mode != 'talent')
    return [ context, noPowers ];
}

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

function getPowerData(characterData, spellData, item) {
    if (spellData.preparation.mode !== 'talent') {
        return null;
    }

    let title = game.i18n.format("DND5E.AbilityUseHint", {type: localise("Power"), name: item.item.name});


    // If it's a 1st Order power, it can't be upcast
    if (spellData.level === 1) {
        return foundry.utils.mergeObject(item, {
            title: title,
            isSpell: true,
            consumeSpellSlot: false,
            spellLevels: null });
    }

    // Determine which levels are feasible
    const lvl = spellData.level;
    let maxOrder = Math.ceil(characterData.parent.classes.talent.system.levels / 4) + 1;
    const spellLevels = Array.fromRange(maxOrder+1).reduce((arr, i) => {
        if (i < lvl) return arr;
        const label = getOrderName(i);
        arr.push({
            level: i,
            label: label,
            canCast: true,
            hasSlots: true
        });
        return arr;
    }, []);


    // Merge spell casting data
    let result = foundry.utils.mergeObject(item, {
        title: title,
        isSpell: true,
        consumeSpellSlot: true,
        spellLevels
    });
    return result;
}

const spellLevelToOrder = (spellLevelString) => {
    if (spellLevelString == localise("SpellLevel0", "DND5E")) {
        return localise("PowerOrder0");
    }
    let level = spellLevelString.match(/\d/g);
    return getOrderName(level);
}

const getOrderName = (order) => {
    return localise(`PowerOrder${order}`);
}

function localise(key, namespace = MODULE_NAME) {
    return game.i18n.localize(`${namespace}.${key}`);
}
