import { log } from './module.js';
import { localise, spellLevelToOrder } from './utils.js';

export const renderUsePowerDialog = function(dialog, html) {
    if (dialog.item.system.preparation.mode !== 'talent') {
        if (dialog.item.actor.classes.talent !== undefined) {
            // Remove orders from upcasting options
            html.find(`form div.form-fields select[name="slotLevel"] option`).map((i, e) => {
                const option = $(e)
                if (option.prop("value").startsWith("power")) {
                    return option.remove();
                }
            });
        }

        return;
    }

    log.debug('renderUsePowerDialog', dialog, html);

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
        let newText = $(e).text().replace(spellHint, powerHint);
        return $(e).text(newText);
    })
    html.find(`form div label:contains('${castLevel}')`).map((i, e) => {
        let newText = $(e).text().replace(castLevel, manifestAtOrder);
        return $(e).text(newText);
    });
    // Remove spell slots from the upcasting options
    html.find(`form div.form-fields select[name="slotLevel"] option`).map((i, e) => {
        const option = $(e)
        let value = option.prop("value");
        if (value.startsWith("power")) {
            return option.prop("value", value.replace("power", "spell"));
        } else {
            return option.remove();
        }
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
