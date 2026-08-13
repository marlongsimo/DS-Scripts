import { TroopTransaction, calcTargetInfo, calcUnitPop, coordDistance, getSlowestUnit, isUnitsArrivalFeasible, resolveArrival, savePlan } from "../core/Api"
import { Lang } from "../core/Language"

// Liest aktuell markiertes Ziel + angehakte Startdörfer direkt aus dem DOM
// (wie addAttackConfirm es beim tatsächlichen Zuteilen auch tut) - wird hier
// zusätzlich gebraucht, um beim Öffnen des Popups schon zu wissen, welche
// Vorlagen/Zeitfenster für genau diese Kombination überhaupt erreichbar sind.
function currentModalContext():{target:target,launchers:village[]}{
    let targetID = parseInt(($('input[name="target"]:checked').val() || '').toString());
    let target = window.attackPlan.targetPool.find((t)=>{return t.village.id==targetID}) || null;
    let launcherIds = $('.launch-list').find("input:checked").get().map((el:any)=>{return parseInt($(el).val().toString())});
    let launchers = launcherIds.map((id)=>{return window.attackPlan.launchPool.find((v)=>{return v.id==id})}).filter((v)=>{return !!v});
    return {target, launchers};
}

// "Alle Einheiten" (temp_all) hat keine feste Truppen-Zusammensetzung wie eine
// benannte Vorlage, sondern nimmt die tatsächlichen Truppen des jeweiligen
// Startdorfs - deshalb hier pro Dorf einzeln aufgelöst statt aus einer
// gespeicherten Vorlage gelesen.
function candidateUnitsFor(templateKey:string, launcher:village):units|null{
    if(templateKey=='temp_all') return launcher.unitsContain;
    let template = window.attackPlan.templates.find((t)=>{return t.name==templateKey});
    return template? template.units : null;
}

// Matrix[Vorlage][Zeitfenster] = erreichbar mit ALLEN aktuell angehakten
// Startdörfern (bei nur einem angehakten Dorf - der vom Nutzer beschriebene
// Regelfall - entspricht das schlicht dessen individueller Erreichbarkeit).
function buildFeasibilityMatrix(target:target, launchers:village[]):Record<string,Record<string,boolean>>{
    let candidateKeys = window.attackPlan.templates.map((t)=>{return t.name}).concat(['temp_all']);
    let matrix:Record<string,Record<string,boolean>> = {};
    candidateKeys.forEach((key)=>{
        matrix[key] = {};
        window.attackPlan.arrivals.forEach((arrival)=>{
            matrix[key][arrival] = launchers.length>0 && launchers.every((launcher)=>{
                let units = candidateUnitsFor(key,launcher);
                return !!units && isUnitsArrivalFeasible(units,launcher,target.village,arrival);
            });
        });
    });
    return matrix;
}

function templateOptionLabel(key:string):string{
    return key=='temp_all'? Lang('allUnit') : key;
}

export const addAttackModal = ()=>{
    const {target, launchers} = currentModalContext();
    let matrix:Record<string,Record<string,boolean>> = {};
    let feasibleTemplates:string[] = [];

    if(target && launchers.length>0){
        matrix = buildFeasibilityMatrix(target, launchers);
        feasibleTemplates = Object.keys(matrix).filter((key)=>{return Object.values(matrix[key]).some((v)=>{return v})});
    }
    window.addAttackModal.matrix=matrix;

    let defaultTemplate = feasibleTemplates.includes(window.latestTemplate)? window.latestTemplate : feasibleTemplates[0];
    let feasibleArrivals = defaultTemplate? window.attackPlan.arrivals.filter((a)=>{return matrix[defaultTemplate][a]}) : [];
    let defaultArrival = feasibleArrivals.includes(window.latestArrival)? window.latestArrival : feasibleArrivals[0];

    return /* html */`
    <div class="modal-input-inline">
        <label for="attack">${Lang('attack')}:</label>
        <input type="radio" value="attack" name="planner-operation" checked>
        <label for="reinforce">${Lang('support')}:</label>
        <input type="radio" value="reinforce" name="planner-operation">
    </div>
    ${feasibleTemplates.length==0? /* html */`<div style="color:#a33;margin:5px 0;">${Lang('noFeasibleCombo')}</div>` : ''}
    <div class="modal-input-group">
        <label for="planner-template">${Lang('template')}:</label>
        <select id="planner-template" placeholder="${Lang('notSelected')}" onchange="window.addAttackModal.onTemplateChange()">
            ${feasibleTemplates.map((key)=>{
                return /* html */`<option value="${key}" ${defaultTemplate==key? `selected`:``}>${templateOptionLabel(key)}</option>`
            }).join('')}
        </select>
    </div>
    <div class="modal-input-group">
        <label for="planner-arrival">${Lang('arrival')}:</label>
        <select id="planner-arrival" placeholder="${Lang('notSelected')}" onchange="window.addAttackModal.onArrivalChange()">
            ${feasibleArrivals.map((arrival)=>{
                return /* html */`<option value="${arrival}" ${defaultArrival==arrival? `selected`:``}>${arrival}</option>`
            }).join('')}
        </select>
    </div>
    <div class="modal-input-group">
        <label for="planner-notes">${Lang('note')}:</label>
        <input id="planner-notes" placeholder="${Lang('noNote')}">
    </div>
    <div class="modal-input-inline">
        <button class="btn" onclick="window.addAttackConfirm()">${Lang('add')}</button>
        <button class="btn" onclick="window.closeModal()">${Lang('cancel')}</button>
    </div>
    `
}

// Kein Ping-Pong zwischen den beiden Dropdowns: jeder onchange-Handler
// verändert ausschließlich die Optionen des JEWEILS ANDEREN Felds anhand der
// einmalig beim Öffnen berechneten Matrix - nie sein eigenes. Dadurch bleibt
// das Verhalten in beide Richtungen stabil vorhersagbar (Vorlage wählen ->
// Zeitfenster schränkt sich ein, und umgekehrt), ohne dass sich die
// Filterung gegenseitig aufschaukelt.
window.addAttackModal = {
    matrix:{},
    onTemplateChange:()=>{
        let matrix=window.addAttackModal.matrix;
        let templateKey=$('#planner-template').val().toString();
        let feasibleArrivals=window.attackPlan.arrivals.filter((a)=>{return matrix[templateKey] && matrix[templateKey][a]});
        let current=($('#planner-arrival').val() || '').toString();
        let next=feasibleArrivals.includes(current)? current : feasibleArrivals[0];
        $('#planner-arrival').html(feasibleArrivals.map((a)=>{
            return /* html */`<option value="${a}" ${next==a? `selected`:``}>${a}</option>`
        }).join(''));
    },
    onArrivalChange:()=>{
        let matrix=window.addAttackModal.matrix;
        let arrival=$('#planner-arrival').val().toString();
        let feasibleTemplates=Object.keys(matrix).filter((key)=>{return matrix[key][arrival]});
        let current=($('#planner-template').val() || '').toString();
        let next=feasibleTemplates.includes(current)? current : feasibleTemplates[0];
        $('#planner-template').html(feasibleTemplates.map((key)=>{
            return /* html */`<option value="${key}" ${next==key? `selected`:``}>${templateOptionLabel(key)}</option>`
        }).join(''));
    },
}

window.addAttackConfirm = () => {
    let launchers:village[]=[];
    let targets:target[]=[];

    if($('input[name="target"]:checked').get().length==0){
        window.UI.ErrorMessage(Lang('noTargetSelected'))
        return;
    }

    if($('.launch-list').find("input:checked").get().length==0){
        window.UI.ErrorMessage(Lang('noLauncherSelected'))
        return;
    }

    let targetID:number = parseInt($('input[name="target"]:checked').val().toString());
    let templateName = $('#planner-template').val().toString();
    let operation = $('input[name="planner-operation"]:checked').val().toString();
    let arrival = $('#planner-arrival').val().toString();
    let notes = $('#planner-notes').val().toString();

    window.latestTemplate=templateName;
    window.latestArrival=arrival;

    let indTarget= window.attackPlan.targetPool.findIndex((target)=>{return target.village.id==targetID})
    let indPlan= window.attackPlan.templates.findIndex((template)=>{return template.name==templateName})

    let templateWbType = indPlan>-1? window.attackPlan.templates[indPlan].wbType : null;

    $('.launch-list').find("input:checked").get().forEach((input:any)=>{
        let launcherID = parseInt($(input).val().toString());
        let indLanucher = window.attackPlan.launchPool.findIndex((vill:village)=>{return vill.id==launcherID;})
        let template=null;
        if(indPlan>-1){
            template=window.attackPlan.templates[indPlan].units;
        }
        if(templateName=='temp_all'){
            template=window.attackPlan.launchPool[indLanucher].unitsContain
        }
        let villageId=window.attackPlan.launchPool[indLanucher].id;
        let isDel = window.addLauncher(indTarget,indLanucher,template,operation,arrival,notes,templateWbType)

        if(!isDel){
            launchers.push(window.attackPlan.launchPool[indLanucher]);
        }else{
            $('.launch-list').find(`#${villageId}`).remove();
        }

    })

    targets.push(window.attackPlan.targetPool[indTarget]);

    window.targetPoolQuery.partialRender(targets,"village.id");
    window.launchVillagesQuery.partialRender(launchers,"id");

    $('.planner-modal').hide();

    savePlan()
}

window.addLauncher = (indTarget: number, indLanucher: number,trans:units,operation:string,arrival:string,notes:string,templateWbType:number|null=null) => {

    let newVillage={...window.attackPlan.launchPool[indLanucher]};
        newVillage.unitsContain={spear:0,sword:0,axe:0,archer:0,spy:0,light:0,marcher:0,heavy:0,ram:0,catapult:0,knight:0,snob:0};

        [newVillage.unitsContain,window.attackPlan.launchPool[indLanucher].unitsContain]
        = TroopTransaction(
            newVillage.unitsContain,
            window.attackPlan.launchPool[indLanucher].unitsContain,
            trans
        )

        newVillage.popSize=calcUnitPop(newVillage.unitsContain);
        window.attackPlan.launchPool[indLanucher].popSize=calcUnitPop(window.attackPlan.launchPool[indLanucher].unitsContain);

        if(newVillage.popSize>0){
            const unitSpeed=getSlowestUnit(newVillage.unitsContain,operation=='attack');
            const dist=coordDistance(newVillage,window.attackPlan.targetPool[indTarget].village);
            const travelMs=Math.round(dist*(unitSpeed.value*60))*1000;
            window.attackPlan.targetPool[indTarget].launchers.push({
                arrival:resolveArrival(arrival,travelMs),
                isAttack:operation=='attack',
                notes:notes,
                unitSpeed:unitSpeed,
                village:newVillage,
                templateWbType:templateWbType,
            })
        }

        window.attackPlan.targetPool[indTarget].info=calcTargetInfo(window.attackPlan.targetPool[indTarget].launchers);
        window.attackPlan.targetPool[indTarget].launchers.sort((a,b)=>{return a.arrival>b.arrival? 1:-1})
        if(window.attackPlan.launchPool[indLanucher].popSize==0){
            window.attackPlan.launchPool.splice(indLanucher,1);
            return true;
        }
        return false;
}
