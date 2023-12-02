import { KEY as MODULE_NAME, CUSTOM_SHEETS } from './module.js';
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
