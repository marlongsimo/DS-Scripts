import { AssetName, TroopTransaction, calcUnitPop, coordDistance, game, getSlowestUnit, hasAvailableTroops, isArrivalFeasible, savePlan } from "../core/Api";
import { Lang } from "../core/Language";

// Laufzeit in ms für die (fixe) Einheiten-Zusammensetzung einer Vorlage -
// dieselbe für jedes Dorf in einer Zuteilungs-Spalte, da addLauncher immer
// exakt assignType.template.units überträgt. Wird gebraucht, um pro
// (Angreifer, Ziel)-Paar zu prüfen, ob der gewählte Ankunftszeitpunkt ab dem
// planweiten Abschickzeitpunkt (Api.ts: sendTimeFloorMs/isArrivalFeasible)
// überhaupt noch erreichbar ist.
function templateTravelMs(assignType:assignType, launcher:village, target:village):number{
    const speed = getSlowestUnit(assignType.template.units, true).value;
    const dist = coordDistance(launcher, target);
    return Math.round(dist*(speed*60))*1000;
}

// Optionale globale Kapazitäts-Limits (siehe Toggles im Modal): begrenzen,
// wie oft ein einzelnes physisches Startdorf insgesamt bzw. gegenüber
// demselben Ziel als Angreifer verwendet werden darf - gelten spaltenübergreifend
// für alle Zuteilungs-Spalten sowie die Maximum-Coverage-Matching-Vorstufe und
// alle vier Algorithmen gemeinsam. Werden vor jedem Lauf mit den schon im Plan
// vorhandenen Angriffen vorbelegt (egal woher diese stammen), damit das Limit
// den tatsächlichen Gesamteinsatz jedes Dorfs widerspiegelt.
let maxIncsPerPair:number|null = null;
let maxIncsPerLauncher:number|null = null;
let usagePerLauncher:Record<number,number> = {};
let usagePerPair:Record<number,Record<number,number>> = {};

function resetCapTracking(perPair:number|null, perLauncher:number|null){
    maxIncsPerPair = perPair;
    maxIncsPerLauncher = perLauncher;
    usagePerLauncher = {};
    usagePerPair = {};
    window.attackPlan.targetPool.forEach((target)=>{
        target.launchers.forEach((launcher)=>{
            const lid = launcher.village.id;
            usagePerLauncher[lid] = (usagePerLauncher[lid]||0)+1;
            if(!usagePerPair[lid]) usagePerPair[lid] = {};
            usagePerPair[lid][target.village.id] = (usagePerPair[lid][target.village.id]||0)+1;
        });
    });
}

function canUseLauncher(launcherId:number, targetId:number):boolean{
    if(maxIncsPerLauncher!=null && (usagePerLauncher[launcherId]||0)>=maxIncsPerLauncher) return false;
    if(maxIncsPerPair!=null){
        const pairCnt = (usagePerPair[launcherId] && usagePerPair[launcherId][targetId]) || 0;
        if(pairCnt>=maxIncsPerPair) return false;
    }
    return true;
}

function recordUsage(launcherId:number, targetId:number){
    usagePerLauncher[launcherId] = (usagePerLauncher[launcherId]||0)+1;
    if(!usagePerPair[launcherId]) usagePerPair[launcherId] = {};
    usagePerPair[launcherId][targetId] = (usagePerPair[launcherId][targetId]||0)+1;
}

export const autoAssignModal = ()=>{
    let templates='';

    window.attackPlan.templates.forEach((template)=>{
        templates+=/* html */`
            <option value='${template.name}'>${template.name}</option>
        `;
    });

    

    return /* html */`
    <style>
        .assigner-row {  display: grid;
            display: grid;
            grid-template-columns: 200px repeat(auto-fill, 80px) 10px;
        }

        .assigner-row input{
            width:30px;
        }

        .item{
            padding:5px;
        }

        .add-assignment{
            width: 130px;
        }

        .add-assignment input{
            width: 50px;
        }

        .assigner-target-villages{
            width:1100px;
            max-height:250px;
            overflow-y:auto;
            border: solid 1px #6c4824;
            border-radius: 5px;
            background-color:#fff5dc;
        }

        .assigner-target-villages .item{
            border: solid 1px #6c4824;
        }

        .assigner-counter .item{
            border: solid 1px #6c4824;
        }

        .assigner-counter .item:first-of-type{
            border: none !important;
        }

        .assigner-counter .item:last-of-type{
            border: none !important;
        }


        .assigner-target-btn{
            display:block;
            width: 20px;
            height: 20px;
            background: url(${AssetName}/graphic/login_close.png) top left no-repeat;
            cursor: pointer;
            background-size: 20px;
            margin-right: 10px;
        }

        .assigner-date div{
            transform: rotate(290deg) translateX(20px);
            text-wrap: nowrap;
        }

        .assignment-alg{
            margin:15px 0;
            display: flex;
            justify-content: center;
        }

        .add-assignment-input{
            margin-bottom:5px;
            display:grid;
        }
    </style>
    
    <div class="assigner">
        <div class="add-assignment">
            <div class="add-assignment-input">
                <label>${Lang('date')}:</label>
                <select id="assignmentArrival">
                ${window.attackPlan.arrivals.map((arrival)=>{
                    return /* html */`<option value='${arrival}'>${arrival}</option>`
                }).join('')}
                </select>
            </div>
            <div class="add-assignment-input">
                <label>${Lang('template')}:</label>
                <select id="assignmentTemplates">
                    ${templates}
                </select>
            </div>
            <div class="add-assignment-input">
                <label>${Lang('qntt')}:</label>
                <input min="1" value="1" id="assigner-number-filter" type="number" disabled>
                <input id="assigner-max-filter" onclick="$('#assigner-number-filter').prop('disabled', (i, v) => !v);" type="checkbox" checked>
            </div>
            ${window.attackPlan.launchGroups && window.attackPlan.launchGroups.length>0? /* html */`
            <div class="add-assignment-input">
                <label>${Lang('onlyFromGroup')}:</label>
                <select id="assigner-launch-group-select" disabled>
                    ${window.attackPlan.launchGroups.map((group)=>{
                        return /* html */`<option value="${group.name}">${group.name}</option>`
                    }).join('')}
                </select>
                <input id="assigner-launch-group-toggle" onclick="$('#assigner-launch-group-select').prop('disabled', (i, v) => !v);" type="checkbox">
            </div>
            ` : ''}
            <button class="btn" onclick="autoAssign.addAssignment()">+ ${Lang('add')}</button>
        </div>
        <div class="add-assignment-input">
            <label>${Lang('targetGroups')}:</label>
            <select id="assigner-group-filter" onchange="autoAssign.filterTargetsByGroup()">
                <option value="">${Lang('allGroups')}</option>
                ${window.attackPlan.targetGroups.map((group)=>{
                    return /* html */`<option value="${group.name}">${group.name}</option>`
                }).join('')}
            </select>
        </div>
        <div class="assigner-header">
            <div class="assigner-row assigner-date">
                    <div class="item"></div>
                    <div class="item checkbox"></div>
            </div>
            <div class="assigner-row assigner-remover">
                    <div class="item"></div>
                    <div class="item checkbox"></div>
            </div>
            <div class="assigner-row assigner-loader">
                    <div class="item"></div>
                    <div class="item checkbox"></div>
            </div>
            <div class="assigner-row assigner-name">
                <div class="item">${Lang('village')} (${window.attackPlan.targetPool.length})</div>
                <div class="item checkbox">
                    <input id="assigner-main-checkbox" onclick="autoAssign.checkAll()" type="checkbox">
                </div>
            </div>  
        </div>
        <div class="assigner-target-villages">
            ${window.attackPlan.targetPool.map((target:target)=>{
            return /* html */`
                <div class="assigner-row ${target.colorTag? `target-tag-${target.colorTag}`:''}" id="assigner-row-${target.village.id}">
                    <div class="item"><a target="_blank" href="/game.php?village=${game.village.id}&screen=info_village&id=${target.village.id}">${target.village.name}(${target.village.coord.text}) K${target.village.kontinent}</a></div>
                    <div class="item checkbox">
                        <input class="assigner-target-check" value="${target.village.id}" type="checkbox">
                    </div>
                </div>
            `
        }).join('')}
        </div>
        <div class="assigner-row assigner-counter">
            <div class="item"></div>
            <div class="item checkbox"></div>
        </div>
        <div class="add-assignment-input">
            <label>${Lang('maxIncsPerPair')}:</label>
            <input min="1" value="1" id="assigner-max-incs-per-pair" type="number" disabled>
            <input id="assigner-max-incs-per-pair-toggle" onclick="$('#assigner-max-incs-per-pair').prop('disabled', (i, v) => !v);" type="checkbox">
        </div>
        <div class="add-assignment-input">
            <label>${Lang('maxIncsPerLauncher')}:</label>
            <input min="1" value="1" id="assigner-max-incs-per-launcher" type="number" disabled>
            <input id="assigner-max-incs-per-launcher-toggle" onclick="$('#assigner-max-incs-per-launcher').prop('disabled', (i, v) => !v);" type="checkbox">
        </div>
        <div class="assignment-alg">
            <input id="evenDistributeClosest" value="1" type="radio" name="assignmentAlg"><label for="evenDistributeClosest">${Lang('even')}</label>
            <input id="oneByOneQ" value="2" type="radio" name="assignmentAlg"><label for="oneByOneQ">${Lang('oneByOne')}</label>
            <input id="oneByOneClosest" value="3"  type="radio" name="assignmentAlg"><label for="oneByOneClosest">${Lang('oneByOneClosest')}</label>
            <input id="closestToTarget" value="4" type="radio" name="assignmentAlg"><label for="closestToTarget">${Lang('closestToTarget')}</label>
        </div>
        <div>
            <button style="margin: 0 auto; display: block;" onclick="autoAssign.startAssignment()" class="btn">${Lang('startAssignment')}</button>
        </div>
        
    </div>
    <div id="dialog-loading" style="display: none;justify-content: center;width: 100%;">
        <img style="height:25px" src="${AssetName}/graphic/loading.gif"><span style="padding:5px">${Lang('assigningAttacks')}...</span>
    </div>
    `
}

window.autoAssign = {
    assignTypes:[],
    launchPoolCopy:[],
    removeAssignment:(id) =>{
        let ind = window.autoAssign.assignTypes.findIndex((type)=>{return type.id==id.toString()})
        if(ind==-1){
            return
        }
        window.autoAssign.assignTypes[ind].filtered.forEach((village:village)=>{
            let lpcInd=window.autoAssign.launchPoolCopy.findIndex((vil:village)=>{return vil.id==village.id})
            if (lpcInd==-1){
                window.autoAssign.launchPoolCopy.push(village);
            }else{
                if(window.autoAssign.assignTypes[ind].template.units.snob>0){
                    if(window.autoAssign.assignTypes[ind].template.units.marcher<0){
                        village.unitsContain.marcher-=window.autoAssign.assignTypes[ind].template.units.marcher;
                    }
                    if(window.autoAssign.assignTypes[ind].template.units.light<0){
                        village.unitsContain.light-=window.autoAssign.assignTypes[ind].template.units.light;
                    }
                    if(window.autoAssign.assignTypes[ind].template.units.axe<0){
                        village.unitsContain.axe-=window.autoAssign.assignTypes[ind].template.units.axe;
                    }
                }
                [window.autoAssign.launchPoolCopy[lpcInd].unitsContain,village.unitsContain]  
                = TroopTransaction(
                    window.autoAssign.launchPoolCopy[lpcInd].unitsContain,
                    village.unitsContain,
                    village.unitsContain
                )
            }

        });
        window.autoAssign.assignTypes.splice(ind,1);
        $('.ar-'+id).remove();

    },
    fillAssignment:(id) =>{
        $(`.assigner-target-villages .assigner-target-check`).get().forEach((elem)=>{
            
            if(!$(elem).is(':checked')){
                return
            }
            let val= $(`.assigner-loader .ar-${id}`).find('.ass-inp').val();
            $(elem).parent().parent().find(`.ar-${id} .ass-inp`).val(val);
        })
        window.autoAssign.updateCount(id);
    },
    addAssignment:() =>{
        if(window.autoAssign.assignTypes.length>=10){
            return;
        }
        let arrival= $('#assignmentArrival').val().toString();
        let max=99999;
        if(!$('#assigner-max-filter').is(':checked')){
            max=parseInt($('#assigner-number-filter').val().toString());
        }
        let templateName= $('#assignmentTemplates').val().toString();
        let temp= window.attackPlan.templates.find((template)=>{
            return template.name==templateName;
        })

        // Toggle aus: gesamte launchPoolCopy berücksichtigen (wie bisher).
        // Toggle an: Spalte auf genau die bei der Planerstellung gewählte
        // Dörfergruppe einschränken - einmalig hier beim Anlegen der Spalte
        // ausgewertet, da filtered danach die einzige Quelle ist, aus der
        // sowohl die Matching-Vorstufe als auch alle vier Algorithmen lesen.
        let launchGroupFilter:string|null = null;
        if($('#assigner-launch-group-toggle').is(':checked')){
            launchGroupFilter = $('#assigner-launch-group-select').val().toString();
        }
        let launchGroupVillageIds:number[]|null = null;
        if(launchGroupFilter){
            let group = window.attackPlan.launchGroups.find((g)=>{return g.name==launchGroupFilter});
            launchGroupVillageIds = group? group.villageIds : [];
        }

        let newAssignment = {
            id:new Date().getTime().toString(),
            arrival:arrival,
            filtered:filterVillages(temp,max,launchGroupVillageIds),
            required:0,
            template:temp,
            max:max,
            launchGroupFilter:launchGroupFilter
        }

        window.autoAssign.assignTypes.push(newAssignment);
        $('.assigner-header .assigner-loader .checkbox').before(/* html */`<div class="item ar-${newAssignment.id}" >
        <input class="ass-inp" value="0" type="number" min="0">
        <button onclick="autoAssign.fillAssignment(${newAssignment.id})">↓</button></div>
        `)
        $('.assigner-header .assigner-name .checkbox').before(/* html */`
            <div class="item ar-${newAssignment.id}" >${newAssignment.template.name}${newAssignment.launchGroupFilter? ` (${newAssignment.launchGroupFilter})` : ''}</div>
        `);
        $('.assigner-header .assigner-remover .checkbox').before(/* html */`
            <div class="item ar-${newAssignment.id}" ><a onclick="autoAssign.removeAssignment(${newAssignment.id})" class="assigner-target-btn"></a></div>
        `);
        $('.assigner-header .assigner-date .checkbox').before(/* html */`
        <div class="item ar-${newAssignment.id}" >${newAssignment.arrival}</div>
        `);
        $('.assigner-target-villages').find('.assigner-row').get().forEach((row)=>{
            $(row).find('.checkbox').before(/* html */`<div class="item ar-${newAssignment.id}" >
                <input class="ass-inp" 
                onchange="autoAssign.updateCount(${newAssignment.id})" 
                onkeyup="autoAssign.updateCount(${newAssignment.id})" 
                value="0" type="number" min="0"></div>`);
        })
        $('.assigner-counter .checkbox').before(/* html */`
        <div class="item ar-${newAssignment.id}" ><span class="cnt-actual">0</span>/${newAssignment.filtered.length}</div>
        `);

        console.log(window.autoAssign.assignTypes);
        
    },
    startAssignment:()=>{
        let alg=$('input[name="assignmentAlg"]:checked').val();
        if (!alg) {
            window.UI.ErrorMessage(Lang('noAlgSelected'));
            return;
        }

        if(window.autoAssign.assignTypes.length==0){
            window.UI.ErrorMessage(Lang('noAttackAssigned'));
            return;
        }

        let capPerPair:number|null = null;
        if($('#assigner-max-incs-per-pair-toggle').is(':checked')){
            capPerPair = parseInt($('#assigner-max-incs-per-pair').val().toString());
        }
        let capPerLauncher:number|null = null;
        if($('#assigner-max-incs-per-launcher-toggle').is(':checked')){
            capPerLauncher = parseInt($('#assigner-max-incs-per-launcher').val().toString());
        }
        resetCapTracking(capPerPair, capPerLauncher);

        $('#dialog-loading').show();
        $('#plannerCloseBtn').hide();
        $('.assigner').hide();
        setTimeout(() => {

            runMaxCoverageMatching();

            switch (alg){
                case "1":
                    evenDistributeClosest()
                break;
                case "2":
                    oneByOneQ()
                break;
                case "3":
                    oneByOneClosest()
                break;
                case "4":
                    closestToTarget()
                break;
            }
            window.targetPoolQuery.resetAll();
            window.launchVillagesQuery.resetAll();
            window.closeModal();
            savePlan()
        }, 200);
        
    },
    checkAll:() =>{
        let checked = $('.assigner-target-villages').find('input[type=checkbox]').get();
        checked.forEach((check)=>{
                $(check).prop( "checked", $('#assigner-main-checkbox').prop('checked'));
        })
    },
    updateCount:(id) =>{
        let cntr=0;
        $(`.assigner-target-villages .ar-${id} .ass-inp`).get().forEach((elem)=>{
            let val= $(elem).val();
            cntr+=parseInt(val.toString().split('x')[0]);
        })
        console.log(id,cntr);
        let ind=window.autoAssign.assignTypes.findIndex((assign)=>{return assign.id==id.toString()})
        window.autoAssign.assignTypes[ind].required=cntr;
        $(`.assigner-counter .ar-${id} .cnt-actual`).text(cntr);
    },
    // Blendet Ziel-Zeilen abhängig von der gewählten Gruppe ein/aus, statt
    // sie neu aufzubauen - ein Rebuild würde die bereits pro Zeile durch
    // addAssignment() eingefügten Mengen-Eingabefelder der laufenden
    // Zuteilungs-Konfiguration zerstören. Rein darstellend: die eigentlichen
    // Zuteilungs-Algorithmen werten weiterhin die vollständige targetPool aus
    // (ausgeblendete Zeilen haben schlicht keine eingetragenen Mengen).
    filterTargetsByGroup:() => {
        let groupName=$('#assigner-group-filter').val().toString();
        let group=groupName? window.attackPlan.targetGroups.find((g)=>{return g.name==groupName}) : null;
        $('.assigner-target-villages .assigner-row').get().forEach((row)=>{
            let id=parseInt($(row).attr('id').replace('assigner-row-',''));
            let show=!group || group.villageIds.includes(id);
            $(row).toggle(show);
        })
    },
}

function filterVillages(template:template,max:number,launchGroupVillageIds:number[]|null):village[]{
    let villages:village[]=[];

    for (let indLanucher = 0; indLanucher < window.autoAssign.launchPoolCopy.length; indLanucher++) {
        const Lanucher = window.autoAssign.launchPoolCopy[indLanucher];
        if(villages.length>=max) break;

        if(launchGroupVillageIds && !launchGroupVillageIds.includes(Lanucher.id)) continue;

        // Ein einzelnes Dorf steuert so viele separate Vorlagen-Instanzen bei,
        // wie seine Truppen hergeben - nicht mehr nur eine einzige, egal wie
        // groß der Truppenüberschuss ist. Ohne diese Schleife konnte ein
        // truppenreiches Dorf pro Spalte nie mehr als einen Angriff liefern,
        // selbst wenn die eingetragene Menge pro Ziel (z.B. 3) und die
        // globalen Kapazitäts-Limits das eigentlich zugelassen hätten - die
        // tatsächliche Obergrenze, wie oft ein Dorf am Ende wirklich verwendet
        // wird, setzen weiterhin canUseLauncher()/die Kapazitäts-Limits beim
        // Zuteilen selbst, nicht diese Sammel-Funktion hier.
        while(villages.length<max && hasAvailableTroops(Lanucher,template.units)){
            let newVillage={...Lanucher};
            newVillage.unitsContain={spear:0,sword:0,axe:0,archer:0,spy:0,light:0,marcher:0,heavy:0,ram:0,catapult:0,knight:0,snob:0};

            [newVillage.unitsContain,Lanucher.unitsContain]
            = TroopTransaction(
                newVillage.unitsContain,
                Lanucher.unitsContain,
                template.units
            )
            if(template.units.snob>0){
                if(template.units.marcher<0){
                    Lanucher.unitsContain.marcher=0;
                }
                if(template.units.light<0){
                    Lanucher.unitsContain.light=0;
                }
                if(template.units.axe<0){
                    Lanucher.unitsContain.axe=0;
                }
            }
            newVillage.popSize=calcUnitPop(newVillage.unitsContain);
            Lanucher.popSize=calcUnitPop(Lanucher.unitsContain);
            villages.push(newVillage);
        }

        if(Lanucher.popSize==0){
            window.autoAssign.launchPoolCopy.splice(indLanucher,1);
        }
    }

    return villages;
}

function oneByOneQ(){
    for (let indTarget = 0; indTarget < window.attackPlan.targetPool.length; indTarget++) {
        const target = window.attackPlan.targetPool[indTarget];
        for (let indAssign = 0; indAssign <  window.autoAssign.assignTypes.length; indAssign++) {
            const assignType = window.autoAssign.assignTypes[indAssign];
            if(assignType.filtered.length==0) continue;
            let cnt=parseInt($(`#assigner-row-${target.village.id} .ar-${assignType.id} .ass-inp`).val().toString());
            for (let i = 0; i < cnt; i++) {
                let choosen=-1;
                let smallest=999999;
                assignType.filtered.forEach((launchVillage,indLanucher)=>{
                    if(!canUseLauncher(launchVillage.id, target.village.id)) return;
                    if(!isArrivalFeasible(assignType.arrival,templateTravelMs(assignType,launchVillage,target.village))) return;
                    let dist=coordDistance(launchVillage,target.village);
                    if(dist<smallest){
                        choosen=indLanucher;
                        smallest=dist;
                    }
                })
                if(choosen>-1){
                    let launcherId=assignType.filtered[choosen].id;
                    let realInd=window.attackPlan.launchPool.findIndex((village:village)=>{return village.id==launcherId})
                    window.addLauncher(indTarget,realInd,assignType.template.units,'attack',assignType.arrival,'',assignType.template.wbType);
                    recordUsage(launcherId, target.village.id);
                    assignType.filtered.splice(choosen,1);
                }
            }
        }
    }
}

function oneByOneClosest(){
    for (let indTarget = 0; indTarget < window.attackPlan.targetPool.length; indTarget++) {
        const target = window.attackPlan.targetPool[indTarget];
        for (let indAssign = 0; indAssign <  window.autoAssign.assignTypes.length; indAssign++) {
            const assignType = window.autoAssign.assignTypes[indAssign];
            if(assignType.filtered.length==0) continue;
            let cnt=parseInt($(`#assigner-row-${target.village.id} .ar-${assignType.id} .ass-inp`).val().toString());
            for (let i = 0; i < cnt; i++) {
                let choosen=assignType.filtered.findIndex((launchVillage)=>{
                    return canUseLauncher(launchVillage.id, target.village.id) && isArrivalFeasible(assignType.arrival,templateTravelMs(assignType,launchVillage,target.village));
                });
                if(choosen==-1) break;
                let launcherId=assignType.filtered[choosen].id;
                let realInd=window.attackPlan.launchPool.findIndex((village:village)=>{return village.id==launcherId})
                window.addLauncher(indTarget,realInd,assignType.template.units,'attack',assignType.arrival,'',assignType.template.wbType);
                recordUsage(launcherId, target.village.id);
                assignType.filtered.splice(choosen,1);
            }
        }
    }
}

// Liest alle "wie viele pro Ziel/Vorlage"-Inputs einmalig aus dem DOM in ein
// In-Memory-Lookup (statt sie in den Zuteilungs-Algorithmen bei jeder
// Kombination aus Ziel x Angreiferdorf x Vorlage per jQuery-Selektor neu
// abzufragen - diese Werte ändern sich während eines Laufs ohnehin nicht).
// Bei 1000+ Dörfern/Zielen war das sonst eine sehr hohe Zahl teurer
// DOM-Lookups in verschachtelten Schleifen und ließ den Tab (spürbar bis hin
// zur "Seite reagiert nicht mehr"-Warnung des Browsers) einfrieren.
function buildAssignmentCountLookup():Record<string,Record<string,number>>{
    let lookup:Record<string,Record<string,number>> = {};
    window.attackPlan.targetPool.forEach((target)=>{
        let byAssign:Record<string,number> = {};
        window.autoAssign.assignTypes.forEach((assignType)=>{
            let val = $(`#assigner-row-${target.village.id} .ar-${assignType.id} .ass-inp`).val();
            byAssign[assignType.id] = parseInt(val.toString());
        });
        lookup[target.village.id] = byAssign;
    });
    return lookup;
}

// Maximum-Bipartite-Matching (Kuhn-Algorithmus) als Vorlauf-Schritt vor allen
// vier Algorithmen: keiner von ihnen garantiert von sich aus, dass jedes
// noch unbediente Ziel (mit angeforderter Anzahl >0) auch tatsächlich einen
// Angriff bekommt - sie sind alle gierig (nächstgelegenes Dorf/erstes Dorf in
// Reihenfolge) und können ein knappes Startdorf an ein weniger eingeschränktes
// Ziel "verlieren", obwohl eine vollständige Zuteilung möglich gewesen wäre.
// Diese Funktion läuft pro Zuteilungs-Spalte einmal vorab und ordnet per
// Kuhn-Algorithmus die größtmögliche Anzahl bislang unbedienter Ziele je
// einem erreichbaren Startdorf zu - unabhängig von Distanz oder Reihenfolge.
// Die dabei "verbrauchte" angeforderte Anzahl wird direkt im ass-inp-Feld
// reduziert, damit die anschließende, unveränderte Algorithmus-Logik (die
// diese Felder bzw. daraus abgeleitete countLookup-Werte liest) den Rest wie
// gewohnt verteilt, ohne die schon zugeteilten Angriffe doppelt zu zählen.
function runMaxCoverageMatching(){
    let countLookup = buildAssignmentCountLookup();
    let coveredTargetIds = new Set<number>(
        window.attackPlan.targetPool.filter((t)=>{return t.launchers.length>0}).map((t)=>{return t.village.id})
    );

    window.autoAssign.assignTypes.forEach((assignType)=>{
        if(assignType.filtered.length==0) return;

        let targetIndices:number[] = [];
        window.attackPlan.targetPool.forEach((target,indTarget)=>{
            if(coveredTargetIds.has(target.village.id)) return;
            if(countLookup[target.village.id][assignType.id]>0){
                targetIndices.push(indTarget);
            }
        });
        if(targetIndices.length==0) return;

        let adjacency:number[][] = targetIndices.map((indTarget)=>{
            const target = window.attackPlan.targetPool[indTarget];
            let list:number[]=[];
            assignType.filtered.forEach((launchVillage,indLanucher)=>{
                if(!canUseLauncher(launchVillage.id, target.village.id)) return;
                if(isArrivalFeasible(assignType.arrival,templateTravelMs(assignType,launchVillage,target.village))){
                    list.push(indLanucher);
                }
            });
            return list;
        });

        let matchLauncherToTargetPos:number[] = new Array(assignType.filtered.length).fill(-1);

        function tryAugment(tPos:number, visited:boolean[]):boolean{
            for(const li of adjacency[tPos]){
                if(visited[li]) continue;
                visited[li]=true;
                if(matchLauncherToTargetPos[li]==-1 || tryAugment(matchLauncherToTargetPos[li],visited)){
                    matchLauncherToTargetPos[li]=tPos;
                    return true;
                }
            }
            return false;
        }

        for(let tPos=0; tPos<targetIndices.length; tPos++){
            tryAugment(tPos, new Array(assignType.filtered.length).fill(false));
        }

        let matches:{indTarget:number,indLanucher:number}[] = [];
        matchLauncherToTargetPos.forEach((tPos,indLanucher)=>{
            if(tPos>-1){
                matches.push({indTarget:targetIndices[tPos], indLanucher});
            }
        });
        // Absteigend nach indLanucher abarbeiten, damit das anschließende
        // Splicen aus assignType.filtered die noch nicht verarbeiteten,
        // niedrigeren Indizes nicht verschiebt.
        matches.sort((a,b)=>{return b.indLanucher-a.indLanucher});

        matches.forEach(({indTarget,indLanucher})=>{
            const target = window.attackPlan.targetPool[indTarget];
            const launchVillage = assignType.filtered[indLanucher];
            let realInd = window.attackPlan.launchPool.findIndex((village:village)=>{return village.id==launchVillage.id});
            window.addLauncher(indTarget,realInd,assignType.template.units,'attack',assignType.arrival,'',assignType.template.wbType);
            recordUsage(launchVillage.id, target.village.id);
            assignType.filtered.splice(indLanucher,1);
            coveredTargetIds.add(target.village.id);

            let cell = $(`#assigner-row-${target.village.id} .ar-${assignType.id} .ass-inp`);
            let remaining = Math.max(0, parseInt(cell.val().toString())-1);
            cell.val(remaining);
        });
    });
}

function closestToTarget(){
    let assigned:assignmentCount[]=[];
    let countLookup = buildAssignmentCountLookup();
    for (let indAssign = 0; indAssign <  window.autoAssign.assignTypes.length; indAssign++) {
        const assignType = window.autoAssign.assignTypes[indAssign];
        if(assignType.filtered.length==0) continue;
        for (let indLanucher = 0; indLanucher < assignType.filtered.length; indLanucher++) {
            const launchVillage = assignType.filtered[indLanucher];
            let choosen=-1;
            let smallest=999999;
            for (let indTarget = 0; indTarget < window.attackPlan.targetPool.length; indTarget++) {
                const target=window.attackPlan.targetPool[indTarget];
                let assInd=assigned.findIndex((assign)=>{return assign.id==target.village.id});
                let cnt=0;
                for (let i = 0; i < indAssign+1; i++) {
                    cnt+=countLookup[target.village.id][window.autoAssign.assignTypes[i].id];
                }
                if(assInd>-1){
                    if(assigned[assInd].cnt>=cnt) continue;
                }

                if(!canUseLauncher(launchVillage.id, target.village.id)) continue;
                if(!isArrivalFeasible(assignType.arrival,templateTravelMs(assignType,launchVillage,target.village))) continue;

                let dist=coordDistance(launchVillage,target.village);
                if(dist<smallest){
                    choosen=indTarget;
                    smallest=dist;
                }
            }
            if(choosen>-1){
                let assInd=assigned.findIndex((assign)=>{return assign.id==window.attackPlan.targetPool[choosen].village.id})
                if(assInd==-1){
                    assigned.push({
                        id:window.attackPlan.targetPool[choosen].village.id,
                        cnt:1
                    })
                }else{
                    assigned[assInd].cnt++;
                }
                let launcherId=assignType.filtered[indLanucher].id;
                let realInd=window.attackPlan.launchPool.findIndex((village:village)=>{return village.id==launcherId})
                window.addLauncher(choosen,realInd,assignType.template.units,'attack',assignType.arrival,'',assignType.template.wbType);
                recordUsage(launcherId, window.attackPlan.targetPool[choosen].village.id);
                assignType.filtered.splice(indLanucher,1);
            }
        }
    }
}

// filledPerTarget zählt NUR die von dieser Funktion selbst neu hinzugefügten
// Angriffe pro Ziel (nicht die tatsächliche target.launchers.length!). Das ist
// wichtig, weil countLookup/cnt bereits von der Maximum-Coverage-Matching-
// Vorstufe (runMaxCoverageMatching) entsprechend heruntergezählt wurde, sobald
// diese einem Ziel schon einen garantierten Angriff gegeben hat (Feld-Wert
// z.B. 2->1). Würde man stattdessen die echte target.launchers.length
// vergleichen (die durch genau diesen Vorstufen-Angriff ja bereits auf 1
// gestiegen ist), würde dieser eine Angriff DOPPELT abgezogen - einmal im
// bereits reduzierten cnt, einmal in der bereits erhöhten launchers.length -
// und "even" hätte fälschlich schon "fertig" gemeldet, obwohl laut
// ursprünglich eingetragener Menge noch mehr gewünscht war. Die anderen drei
// Algorithmen haben dieses Problem nicht, weil sie ohnehin nur mit einem bei
// 0 startenden, rein lokalen Zähler arbeiten statt mit dem echten Bestand.
function evenDistributeClosest(){
    let countLookup = buildAssignmentCountLookup();
    let filledPerTarget:Record<number,number> = {};
    window.autoAssign.assignTypes.forEach((assignType,index) => {
        let filled=0;
       while (assignType.filtered.length>0 && assignType.required>filled) {
        // Merkt sich, ob in diesem kompletten Durchlauf über alle Ziele
        // überhaupt ein Angriff zugeteilt werden konnte. Ohne diese Prüfung
        // dreht die while-Schleife sich unendlich weiter, sobald kein Ziel
        // mehr zuteilbar ist (z.B. weil bereits alle Ziele ihre gewünschte
        // Anzahl haben), obwohl "required" noch nicht erreicht ist - genau
        // das führte zum Einfrieren der Seite.
        let progressedThisPass=false;
        for (let indTarget = 0; indTarget < window.attackPlan.targetPool.length; indTarget++) {
            const target=window.attackPlan.targetPool[indTarget];
            let cnt=0;
            for (let i = 0; i < index+1; i++) {
                cnt+=countLookup[target.village.id][window.autoAssign.assignTypes[i].id];
            }
            let already=filledPerTarget[target.village.id]||0;
            if(already<cnt){
                let choosen=-1;
                let smallest=999999;
                assignType.filtered.forEach((launchVillage,indLanucher)=>{
                    if(!canUseLauncher(launchVillage.id, target.village.id)) return;
                    if(!isArrivalFeasible(assignType.arrival,templateTravelMs(assignType,launchVillage,target.village))) return;
                    let dist=coordDistance(launchVillage,target.village);
                    if(dist<smallest){
                        choosen=indLanucher;
                        smallest=dist;
                    }
                })
                if(choosen>-1){
                    filled++;
                    progressedThisPass=true;
                    filledPerTarget[target.village.id]=already+1;
                    let launcherId=assignType.filtered[choosen].id;
                    let realInd=window.attackPlan.launchPool.findIndex((village:village)=>{return village.id==launcherId})
                    window.addLauncher(indTarget,realInd,assignType.template.units,'attack',assignType.arrival,'',assignType.template.wbType);
                    recordUsage(launcherId, target.village.id);
                    assignType.filtered.splice(choosen,1);
                    if(assignType.filtered.length==0) break;
                }
            }
        }
        if(!progressedThisPass) break;
       }
    });
}