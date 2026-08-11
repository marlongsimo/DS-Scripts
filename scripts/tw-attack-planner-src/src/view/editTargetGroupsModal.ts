import { savePlan } from "../core/Api";
import { Lang } from "../core/Language";

// Nur vom Hauptfenster aus erreichbar (Zielgruppen ergeben erst Sinn, wenn
// bereits Ziele existieren) - anders als editTargetModal etc. kein Teil des
// Plan-Erstellungs-Assistenten, daher kein window.launchDialog.stepCheck().
export const editTargetGroupsModal = (targets:target[])=>{
    window.editTargetGroupsModal.targetsRef=targets;
    return /* html */`
    <div class="modal-input-group">
    <label for="target_group_select">${Lang('targetGroups')} (<span id="modal-target-groups-cnt">${window.attackPlan.targetGroups.length}</span>):</label>
    <select id="target_group_select" size="5">
        ${window.attackPlan.targetGroups.map((group)=>{
            return /* html */`
            <option value="${group.name}">${group.name} (${group.villageIds.length})</option>
            `
        }).join('')}
    </select>
    </div>
    <div class="modal-input-group">
        <label for="target_group_name">${Lang('name')}:</label>
        <input id="target_group_name" type="text" />
    </div>
    <div class="modal-input-group">
        <label for="">${Lang('newTargets')}:</label><br>
        <textarea id="target_group_coords" size="10"></textarea>
    </div>
    <div class="modal-input-inline">
        <button class="btn" onclick="editTargetGroupsModal.addGroup()">${Lang('add')}</button>
        <button class="btn" onclick="editTargetGroupsModal.removeGroup()">${Lang('remove')}</button>
    </div>
    `
}

function renderGroupSelect(){
    $('#target_group_select').html(window.attackPlan.targetGroups.map((group)=>{
        return /* html */`
        <option value="${group.name}">${group.name} (${group.villageIds.length})</option>
        `
    }).join(''))
    $('#modal-target-groups-cnt').text(window.attackPlan.targetGroups.length);
}

window.editTargetGroupsModal = {
    targetsRef:[],
    // Nimmt beliebig viele eingefügte Koordinaten entgegen (gleiche
    // Regex-Erkennung wie editTargetModal.addTargets), gleicht sie gegen die
    // bestehende Zielliste ab - Treffer werden der Gruppe (per Dorf-ID)
    // hinzugefügt, alles andere wird stillschweigend ignoriert.
    addGroup:() => {
        let name = $('#target_group_name').val().toString().trim();
        if(name==""){
            return;
        }

        let coordsRaw:string = $('#target_group_coords').val().toString();
        let reg = Array.from(coordsRaw.matchAll(/([0-9]{1,3}).([0-9]{1,3})/g));
        let villageIds:number[] = [];
        reg.forEach((elem:any)=>{
            let coord=elem[1]+"|"+elem[2];
            let target = window.editTargetGroupsModal.targetsRef.find((t:target)=>{ return t.village.coord.text==coord});
            if(target && !villageIds.includes(target.village.id)){
                villageIds.push(target.village.id);
            }
        });

        let ind = window.attackPlan.targetGroups.findIndex((group)=>{ return group.name==name});
        if(ind>-1){
            window.attackPlan.targetGroups[ind].villageIds=villageIds;
        }else{
            window.attackPlan.targetGroups.push({name:name, villageIds:villageIds});
        }

        $('#target_group_name').val('');
        $('#target_group_coords').val('');
        renderGroupSelect();
        window.refreshTargetGroupFilterOptions();
        savePlan();
    },
    removeGroup:() => {
        let val=$('#target_group_select').val();
        let ind = window.attackPlan.targetGroups.findIndex((group)=>{ return group.name==val});
        if(ind>-1){
            window.attackPlan.targetGroups.splice(ind,1);
        }
        renderGroupSelect();
        window.refreshTargetGroupFilterOptions();
        savePlan();
    },
}
