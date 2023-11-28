import { log } from "./module.js";
import { spellLevelToOrder } from "./utils.js";

export const preDisplayPowerCard = function(item, chatData) {
    if (item.system.preparation.mode !== 'talent') {
        return;
    }

    log.debug("preDisplayPowerCard. item: ", item, "chatData: ", chatData)

    let spellLevel = item.labels.level;
    let powerOrder = spellLevelToOrder(item.labels.level);
    let newContent = chatData.content.replace(spellLevel, powerOrder);
    foundry.utils.mergeObject(chatData, {
        content: newContent
    });
}

export const renderRsr5ePower = function(quickRoll) {
    let item = quickRoll.item;

    if (item.system.preparation.mode !== 'talent') {
        return;
    }

    log.debug("renderRsr5ePower", quickRoll);

    let spellLevel = item.labels.level;
    let powerOrder = spellLevelToOrder(item.labels.level);    

    for (let i = 0; i < quickRoll.templates.length; i++) {
        let newTemplate = quickRoll.templates[i].replace(spellLevel, powerOrder);
        quickRoll.templates[i] = newTemplate;
    }
}
