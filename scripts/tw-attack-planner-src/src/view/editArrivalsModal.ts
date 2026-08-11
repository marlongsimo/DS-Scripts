import { savePlan } from "../core/Api";
import { Lang } from "../core/Language";

export const editArrivalsModal = (arrivals:string[])=>{
    window.editArrivalsModal.arrivalsRef=arrivals;
    return /* html */`
    <div class="modal-input-group">
        <label for="">${Lang('arrivals')}:</label>
        <select id="plan_arrivals_select" size="5">
        ${arrivals.map((arrival)=>{
            return /* html */`
            <option value="${arrival}">${arrival}</option>
            `
        }).join('')}
        </select>
        <input id="plan_arrivals_input" type="datetime-local" type="text" step="1"/>
        <label for="plan_arrivals_input_to">${Lang('to')}:</label>
        <input id="plan_arrivals_input_to" type="time" step="1"/>
    </div>
    <div class="modal-input-inline">
        <button class="btn" onclick="editArrivalsModal.addArrival()" >${Lang('add')}</button>
        <button class="btn" onclick="editArrivalsModal.removeArrival()">${Lang('remove')}</button>
    </div>
    `
}
window.editArrivalsModal = {
    addArrival:()=> {
        let fromRaw = $('#plan_arrivals_input').val().toString();
        let toRaw = $('#plan_arrivals_input_to').val().toString();

        if(fromRaw==""){
            return;
        }

        let val = fromRaw.replace('T',' ');

        // "bis"-Zeit optional - wenn gesetzt, wird aus der Fixzeit ein
        // Ankunfts-Zeitfenster (gleiches Datum wie "von", siehe resolveArrival
        // in Api.ts, das daraus je Angreifer eine zufaellige, "krumme" Landezeit
        // auslost statt einer fixen).
        if(toRaw!==""){
            let toFull = fromRaw.split('T')[0]+' '+toRaw;
            if(toFull<=val){
                window.UI.ErrorMessage(Lang('invalidArrivalWindow'));
                return;
            }
            val = val+' - '+toFull;
        }

        if(! window.editArrivalsModal.arrivalsRef.includes(val)){
            window.editArrivalsModal.arrivalsRef.push(val);
        }

        window.editArrivalsModal.arrivalsRef.sort((a,b)=>{return a>b? 1:-1})

        let select="";

        window.editArrivalsModal.arrivalsRef.forEach((arrival)=>{
            select+=`<option value="${arrival}">${arrival}</option>`;
        });
        $('#plan_arrivals_select').html(select);
        $('#plan_arrivals_input_to').val('');
        if($('.mainWindow').get().length==1){
            savePlan()
        }else{
            window.launchDialog.stepCheck();
        }
    },
    removeArrival:()=> {
        let val = $('#plan_arrivals_select').val().toString().replace('T',' ');
        if(val==""){
            return;
        }

        let ind= window.editArrivalsModal.arrivalsRef.findIndex((arrival)=>{ return arrival==val})

        if(ind>-1){
            window.editArrivalsModal.arrivalsRef.splice(ind,1);
        }

        let select="";
        window.editArrivalsModal.arrivalsRef.forEach((arrival)=>{
            select+=`<option value="${arrival}">${arrival}</option>`;
        });
        $('#plan_arrivals_select').html(select);
        if($('.mainWindow').get().length==1){
            savePlan()
        }else{
            window.launchDialog.stepCheck();
        }
    }
}