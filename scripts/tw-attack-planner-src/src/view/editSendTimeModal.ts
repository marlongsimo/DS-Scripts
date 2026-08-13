import { savePlan } from "../core/Api";
import { Lang } from "../core/Language";

// Legt planweit fest, ab wann überhaupt gesendet werden darf (z.B. weil man
// heute für einen erst morgen beginnenden, abgesprochenen Versand plant).
// Wird in Api.ts (sendTimeFloorMs/isArrivalFeasible/resolveArrival) genutzt,
// um beim Automatic-assignment Dörfer auszuschließen, die den gewählten
// Ankunftszeitpunkt/das Fenster ab diesem Zeitpunkt nicht mehr erreichen
// könnten - ohne gesetzten Wert verhält sich alles wie bisher (Referenz =
// aktueller Zeitpunkt).
export const editSendTimeModal = ()=>{
    let current = (window.attackPlan.sendTimeFloor || '').replace(' ','T');
    return /* html */`
        <label for="send_time_floor_input">${Lang('sendTimeFloor')}:</label><br>
        <input id="send_time_floor_input" type="datetime-local" step="1" value="${current}"/>
        <div class="modal-input-inline">
            <button class="btn" onclick="window.editSendTimeModal.save()">${Lang('add')}</button>
            <button class="btn" onclick="window.editSendTimeModal.clear()">${Lang('remove')}</button>
        </div>
    `
}

window.editSendTimeModal = {
    save:()=>{
        let val = $('#send_time_floor_input').val().toString();
        if(val==''){
            return;
        }
        window.attackPlan.sendTimeFloor = val.replace('T',' ');
        savePlan();
        window.closeModal();
    },
    clear:()=>{
        window.attackPlan.sendTimeFloor = null;
        savePlan();
        window.closeModal();
    },
}
