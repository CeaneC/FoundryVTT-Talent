import { KEY as MODULE_NAME, CUSTOM_SHEETS, log, KEY } from './module.js';
import { localise } from './utils.js';

export const STRAIN_TYPES = [
    "body",
    "mind",
    "soul"
];

const STRAIN_FLAG = "strain";

export const addStrainTab = async function(sheet, html, actor) {
    if (actor.classes.talent === undefined) {
        return;
    }

    log.debug("Adding strain tab to character sheet", sheet, html, actor);

    if (actor.flags[MODULE_NAME] === undefined) {
        await seedStrain(actor);
    }

    let strainName = game.settings.get(MODULE_NAME, "strainName.strain");

    let strainTab;
    if (isDefault5eSheet(sheet)) {
        strainTab = $("<a>")
            .addClass("item control")
            .attr("data-tab", "strain")
            .attr("data-tooltip", strainName)
            .attr("aria-label", strainName)
            .append($("<i>")
                .addClass("fas fa-brain"));
    } else {
        strainTab = $("<a>")
            .addClass("item")
            .attr("data-tab", "strain")
            .text(game.settings.get(MODULE_NAME, `strainName.strain`));
    }

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
                header = game.i18n.format(`${KEY}.StrainTable.Header`, { type: game.settings.get(MODULE_NAME, `strainName.${type}`) });
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
        maximum_strain_label: game.settings.get(MODULE_NAME, 'strainName.maximum'),
        total_strain: totalStrain,
        max_strain: maxStrain,
        remaining_strain: remainingStrain,
        resources: resources,
        rows: rows
    };

    let template = `/modules/${MODULE_NAME}/templates/`;

    if (isDefault5eSheet(sheet)) {
        template += "actor-strain.hbs"
    } else if (isTidy5eSheet(sheet)) {
        template += "actor-strain-t5e.hbs";
    } else {
        template += "actor-strain-legacy.hbs";
    }

    let strainBody = await renderTemplate(template, template_data);

    if (isDefault5eSheet(sheet)) {
        html.find("section.sheet-body section.tab-body").append($(strainBody));
        html.find("nav.tabs .item.control[data-tab='spells']").after(strainTab);
    } else {
        html.find("section.sheet-body").append($(strainBody));
        html.find("nav.tabs").append(strainTab);
    }

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

function isDefault5eSheet(sheet) {
    return sheet.constructor.name === CUSTOM_SHEETS.DEFAULT;
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
