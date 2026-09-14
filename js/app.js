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
  draftAppointment: null
};

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
      <div class="brand-wrap">
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

  return `<main class="content">
    <section class="hero-card">
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

    <section class="verse-card">${escapeHtml(verse)}</section>
  </main>`;
}

function appointmentRow(a) {
  const client = currentData().clients.find(c=>c.id===a.clientId);
  const paid = paymentTotalForAppointment(a.id);
  const status = paid >= Number(a.totalValue||0) && a.totalValue > 0 ? 'Pago' : paid > 0 ? 'Parcial' : 'Pendente';
  return `<button class="appointment-row" data-appointment="${a.id}">
    <div class="date-box"><b>${fmtDayShort(a.start).split(' ')[0]}</b><small>${fmtTime(a.start)}</small></div>
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
  return `<main class="content"><section class="section-card calendar-card">
    <div class="section-head"><div><span class="eyebrow">AGENDA</span><h1 class="capitalize">${monthLabel}</h1></div>
      <div class="week-controls"><button id="prevMonth">‹</button><button id="todayMonth">Hoje</button><button id="nextMonth">›</button></div>
    </div>
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
  return `<button class="day-cell ${cls} ${today?'today':''}" data-day="${key}">
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
    <section class="metric-grid"><article class="metric"><span>Recebido</span><strong>${brl(received)}</strong></article><article class="metric"><span>A receber</span><strong>${brl(receivable)}</strong></article><article class="metric"><span>Gastos produtos</span><strong>${brl(expenses)}</strong></article><article class="metric"><span>Resultado</span><strong>${brl(received-expenses)}</strong></article></section>
    <section class="section-card"><div class="section-head"><div><span class="eyebrow">GASTOS COM PRODUTOS</span><h2>Lançamentos</h2></div><button class="primary small" id="addExpense">+ Gasto</button></div>
      <div class="simple-list">${data.expenses.length?data.expenses.slice().reverse().map(x=>`<div class="simple-row"><div><strong>${escapeHtml(x.description)}</strong><span>${new Date(x.date).toLocaleDateString('pt-BR')}</span></div><b>${brl(x.value)}</b></div>`).join(''):'<div class="empty">Nenhum gasto lançado.</div>'}</div>
    </section>
  </main>`;
}

function clients() {
  const data = currentData();
  return `<main class="content"><section class="section-card"><div class="section-head"><div><span class="eyebrow">CLIENTES</span><h1>Clientes</h1></div><button class="primary small" id="addClient">+ Cliente</button></div>
    <div class="simple-list">${data.clients.length?data.clients.map(c=>`<button class="client-row" data-client="${c.id}"><div><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.whatsapp||'')}</span></div><span>›</span></button>`).join(''):'<div class="empty">Nenhuma cliente cadastrada.</div>'}</div>
  </section></main>`;
}

function catalog() {
  return `<main class="content"><section class="hero-card"><span class="eyebrow">CATÁLOGO</span><h1>Procedimentos</h1><p>Uma única base para agenda e compartilhamento.</p></section>
  <section class="catalog-grid">${currentData().procedures.filter(p=>p.active).map(p=>`<article class="catalog-card"><div><strong>${escapeHtml(p.name)}</strong><span>${Math.floor(p.durationMin/60)}h${String(p.durationMin%60).padStart(2,'0')}</span></div><b>${brl(p.value)}</b></article>`).join('')}</section>
  <button class="primary full" id="shareCatalog">Compartilhar catálogo</button></main>`;
}

function admin() {
  return `<main class="content"><section class="section-card"><div class="section-head"><div><span class="eyebrow">ADM</span><h1>Procedimentos</h1></div></div>
  <p class="muted">Altere valores e tempos-base sem atualizar o código. Mudanças aqui afetam novos agendamentos e o catálogo; históricos anteriores permanecem.</p>
  <div class="simple-list">${currentData().procedures.map(p=>`<button class="procedure-row" data-procedure="${p.id}"><div><strong>${escapeHtml(p.name)}</strong><span>${brl(p.value)} • ${p.durationMin} min</span></div><span>Editar</span></button>`).join('')}</div>
  ${store.environment==='sandbox'?'<button class="danger full" id="resetSandbox">Resetar Sandbox</button>':''}
  </section></main>`;
}

function renderModal() {
  if (!state.modal) return '';
  return `<div class="modal-backdrop"><div class="modal">${state.modal}</div></div>`;
}

function render() {
  const body = state.view==='dashboard'?dashboard():state.view==='calendar'?calendar():state.view==='finance'?finance():state.view==='clients'?clients():state.view==='catalog'?catalog():admin();
  app.innerHTML = `${header()}${body}${bottomNav()}${renderModal()}`;
  bind();
}

function bind() {
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;state.modal=null;render();});
  document.querySelector('#adminBtn')?.addEventListener('click',()=>{state.view='admin';render();});
  document.querySelector('#envSwitch')?.addEventListener('click',()=>{
    const next = store.environment==='official'?'sandbox':'official';
    if (confirm(`Entrar no ambiente ${next==='sandbox'?'de TESTES':'OFICIAL'}?`)) { store.switchEnvironment(next); state.view='dashboard'; render(); }
  });
  document.querySelector('#newAppointment')?.addEventListener('click', startAppointmentFlow);
  document.querySelector('#prevWeek')?.addEventListener('click',()=>{state.selectedWeek.setDate(state.selectedWeek.getDate()-7);render();});
  document.querySelector('#nextWeek')?.addEventListener('click',()=>{state.selectedWeek.setDate(state.selectedWeek.getDate()+7);render();});
  document.querySelector('#thisWeek')?.addEventListener('click',()=>{state.selectedWeek=startOfWeek(new Date());render();});
  document.querySelector('#prevMonth')?.addEventListener('click',()=>{state.selectedMonth=new Date(state.selectedMonth.getFullYear(),state.selectedMonth.getMonth()-1,1);render();});
  document.querySelector('#nextMonth')?.addEventListener('click',()=>{state.selectedMonth=new Date(state.selectedMonth.getFullYear(),state.selectedMonth.getMonth()+1,1);render();});
  document.querySelector('#todayMonth')?.addEventListener('click',()=>{const n=new Date();state.selectedMonth=new Date(n.getFullYear(),n.getMonth(),1);render();});
  document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>openDay(b.dataset.day,false));
  document.querySelectorAll('[data-appointment]').forEach(b=>b.onclick=()=>openAppointment(b.dataset.appointment));
  document.querySelectorAll('[data-client]').forEach(b=>b.onclick=()=>openClient(b.dataset.client));
  document.querySelectorAll('[data-procedure]').forEach(b=>b.onclick=()=>editProcedure(b.dataset.procedure));
  document.querySelector('#addClient')?.addEventListener('click', addClient);
  document.querySelector('#addExpense')?.addEventListener('click', addExpense);
  document.querySelector('#shareCatalog')?.addEventListener('click', shareCatalog);
  document.querySelector('#resetSandbox')?.addEventListener('click',()=>{if(confirm('Resetar todos os dados do Sandbox?')){store.resetSandbox();render();}});
  document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=()=>{state.modal=null;render();});
}

function openDay(key, selectable=false) {
  const aps = currentData().appointments.filter(a=>toLocalDateKey(new Date(a.start))===key&&a.status!=='cancelled').sort((a,b)=>new Date(a.start)-new Date(b.start));
  state.modal = `<div class="modal-head"><div><span class="eyebrow">${selectable?'ESCOLHA O DIA':'AGENDA DO DIA'}</span><h2>${new Date(key+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})}</h2></div><button data-close-modal>×</button></div>
  <div class="day-agenda">${aps.length?aps.map(a=>`<div class="day-slot"><b>${fmtTime(a.start)}–${fmtTime(a.end)}</b><span>${escapeHtml(a.procedureNames?.join(', ') || (a.type==='personal'?'Particular':'Atendimento'))}</span></div>`).join(''):'<div class="empty">Nenhum compromisso neste dia.</div>'}</div>
  ${selectable?`<button class="primary full" id="selectThisDay">Selecionar este dia</button>`:''}`;
  render();
  if (selectable) document.querySelector('#selectThisDay')?.addEventListener('click',()=>{state.selectedDateKey=key;state.modal=null;openNewAppointmentForm();});
}

function startAppointmentFlow() {
  state.draftAppointment = { procedureIds: [], notes:'', totalValue:0 };
  state.view='calendar';
  render();
  setTimeout(()=>{
    document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>openDay(b.dataset.day,true));
  },0);
}

function openNewAppointmentForm() {
  const clients = currentData().clients;
  const procs = currentData().procedures.filter(p=>p.active);
  state.modal = `<div class="modal-head"><div><span class="eyebrow">NOVO AGENDAMENTO</span><h2>${new Date(state.selectedDateKey+'T12:00:00').toLocaleDateString('pt-BR')}</h2></div><button data-close-modal>×</button></div>
  <label>Cliente<select id="apptClient"><option value="">Selecione</option>${clients.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}</select></label>
  <fieldset><legend>Procedimentos</legend>${procs.map(p=>`<label class="check-row"><input type="checkbox" value="${p.id}" class="proc-check"><span>${escapeHtml(p.name)}</span><b>${brl(p.value)}</b></label>`).join('')}</fieldset>
  <div class="two-col"><label>Início<input type="time" id="apptStart" value="09:00" step="60"></label><label>Fim<input type="time" id="apptEnd" value="09:00" step="60"></label></div>
  <label>Valor do atendimento<input type="number" id="apptValue" step="0.01" value="0"></label>
  <label>Anotações (opcional)<textarea id="apptNotes" placeholder="Ex.: não retirar cutículas, usar somente branco..."></textarea></label>
  <button class="primary full" id="saveAppointment">Confirmar agendamento</button>`;
  render();
  const refreshCalc=()=>{
    const selected=[...document.querySelectorAll('.proc-check:checked')].map(x=>currentData().procedures.find(p=>p.id===x.value));
    const total=selected.reduce((s,p)=>s+p.value,0); const mins=selected.reduce((s,p)=>s+p.durationMin,0);
    document.querySelector('#apptValue').value=total.toFixed(2);
    const startVal=document.querySelector('#apptStart').value||'09:00';
    const [h,m]=startVal.split(':').map(Number); const d=new Date(`${state.selectedDateKey}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`); const e=addMinutes(d,mins);
    document.querySelector('#apptEnd').value=`${String(e.getHours()).padStart(2,'0')}:${String(e.getMinutes()).padStart(2,'0')}`;
  };
  document.querySelectorAll('.proc-check').forEach(x=>x.onchange=refreshCalc);
  document.querySelector('#apptStart').onchange=refreshCalc;
  document.querySelector('#saveAppointment').onclick=saveAppointment;
}

function saveAppointment() {
  const clientId=document.querySelector('#apptClient').value;
  const procIds=[...document.querySelectorAll('.proc-check:checked')].map(x=>x.value);
  if(!clientId||!procIds.length){alert('Selecione a cliente e pelo menos um procedimento.');return;}
  const startTime=document.querySelector('#apptStart').value; const endTime=document.querySelector('#apptEnd').value;
  const start=new Date(`${state.selectedDateKey}T${startTime}:00`); let end=new Date(`${state.selectedDateKey}T${endTime}:00`); if(end<=start) end.setDate(end.getDate()+1);
  const procedures=procIds.map(id=>currentData().procedures.find(p=>p.id===id));
  const appointment={id:uid('appt'),clientId,type:'service',procedureIds:procIds,procedureNames:procedures.map(p=>p.name),start:start.toISOString(),end:end.toISOString(),totalValue:Number(document.querySelector('#apptValue').value||0),notes:document.querySelector('#apptNotes').value,status:'scheduled',createdAt:new Date().toISOString()};
  currentData().appointments.push(appointment); store.save('appointment.create',{appointmentId:appointment.id});
  state.modal=null; state.view='dashboard'; render();
}

function addClient(){
  state.modal=`<div class="modal-head"><div><span class="eyebrow">CLIENTE</span><h2>Nova cliente</h2></div><button data-close-modal>×</button></div><label>Nome<input id="clientName"></label><label>WhatsApp<input id="clientWhatsapp" inputmode="tel"></label><label>Observações<textarea id="clientNotes"></textarea></label><button class="primary full" id="saveClient">Salvar cliente</button>`;render();
  document.querySelector('#saveClient').onclick=()=>{const name=document.querySelector('#clientName').value.trim();if(!name){alert('Informe o nome.');return;}const c={id:uid('client'),name,whatsapp:document.querySelector('#clientWhatsapp').value.trim(),notes:document.querySelector('#clientNotes').value.trim(),createdAt:new Date().toISOString()};currentData().clients.push(c);store.save('client.create',{clientId:c.id});state.modal=null;render();};
}

function openClient(id){
  const c=currentData().clients.find(x=>x.id===id); const aps=currentData().appointments.filter(a=>a.clientId===id).sort((a,b)=>new Date(b.start)-new Date(a.start)); const pays=currentData().payments.filter(p=>aps.some(a=>a.id===p.appointmentId));
  state.modal=`<div class="modal-head"><div><span class="eyebrow">CLIENTE</span><h2>${escapeHtml(c.name)}</h2></div><button data-close-modal>×</button></div><div class="tab-grid"><article><span>Histórico</span><strong>${aps.length}</strong></article><article><span>Recebido</span><strong>${brl(pays.reduce((s,p)=>s+p.amount,0))}</strong></article></div><h3>Histórico de atendimentos</h3><div class="simple-list">${aps.length?aps.map(a=>`<button class="client-history" data-appointment="${a.id}"><div><strong>${new Date(a.start).toLocaleDateString('pt-BR')} • ${fmtTime(a.start)}</strong><span>${escapeHtml(a.procedureNames?.join(', ')||'')}</span></div><b>${brl(a.totalValue)}</b></button>`).join(''):'<div class="empty">Sem atendimentos.</div>'}</div>`;render();document.querySelectorAll('[data-appointment]').forEach(b=>b.onclick=()=>openAppointment(b.dataset.appointment));
}

function openAppointment(id){
  const a=currentData().appointments.find(x=>x.id===id); const c=currentData().clients.find(x=>x.id===a.clientId); const paid=paymentTotalForAppointment(id); const balance=Math.max(0,a.totalValue-paid);
  state.modal=`<div class="modal-head"><div><span class="eyebrow">AGENDAMENTO</span><h2>${escapeHtml(c?.name||'Cliente')}</h2></div><button data-close-modal>×</button></div><div class="detail-grid"><span>Data</span><b>${new Date(a.start).toLocaleDateString('pt-BR')}</b><span>Horário</span><b>${fmtTime(a.start)}–${fmtTime(a.end)}</b><span>Procedimentos</span><b>${escapeHtml(a.procedureNames?.join(', ')||'')}</b><span>Valor</span><b>${brl(a.totalValue)}</b><span>Recebido</span><b>${brl(paid)}</b><span>A receber</span><b>${brl(balance)}</b></div>${a.notes?`<div class="note-box">${escapeHtml(a.notes)}</div>`:''}<button class="primary full" id="registerPayment">Ir para Financeiro</button><button class="secondary full" id="scheduleMaintenance">Agendar próxima manutenção</button>`;render();
  document.querySelector('#registerPayment').onclick=()=>registerPayment(a.id);
  document.querySelector('#scheduleMaintenance').onclick=()=>{state.modal=null;state.view='calendar';const sug=new Date(a.start);sug.setDate(sug.getDate()+15);state.selectedMonth=new Date(sug.getFullYear(),sug.getMonth(),1);render();setTimeout(()=>document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>openDay(b.dataset.day,true)),0);};
}

function registerPayment(appointmentId){
  const a=currentData().appointments.find(x=>x.id===appointmentId);const paid=paymentTotalForAppointment(appointmentId);const suggested=Math.min(a.totalValue-paid,Math.round(a.totalValue*0.30*100)/100);
  state.modal=`<div class="modal-head"><div><span class="eyebrow">FINANCEIRO</span><h2>Registrar pagamento</h2></div><button data-close-modal>×</button></div><label>Valor recebido<input id="payAmount" type="number" step="0.01" value="${suggested.toFixed(2)}"></label><label>Forma<select id="payMethod"><option>PIX</option><option>Dinheiro</option><option>Cartão</option></select></label><button class="primary full" id="savePayment">Confirmar recebimento</button>`;render();
  document.querySelector('#savePayment').onclick=()=>{const amount=Number(document.querySelector('#payAmount').value||0);if(amount<=0)return;currentData().payments.push({id:uid('pay'),appointmentId,amount,method:document.querySelector('#payMethod').value,at:new Date().toISOString()});store.save('payment.create',{appointmentId,amount});const newPaid=paymentTotalForAppointment(appointmentId);const client=currentData().clients.find(c=>c.id===a.clientId);const integral=newPaid>=a.totalValue;const msg=integral?`Olá, ${client?.name||''}! 😊 Seu pagamento integral foi confirmado e seu horário está reservado para ${new Date(a.start).toLocaleDateString('pt-BR')} às ${fmtTime(a.start)}.\n\nGratidão pela preferência. 💅`:`Olá, ${client?.name||''}! 😊 Seu pagamento de ${brl(amount)} foi confirmado e seu horário está reservado para ${new Date(a.start).toLocaleDateString('pt-BR')} às ${fmtTime(a.start)}.\n\nGratidão pela preferência. 💅`;state.modal=`<div class="modal-head"><div><span class="eyebrow">PAGAMENTO CONFIRMADO</span><h2>${integral?'Pagamento integral':'Pagamento registrado'}</h2></div><button data-close-modal>×</button></div><div class="message-preview">${escapeHtml(msg).replace(/\n/g,'<br>')}</div><button class="primary full" id="sendWhatsapp">Enviar confirmação no WhatsApp</button>`;render();document.querySelector('#sendWhatsapp').onclick=()=>{const phone=(client?.whatsapp||'').replace(/\D/g,'');window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');};};
}

function addExpense(){
  state.modal=`<div class="modal-head"><div><span class="eyebrow">GASTO</span><h2>Novo gasto com produto</h2></div><button data-close-modal>×</button></div><label>Descrição<input id="expenseDesc" placeholder="Ex.: Gel construtor"></label><label>Valor<input id="expenseValue" type="number" step="0.01"></label><label>Data<input id="expenseDate" type="date" value="${toLocalDateKey(new Date())}"></label><button class="primary full" id="saveExpense">Salvar gasto</button>`;render();document.querySelector('#saveExpense').onclick=()=>{const description=document.querySelector('#expenseDesc').value.trim();const value=Number(document.querySelector('#expenseValue').value||0);if(!description||value<=0)return;currentData().expenses.push({id:uid('exp'),description,value,date:document.querySelector('#expenseDate').value});store.save('expense.create',{value});state.modal=null;render();};
}

function editProcedure(id){
  const p=currentData().procedures.find(x=>x.id===id);state.modal=`<div class="modal-head"><div><span class="eyebrow">ADM • PROCEDIMENTO</span><h2>${escapeHtml(p.name)}</h2></div><button data-close-modal>×</button></div><label>Valor padrão<input id="procValue" type="number" step="0.01" value="${p.value}"></label><label>Duração padrão (minutos)<input id="procDuration" type="number" step="5" value="${p.durationMin}"></label><div class="warning">Ao salvar, o novo padrão será usado em <b>novos agendamentos</b> e no <b>Catálogo</b>. Histórico e agendamentos já salvos não serão alterados.</div><button class="primary full" id="saveProcedure">Salvar novo valor/tempo</button>`;render();document.querySelector('#saveProcedure').onclick=()=>{if(!confirm('Salvar novo valor e tempo padrão?'))return;p.value=Number(document.querySelector('#procValue').value);p.durationMin=Number(document.querySelector('#procDuration').value);store.save('procedure.update',{procedureId:id});state.modal=null;render();};
}

function shareCatalog(){
  const txt=['Olá! 😊','Confira os procedimentos e valores do Studio Juliane Boone:','',...currentData().procedures.filter(p=>p.active).map(p=>`• ${p.name}: ${brl(p.value)}`),'','Gratidão pela preferência.'].join('\n');
  if(navigator.share){navigator.share({title:'Catálogo Juliane Boone',text:txt}).catch(()=>{});}else{navigator.clipboard?.writeText(txt);alert('Catálogo copiado para a área de transferência.');}
}

registerSW();
render();
