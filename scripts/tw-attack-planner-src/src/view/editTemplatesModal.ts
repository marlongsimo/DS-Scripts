import { AssetName, savePlan } from "../core/Api";
import { Lang } from "../core/Language";

// Vollständige DS-Ultimate-Werkbank-Typ/Icon-Palette (commandTypeToImageLink,
// Werte 0-46) - Basis für das "Typ"-Dropdown pro Vorlage (Icon 2). 0-11
// entsprechen den 12 Einheiten in derselben Reihenfolge wie unitCode in
// calculatedAttackModal.ts (dort auch für den automatischen Typ - Icon 1 -
// verwendet).
const WB_IMAGE_BASE='https://ds-ultimate.de/images/ds_images/';
const WB_ICON_GROUPS:{label:string,options:{value:number,label:string,file:string}[]}[]=[
    { label:'Einheiten', options:[
        {value:0,label:'Speer',file:'unit/spear.png'},
        {value:1,label:'Schwert',file:'unit/sword.png'},
        {value:2,label:'Axt',file:'unit/axe.png'},
        {value:3,label:'Bogenschütze',file:'unit/archer.png'},
        {value:4,label:'Späher',file:'unit/spy.png'},
        {value:5,label:'Leichte Kavallerie',file:'unit/light.png'},
        {value:6,label:'Berittener Bogenschütze',file:'unit/marcher.png'},
        {value:7,label:'Schwere Kavallerie',file:'unit/heavy.png'},
        {value:8,label:'Ramme',file:'unit/ram.png'},
        {value:9,label:'Katapult',file:'unit/catapult.png'},
        {value:10,label:'Adelsgeschlecht',file:'unit/knight.png'},
        {value:11,label:'Adliger',file:'unit/snob.png'},
    ]},
    { label:'Werkbank', options:[
        {value:12,label:'Verteidigung Kavallerie',file:'wb/def_cav.png'},
        {value:13,label:'Verteidigung Bogen',file:'wb/def_archer.png'},
        {value:14,label:'Fake',file:'wb/fake.png'},
        {value:15,label:'Unterstützung',file:'wb/ally.png'},
        {value:16,label:'Auszug',file:'wb/move_out.png'},
        {value:17,label:'Einzug',file:'wb/move_in.png'},
        {value:46,label:'Fake (Verteidigung)',file:'wb/def_fake.png'},
    ]},
    { label:'Symbole', options:[
        {value:18,label:'Kugel blau',file:'wb/bullet_ball_blue.png'},
        {value:19,label:'Kugel grün',file:'wb/bullet_ball_green.png'},
        {value:20,label:'Kugel gelb',file:'wb/bullet_ball_yellow.png'},
        {value:21,label:'Kugel rot',file:'wb/bullet_ball_red.png'},
        {value:22,label:'Kugel grau',file:'wb/bullet_ball_grey.png'},
        {value:23,label:'Warnung',file:'wb/warning.png'},
        {value:24,label:'Sterben',file:'wb/die.png'},
        {value:25,label:'Hinzufügen',file:'wb/add.png'},
        {value:26,label:'Entfernen',file:'wb/remove.png'},
        {value:27,label:'Checkbox',file:'wb/checkbox.png'},
        {value:28,label:'Auge',file:'wb/eye.png'},
        {value:29,label:'Auge (verboten)',file:'wb/eye_forbidden.png'},
    ]},
    { label:'Gebäude', options:[
        {value:30,label:'Hauptgebäude',file:'buildings/small/main.png'},
        {value:31,label:'Kaserne',file:'buildings/small/barracks.png'},
        {value:32,label:'Stall',file:'buildings/small/stable.png'},
        {value:33,label:'Werkstatt',file:'buildings/small/garage.png'},
        {value:34,label:'Kirche',file:'buildings/small/church.png'},
        {value:35,label:'Adelshof',file:'buildings/small/snob.png'},
        {value:36,label:'Schmiede',file:'buildings/small/smith.png'},
        {value:37,label:'Versammlungsplatz',file:'buildings/small/place.png'},
        {value:38,label:'Statue',file:'buildings/small/statue.png'},
        {value:39,label:'Marktplatz',file:'buildings/small/market.png'},
        {value:40,label:'Holzfäller',file:'buildings/small/wood.png'},
        {value:41,label:'Lehmgrube',file:'buildings/small/stone.png'},
        {value:42,label:'Eisenmine',file:'buildings/small/iron.png'},
        {value:43,label:'Bauernhof',file:'buildings/small/farm.png'},
        {value:44,label:'Lager',file:'buildings/small/storage.png'},
        {value:45,label:'Mauer',file:'buildings/small/wall.png'},
    ]},
];
const WB_UNIT_ORDER=['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'];

function wbIconUrl(value:number):string{
    for(const group of WB_ICON_GROUPS){
        const found=group.options.find((o)=>o.value==value);
        if(found) return WB_IMAGE_BASE+found.file;
    }
    return '';
}

// Icon 1 (automatisch, nicht editierbar): langsamste Einheit unter den
// aktuell im Formular eingetragenen Werten >0 - reine Vorschau, analog zu
// getSlowestUnit() in Api.ts, hier aber ohne Truppen-Verfügbarkeits-Prüfung
// und unabhängig von Angriff/Unterstützung (das wird erst beim Zuteilen
// entschieden, nicht beim Anlegen der Vorlage).
function slowestUnitAmongInputs():string|null{
    let slowest:string=null;
    let slowestSpeed=-Infinity;
    WB_UNIT_ORDER.forEach((unit)=>{
        let raw=$(`#palnner_unit_input_${unit}`).val().toString();
        let val=$(`#max_${unit}`).is(':checked')? 99999 : parseInt(raw);
        if(!val || val<=0) return;
        let unitCfg=window.unitConfig[unit as keyof unitConfig];
        if(!unitCfg) return;
        if(unitCfg.speed>slowestSpeed){ slowestSpeed=unitCfg.speed; slowest=unit; }
    });
    return slowest;
}

export const editTemplatesModal = (templates:template[])=>{
    window.templateModal.templateRef=templates;
    return /* html */`
        <style>
            .template-editor {  
            margin: 0 auto;
            display: grid;
            grid-template-columns: 100px 100px;
            grid-template-rows: max-content 35px max-content max-content;
            text-align:center;
            gap: 10px 0px;
            grid-auto-flow: row;
            grid-template-areas:
                "template-select-box template-select-box"
                "template-buttons template-buttons"
                "template-infantry template-calvary"
                "template-machines template-other";
            }
            .template-select-box { grid-area: template-select-box; display:grid; }
            .template-calvary { grid-area: template-calvary; }
            .template-machines { grid-area: template-machines; }
            .template-other { grid-area: template-other; }
            .template-buttons{ grid-area: template-buttons; }
            .template-infantry { grid-area: template-infantry; }
            .template-input-group{
                margin-top:5px;
            }

            .template-editor option {
                font-size: 16px;
                padding: 2px 5px;
                text-align: center;
            }
            .template-unitsInput {
                width: 45px;
            }

        </style>
        <div class="template-editor">
            <div class="template-select-box">
                <label for="template_select">${Lang('templates')}:</label>
                <select onclick="templateModal.selectTemplate()" id="template_select" size="5">
                    ${templates.map((template)=>{
                        return /* html */`
                        <option value="${template.name}">${template.name}</option>
                        `
                    })
                    }
                </select>
                <label for="temp_name">${Lang('name')}:</label>
                <input id="temp_name" type="text" />
                <label>${Lang('wbTypeAuto')}:</label>
                <img id="template-wbtype-auto-preview" height="20" src="">
                <label for="template-wbtype-select">${Lang('wbType')}:</label>
                <select id="template-wbtype-select" onchange="templateModal.updateWbTypePreview()">
                    <option value="">${Lang('automatic')}</option>
                    ${WB_ICON_GROUPS.map((group)=>{
                        return /* html */`<optgroup label="${group.label}">${group.options.map((o)=>{
                            return /* html */`<option value="${o.value}">${o.label}</option>`
                        }).join('')}</optgroup>`
                    }).join('')}
                </select>
                <img id="template-wbtype-preview" height="20" src="">
            </div>
            <div class="template-infantry">
                <div class="template-input-group">
                    <img src="${AssetName}/graphic/unit/unit_spear.png" >
                    <input id="palnner_unit_input_spear" type="number" tabindex="1" value="0" class="template-unitsInput" oninput="templateModal.updateAutoIconPreview()"><br>
                    <input onclick="templateModal.selectAll('spear')" id="max_spear" type="checkbox"> ${Lang('all')}
                </div>
                <div class="template-input-group">
                    <img src="${AssetName}/graphic/unit/unit_sword.png" >
                    <input id="palnner_unit_input_sword" type="number" tabindex="1" value="0" class="template-unitsInput" oninput="templateModal.updateAutoIconPreview()"><br>
                    <input onclick="templateModal.selectAll('sword')" id="max_sword" type="checkbox"> ${Lang('all')}
                </div>
                <div class="template-input-group">
                    <img src="${AssetName}/graphic/unit/unit_axe.png" >
                    <input id="palnner_unit_input_axe" type="number" tabindex="1" value="0" class="template-unitsInput" oninput="templateModal.updateAutoIconPreview()"><br>
                    <input onclick="templateModal.selectAll('axe')" id="max_axe" type="checkbox"> ${Lang('all')}
                </div>
                <div class="template-input-group" ${window.gameConfig.game.archer==0 && `style="display:none;"`} >
                    <img src="${AssetName}/graphic/unit/unit_archer.png" >
                    <input id="palnner_unit_input_archer" type="number" tabindex="1" value="0" class="template-unitsInput" oninput="templateModal.updateAutoIconPreview()"><br>
                    <input onclick="templateModal.selectAll('archer')" id="max_archer" type="checkbox"> ${Lang('all')}
                </div>
            </div>
            <div class="template-calvary">
                <div class="template-input-group">
                    <img src="${AssetName}/graphic/unit/unit_spy.png" >
                    <input id="palnner_unit_input_spy" type="number" tabindex="1" value="0" class="template-unitsInput" oninput="templateModal.updateAutoIconPreview()"><br>
                    <input onclick="templateModal.selectAll('spy')" id="max_spy" type="checkbox"> ${Lang('all')}
                </div>
                <div class="template-input-group">
                    <img src="${AssetName}/graphic/unit/unit_light.png" >
                    <input id="palnner_unit_input_light" type="number" tabindex="1" value="0" class="template-unitsInput" oninput="templateModal.updateAutoIconPreview()"><br>
                    <input onclick="templateModal.selectAll('light')" id="max_light" type="checkbox"> ${Lang('all')}
                </div>
                <div class="template-input-group" ${window.gameConfig.game.archer==0 && `style="display:none;"`}>
                    <img src="${AssetName}/graphic/unit/unit_marcher.png" >
                    <input id="palnner_unit_input_marcher" type="number" tabindex="1" value="0" class="template-unitsInput" oninput="templateModal.updateAutoIconPreview()"><br>
                    <input onclick="templateModal.selectAll('marcher')" id="max_marcher" type="checkbox"> ${Lang('all')}
                </div>
                <div class="template-input-group">
                    <img src="${AssetName}/graphic/unit/unit_heavy.png" >
                    <input id="palnner_unit_input_heavy" type="number" tabindex="1" value="0" class="template-unitsInput" oninput="templateModal.updateAutoIconPreview()"><br>
                    <input onclick="templateModal.selectAll('heavy')" id="max_heavy" type="checkbox"> ${Lang('all')}
                </div>    
            </div>
            <div class="template-machines">
                <div class="template-input-group">
                    <img src="${AssetName}/graphic/unit/unit_ram.png" >
                    <input id="palnner_unit_input_ram" type="number" tabindex="1" value="0" class="template-unitsInput" oninput="templateModal.updateAutoIconPreview()"><br>
                    <input onclick="templateModal.selectAll('ram')" id="max_ram" type="checkbox"> ${Lang('all')}
                </div>
                <div class="template-input-group">
                    <img src="${AssetName}/graphic/unit/unit_catapult.png" >
                    <input id="palnner_unit_input_catapult"  type="number" tabindex="1" value="0" class="template-unitsInput" oninput="templateModal.updateAutoIconPreview()"><br>
                    <input onclick="templateModal.selectAll('catapult')" id="max_catapult" type="checkbox"> ${Lang('all')}
                </div>
            </div>
            <div class="template-other">
                <div class="template-input-group">
                    <img src="${AssetName}/graphic/unit/unit_knight.png" >
                    <input id="palnner_unit_input_knight" type="number" tabindex="1" value="0" class="template-unitsInput" oninput="templateModal.updateAutoIconPreview()"><br>
                    <input onclick="templateModal.selectAll('knight')" id="max_knight" type="checkbox"> ${Lang('all')}
                </div>
                <div class="template-input-group">
                    <img src="${AssetName}/graphic/unit/unit_snob.png" >
                    <input id="palnner_unit_input_snob" type="number" tabindex="1" value="0" class="template-unitsInput" oninput="templateModal.updateAutoIconPreview()"><br>
                    <input onclick="templateModal.selectAll('snob')" id="max_snob" type="checkbox"> ${Lang('all')}
                </div>
            </div>
            <div class="template-buttons">
                <button class="btn" onclick="templateModal.addTemplate()">${Lang('add')}</button>
                <button class="btn" onclick="templateModal.removeTemplate()">${Lang('remove')}</button>
            </div>
        </div>
    `
}

window.templateModal = {
    templateRef:[],
    addTemplate: ()=> {
        if($('#temp_name').val().toString().length>10){
            return;
        }

        let wbTypeRaw=$('#template-wbtype-select').val().toString();
        let template:template ={
            name:$('#temp_name').val().toString(),
            units:{spear:0,sword:0,archer:0,axe:0,spy:0,light:0,marcher:0,heavy:0,ram:0,catapult:0,knight:0,snob:0},
            wbType:wbTypeRaw==''? null : parseInt(wbTypeRaw)
        }

        Object.keys(template.units).forEach((unit)=>{
            
            let val = parseInt($(`#palnner_unit_input_${unit}`).val().toString()) ;
            console.log($(`#max_${unit}`).is(":checked"));
            
            if($(`#max_${unit}`).is(":checked")){
                val=99999
            }

            if(val==null){
                val=0;
            }

            template.units[unit as keyof unitConfig]=val;

        })
        console.log(template);
    
        if(template.name==""){
            return
        }
        let ind=window.templateModal.templateRef.findIndex((temp)=>{ return temp.name==template.name});
    
        if(ind>-1){
            window.templateModal.templateRef[ind]=template;
        }else{
            window.templateModal.templateRef.push(template);
        }
        $('#temp_name').val('');
        Object.keys(template.units).forEach((unit)=>{
            $(`#palnner_unit_input_${unit}`).val('0')
            $(`#palnner_unit_input_${unit}`).prop('disabled',false);
            $(`#max_${unit}`).prop("checked",false);
        })
        $('#template-wbtype-select').val('');
        window.templateModal.updateAutoIconPreview();
        window.templateModal.updateWbTypePreview();

        let select="";
        window.templateModal.templateRef.forEach((temp)=>{
            select+=`<option value="${temp.name}">${temp.name}</option>`;
        });
        $('#template_select').html(select);
        
        if($('.mainWindow').get().length==1){
            savePlan()
        }else{
            window.launchDialog.stepCheck();
        }
    },
    removeTemplate:()=> {
        let val=$('#template_select').val();
    
        let ind=window.templateModal.templateRef.findIndex((temp)=>{ return temp.name==val})
        
        if(ind>-1){
            window.templateModal.templateRef.splice(ind,1);
        }
    
        let select="";
        window.templateModal.templateRef.forEach((temp)=>{
            select+=`<option value="${temp.name}">${temp.name}</option>`;
        });
    
        $('#template_select').html(select);

        if($('.mainWindow').get().length==1){
            savePlan()
        }else{
            window.launchDialog.stepCheck();
        }
    },
    selectTemplate:()=> {
        let val=$('#template_select').val();
    
        let ind=window.templateModal.templateRef.findIndex((temp)=>{ return temp.name==val})
        console.log(ind,val,window.templateModal.templateRef);
        
        if(ind>-1){
            let temp=window.templateModal.templateRef[ind]
            console.log(temp);
            $('#temp_name').val(temp.name);
            Object.keys(temp.units).forEach((unit)=>{
                let val=temp.units[unit as keyof unitConfig];
                if(val==99999){
                    $(`#max_${unit}`).prop("checked",true);
                    $(`#palnner_unit_input_${unit}`).prop('disabled',true);
                    $(`#palnner_unit_input_${unit}`).val('');
                }else{
                    $(`#palnner_unit_input_${unit}`).val(val);
                    $(`#palnner_unit_input_${unit}`).prop('disabled',false);
                    $(`#max_${unit}`).prop("checked",false);
                }
            })
            $('#template-wbtype-select').val(temp.wbType!=null? temp.wbType.toString() : '');
            window.templateModal.updateAutoIconPreview();
            window.templateModal.updateWbTypePreview();
        }
    },
    selectAll:(unit:string)=>{
        if($(`#max_${unit}`).prop("checked")){
            $(`#palnner_unit_input_${unit}`).val('');
        }else{
            $(`#palnner_unit_input_${unit}`).val('0');
        }

        $(`#palnner_unit_input_${unit}`).prop('disabled',$(`#max_${unit}`).prop("checked"));
        window.templateModal.updateAutoIconPreview();
    },
    updateAutoIconPreview:()=>{
        let unit=slowestUnitAmongInputs();
        $('#template-wbtype-auto-preview').attr('src', unit!=null? wbIconUrl(WB_UNIT_ORDER.indexOf(unit)) : '');
    },
    updateWbTypePreview:()=>{
        let raw=$('#template-wbtype-select').val().toString();
        $('#template-wbtype-preview').attr('src', raw==''? '' : wbIconUrl(parseInt(raw)));
    },
}


