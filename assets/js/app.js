
"use strict";
const STORE_KEY = "grannySquares.v1";
const LANG_KEY = "grannySquares.lang";
let PAGE_SIZE = 120;

// ---------- i18n ----------
let LANG = localStorage.getItem(LANG_KEY) || "it";
const I18N = {
  it:{
    colors:"Colori", addColor:"+ Aggiungi colore",
    hint:"Il numero di giri equivale al numero di colori attivi. Disattiva un colore per ridurre i giri di uno: le combinazioni si ricalcolano, ma i granny square già completati restano salvati.",
    fAll:"Tutti", fTodo:"Da fare", fDone:"Completati", perPage:"per pagina", pageSizeTitle:"Combinazioni per pagina",
    counter:(n,total)=>`<b>${n}</b> colori attivi → <b>${n}</b> giri · <b>${total}</b> combinazioni`,
    pageOf:(cur,pages,start,end,len)=>`${cur} / ${pages}  ·  pagina ${start}–${end} di ${len}`,
    doneLabel:"✓ Completato", markDone:"Segna completato",
    emptyActive:"Nessun colore attivo. Attiva almeno un colore per vedere le combinazioni.",
    emptyTooMany:"Troppi colori attivi (max 10) per generare tutte le permutazioni.",
    doneCount:"completati",
    noneCompleted:"Nessun granny square completato ancora.",
    namePlaceholder:"Nome",
    toggleTitle:"Attiva/disattiva", delTitle:"Elimina", delColor:"Eliminare questo colore? I granny square già completati con questo colore restano salvati.",
    newColor:(n)=>"Colore "+n,
    reset:"Azzera dati", resetTitle:"Azzera tutto (colori e completati)", resetConfirm:"Azzerare TUTTO (colori e completati)?",
    cloud:"Cloud", cloudTitle:"Sincronizzazione cloud Supabase",
    cloudTitleModal:"Sincronizzazione cloud", cloudDesc:"Salva colori e granny square completati su Supabase: restano permanenti e sincronizzati tra dispositivi. Le credenziali restano solo in questo browser.",
    sbUrlLabel:"Project URL", sbKeyLabel:"Publishable / anon key",
    cloudSave:"Connetti e sincronizza", cloudTest:"Solo prova", cloudClear:"Disconnetti", cloudClose:"Chiudi",
    cloudCreateLink:"Crea un progetto su supabase.com →",
    cloudConnected:"Connesso.", cloudDisconnected:"Disconnesso. I dati restano salvati solo in questo browser.",
    cloudTesting:"Provo la connessione…",
    cloudOkFound:"Connessione riuscita (trovato stato remoto).", cloudOkEmpty:"Connessione riuscita (tabella vuota: la prima sincronizzazione creerà il record).",
    cloudFail:"Connessione fallita. Controlla URL, anon key e di aver eseguito lo script SQL (vedi istruzioni).",
    cloudEnter:"Inserisci URL e anon key.", cloudConnecting:"Connessione in corso…", cloudSyncing:"Sincronizzo…",
    cloudSynced:"Sincronizzato. Dati permanenti e condivisi tra dispositivi.",
    cloudFail2:"Connessione fallita. Controlla URL, anon key e di aver eseguito lo script SQL.",
  },
  en:{
    colors:"Colors", addColor:"+ Add color",
    hint:"The number of rounds equals the number of active colors. Disable a colour to reduce the rounds by one: combinations are recalculated, but already completed granny squares stay saved.",
    fAll:"All", fTodo:"To do", fDone:"Completed", perPage:"per page", pageSizeTitle:"Combinations per page",
    counter:(n,total)=>`<b>${n}</b> active colours → <b>${n}</b> rounds · <b>${total}</b> combinations`,
    pageOf:(cur,pages,start,end,len)=>`${cur} / ${pages}  ·  page ${start}–${end} of ${len}`,
    doneLabel:"✓ Completed", markDone:"Mark complete",
    emptyActive:"No active colour. Activate at least one colour to see combinations.",
    emptyTooMany:"Too many active colours (max 10) to generate all permutations.",
    doneCount:"completed",
    noneCompleted:"No granny square completed yet.",
    namePlaceholder:"Name",
    toggleTitle:"Enable/disable", delTitle:"Delete", delColor:"Delete this colour? Already completed granny squares with this colour stay saved.",
    newColor:(n)=>"Colour "+n,
    reset:"Reset data", resetTitle:"Reset all (colours and completed)", resetConfirm:"Reset ALL (colours and completed)?",
    cloud:"Cloud", cloudTitle:"Supabase cloud sync",
    cloudTitleModal:"Cloud sync", cloudDesc:"Save colours and completed granny squares to Supabase: they stay permanent and synced across devices. Credentials stay only in this browser.",
    sbUrlLabel:"Project URL", sbKeyLabel:"Publishable / anon key",
    cloudSave:"Connect and sync", cloudTest:"Test only", cloudClear:"Disconnect", cloudClose:"Close",
    cloudCreateLink:"Create a project on supabase.com →",
    cloudConnected:"Connected.", cloudDisconnected:"Disconnected. Data stays saved only in this browser.",
    cloudTesting:"Testing connection…",
    cloudOkFound:"Connection successful (remote state found).", cloudOkEmpty:"Connection successful (empty table: first sync will create the record).",
    cloudFail:"Connection failed. Check URL, anon key and that you ran the SQL script (see instructions).",
    cloudEnter:"Enter URL and anon key.", cloudConnecting:"Connecting…", cloudSyncing:"Syncing…",
    cloudSynced:"Synced. Permanent data, shared across devices.",
    cloudFail2:"Connection failed. Check URL, anon key and that you ran the SQL script.",
  },
};
const t = (k, ...a) => { const v = I18N[LANG][k]; return typeof v === "function" ? v(...a) : v; };
function applyLang(){
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach(el=>{ el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-title]").forEach(el=>{ el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll("#langSwitch button").forEach(b=> b.classList.toggle("active", b.dataset.lang===LANG));
}

const state = {
  colors: [],
  done: {},
  filter: "all",
  page: 0,
};

let uid = 1;
function nextId(){ return "c"+(uid++); }

let supa = null;          // supabase client
let supaConnected = false;
let supaRow = null;       // cached remote row
let syncTimer = null;
let syncing = false;      // guard against pull/push recursion

function localLoad(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(raw){
      const d = JSON.parse(raw);
      state.colors = d.colors || [];
      state.done = d.done || {};
      uid = d.uid || (state.colors.reduce((m,c)=>Math.max(m,parseInt((c.id||"c1").slice(1))||1),1)+1);
      return true;
    }
  }catch(e){ console.warn("load failed", e); }
  return false;
}
function localSave(){
  localStorage.setItem(STORE_KEY, JSON.stringify({colors:state.colors, done:state.done, uid}));
}
// ---------- persistence ----------
function load(){
  if(!localLoad()) seed();
}
function save(){
  localSave();
  scheduleCloudPush();
}
function seed(){
  const palette = [
    {name:"Bordeaux", rgb:[150,40,50]},
    {name:"Zafferano", rgb:[214,150,40]},
    {name:"Crema",    rgb:[238,222,188]},
    {name:"Salvia",   rgb:[120,158,110]},
    {name:"Lago",     rgb:[86,128,150]},
    {name:"Prugna",   rgb:[120,78,120]},
  ];
  state.colors = palette.map(p=>({id:nextId(),name:p.name,r:p.rgb[0],g:p.rgb[1],b:p.rgb[2],enabled:true}));
  localSave();
}

// ---------- Supabase ----------
const SB_KEY = "grannySquares.supabase";
const TABLE = "granny_state";
const PK = "id";
const ROW_ID = "single";

function readCreds(){ try{ return JSON.parse(localStorage.getItem(SB_KEY) || "null"); }catch(e){ return null; } }
function writeCreds(c){ if(c) localStorage.setItem(SB_KEY, JSON.stringify(c)); else localStorage.removeItem(SB_KEY); }
function setCloudDot(s){
  const dot=document.getElementById("cloudDot");
  if(!dot) return;
  dot.classList.toggle("on", s==="on"); dot.classList.toggle("err", s==="err");
}
async function connectSupabase(creds){
  if(!window.supabase || !creds || !creds.url || !creds.key) return false;
  try{
    supa = window.supabase.createClient(creds.url, creds.key);
    const { data, error } = await supa.from(TABLE).select("*").eq(PK, ROW_ID).maybeSingle();
    if(error) throw error;
    supaConnected = true; supaRow = data;
    writeCreds(creds); setCloudDot("on");
    return true;
  }catch(e){
    supaConnected=false; supa=null; setCloudDot("err");
    return false;
  }
}
function applyRemote(d){
  if(!d || !d.data) return;
  let r; try{ r = typeof d.data === "string" ? JSON.parse(d.data) : d.data; }catch(e){ return; }
  if(!r || typeof r !== "object") return;
  if(Array.isArray(r.colors)) state.colors = r.colors;
  if(r.done && typeof r.done === "object") state.done = r.done;
  if(typeof r.uid === "number") uid = r.uid;
  localSave();
}
async function cloudPull(){
  if(!supaConnected || !supa) return;
  syncing = true;
  try{
    const { data, error } = await supa.from(TABLE).select("*").eq(PK, ROW_ID).maybeSingle();
    if(error) throw error;
    supaRow = data;
    if(data && data.data){ applyRemote(data); renderColors(); renderCombos(); }
  }catch(e){ console.warn("pull failed", e); setCloudDot("err"); }
  finally{ syncing = false; }
}
async function cloudPush(){
  if(!supaConnected || !supa) return;
  if(syncing) return;
  syncing = true;
  try{
    const payload = { colors: state.colors, done: state.done, uid };
    const body = { [PK]: ROW_ID, data: payload, updated_at: new Date().toISOString() };
    const { data, error } = await supa.from(TABLE).upsert(body).select().maybeSingle();
    if(error) throw error;
    supaRow = data; setCloudDot("on");
  }catch(e){ console.warn("push failed", e); setCloudDot("err"); }
  finally{ syncing = false; }
}
function scheduleCloudPush(){
  if(!supaConnected) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(cloudPush, 800);
}

// ---------- helpers ----------
const active = ()=> state.colors.filter(c=>c.enabled);
const hex = c=>"#"+[c.r,c.g,c.b].map(v=>v.toString(16).padStart(2,"0")).join("");
const fromHex = h=>{ h=h.replace("#",""); return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)}; };
const lum = c=>(0.299*c.r+0.587*c.g+0.114*c.b);
const contrast = c=> lum(c)>140 ? "rgba(0,0,0,.62)" : "rgba(255,255,255,.92)";
const keyOf = arr=> arr.map(c=>c.id).join("|");

// ---------- permutations (Heap's algorithm) ----------
function permutations(arr){
  const out=[];
  const n=arr.length;
  if(n===0) return [[]];
  if(n>10){ return null; }
  const a=arr.slice();
  const c=new Array(n).fill(0);
  out.push(a.slice());
  let i=1;
  while(i<n){
    if(c[i]<i){
      if(i%2===0){ [a[0],a[i]]=[a[i],a[0]]; } else { [a[c[i]],a[i]]=[a[i],a[c[i]]]; }
      out.push(a.slice());
      c[i]++; i=1;
    } else { c[i]=0; i++; }
    if(out.length>500000){ return out; }
  }
  return out;
}

// ---------- concentric granny square HTML ----------
// perm[0] = outermost ring (giro 1), last = center.
function grannyHtml(perm, size){
  const n=perm.length;
  if(n===0) return "";
  const gr = Math.min(14, size*0.09);
  let rings="";
  for(let k=0;k<n;k++){
    const side = (100 - (k*100/n)).toFixed(3);
    const kk = (k/n).toFixed(3);
    rings += `<div class="ring" style="width:${side}%;background:${hex(perm[k])};--k:${kk}"></div>`;
  }
  return `<div class="granny" style="max-width:${size}px;--gr:${gr}px">${rings}</div>`;
}

// ---------- render colors ----------
function renderColors(){
  const list=document.getElementById("colorList");
  list.innerHTML="";
  state.colors.forEach((c,idx)=>{
    const row=document.createElement("div");
    row.className="color-row";
    row.innerHTML=`
      <label class="swatch" style="background:${hex(c)}">
        <input type="color" value="${hex(c)}" data-i="${idx}" data-act="color">
      </label>
      <div class="cname-wrap">
        <input class="cname" value="${c.name.replace(/"/g,'&quot;')}" data-i="${idx}" data-act="name" placeholder="${t("namePlaceholder")}">
        <span class="crgb">${c.r}, ${c.g}, ${c.b}</span>
      </div>
      <div class="row-actions">
        <div class="toggle ${c.enabled?'on':''}" data-i="${idx}" data-act="toggle" title="${t("toggleTitle")}" style="--tc:${hex(c)}"></div>
        <button class="btn sm" data-i="${idx}" data-act="del" title="${t("delTitle")}">✕</button>
      </div>`;
    list.appendChild(row);
  });
}

// ---------- render combinations ----------
let allCombos=null;
function renderCombos(){
  const grid=document.getElementById("grid");
  const pager=document.getElementById("pager");
  const counter=document.getElementById("counter");
  const A=active();
  const n=A.length;

  if(n===0 && state.filter!=="done"){
    allCombos=null;
    grid.innerHTML=`<div class="empty">${t("emptyActive")}</div>`;
    pager.innerHTML="";
    counter.textContent="";
    return;
  }
  if(n===0){ // filter==="done" with no active colours: still show saved ones
    allCombos=null;
  }

  if(n>0){
    allCombos=permutations(A);
    if(allCombos===null){
      grid.innerHTML=`<div class="empty">${t("emptyTooMany")}</div>`;
      pager.innerHTML=""; counter.textContent="";
      return;
    }
  } else {
    allCombos=[];
  }

  const byId=new Map(state.colors.map(c=>[c.id,c]));
  const savedDone = Object.keys(state.done).map(key=>{
    const ids=key.split("|");
    return ids.map(id=>byId.get(id)).filter(Boolean);
  }).filter(arr=>arr.length>0);

  let combos;
  if(state.filter==="done"){
    combos = savedDone;
    if(combos.length===0){
      grid.innerHTML=`<div class="empty">${t("noneCompleted")}</div>`;
      pager.innerHTML="";
      counter.innerHTML=`<b>0</b> ${t("doneCount")}`;
      return;
    }
  } else if(state.filter=="todo"){
    combos = allCombos.filter(p=>!state.done[keyOf(p)]);
  } else {
    combos = allCombos;
  }

  const total=allCombos.length;
  const loc = LANG==="it"?"it-IT":"en-US";
  if(state.filter=="done"){
    counter.innerHTML = `<b>${savedDone.length}</b> ${t("doneCount")}`;
  } else {
    counter.innerHTML=t("counter", n, total.toLocaleString(loc));
  }

  const pages=Math.ceil(combos.length/PAGE_SIZE)||1;
  if(state.page>=pages) state.page=pages-1;
  if(state.page<0) state.page=0;
  const start=state.page*PAGE_SIZE;
  const slice=combos.slice(start,start+PAGE_SIZE);

  const ringSize = n<=4?150: n<=6?140:128;

  grid.innerHTML="";
  const frag=document.createDocumentFragment();
  slice.forEach(perm=>{
    const key=keyOf(perm);
    const isDone=!!state.done[key];
    const size = perm.length<=4?150: perm.length<=6?140:128;
    const sq=document.createElement("div");
    sq.className="square"+(isDone?" done":"");
    sq.dataset.key=key;
    sq.innerHTML=
      grannyHtml(perm, size) +
      `<div class="badge">✓</div>`;
    sq.addEventListener("click",()=>{
      if(state.done[key]) delete state.done[key]; else state.done[key]=true;
      save();
      renderCombos();
    });
    frag.appendChild(sq);
  });
  grid.appendChild(frag);

  pager.innerHTML="";
  if(pages>1){
    const prev=document.createElement("button");
    prev.className="btn sm"; prev.textContent="‹"; prev.disabled=state.page===0;
    prev.onclick=()=>{state.page--;renderCombos();};
    pager.appendChild(prev);
    const info=document.createElement("span");
    info.className="info";
    info.textContent=t("pageOf", state.page+1, pages, start+1, Math.min(start+PAGE_SIZE,combos.length), combos.length);
    pager.appendChild(info);
    const next=document.createElement("button");
    next.className="btn sm"; next.textContent="›"; next.disabled=state.page===pages-1;
    next.onclick=()=>{state.page++;renderCombos();};
    pager.appendChild(next);
  }
}

// ---------- events ----------
document.getElementById("colorList").addEventListener("click",e=>{
  const el=e.target.closest("[data-act]");
  if(!el) return;
  const i=+el.dataset.i;
  const act=el.dataset.act;
  if(act=="toggle"){
    state.colors[i].enabled=!state.colors[i].enabled;
    save(); renderColors(); state.page=0; renderCombos();
  } else if(act=="del"){
    if(!confirm(t("delColor"))) return;
    state.colors.splice(i,1);
    save(); renderColors(); state.page=0; renderCombos();
  }
});

document.getElementById("colorList").addEventListener("input",e=>{
  const el=e.target.closest("[data-act]");
  if(!el) return;
  const i=+el.dataset.i;
  if(el.dataset.act=="color"){
    const {r,g,b}=fromHex(el.value);
    Object.assign(state.colors[i],{r,g,b});
    el.closest(".swatch").style.background=el.value;
    const rgb=el.closest(".color-row").querySelector(".crgb");
    rgb.textContent=`${r}, ${g}, ${b}`;
    save(); renderCombos();
  } else if(el.dataset.act=="name"){
    state.colors[i].name=el.value;
    save();
  }
});

document.getElementById("addBtn").addEventListener("click",()=>{
  state.colors.push({id:nextId(),name:t("newColor",(state.colors.length+1)),r:130,g:120,b:110,enabled:true});
  save(); renderColors(); state.page=0; renderCombos();
});
document.querySelectorAll(".filter").forEach(b=>{
  b.addEventListener("click",()=>{
    state.filter=b.dataset.f;
    document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));
    state.page=0; renderCombos();
  });
});
document.getElementById("pageSize").addEventListener("change",e=>{
  PAGE_SIZE=+e.target.value;
  state.page=0; renderCombos();
});
function resetBtnHandler(){
  if(!confirm(t("resetConfirm"))) return;
  localStorage.removeItem(STORE_KEY);
  state.colors=[]; state.done={}; uid=1; seed();
  state.page=0; state.filter="all";
  document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x.dataset.f==="all"));
  renderColors(); renderCombos();
}
document.getElementById("resetBtn").addEventListener("click",resetBtnHandler);

// ---------- cloud modal ----------
function cloudStatus(msg, kind){
  const s=document.getElementById("cloudStatus");
  s.textContent=msg||""; s.className="status"+(kind?" "+kind:"");
}
document.getElementById("cloudBtn").addEventListener("click",()=>{
  const c=readCreds();
  if(c){ document.getElementById("sbUrl").value=c.url; document.getElementById("sbKey").value=c.key; }
  cloudStatus(supaConnected?t("cloudConnected"):"", supaConnected?"ok":"");
  document.getElementById("cloudOverlay").classList.add("show");
});
document.getElementById("cloudClose").addEventListener("click",()=>{
  document.getElementById("cloudOverlay").classList.remove("show");
});
document.getElementById("cloudOverlay").addEventListener("click",e=>{
  if(e.target.id=="cloudOverlay") document.getElementById("cloudOverlay").classList.remove("show");
});
document.getElementById("cloudClear").addEventListener("click",()=>{
  writeCreds(null); supa=null; supaConnected=false; supaRow=null; setCloudDot("");
  cloudStatus(t("cloudDisconnected"), "");
});
document.getElementById("cloudTest").addEventListener("click",async()=>{
  const url=document.getElementById("sbUrl").value.trim();
  const key=document.getElementById("sbKey").value.trim();
  cloudStatus(t("cloudTesting"), "");
  const ok=await connectSupabase({url,key});
  if(ok){
    cloudStatus(supaRow && supaRow.data ? t("cloudOkFound") : t("cloudOkEmpty"), "ok");
  } else {
    cloudStatus(t("cloudFail"), "err");
  }
});
document.getElementById("cloudSave").addEventListener("click",async()=>{
  const url=document.getElementById("sbUrl").value.trim();
  const key=document.getElementById("sbKey").value.trim();
  if(!url||!key){ cloudStatus(t("cloudEnter"), "err"); return; }
  cloudStatus(t("cloudConnecting"), "");
  const ok=await connectSupabase({url,key});
  if(!ok){ cloudStatus(t("cloudFail2"), "err"); return; }
  cloudStatus(t("cloudSyncing"), "");
  await cloudPull();
  await cloudPush();
  cloudStatus(t("cloudSynced"), "ok");
  renderColors(); renderCombos();
  setTimeout(()=>document.getElementById("cloudOverlay").classList.remove("show"), 900);
});

// ---------- init ----------
applyLang();
load();
document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x.dataset.f=="all"));
renderColors();
renderCombos();
document.getElementById("langSwitch").addEventListener("click",e=>{
  const b=e.target.closest("button[data-lang]");
  if(!b) return;
  LANG=b.dataset.lang;
  localStorage.setItem(LANG_KEY, LANG);
  applyLang();
  renderColors(); renderCombos();
});
(async()=>{
  const c=readCreds();
  if(c){
    const ok=await connectSupabase(c);
    if(ok){ await cloudPull(); renderColors(); renderCombos(); }
  }
})();
