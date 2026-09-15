import { Store } from './store.js';
import { BIBLE_MESSAGES } from './data.js';
import { brl, fmtDayShort, fmtTime, startOfWeek, endOfWeek, toLocalDateKey, addMinutes, uid, escapeHtml } from './utils.js';

const store = new Store();
const app = document.querySelector('#app');

const state = {
  view: 'dashboard',
  selectedMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedWeek: startOfWeek(new Date()),
  selectedDateKey: null,
  modal: null,
  draftAppointment: null,
  calendarSelectionMode: null,
  selectionOrigin: null,
  returnClientId: null
};

const STUDIO_WHATSAPP = '5547989259820';
const STUDIO_ADDRESS = 'Rua Adriano Schondermank, 279, Costa e Silva, Joinville - SC';
const BOOKING_RULES_IMAGE = './assets/informacoes-agendamento.jpg';
let navigationStack = ['dashboard'];

const navItems = [
  ['dashboard', 'Painel', '⌂'],
  ['calendar', 'Agenda', '◫'],
  ['finance', 'Financeiro', '$'],
  ['clients', 'Clientes', '♙'],
  ['catalog', 'Catálogo', '▦']
];

function registerSW() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.error);
}

function currentData() { return store.state; }
function formatDuration(mins) { const m=Number(mins||0); const h=Math.floor(m/60); const r=m%60; return h ? `${h}h${String(r).padStart(2,'0')}` : `${r}min`; }
function formatPhone(v=''){const d=String(v).replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,''); if(d.length===11)return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`; if(d.length===10)return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`; return v;}
function addHistory(a,type,label,meta={}){a.history=a.history||[];a.history.push({id:uid('hist'),at:new Date().toISOString(),type,label,...meta});}
function maintenanceCount(clientId){let n=0;const aps=currentData().appointments.filter(a=>a.clientId===clientId&&a.status!=='cancelled').sort((a,b)=>new Date(a.start)-new Date(b.start));for(const a of aps){if(a.procedureIds?.includes('alongamento')) n=0; if(a.procedureIds?.includes('manutencao')) n++;}return n;}
function hasConflict(candidate,ignoreId=null){const s=new Date(candidate.start),e=new Date(candidate.end);return currentData().appointments.find(a=>a.id!==ignoreId&&a.status!=='cancelled'&&new Date(a.start)<e&&new Date(a.end)>s);}
function goView(view,push=true){if(push&&state.view!==view)navigationStack.push(view);state.view=view;state.modal=null;state.calendarSelectionMode=null;render();}
function goBack(){if(state.modal){state.modal=null;render();return;}if(state.calendarSelectionMode){state.calendarSelectionMode=null;state.draftAppointment=null;state.view='dashboard';navigationStack=['dashboard'];render();return;}if(state.view!=='dashboard'){navigationStack.pop();state.view=navigationStack[navigationStack.length-1]||'dashboard';render();return;}history.back();}

function appointmentsInRange(start, end) {
  return currentData().appointments
    .filter(a => a.status !== 'cancelled')
    .filter(a => new Date(a.start) >= start && new Date(a.start) <= end)
    .sort((a,b) => new Date(a.start) - new Date(b.start));
}

function paymentTotalForAppointment(id) {
  return currentData().payments.filter(p => p.appointmentId === id).reduce((s,p) => s + Number(p.amount), 0);
}

function weekLabel(d) {
  const s = startOfWeek(d); const e = endOfWeek(d);
  const f = (x) => `${String(x.getDate()).padStart(2,'0')}/${String(x.getMonth()+1).padStart(2,'0')}`;
  return `${f(s)} – ${f(e)}`;
}

function header() {
  const sandbox = store.environment === 'sandbox';
  return `
    <header class="topbar ${sandbox ? 'sandbox' : ''}">
      <div class="brand-wrap">${state.view!=='dashboard' ? '<button class="top-back" id="topBack" aria-label="Voltar">‹</button>' : ''}
        <img src="./assets/logo-juliane-boone.png" class="brand-logo" alt="Juliane Boone Nail Designer" />
      </div>
      <div class="top-actions">
        <button class="chip ${sandbox ? 'active' : ''}" id="envSwitch">${sandbox ? 'TESTE' : 'OFICIAL'}</button>
        <button class="icon-btn" id="adminBtn" title="ADM">⚙</button>
      </div>
      ${sandbox ? '<div class="sandbox-strip">AMBIENTE DE TESTES • dados separados do oficial</div>' : ''}
    </header>`;
}

function bottomNav() {
  return `
    <nav class="bottom-nav">
      ${navItems.slice(0,2).map(([id,label,icon]) => navButton(id,label,icon)).join('')}
      <button class="fab" id="newAppointment" aria-label="Novo agendamento">+</button>
      ${navItems.slice(2).map(([id,label,icon]) => navButton(id,label,icon)).join('')}
    </nav>`;
}

function navButton(id,label,icon) {
  return `<button class="nav-item ${state.view===id?'active':''}" data-view="${id}"><span>${icon}</span><small>${label}</small></button>`;
}

function dashboard() {
  const data = currentData();
  const start = startOfWeek(state.selectedWeek), end = endOfWeek(state.selectedWeek);
  const weekAppointments = appointmentsInRange(start, end);
  const received = data.payments.filter(p => new Date(p.at) >= start && new Date(p.at) <= end).reduce((s,p)=>s+Number(p.amount),0);
  const expected = weekAppointments.reduce((s,a)=>s+Number(a.totalValue||0),0);
  const expenses = data.expenses.filter(x=>new Date(x.date)>=start&&new Date(x.date)<=end).reduce((s,x)=>s+Number(x.value||0),0);
  const receivable = Math.max(0, expected - weekAppointments.reduce((s,a)=>s+paymentTotalForAppointment(a.id),0));
  const verse = BIBLE_MESSAGES[new Date().getDate() % BIBLE_MESSAGES.length];

  return `<main class="content dashboard-content">
    <section class="verse-card dashboard-verse">${escapeHtml(verse)}</section>

    <section class="hero-card dashboard-hero">
      <div><span class="eyebrow">PAINEL</span><h1>Hoje e sua semana</h1><p>Visão rápida do Studio.</p></div>
    </section>

    <section class="metric-grid">
      <article class="metric"><span>Recebido</span><strong>${brl(received)}</strong><small>semana selecionada</small></article>
      <article class="metric"><span>A receber</span><strong>${brl(receivable)}</strong><small>agendamentos da semana</small></article>
      <article class="metric"><span>Atendimentos</span><strong>${weekAppointments.length}</strong><small>na semana</small></article>
      <article class="metric"><span>Gastos produtos</span><strong>${brl(expenses)}</strong><small>na semana</small></article>
    </section>

    <section class="section-card">
      <div class="section-head">
        <div><span class="eyebrow">ATENDIMENTOS DA SEMANA</span><h2>${weekLabel(state.selectedWeek)}</h2></div>
        <div class="week-controls"><button id="prevWeek">‹</button><button id="thisWeek">Esta semana</button><button id="nextWeek">›</button></div>
      </div>
      <div class="appointment-list">
        ${weekAppointments.length ? weekAppointments.map(appointmentRow).join('') : '<div class="empty">Nenhum atendimento nesta semana.</div>'}
      </div>
    </section>

  </main>`;
}

function appointmentRow(a) {
  const client = currentData().clients.find(c=>c.id===a.clientId);
  const paid = paymentTotalForAppointment(a.id);
  const status = paid >= Number(a.totalValue||0) && a.totalValue > 0 ? 'Pago' : paid > 0 ? 'Parcial' : 'Pendente';
  return `<button class="appointment-row" data-appointment="${a.id}">
    <div class="date-box"><b>${fmtDayShort(a.start).split(' ')[0]}</b><small>${fmtTime(a.start)}–${fmtTime(a.end)}</small></div>
    <div class="appointment-main"><strong>${escapeHtml(client?.name || 'Cliente')}</strong><span>${escapeHtml(a.procedureNames?.join(', ') || 'Atendimento')}</span></div>
    <div class="payment-state ${status.toLowerCase()}">${status}</div><span class="chevron">›</span>
  </button>`;
}

function calendar() {
  const d = state.selectedMonth;
  const year = d.getFullYear(), month = d.getMonth();
  const first = new Date(year,month,1), last = new Date(year,month+1,0);
  const offset = first.getDay();
  const cells = [];
  for (let i=0;i<offset;i++) cells.push(null);
  for (let day=1;day<=last.getDate();day++) cells.push(new Date(year,month,day));
  while (cells.length % 7) cells.push(null);
  const monthLabel = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(d);
  return `<main class="content ${state.calendarSelectionMode?'calendar-selecting':''}"><section class="section-card calendar-card ${state.calendarSelectionMode?'selection-focus':''}">
    <div class="section-head"><div><span class="eyebrow">AGENDA</span><h1 class="capitalize">${monthLabel}</h1></div>
      <div class="week-controls"><button id="prevMonth">‹</button><button id="todayMonth">Hoje</button><button id="nextMonth">›</button></div>
    </div>
    ${state.calendarSelectionMode?`<div class="calendar-selection-hint"><button id="cancelCalendarSelection" aria-label="Voltar">‹</button><span>${state.calendarSelectionMode==='maintenance'?'Escolha o dia do retorno':'Toque no dia desejado'}</span></div>`:''}
    <div class="legend"><span><i class="dot free"></i>Livre</span><span><i class="dot booked"></i>Atendimento</span><span><i class="dot personal"></i>Particular</span><span><i class="dot mixed"></i>Misto</span></div>
    <div class="calendar-grid dow">${['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map(x=>`<b>${x}</b>`).join('')}</div>
    <div class="calendar-grid">${cells.map(calCell).join('')}</div>
  </section></main>`;
}

function calCell(date) {
  if (!date) return '<div></div>';
  const key = toLocalDateKey(date);
  const aps = currentData().appointments.filter(a=>toLocalDateKey(new Date(a.start))===key && a.status!=='cancelled');
  const personal = aps.filter(a=>a.type==='personal');
  const service = aps.filter(a=>a.type!=='personal');
  const cls = personal.length && service.length ? 'mixed' : personal.length ? 'personal' : service.length ? 'booked' : 'free';
  const today = key===toLocalDateKey(new Date());
  return `<button class="day-cell ${cls} ${today?'today':''} ${state.calendarSelectionMode?'awaiting-choice':''}" data-day="${key}">
    <span class="day-number">${date.getDate()}</span>
    ${aps.length ? `<span class="count-badge">${aps.length}</span>` : ''}
    <i class="dot ${cls}"></i>
  </button>`;
}

function finance() {
  const data = currentData();
  const received = data.payments.reduce((s,p)=>s+Number(p.amount),0);
  const billed = data.appointments.filter(a=>a.type!=='personal'&&a.status!=='cancelled').reduce((s,a)=>s+Number(a.totalValue||0),0);
  const receivable = Math.max(0,billed-received);
  const expenses = data.expenses.reduce((s,x)=>s+Number(x.value||0),0);
  return `<main class="content">
    <section class="hero-card"><span class="eyebrow">FINANCEIRO</span><h1>Entradas e gastos</h1><p>Controle simples do Studio.</p></section>
    <section class="metric-grid"><article class="metric"><span>Recebido</span><strong>${brl(received)}</strong></article><button class="metric metric-button" id="receivableCard"><span>A receber</span><strong>${brl(receivable)}</strong></button><article class="metric"><span>Gastos produtos</span><strong>${brl(expenses)}</strong></article><article class="metric"><span>Resultado</span><strong>${brl(received-expenses)}</strong></article></section>
    <section class="section-card"><div class="section-head"><div><span class="eyebrow">GASTOS COM PRODUTOS</span><h2>Lançamentos</h2></div><button class="primary small" id="addExpense">+ Gasto</button></div>
      <div class="simple-list">${data.expenses.length?data.expenses.slice().reverse().map(x=>`<div class="simple-row"><div><strong>${escapeHtml(x.description)}</strong><span>${new Date(x.date).toLocaleDateString('pt-BR')}</span></div><b>${brl(x.value)}</b></div>`).join(''):'<div class="empty">Nenhum gasto lançado.</div>'}</div>
    </section>
  </main>`;
}

function clients() {
  const data = currentData();
  return `<main class="content"><section class="section-card"><div class="section-head"><div><span class="eyebrow">CLIENTES</span><h1>Clientes</h1></div><button class="primary small" id="addClient">+ Cliente</button></div>
    <div class="simple-list">${data.clients.length?data.clients.map(c=>`<button class="client-row client-columns" data-client="${c.id}"><strong>${escapeHtml(c.name)}</strong><span class="client-phone">${escapeHtml(formatPhone(c.whatsapp||''))}</span><span class="chevron">›</span></button>`).join(''):'<div class="empty">Nenhuma cliente cadastrada.</div>'}</div>
  </section></main>`;
}

function publicCatalogUrl() {
  const u = new URL(window.location.href);
  u.search = '';
  u.hash = '';
  u.searchParams.set('catalogo','1');
  return u.toString();
}

function catalogCards(publicMode=false) {
  return currentData().procedures.filter(p=>p.active).map(p=>`<article class="portfolio-card">
    <img src="${escapeHtml(p.image||'./assets/logo-juliane-boone.png')}" alt="${escapeHtml(p.name)}" loading="lazy">
    <div class="portfolio-body"><div class="portfolio-title"><strong>${escapeHtml(p.name)}</strong><b>${brl(p.value)}</b></div><span class="portfolio-time">${formatDuration(p.durationMin)}</span><p>${escapeHtml(p.description||'')}</p>${publicMode?`<button class="primary full catalog-whatsapp" data-catalog-procedure="${p.id}">Quero agendar</button>`:''}</div>
  </article>`).join('');
}

function catalog() {
  return `<main class="content"><section class="hero-card"><span class="eyebrow">CATÁLOGO</span><h1>Procedimentos</h1><p>Conheça os procedimentos, valores e cuidados de cada serviço.</p></section>
  <section class="catalog-showcase">${catalogCards(false)}</section>
  <button class="primary full" id="shareCatalog">Compartilhar catálogo online</button></main>`;
}

function renderPublicCatalog() {
  document.body.classList.add('public-catalog-page');
  app.innerHTML=`<main class="public-catalog"><header class="public-catalog-head"><img src="./assets/logo-juliane-boone.png" alt="Juliane Boone Nail Designer"><p>Escolha seu procedimento e fale com a Juliane pelo WhatsApp.</p></header><section class="catalog-showcase">${catalogCards(true)}</section><div class="public-actions"><button class="secondary full" id="howToGet">📍 Como chegar</button></div><footer>Juliane Boone • Nail Designer</footer></main>`;
  document.querySelectorAll('[data-catalog-procedure]').forEach(btn=>btn.onclick=()=>{
    const p=currentData().procedures.find(x=>x.id===btn.dataset.catalogProcedure);
    const msg=`Olá! 😊 Vi o catálogo da Juliane Boone e gostaria de agendar ${p?.name||'um procedimento'} – ${brl(p?.value||0)}.`;
    window.open(`https://wa.me/${STUDIO_WHATSAPP}?text=${encodeURIComponent(msg)}`,'_blank');
  });
  document.querySelector('#howToGet')?.addEventListener('click',()=>window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STUDIO_ADDRESS)}`,'_blank'));
}

function admin() {
  return `<main class="content"><section class="section-card"><div class="section-head"><div><span class="eyebrow">ADM</span><h1>Procedimentos</h1></div></div>
  <p class="muted">Altere valores, tempos, descrição e imagem sem atualizar o código. Mudanças aqui afetam novos agendamentos e o catálogo; históricos anteriores permanecem.</p>
  <div class="procedure-table"><div class="procedure-table-head"><b>Procedimento</b><b>Valor</b><b>Tempo</b><b></b></div>${currentData().procedures.map(p=>`<button class="procedure-grid-row" data-procedure="${p.id}"><strong>${escapeHtml(p.name)}</strong><span>${brl(p.value)}</span><span>${formatDuration(p.durationMin)}</span><span>Editar</span></button>`).join('')}</div>
  ${store.environment==='sandbox'?'<button class="danger full" id="resetSandbox">Resetar Sandbox</button>':''}
  </section></main>`;
}
function renderModal() {
  if (!state.modal) return '';
  return `<div class="modal-backdrop"><div class="modal">${state.modal}</div></div>`;
}

function render() {
  if (new URLSearchParams(window.location.search).get('catalogo')==='1') { renderPublicCatalog(); return; }
  document.body.classList.toggle('calendar-choice-mode',!!state.calendarSelectionMode);
  const body = state.view==='dashboard'?dashboard():state.view==='calendar'?calendar():state.view==='finance'?finance():state.view==='clients'?clients():state.view==='catalog'?catalog():admin();
  app.innerHTML = `${header()}${body}${bottomNav()}${renderModal()}`;
  bind();
}

function bind() {
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>goView(b.dataset.view));
  document.querySelector('#adminBtn')?.addEventListener('click',()=>goView('admin'));
  document.querySelector('#topBack')?.addEventListener('click',goBack);
  document.querySelector('#envSwitch')?.addEventListener('click',()=>{
    const next = store.environment==='official'?'sandbox':'official';
    if (confirm(`Entrar no ambiente ${next==='sandbox'?'de TESTES':'OFICIAL'}?`)) { store.switchEnvironment(next); state.view='dashboard'; navigationStack=['dashboard']; render(); }
  });
  document.querySelector('#newAppointment')?.addEventListener('click', startAppointmentFlow);
  document.querySelector('#prevWeek')?.addEventListener('click',()=>{state.selectedWeek.setDate(state.selectedWeek.getDate()-7);render();});
  document.querySelector('#nextWeek')?.addEventListener('click',()=>{state.selectedWeek.setDate(state.selectedWeek.getDate()+7);render();});
  document.querySelector('#thisWeek')?.addEventListener('click',()=>{state.selectedWeek=startOfWeek(new Date());render();});
  document.querySelector('#prevMonth')?.addEventListener('click',()=>{state.selectedMonth=new Date(state.selectedMonth.getFullYear(),state.selectedMonth.getMonth()-1,1);render();});
  document.querySelector('#nextMonth')?.addEventListener('click',()=>{state.selectedMonth=new Date(state.selectedMonth.getFullYear(),state.selectedMonth.getMonth()+1,1);render();});
  document.querySelector('#todayMonth')?.addEventListener('click',()=>{const n=new Date();state.selectedMonth=new Date(n.getFullYear(),n.getMonth(),1);render();});
  document.querySelector('#cancelCalendarSelection')?.addEventListener('click',goBack);
  document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>openDay(b.dataset.day,!!state.calendarSelectionMode));
  document.querySelectorAll('[data-appointment]').forEach(b=>b.onclick=()=>openAppointment(b.dataset.appointment));
  document.querySelectorAll('[data-client]').forEach(b=>b.onclick=()=>openClient(b.dataset.client));
  document.querySelectorAll('[data-procedure]').forEach(b=>b.onclick=()=>editProcedure(b.dataset.procedure));
  document.querySelector('#addClient')?.addEventListener('click', addClient);
  document.querySelector('#addExpense')?.addEventListener('click', addExpense);
  document.querySelector('#receivableCard')?.addEventListener('click', openReceivables);
  document.querySelector('#shareCatalog')?.addEventListener('click', shareCatalog);
  document.querySelector('#resetSandbox')?.addEventListener('click',()=>{if(confirm('Resetar todos os dados do Sandbox?')){store.resetSandbox();render();}});
  document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=()=>{state.modal=null;if(state.calendarSelectionMode){state.calendarSelectionMode=null;state.view='dashboard';navigationStack=['dashboard'];}render();});
}

function openDay(key, selectable=false) {
  const aps = currentData().appointments.filter(a=>toLocalDateKey(new Date(a.start))===key&&a.status!=='cancelled').sort((a,b)=>new Date(a.start)-new Date(b.start));
  state.modal = `<div class="modal-head"><div><span class="eyebrow">${selectable?'ESCOLHA O DIA':'AGENDA DO DIA'}</span><h2>${new Date(key+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})}</h2></div><button data-close-modal>×</button></div>
  <div class="day-agenda">${aps.length?aps.map(a=>`<div class="day-slot"><b>${fmtTime(a.start)}–${fmtTime(a.end)}</b><span>${escapeHtml(a.procedureNames?.join(', ') || (a.type==='personal'?'Particular':'Atendimento'))}</span></div>`).join(''):'<div class="empty">Nenhum compromisso neste dia.</div>'}</div>
  ${selectable?`<button class="primary full" id="selectThisDay">Selecionar este dia</button>`:''}`;
  render();
  if (selectable) document.querySelector('#selectThisDay')?.addEventListener('click',()=>{state.selectedDateKey=key;state.modal=null;state.calendarSelectionMode=null;openNewAppointmentForm();});
}

function startAppointmentFlow(clientId=null, origin='new') {
  state.draftAppointment = { procedureIds: [], notes:'', totalValue:0, clientId, origin };
  state.selectionOrigin=origin;
  state.calendarSelectionMode=origin==='maintenance'?'maintenance':'appointment';
  state.view='calendar';
  navigationStack=['dashboard','calendar'];
  render();
  setTimeout(()=>document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>openDay(b.dataset.day,true)),0);
}

function openNewAppointmentForm() {
  const clients=currentData().clients, procs=currentData().procedures.filter(p=>p.active);
  const preClient=state.draftAppointment?.clientId||'';
  const cycle=preClient?maintenanceCount(preClient):0;
  state.modal=`<div class="modal-head"><div><span class="eyebrow">NOVO AGENDAMENTO</span><h2>${new Date(state.selectedDateKey+'T12:00:00').toLocaleDateString('pt-BR')}</h2></div><button data-close-modal>×</button></div>
  <label>Cliente<select id="apptClient"><option value="">Selecione</option>${clients.map(c=>`<option value="${c.id}" ${c.id===preClient?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></label>
  <button class="secondary full compact" id="newClientFromAppointment">+ Cadastrar nova cliente</button>
  ${cycle>=2?`<div class="cycle-alert"><b>${cycle} manutenções desde a última aplicação.</b><span>Avaliar necessidade de nova aplicação.</span></div>`:''}
  ${state.selectionOrigin==='maintenance'?`<label class="check-row new-application-choice"><input type="checkbox" id="newApplicationChoice"><span><b>Nova aplicação</b><small>Marque se será necessário remover/refazer tudo.</small></span></label>`:''}
  <fieldset><legend>Procedimentos</legend>${procs.map(p=>`<label class="check-row"><input type="checkbox" value="${p.id}" class="proc-check" ${(state.selectionOrigin==='maintenance'&&p.id==='manutencao')?'checked':''}><span>${escapeHtml(p.name)}</span><b>${brl(p.value)}</b></label>`).join('')}</fieldset>
  <div class="two-col"><label>Início<input type="time" id="apptStart" value="09:00" step="60"></label><label>Fim<input type="time" id="apptEnd" value="09:00" step="60"></label></div>
  <label>Valor do atendimento<input type="number" id="apptValue" step="0.01" value="0"></label>
  <label>Anotações (opcional)<textarea id="apptNotes"></textarea></label>
  <button class="primary full" id="saveAppointment">Confirmar agendamento</button>`;
  render();
  const refreshCalc=()=>{const selected=[...document.querySelectorAll('.proc-check:checked')].map(x=>currentData().procedures.find(p=>p.id===x.value));const total=selected.reduce((s,p)=>s+Number(p.value||0),0),mins=selected.reduce((s,p)=>s+Number(p.durationMin||0),0);document.querySelector('#apptValue').value=total.toFixed(2);const startVal=document.querySelector('#apptStart').value||'09:00';const d=new Date(`${state.selectedDateKey}T${startVal}:00`),e=addMinutes(d,mins);document.querySelector('#apptEnd').value=`${String(e.getHours()).padStart(2,'0')}:${String(e.getMinutes()).padStart(2,'0')}`;};
  document.querySelector('#newClientFromAppointment').onclick=()=>addClient('appointment');
  document.querySelectorAll('.proc-check').forEach(x=>x.onchange=refreshCalc);document.querySelector('#apptStart').onchange=refreshCalc;
  document.querySelector('#newApplicationChoice')?.addEventListener('change',e=>{const m=document.querySelector('.proc-check[value="manutencao"]'),a=document.querySelector('.proc-check[value="alongamento"]');if(e.target.checked){if(m)m.checked=false;if(a)a.checked=true;}else{if(a)a.checked=false;if(m)m.checked=true;}refreshCalc();});
  document.querySelector('#saveAppointment').onclick=saveAppointment;refreshCalc();
}

function saveAppointment() {
  const clientId=document.querySelector('#apptClient').value,procIds=[...document.querySelectorAll('.proc-check:checked')].map(x=>x.value);
  if(!clientId||!procIds.length){alert('Selecione a cliente e pelo menos um procedimento.');return;}
  const startTime=document.querySelector('#apptStart').value,endTime=document.querySelector('#apptEnd').value;
  const start=new Date(`${state.selectedDateKey}T${startTime}:00`);let end=new Date(`${state.selectedDateKey}T${endTime}:00`);if(end<=start)end.setDate(end.getDate()+1);
  const procedures=procIds.map(id=>currentData().procedures.find(p=>p.id===id));
  const appointment={id:uid('appt'),clientId,type:'service',procedureIds:procIds,procedureNames:procedures.map(p=>p.name),start:start.toISOString(),end:end.toISOString(),totalValue:Number(document.querySelector('#apptValue').value||0),notes:document.querySelector('#apptNotes').value,status:'scheduled',createdAt:new Date().toISOString(),history:[]};
  const conflict=hasConflict(appointment);if(conflict){const cc=currentData().clients.find(c=>c.id===conflict.clientId);alert(`Horário indisponível. Já existe ${cc?.name||'um compromisso'} das ${fmtTime(conflict.start)} às ${fmtTime(conflict.end)}.`);return;}
  addHistory(appointment,'scheduled','Agendamento criado');openBookingPayment(appointment);
}

function finalizeAppointment(appointment, initialPayment=0, method='PIX', noDeposit=false) {
  appointment.noDeposit=!!noDeposit;currentData().appointments.push(appointment);
  if(initialPayment>0){currentData().payments.push({id:uid('pay'),appointmentId:appointment.id,amount:initialPayment,method,kind:'signal',at:new Date().toISOString()});addHistory(appointment,'payment',`Recebimento ${brl(initialPayment)}`,{amount:initialPayment,method});}
  store.save('appointment.create',{appointmentId:appointment.id,initialPayment,noDeposit});state.calendarSelectionMode=null;
  const c=currentData().clients.find(x=>x.id===appointment.clientId);const paid=paymentTotalForAppointment(appointment.id);const balance=Math.max(0,appointment.totalValue-paid);const msg=`Olá, ${c?.name||''}! 😊\nSeu agendamento na Juliane Boone Nail Designer está confirmado.\n\n📅 ${new Date(appointment.start).toLocaleDateString('pt-BR')}\n⏰ ${fmtTime(appointment.start)}–${fmtTime(appointment.end)}\n💅 ${appointment.procedureNames.join(', ')}\n💰 Valor: ${brl(appointment.totalValue)}${paid>0?`\n✅ Recebido: ${brl(paid)}\nSaldo: ${brl(balance)}`:''}`;
  state.modal=`<div class="modal-head"><div><span class="eyebrow">AGENDAMENTO CONFIRMADO</span><h2>${escapeHtml(c?.name||'Cliente')}</h2></div><button data-close-modal>×</button></div><div class="message-preview">${escapeHtml(msg).replace(/\n/g,'<br>')}</div><img class="booking-rules-preview" src="${BOOKING_RULES_IMAGE}" alt="Informações para agendamento"><button class="primary full" id="sendBookingText">Enviar confirmação no WhatsApp</button><button class="secondary full" id="shareBookingRules">Compartilhar imagem das regras</button><button class="secondary full" id="bookingDone">Concluir</button>`;state.view='dashboard';navigationStack=['dashboard'];render();
  document.querySelector('#sendBookingText').onclick=()=>{const phone=(c?.whatsapp||'').replace(/\D/g,'');window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');};
  document.querySelector('#shareBookingRules').onclick=shareBookingRulesImage;document.querySelector('#bookingDone').onclick=()=>{state.modal=null;render();};
}

async function shareBookingRulesImage(){try{const res=await fetch(BOOKING_RULES_IMAGE),blob=await res.blob(),file=new File([blob],'informacoes-agendamento-juliane-boone.jpg',{type:blob.type||'image/jpeg'});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Informações para agendamento'});}else{window.open(BOOKING_RULES_IMAGE,'_blank');}}catch(e){window.open(BOOKING_RULES_IMAGE,'_blank');}}

function openBookingPayment(appointment) {
  const signal=Math.round(Number(appointment.totalValue||0)*0.30*100)/100;
  state.modal=`<div class="modal-head"><div><span class="eyebrow">FINALIZAR AGENDAMENTO</span><h2>Sinal / Entrada</h2></div><button data-close-modal>×</button></div>
  <div class="payment-summary"><span>Valor do atendimento</span><b>${brl(appointment.totalValue)}</b><span>Sugestão de sinal (30%)</span><b>${brl(signal)}</b></div>
  <label>Valor recebido agora<input id="bookingPayAmount" type="number" step="0.01" min="0" max="${appointment.totalValue}" value="${signal.toFixed(2)}"></label>
  <label>Forma<select id="bookingPayMethod"><option>PIX</option><option>Dinheiro</option><option>Cartão</option></select></label>
  <button class="primary full" id="launchBookingPayment">LANÇAR E FINALIZAR</button>
  <button class="secondary full" id="finishWithoutPayment">Finalizar sem receber agora</button>
  <button class="secondary full" id="skipDeposit">Não necessita de sinal</button>
  <p class="payment-help">Os 30% são apenas uma sugestão. O valor pode ser alterado livremente.</p>`;
  render();
  document.querySelector('#launchBookingPayment').onclick=()=>{
    const amount=Number(document.querySelector('#bookingPayAmount').value||0);
    if(amount<0||amount>appointment.totalValue){alert('Informe um valor válido.');return;}
    if(amount===0){if(!confirm('Nenhum valor foi recebido. Finalizar e manter o atendimento totalmente A RECEBER?'))return;finalizeAppointment(appointment,0,document.querySelector('#bookingPayMethod').value,false);return;}
    const method=document.querySelector('#bookingPayMethod').value;confirmMoneyLaunch({amount,method,kind:amount>=appointment.totalValue?'Pagamento integral':'Sinal / Entrada',onConfirm:()=>finalizeAppointment(appointment,amount,method,false),onCancel:()=>openBookingPayment(appointment)});
  };
  document.querySelector('#finishWithoutPayment').onclick=()=>{if(confirm('Finalizar sem registrar recebimento agora? O valor total ficará A RECEBER.'))finalizeAppointment(appointment,0,'',false);};
  document.querySelector('#skipDeposit').onclick=()=>{if(confirm('Confirmar que este agendamento não necessita de sinal? O valor total ficará A RECEBER.'))finalizeAppointment(appointment,0,'',true);};
}

function addClient(origin='clients'){
  const fromAppointment = origin === 'appointment';
  state.modal=`<div class="modal-head"><div><span class="eyebrow">CLIENTE</span><h2>Nova cliente</h2></div><button data-close-modal>×</button></div><label>Nome<input id="clientName"></label><label>WhatsApp<input id="clientWhatsapp" inputmode="tel"></label><label>Observações<textarea id="clientNotes"></textarea></label><button class="primary full" id="saveClient">Salvar cliente</button>`;render();
  document.querySelector('#saveClient').onclick=()=>{const name=document.querySelector('#clientName').value.trim();if(!name){alert('Informe o nome.');return;}const c={id:uid('client'),name,whatsapp:document.querySelector('#clientWhatsapp').value.trim(),notes:document.querySelector('#clientNotes').value.trim(),createdAt:new Date().toISOString()};currentData().clients.push(c);store.save('client.create',{clientId:c.id,origin});state.modal=null;if(fromAppointment){openNewAppointmentForm();setTimeout(()=>{const sel=document.querySelector('#apptClient');if(sel)sel.value=c.id;},0);}else render();};
}
function openClient(id){
  const c=currentData().clients.find(x=>x.id===id);const aps=currentData().appointments.filter(a=>a.clientId===id).sort((a,b)=>new Date(b.start)-new Date(a.start));const pays=currentData().payments.filter(p=>aps.some(a=>a.id===p.appointmentId));const cycle=maintenanceCount(id);
  state.modal=`<div class="modal-head"><div><span class="eyebrow">CLIENTE</span><h2>${escapeHtml(c.name)}</h2></div><button data-close-modal>×</button></div><div class="tab-grid"><article><span>Histórico</span><strong>${aps.length}</strong></article><article><span>Recebido</span><strong>${brl(pays.reduce((s,p)=>s+Number(p.amount),0))}</strong></article></div>${cycle?`<div class="cycle-alert"><b>${cycle} manutenção${cycle>1?'ões':''} desde a última aplicação</b>${cycle>=2?'<span>Avaliar nova aplicação no próximo retorno.</span>':''}</div>`:''}<button class="primary full" id="clientSchedule">AGENDAR</button><h3 class="history-title">Histórico de atendimentos</h3><div class="simple-list">${aps.length?aps.map(a=>{const paid=paymentTotalForAppointment(a.id);return `<div class="client-history-wrap"><button class="client-history history-columns" data-appointment="${a.id}"><span class="history-date">${new Date(a.start).toLocaleDateString('pt-BR')}<small>${fmtTime(a.start)}–${fmtTime(a.end)}</small></span><span class="history-proc">${escapeHtml(a.procedureNames?.join(', ')||'')}</span><b class="history-money">${brl(paid)} <small>de ${brl(a.totalValue)}</small></b></button>${a.status==='scheduled'?`<button class="history-conclude" data-conclude-client="${a.id}">Concluir</button>`:''}</div>`}).join(''):'<div class="empty">Sem atendimentos.</div>'}</div>`;render();
  document.querySelector('#clientSchedule').onclick=()=>openClientScheduleChoice(id);document.querySelectorAll('[data-appointment]').forEach(b=>b.onclick=()=>openAppointment(b.dataset.appointment));document.querySelectorAll('[data-conclude-client]').forEach(b=>b.onclick=()=>completeAppointment(b.dataset.concludeClient));
}

function openClientScheduleChoice(clientId){const n=maintenanceCount(clientId);state.modal=`<div class="modal-head"><div><span class="eyebrow">AGENDAR</span><h2>Procedimento / manutenção</h2></div><button data-close-modal>×</button></div>${n>=2?`<div class="cycle-alert"><b>${n} manutenções desde a última aplicação.</b><span>Avaliar nova aplicação.</span></div>`:''}<button class="primary full" id="newProcedureChoice">Novo procedimento</button><button class="secondary full" id="maintenanceChoice">Manutenção / retorno</button>`;render();document.querySelector('#newProcedureChoice').onclick=()=>startAppointmentFlow(clientId,'new');document.querySelector('#maintenanceChoice').onclick=()=>startAppointmentFlow(clientId,'maintenance');}

function openAppointment(id){
  const a=currentData().appointments.find(x=>x.id===id);if(!a)return;const c=currentData().clients.find(x=>x.id===a.clientId),paid=paymentTotalForAppointment(id),balance=Math.max(0,Number(a.totalValue||0)-paid);const completed=a.status==='completed',cancelled=a.status==='cancelled';
  state.modal=`<div class="modal-head"><div><span class="eyebrow">AGENDAMENTO${completed?' • CONCLUÍDO':cancelled?' • CANCELADO':''}</span><h2>${escapeHtml(c?.name||'Cliente')}</h2></div><button data-close-modal>×</button></div><div class="detail-grid"><span>Data</span><b>${new Date(a.start).toLocaleDateString('pt-BR')}</b><span>Horário</span><b>${fmtTime(a.start)}–${fmtTime(a.end)}</b><span>Procedimentos</span><b>${escapeHtml(a.procedureNames?.join(', ')||'')}</b><span>Valor</span><b>${brl(a.totalValue)}</b><span>Recebido</span><b>${brl(paid)}</b><span>A receber</span><b>${brl(balance)}</b></div>${a.notes?`<div class="note-box">${escapeHtml(a.notes)}</div>`:''}${!cancelled?`<button class="primary full" id="registerPayment">Ir para Financeiro</button>${!completed?'<button class="success-action full" id="completeAppointment">✓ Concluir atendimento</button>':''}<button class="secondary full" id="scheduleMaintenance">Agendar procedimento / manutenção</button>${!completed?'<div class="action-pair"><button class="secondary" id="editSchedule">Alterar data / horário</button><button class="secondary" id="rescheduleCancel">Reagendar / cancelar</button></div>':''}${paid<=0&&!completed?'<button class="danger full" id="deleteAppointment">Excluir agendamento</button>':''}`:''}${a.history?.length?`<details class="appointment-history"><summary>Ver histórico do agendamento</summary>${a.history.slice().reverse().map(h=>`<div><b>${new Date(h.at).toLocaleString('pt-BR')}</b><span>${escapeHtml(h.label)}</span></div>`).join('')}</details>`:''}`;render();
  document.querySelector('#registerPayment')?.addEventListener('click',()=>registerPayment(a.id));document.querySelector('#completeAppointment')?.addEventListener('click',()=>completeAppointment(a.id));document.querySelector('#scheduleMaintenance')?.addEventListener('click',()=>startAppointmentFlow(a.clientId,'maintenance'));document.querySelector('#editSchedule')?.addEventListener('click',()=>editSchedule(a.id));document.querySelector('#rescheduleCancel')?.addEventListener('click',()=>rescheduleOrCancel(a.id));document.querySelector('#deleteAppointment')?.addEventListener('click',()=>deleteAppointmentFlow(a.id));
}

function confirmMoneyLaunch({amount,method,kind,onConfirm,onCancel}){state.modal=`<div class="modal-head"><div><span class="eyebrow">CONFIRMAR RECEBIMENTO</span><h2>${escapeHtml(kind)}</h2></div><button data-close-modal>×</button></div><div class="payment-summary"><span>Valor</span><b>${brl(amount)}</b><span>Forma</span><b>${escapeHtml(method)}</b></div><div class="warning"><b>Só clique em continuar se você realmente recebeu este valor.</b><br>Ao confirmar, ele será registrado como recebido e deduzido do saldo do atendimento.</div><button class="primary full" id="confirmMoney">CONFIRMAR RECEBIMENTO</button><button class="secondary full" id="cancelMoneyConfirm">Cancelar</button>`;render();document.querySelector('#confirmMoney').onclick=onConfirm;document.querySelector('#cancelMoneyConfirm').onclick=()=>onCancel?onCancel():(state.modal=null,render());}

function registerPayment(appointmentId){
  const a=currentData().appointments.find(x=>x.id===appointmentId),paid=paymentTotalForAppointment(appointmentId),balance=Math.max(0,Number(a.totalValue||0)-paid);if(balance<=0){alert('Este atendimento já está quitado.');return;}const first=paid<=0,sig=Math.round(Number(a.totalValue||0)*.30*100)/100,suggested=first&&!a.noDeposit?Math.min(balance,sig):balance,label=first&&!a.noDeposit?'Sinal / Entrada sugerida (30%)':'Saldo restante';
  state.modal=`<div class="modal-head"><div><span class="eyebrow">FINANCEIRO</span><h2>Registrar pagamento</h2></div><button data-close-modal>×</button></div><div class="payment-summary"><span>Valor do atendimento</span><b>${brl(a.totalValue)}</b><span>Já recebido</span><b>${brl(paid)}</b><span>${label}</span><b>${brl(suggested)}</b><span>Saldo atual</span><b>${brl(balance)}</b></div><label>Valor para lançar<input id="payAmount" type="number" step="0.01" min="0.01" max="${balance}" value="${suggested.toFixed(2)}"></label><label>Forma<select id="payMethod"><option>PIX</option><option>Dinheiro</option><option>Cartão</option></select></label><div class="live-payment-result"><span>Após este lançamento</span><strong id="paymentResult"></strong></div><button class="primary full" id="savePayment">LANÇAR</button>`;render();const input=document.querySelector('#payAmount');const refresh=()=>{const amount=Math.max(0,Number(input.value||0));document.querySelector('#paymentResult').textContent=`Recebido ${brl(paid+amount)} • A receber ${brl(Math.max(0,balance-amount))}`};input.oninput=refresh;refresh();document.querySelector('#savePayment').onclick=()=>{const amount=Number(input.value||0),method=document.querySelector('#payMethod').value;if(amount<=0||amount>balance){alert(`Informe um valor entre R$ 0,01 e ${brl(balance)}.`);return;}const kind=first&&Math.abs(amount-sig)<.01?'Sinal / Entrada':amount>=balance?'Pagamento integral':'Pagamento parcial';confirmMoneyLaunch({amount,method,kind,onConfirm:()=>savePaymentRecord(a,amount,method,kind),onCancel:()=>registerPayment(a.id)});};
}

function savePaymentRecord(a,amount,method,kind){currentData().payments.push({id:uid('pay'),appointmentId:a.id,amount,method,kind:kind.toLowerCase(),at:new Date().toISOString()});addHistory(a,'payment',`${kind}: ${brl(amount)}`,{amount,method});store.save('payment.create',{appointmentId:a.id,amount,kind});const newPaid=paymentTotalForAppointment(a.id),client=currentData().clients.find(c=>c.id===a.clientId),integral=newPaid>=a.totalValue,msg=integral?`Olá, ${client?.name||''}! 😊 Seu pagamento integral foi confirmado. Horário: ${new Date(a.start).toLocaleDateString('pt-BR')} às ${fmtTime(a.start)}.`:`Olá, ${client?.name||''}! 😊 Recebimento de ${brl(amount)} confirmado. Saldo restante: ${brl(Math.max(0,a.totalValue-newPaid))}. Horário: ${new Date(a.start).toLocaleDateString('pt-BR')} às ${fmtTime(a.start)}.`;state.modal=`<div class="modal-head"><div><span class="eyebrow">PAGAMENTO CONFIRMADO</span><h2>${integral?'Quitado':'Pagamento registrado'}</h2></div><button data-close-modal>×</button></div><div class="message-preview">${escapeHtml(msg)}</div><button class="primary full" id="sendWhatsapp">Enviar confirmação no WhatsApp</button>`;render();document.querySelector('#sendWhatsapp').onclick=()=>{const phone=(client?.whatsapp||'').replace(/\D/g,'');window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');};}

function openReceivables(){const items=currentData().appointments.filter(a=>a.type!=='personal'&&a.status!=='cancelled').map(a=>({a,paid:paymentTotalForAppointment(a.id)})).filter(x=>x.paid<Number(x.a.totalValue||0));state.modal=`<div class="modal-head"><div><span class="eyebrow">A RECEBER</span><h2>Pendentes e parciais</h2></div><button data-close-modal>×</button></div><div class="receivable-list">${items.length?items.map(({a,paid})=>{const c=currentData().clients.find(x=>x.id===a.clientId),bal=a.totalValue-paid;return `<button class="receivable-row" data-receive="${a.id}"><div><strong>${escapeHtml(c?.name||'Cliente')}</strong><span>${new Date(a.start).toLocaleDateString('pt-BR')} • ${escapeHtml(a.procedureNames?.join(', ')||'')}</span></div><div><em>${paid>0?'PARCIAL':'PENDENTE'}</em><b>${brl(bal)}</b></div></button>`}).join(''):'<div class="empty">Nenhum valor a receber.</div>'}</div>`;render();document.querySelectorAll('[data-receive]').forEach(b=>b.onclick=()=>registerPayment(b.dataset.receive));}

function completeAppointment(id){const a=currentData().appointments.find(x=>x.id===id);if(!confirm('Confirmar que este atendimento foi concluído?'))return;a.status='completed';a.completedAt=new Date().toISOString();addHistory(a,'completed','Atendimento concluído');store.save('appointment.complete',{appointmentId:id});const balance=Math.max(0,a.totalValue-paymentTotalForAppointment(id));state.modal=`<div class="modal-head"><div><span class="eyebrow">ATENDIMENTO CONCLUÍDO</span><h2>Próximos passos</h2></div><button data-close-modal>×</button></div>${balance>0?`<div class="warning">Ainda há <b>${brl(balance)}</b> a receber. Você pode lançar agora ou manter em A RECEBER.</div><button class="primary full" id="finishFinance">Ir para Financeiro</button>`:'<div class="cycle-alert"><b>Pagamento quitado.</b></div>'}<button class="secondary full" id="finishSchedule">Agendar procedimento / manutenção</button><button class="secondary full" id="finishClose">Finalizar por agora</button>`;render();document.querySelector('#finishFinance')?.addEventListener('click',()=>registerPayment(id));document.querySelector('#finishSchedule').onclick=()=>startAppointmentFlow(a.clientId,'maintenance');document.querySelector('#finishClose').onclick=()=>{state.modal=null;state.view='dashboard';navigationStack=['dashboard'];render();};}

function editSchedule(id){const a=currentData().appointments.find(x=>x.id===id);state.modal=`<div class="modal-head"><div><span class="eyebrow">ALTERAR AGENDAMENTO</span><h2>Data / horário</h2></div><button data-close-modal>×</button></div><label>Data<input id="editDate" type="date" value="${toLocalDateKey(new Date(a.start))}"></label><div class="two-col"><label>Início<input id="editStart" type="time" value="${fmtTime(a.start)}"></label><label>Fim<input id="editEnd" type="time" value="${fmtTime(a.end)}"></label></div><button class="primary full" id="saveScheduleEdit">Salvar alteração</button>`;render();document.querySelector('#saveScheduleEdit').onclick=()=>{const old=`${new Date(a.start).toLocaleDateString('pt-BR')} ${fmtTime(a.start)}–${fmtTime(a.end)}`,date=document.querySelector('#editDate').value,st=document.querySelector('#editStart').value,et=document.querySelector('#editEnd').value,s=new Date(`${date}T${st}:00`),e=new Date(`${date}T${et}:00`);if(e<=s)e.setDate(e.getDate()+1);const candidate={...a,start:s.toISOString(),end:e.toISOString()};const conflict=hasConflict(candidate,a.id);if(conflict){alert(`Horário indisponível: já existe compromisso das ${fmtTime(conflict.start)} às ${fmtTime(conflict.end)}.`);return;}a.start=candidate.start;a.end=candidate.end;addHistory(a,'schedule_change',`Horário alterado: ${old} → ${new Date(a.start).toLocaleDateString('pt-BR')} ${fmtTime(a.start)}–${fmtTime(a.end)}`);store.save('appointment.schedule.update',{appointmentId:id});openAppointment(id);};}

function rescheduleOrCancel(id){const a=currentData().appointments.find(x=>x.id===id),paid=paymentTotalForAppointment(id);state.modal=`<div class="modal-head"><div><span class="eyebrow">REAGENDAR / CANCELAR</span><h2>O que aconteceu?</h2></div><button data-close-modal>×</button></div>${paid>0?`<div class="warning">Há ${brl(paid)} recebido. O sistema não devolverá nem apagará esse valor automaticamente. Juliane decide depois se reaproveita, devolve ou retém conforme a situação.</div>`:''}<button class="primary full" id="moveAppointment">Reagendar para outra data</button><button class="danger full" id="cancelAppointment">Cancelar atendimento</button>`;render();document.querySelector('#moveAppointment').onclick=()=>{addHistory(a,'reschedule','Reagendamento iniciado');store.save('appointment.reschedule.start',{appointmentId:id});editSchedule(id);};document.querySelector('#cancelAppointment').onclick=()=>{if(!confirm('Confirmar cancelamento deste atendimento?'))return;a.status='cancelled';addHistory(a,'cancelled','Atendimento cancelado',{paid});store.save('appointment.cancel',{appointmentId:id,paid});openAppointment(id);};}

function deleteAppointmentFlow(id){const a=currentData().appointments.find(x=>x.id===id);state.modal=`<div class="modal-head"><div><span class="eyebrow">EXCLUIR AGENDAMENTO</span><h2>Escolha como excluir</h2></div><button data-close-modal>×</button></div><div class="warning">Disponível porque ainda não há recebimento financeiro neste agendamento.</div><button class="danger full" id="deleteKeepHistory">Excluir e registrar no histórico</button><button class="secondary full" id="deleteNoHistory">Excluir sem registro</button>`;render();document.querySelector('#deleteKeepHistory').onclick=()=>{a.status='cancelled';addHistory(a,'deleted_registered','Agendamento excluído e registrado no histórico');store.save('appointment.delete.registered',{appointmentId:id});state.modal=null;render();};document.querySelector('#deleteNoHistory').onclick=()=>{currentData().appointments=currentData().appointments.filter(x=>x.id!==id);store.save('appointment.delete',{appointmentId:id});state.modal=null;render();};}

function addExpense(){
  state.modal=`<div class="modal-head"><div><span class="eyebrow">GASTO</span><h2>Novo gasto com produto</h2></div><button data-close-modal>×</button></div><label>Descrição<input id="expenseDesc" placeholder="Ex.: Gel construtor"></label><label>Valor<input id="expenseValue" type="number" step="0.01"></label><label>Data<input id="expenseDate" type="date" value="${toLocalDateKey(new Date())}"></label><button class="primary full" id="saveExpense">Salvar gasto</button>`;render();document.querySelector('#saveExpense').onclick=()=>{const description=document.querySelector('#expenseDesc').value.trim();const value=Number(document.querySelector('#expenseValue').value||0);if(!description||value<=0)return;currentData().expenses.push({id:uid('exp'),description,value,date:document.querySelector('#expenseDate').value});store.save('expense.create',{value});state.modal=null;render();};
}

function editProcedure(id){
  const p=currentData().procedures.find(x=>x.id===id);state.modal=`<div class="modal-head"><div><span class="eyebrow">ADM • PROCEDIMENTO</span><h2>${escapeHtml(p.name)}</h2></div><button data-close-modal>×</button></div><label>Valor padrão<input id="procValue" type="number" step="0.01" value="${p.value}"></label><div class="two-col"><label>Horas<input id="procHours" type="number" min="0" step="1" value="${Math.floor(p.durationMin/60)}"></label><label>Minutos<input id="procMinutes" type="number" min="0" max="59" step="5" value="${p.durationMin%60}"></label></div><label>Descrição do catálogo<textarea id="procDescription">${escapeHtml(p.description||'')}</textarea></label><label>Imagem do catálogo<input id="procImageFile" type="file" accept="image/*"></label><div class="catalog-image-preview"><img id="procImagePreview" src="${escapeHtml(p.image||'./assets/logo-juliane-boone.png')}" alt="Prévia"></div><div class="warning">Ao salvar, o novo padrão será usado em <b>novos agendamentos</b> e no <b>Catálogo</b>. Histórico e agendamentos já salvos não serão alterados.</div><button class="primary full" id="saveProcedure">Salvar alterações</button>`;render();
  let newImage=p.image;
  document.querySelector('#procImageFile').onchange=(ev)=>{const file=ev.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');const max=900;const scale=Math.min(1,max/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);newImage=canvas.toDataURL('image/jpeg',.82);document.querySelector('#procImagePreview').src=newImage;};img.src=reader.result;};reader.readAsDataURL(file);};
  document.querySelector('#saveProcedure').onclick=()=>{if(!confirm('Salvar alterações deste procedimento?'))return;const h=Math.max(0,Number(document.querySelector('#procHours').value||0));const m=Math.min(59,Math.max(0,Number(document.querySelector('#procMinutes').value||0)));p.value=Number(document.querySelector('#procValue').value);p.durationMin=h*60+m;p.description=document.querySelector('#procDescription').value.trim();p.image=newImage;store.save('procedure.update',{procedureId:id});state.modal=null;render();};
}
function shareCatalog(){
  const url=publicCatalogUrl();
  const text='Olá! 😊\nConfira o catálogo visual da Juliane Boone Nail Designer e escolha o procedimento que deseja agendar:';
  if(navigator.share){navigator.share({title:'Catálogo Juliane Boone',text,url}).catch(()=>{});}else{const txt=`${text}\n${url}`;navigator.clipboard?.writeText(txt);alert('Link do catálogo copiado para a área de transferência.');}
}


history.replaceState({juliane:true},'');history.pushState({juliane:true},'');window.addEventListener('popstate',()=>{if(state.view!=='dashboard'||state.modal||state.calendarSelectionMode){history.pushState({juliane:true},'');goBack();}});
registerSW();
render();
