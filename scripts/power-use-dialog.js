import { localise, spellLevelToOrder } from './utils.js';
import { log } from "./module.js";

export const renderUsePowerDialog = function(dialog, html, formData) {
    log.debug('renderUsePowerDialog', dialog, html, formData);

    if (dialog.item.system.preparation.mode !== 'talent')
        return;

    const spellHint = game.i18n.format("DND5E.AbilityUseHint", {
        type: game.i18n.localize(CONFIG.Item.typeLabels[dialog.item.type]),
        name: dialog.item.name
    });
    const powerHint = game.i18n.format("DND5E.AbilityUseHint", {
        type: localise("PowerTypeLabel"),
        name: dialog.item.name
    });
    const castLevel = localise("SpellCastUpcast", "DND5E");
    const checkboxRegex = /class="checkbox/g;
    const consumeSlotRegex = /(?<=consumeSpellSlot" )checked/g;
    let manifestAtOrder = localise("PowerManifestIncreaseOrder");
    let castSpell = localise("AbilityUseCast", "DND5E");
    let manifestPower = localise(`AbilityUseManifest`);

    html.find(`form p:contains('${spellHint}')`).map((i, e) => {
        const element = $(e)
        let newText = element.text().replace(spellHint, powerHint);
        return element.text(newText);
    })
    html.find(`form div label:contains('${castLevel}')`).map((i, e) => {
        const element = $(e)
        let newText = element.text().replace(castLevel, manifestAtOrder);
        return element.text(newText);
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

    foundry.utils.mergeObject(dialog, {
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
}
