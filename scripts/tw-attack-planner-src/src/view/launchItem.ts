import { AssetName, calcUnitPop, game } from "../core/Api";

export const launchItem = (village:village):string=>{   

    village.popSize=calcUnitPop(village.unitsContain)

    let size='small';
    if(village.popSize>1000 && village.popSize<=5000){
        size='medium';
    }else if(village.popSize>5000){
        size='large';
    }

    let units=Object.keys(village.unitsContain) as (keyof typeof village.unitsContain)[]

    let isSelected = window.selectedLauncherForFilter!=null && window.selectedLauncherForFilter.id==village.id;

    return /* html */`
        <div class="launch-item ${isSelected? 'launch-item-selected':''}" id="${village.id}" onclick="window.launchItem.selectLaunchItem(event,${village.id})">
            <div class="name-field">
                <a href="/game.php?village=${game.village.id}&screen=info_village&id=${village.id}" target="_blank">${village.name} (${village.coord.text}) K${village.kontinent}</a>
            </div>
            <div class="check-field">
                <input type="checkbox" value="${village.id}"><img src="${AssetName}/graphic/command/attack_${size}.png">
            </div>
            ${units.map((key: keyof units)=>{
                if(window.gameConfig.game.archer==0 && (key=="archer" || key=="marcher")){
                    return;
                }
                return /* html */`<div class="${key}-field ${village.unitsContain[key]==0 ? `hidden` : ``}">${village.unitsContain[key]}</div>`
            }).join('')}
        </div>`

}

// Spiegelbild von targetItem.selectTargetItem: Klick auf ein Startdorf
// merkt sich dieses als Referenz (window.selectedLauncherForFilter) und
// filtert die Zielliste (links) auf window.targetVillagesSearch() auf
// Ziele, die dieses eine Startdorf mit mind. einer Vorlage (inkl. "Alle
// Einheiten") in mind. einem Zeitfenster noch rechtzeitig erreichen könnte.
//
// Die Markierung wird bewusst per direktem Klassen-Toggle statt per
// partialRender() gesetzt: ein partialRender ersetzt die komplette Zeile
// (inkl. der Checkbox zum Ankreuzen fürs spätere Zuteilen per Pfeil) durch
// eine frisch gerenderte, wieder unmarkierte Checkbox - da die Checkbox
// selbst Teil der anklickbaren Zeile ist, würde jeder Klick auf sie ihr
// eigenes Ankreuzen sofort wieder rückgängig machen.
window.launchItem = {
    selectLaunchItem:(e,id)=>{
        let selected = window.attackPlan.launchPool.find((v)=>{return v.id==id}) || null;
        window.selectedLauncherForFilter = selected;

        $('.launch-list .launch-item-selected').removeClass('launch-item-selected');
        if(selected) $('.launch-list').find(`#${id}`).addClass('launch-item-selected');

        window.targetVillagesSearch();
        e.stopPropagation();
    }
}