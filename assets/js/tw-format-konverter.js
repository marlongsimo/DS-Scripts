// TW Format-Konverter: BBCode/Workbench → Katta-Planner JSON & DS-Ultimate Workbench-CSV

const BASE_SPEED = { spear:18,sword:22,axe:18,archer:18,spy:9,light:10,marcher:10,heavy:11,ram:30,catapult:30,knight:10,snob:35 };
let lastJson=null, lastWb=null, activeTab='bbcode', activeOutTab='json';

document.addEventListener('DOMContentLoaded', function () {
  // Timezone label
  const tzOff = -new Date().getTimezoneOffset()/60;
  document.getElementById('tzLabel').textContent = 'UTC'+(tzOff>=0?'+':'')+tzOff;

  // Merge checkbox
  document.getElementById('mergeChk').addEventListener('change',function(){
    document.getElementById('mergeArea').style.display=this.checked?'block':'none';
  });
});

function switchTab(name,el){
  activeTab=name;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
  document.getElementById('wbTabBtn').disabled=(name==='workbench');
}

function switchOutTab(name,el){
  activeOutTab=name;
  document.querySelectorAll('.out-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.out-panel').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('out-'+name).classList.add('active');
}

function showStatus(msg,type){
  const el=document.getElementById('status');
  el.textContent=msg; el.className='status '+type;
  if(type==='ok') setTimeout(()=>el.className='status',6000);
}

function generateId(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&0x3|0x8)).toString(16);});
}

function pad(n){return String(n).padStart(2,'0');}
function ms3(n){return String(Math.round(n)).padStart(3,'0');}

function localISO(d){
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
}

function gameFormat(d){
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds())+'.'+ms3(d.getMilliseconds());
}

function msToHMSms(ms){
  const h=Math.floor(ms/3600000); ms-=h*3600000;
  const m=Math.floor(ms/60000);   ms-=m*60000;
  const s=Math.floor(ms/1000);    ms-=s*1000;
  return pad(h)+':'+pad(m)+':'+pad(s)+'.'+ms3(ms);
}

function msToHMS(ms){
  const s=Math.round(ms/1000);
  return pad(Math.floor(s/3600))+':'+pad(Math.floor((s%3600)/60))+':'+pad(s%60);
}

function coordDist(c1,c2){
  const [x1,y1]=c1.split('|').map(Number);
  const [x2,y2]=c2.split('|').map(Number);
  return Math.sqrt((x2-x1)**2+(y2-y1)**2);
}

function calcTravelMs(unit,dist,wSpeed,uSpeed){
  return (dist*(BASE_SPEED[unit]||30))/(wSpeed*uSpeed)*60*1000;
}

function detectType(tropas){
  const nz=k=>tropas[k]&&tropas[k]!==''&&tropas[k]!=='0';
  if(nz('snob')) return 'Adelung';
  const off=['axe','light','heavy','ram','catapult','archer','marcher','knight'];
  const def=['spear','sword'];
  if(!off.some(nz)&&def.some(nz)) return 'Unterstützung';
  if(!off.some(nz)&&!def.some(nz)&&nz('spy')) return 'Spionage';
  return 'Ataque';
}

function parseSendTime(str){
  const m=str.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})(?::(\d+))?$/);
  if(!m) return null;
  const msVal=m[3]?parseInt(m[3].substring(0,3).padEnd(3,'0')):0;
  const d=new Date(m[1]+'T'+m[2]);
  d.setMilliseconds(msVal);
  return d;
}

function parseBBCode(raw,wSpeed,uSpeed){
  const results=[];
  const lines=raw.split(/\[\*\]/).map(l=>l.trim()).filter(l=>l.length>10);
  for(const line of lines){
    try{
      const unitM=line.match(/\[unit\](\w+)\[\/unit\]/);
      const unit=unitM?unitM[1].toLowerCase():'ram';
      const coords=[...line.matchAll(/\[coord\](\d+\|\d+)\[\/coord\]/g)].map(m=>m[1]);
      if(coords.length<2) continue;
      const timeM=line.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?::\d+)?)/);
      if(!timeM) continue;
      const sendDate=parseSendTime(timeM[1]);
      if(!sendDate) continue;
      const urlM=line.match(/\[url="([^"]+)"\]/);
      if(!urlM) continue;
      let params={};
      try{params=Object.fromEntries(new URL(urlM[1]).searchParams);}
      catch(e){(urlM[1].split('?')[1]||'').split('&').forEach(p=>{const[k,v]=p.split('=');if(k)params[k]=decodeURIComponent(v||'');});}
      const villageId=params.village||''; const targetId=params.target||'';
      if(!villageId||!targetId) continue;
      const dist=coordDist(coords[0],coords[1]);
      const travelMs=calcTravelMs(unit,dist,wSpeed,uSpeed);
      const arrivalDate=new Date(sendDate.getTime()+travelMs);
      const tropas={};
      ['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'].forEach(k=>{
        const v=params[k]; tropas[k]=(!v||v===''||v==='0')?'':v;
      });
      results.push({
        cmd:{
          id:generateId(), origem:coords[0], idOrigem:Number(villageId),
          destino:coords[1], idDestino:targetId,
          dateTime:localISO(arrivalDate), horaEnvio:localISO(sendDate),
          duration:msToHMS(travelMs), return:'', actionType:detectType(tropas),
          tropas, tropasAdicionais:{}, sended:'Comando não enviado!',
          targetCatapult:'', sigil:false, fastSend:false
        },
        unit, dist, travelMs, sendDate, arrivalDate,
        wbLine:`${coords[0]}->${coords[1]},${dist.toFixed(2)},${unit},Attack,${gameFormat(arrivalDate)},${msToHMSms(travelMs)},${gameFormat(sendDate)},1`
      });
    }catch(e){ /* skip */ }
  }
  return results;
}

function parseWorkbench(raw){
  const results=[];
  const lines=raw.split('\n').map(l=>l.trim()).filter(l=>l.includes('&spear='));
  for(const line of lines){
    try{
      const ampIdx=line.indexOf('&spear=');
      const head=line.substring(0,ampIdx).split('&');
      const troopStr=line.substring(ampIdx+1);
      const [srcId,dstId,slowUnit,arrMsStr,,sigilStr,fastStr]=head;
      const arrivalDate=new Date(Number(arrMsStr));
      const tropas={};
      const keys=['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'];
      troopStr.split('/').forEach(part=>{
        const eq=part.indexOf('=');
        if(eq<0) return;
        const key=part.substring(0,eq);
        const b64=part.substring(eq+1);
        if(!keys.includes(key)) return;
        if(!b64||b64===''){tropas[key]='';return;}
        try{const dec=atob(b64).replace(/\0/g,'').trim(); tropas[key]=(dec==='0'||dec==='')?'':dec;}
        catch(e){tropas[key]='';}
      });
      keys.forEach(k=>{if(!(k in tropas))tropas[k]='';});
      results.push({
        cmd:{
          id:generateId(), origem:'???|???', idOrigem:Number(srcId),
          destino:'???|???', idDestino:String(dstId),
          dateTime:localISO(arrivalDate), horaEnvio:'', duration:'', return:'',
          actionType:detectType(tropas), tropas, tropasAdicionais:{},
          sended:'Comando não enviado!', targetCatapult:'',
          sigil:sigilStr==='true', fastSend:fastStr==='true'
        },
        unit:slowUnit, dist:null, travelMs:null, sendDate:null, arrivalDate, wbLine:null
      });
    }catch(e){ /* skip */ }
  }
  return results;
}

function convert(){
  const wSpeed=parseFloat(document.getElementById('worldSpeed').value)||1;
  const uSpeed=parseFloat(document.getElementById('unitSpeed').value)||1;
  let parsed=[];
  if(activeTab==='bbcode'){
    const raw=document.getElementById('inpBB').value.trim();
    if(!raw){showStatus('Bitte BBCode einfügen.','err');return;}
    parsed=parseBBCode(raw,wSpeed,uSpeed);
  } else {
    const raw=document.getElementById('inpWB').value.trim();
    if(!raw){showStatus('Bitte Workbench-Zeilen einfügen.','err');return;}
    parsed=parseWorkbench(raw);
  }
  if(!parsed.length){showStatus('Keine gültigen Befehle erkannt. Format prüfen.','err');return;}

  let commands={};
  if(document.getElementById('mergeChk').checked){
    const existRaw=document.getElementById('existingJson').value.trim();
    if(existRaw){
      try{commands=JSON.parse(existRaw).commands||{};}
      catch(e){showStatus('Bestehende JSON ungültig.','err');return;}
    }
  }
  for(const{cmd}of parsed){
    const key=String(cmd.idOrigem);
    if(!commands[key])commands[key]=[];
    commands[key].push(cmd);
  }
  lastJson={commands};
  lastWb=parsed.map(r=>r.wbLine).filter(Boolean).join('\n');

  // Preview
  const tbody=document.getElementById('previewBody');
  tbody.innerHTML='';
  parsed.forEach(({unit,dist,travelMs,sendDate,arrivalDate,cmd},i)=>{
    tbody.innerHTML+=`<tr>
      <td>${i+1}</td>
      <td>${cmd.origem}</td><td>${cmd.destino}</td>
      <td><span class="badge">${unit}</span></td>
      <td>${dist!=null?dist.toFixed(2):'—'}</td>
      <td>${sendDate?gameFormat(sendDate):'—'}</td>
      <td>${gameFormat(arrivalDate)}</td>
      <td>${travelMs!=null?msToHMSms(travelMs):'—'}</td>
    </tr>`;
  });

  document.getElementById('previewCard').style.display='block';
  document.getElementById('outCard').style.display='block';
  document.getElementById('outJson').value=JSON.stringify(lastJson,null,2);
  document.getElementById('outWb').value=lastWb||'(nur bei BBCode verfügbar)';
  document.getElementById('dlJson').disabled=false;
  document.getElementById('dlCsv').disabled=!lastWb;

  // Auto filename with timestamp
  const now=new Date();
  const ts=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate())+'_'+pad(now.getHours())+'-'+pad(now.getMinutes())+'-'+pad(now.getSeconds());
  document.getElementById('filename').value=`${ts}_Anabol_de254`;

  showStatus(`✓ ${parsed.length} Befehl(e) erfolgreich konvertiert.`,'ok');
  document.getElementById('previewCard').scrollIntoView({behavior:'smooth',block:'start'});
}

function copyActive(){
  const txt=activeOutTab==='wb'
    ? document.getElementById('outWb').value
    : document.getElementById('outJson').value;
  if(!txt){showStatus('Nichts zu kopieren.','err');return;}
  navigator.clipboard.writeText(txt).then(()=>showStatus('In Zwischenablage kopiert!','ok'));
}

function downloadFile(type){
  const base=document.getElementById('filename').value.trim()||'export';
  if(type==='json'&&lastJson){
    triggerDownload(new Blob([JSON.stringify(lastJson,null,2)],{type:'application/json'}),base+'.json');
  } else if(type==='csv'&&lastWb){
    triggerDownload(new Blob([lastWb],{type:'text/plain'}),base+'.csv');
  }
}

function triggerDownload(blob,fname){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=fname; a.click();
  URL.revokeObjectURL(url);
  showStatus(`✓ "${fname}" wird heruntergeladen.`,'ok');
}

function clearAll(){
  ['inpBB','inpWB','outJson','outWb','existingJson'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('previewCard').style.display='none';
  document.getElementById('outCard').style.display='none';
  document.getElementById('status').className='status';
  document.getElementById('dlJson').disabled=true;
  document.getElementById('dlCsv').disabled=true;
  lastJson=null; lastWb=null;
}
