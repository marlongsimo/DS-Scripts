import { AssetName, coordDistance, game } from "../core/Api";

export const targetsLauncher = (launcher:launcher,targetId:number):string=>{    
    let size='small';
    if(launcher.village.popSize>1000 && launcher.village.popSize<=5000){
        size='medium';
    }else if(launcher.village.popSize>5000){
        size='large';
    }
    

    let src=`${AssetName}/graphic/command/attack_${size}.png`;

    if(!launcher.isAttack){
        src=`${AssetName}/graphic/command/support.png`;
    }

    let units=Object.keys(launcher.village.unitsContain) as (keyof typeof launcher.village.unitsContain)[]
    let unitText=``;
    for (let i = 0; i < units.length; i++) {
        const key = units[i];
        if(window.gameConfig.game.archer==0 && (key=="archer" || key=="marcher")){
            continue;
        }
        unitText+=/* html */`<div class="${key}-field ${launcher.village.unitsContain[key]==0 ? `hidden` : ``}">${launcher.village.unitsContain[key]}</div>`;
    }

    return /* html */`
    <div class="targetsLauncher-item" id="${launcher.village.id}" onclick="window.targetsLauncher.selectLauncherAttack(event,${targetId},${launcher.village.id})">
        <div class="name-field">
            <span><a target="_blank" href="/game.php?village=${game.village.id}&screen=info_village&id=${launcher.village.id}">${launcher.village.name} (${launcher.village.coord.text}) K${launcher.village.kontinent}</a></span>
            <span style="font-size:9px;color:black">(${launcher.arrival})</span>
        </div>
        <div class="size-field"><img src="${src}"></div>
        ${unitText}
        <div class="del-field"><a onclick="window.targetItem.removeTargetLauncherItem(event,${launcher.village.id.toString()},${targetId})" class="remove-target-btn"></a></div>
    </div>`;
}

// Klick auf einen bereits geplanten Angriff merkt sich dessen Laufzeit +
// exakten (bereits aufgelösten) Ankunftszeitpunkt als "Zeitgleich"-Referenz
// (window.selectedAttackForFilter) und filtert die Startdorf-Liste (rechts,
// über window.launchVillagesSearch in mainWindow.ts) auf Dörfer, die für
// mindestens eine Vorlage eine ECHT kürzere Laufzeit hätten - könnten also
// erst NACH diesem Befehl losgeschickt werden und trotzdem exakt zeitgleich
// mit ihm landen.
window.targetsLauncher = {
    selectLauncherAttack:(e,targetId,launcherId)=>{
        e.stopPropagation();
        let target = window.attackPlan.targetPool.find((t)=>{return t.village.id==targetId});
        if(!target) return;
        let launcher = target.launchers.find((l)=>{return l.village.id==launcherId});
        if(!launcher) return;

        const dist = coordDistance(launcher.village,target.village);
        const travelMs = Math.round(dist*(launcher.unitSpeed.value*60))*1000;

        window.selectedAttackForFilter = {launcherId:launcherId,arrival:launcher.arrival,travelMs:travelMs};
        window.selectedTargetForFilter = target;
        window.launchVillagesSearch();

        $(`#${targetId} .targetsLauncher-item-selected`).removeClass('targetsLauncher-item-selected');
        $(`#${targetId}`).find(`.targetsLauncher-item#${launcherId}`).addClass('targetsLauncher-item-selected');
    }
}
