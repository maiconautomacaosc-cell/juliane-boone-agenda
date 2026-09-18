import { Store } from './store.js';
import { BIBLE_MESSAGES } from './data.js';
import { brl, fmtDayShort, fmtTime, startOfWeek, endOfWeek, toLocalDateKey, addMinutes, uid, escapeHtml } from './utils.js';

const WEEKDAY_PT = ['DOM.','SEG.','TER.','QUA.','QUI.','SEX.','SÁB.'];
function dateWithWeekday(dateLike, withTime=false){
  const d=new Date(dateLike);
  const date=d.toLocaleDateString('pt-BR');
  const base=`${WEEKDAY_PT[d.getDay()]} ${date}`;
  return withTime?`${base}, ${fmtTime(d)}`:base;
}

const store = new Store();
const app = document.querySelector('#app');

const state = {
  view: 'dashboard',
  selectedMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  selectedWeek: startOfWeek(new Date()),
  selectedDateKey: null,
  slotPrefillTime: null,
  modal: null,
  draftAppointment: null,
  calendarSelectionMode: null,
  calendarEditAppointmentId: null,
  calendarEditKind: null,
  returnAppointmentId: null,
  selectionOrigin: null,
  returnClientId: null,
  dashboardTab: 'service',
  dashboardPeriod: 'week',
  agendaMode: 'week',
  expandedDayKey: null,
  financeReportMode: 'week',
  financeReportAnchor: new Date()
};

const STUDIO_WHATSAPP = '5547989259820';
const STUDIO_ADDRESS = 'Rua Adriano Schondermank, 279, Costa e Silva, Joinville - SC';
const BOOKING_RULES_IMAGE = './assets/informacoes-agendamento.jpg';
const POST_CARE_PDF = './assets/cuidados-pos-atendimento.pdf';
const PUBLIC_CATALOG_SHORT_URL = 'https://tinyurl.com/Catalogojulianenail';
const PIX_KEY = '029.090.202-90';
const PIX_NAME = 'Juliane de Souza B. Bentes';
const PERSONAL_TYPES = ['AZAF - Reunião geral','AZAF - Reunião ADM','AZAF - Ensaio extra','AZAF - Evento','MORIAH - Ensaio Geral','MORIAH - Reunião Geral','MORIAH - Evento','GP CASAIS - Ensaio extra','GP CASAIS - Evento','Consulta médica','Cuidado pessoal','Outros'];
let navigationStack = ['dashboard'];

const navItems = [
  ['dashboard', 'Painel', '⌂'],
  ['calendar', 'Agenda', '◫'],
  ['finance', 'Financeiro', '$'],
  ['clients', 'Clientes', '♙'],
  ['catalog', 'Catálogo', '▦']
];

function alert(message){
  state.modal=`<div class="modal-head"><div><span class="eyebrow">AGENDA JULIANE</span><h2>Aviso</h2></div><button data-close-modal>×</button></div><div class="app-alert-message">${escapeHtml(String(message)).replace(/\n/g,'<br>')}</div><button class="primary full" id="appAlertOk">OK</button>`;render();document.querySelector('#appAlertOk')?.addEventListener('click',()=>{state.modal=null;render();});
}
function confirmDialog(message,onConfirm,onCancel=null){
  state.modal=`<div class="modal-head"><div><span class="eyebrow">AGENDA JULIANE</span><h2>Confirmar</h2></div><button data-close-modal>×</button></div><div class="app-alert-message">${escapeHtml(String(message)).replace(/\n/g,'<br>')}</div><div class="action-pair"><button class="secondary" id="appConfirmCancel">Cancelar</button><button class="primary" id="appConfirmOk">Continuar</button></div>`;render();document.querySelector('#appConfirmOk').onclick=()=>onConfirm?.();document.querySelector('#appConfirmCancel').onclick=()=>{if(onCancel)onCancel();else{state.modal=null;render();}};
}
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js?v=0.1.25', { updateViaCache: 'none' })
    .then(reg => reg.update().catch(()=>{}))
    .catch(console.error);
}

function currentData() { return store.state; }
function formatDuration(mins) { const m=Number(mins||0); const h=Math.floor(m/60); const r=m%60; return h ? `${h}h${String(r).padStart(2,'0')}` : `${r}min`; }
function formatPhone(v=''){const d=String(v).replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,''); if(d.length===11)return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`; if(d.length===10)return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`; return v;}
function addHistory(a,type,label,meta={}){a.history=a.history||[];a.history.push({id:uid('hist'),at:new Date().toISOString(),type,label,...meta});}
function friendlyHistoryLabel(h){if(h?.messageType&&MESSAGE_HISTORY_LABELS[h.messageType]){const count=(String(h.label||'').match(/(?:envio|reenvio)\s*(\d+)/i)||[])[1];return MESSAGE_HISTORY_LABELS[h.messageType]+(Number(count)>1?` • reenvio ${count}`:'');}const map={appointment_confirmation:'Confirmação do agendamento enviada',confirmation_reminder:'Lembrete de confirmação enviado',reservation_signal:'Informações do sinal enviadas',reservation_full:'Regras de agendamento + sinal enviadas',completion_payment:'Confirmação de atendimento concluído enviada',post_care:'Cuidados pós-atendimento enviados'};let label=String(h?.label||'');for(const [k,v] of Object.entries(map))if(label.includes(k)){const n=(label.match(/envio\s*(\d+)/i)||[])[1];return v+(Number(n)>1?` • reenvio ${n}`:'');}return label.replace(/_/g,' ');}
function messageWasSent(a,type){return !!a?.messageLog?.[type]?.lastSentAt;}
function messageButtonLabel(a,type){return messageWasSent(a,type)?'REENVIAR':'ENVIAR';}
const MESSAGE_HISTORY_LABELS={reservation_full:'Regras de agendamento + sinal enviadas',reservation_signal:'Informações do sinal enviadas',confirmation_reminder:'Lembrete de confirmação enviado',appointment_confirmation:'Confirmação do agendamento enviada',tomorrow_reminder:'Lembrete do atendimento enviado',completion_payment:'Confirmação de atendimento concluído enviada',post_care:'Cuidados pós-atendimento enviados'};
function markMessageSent(a,type){if(!a)return;a.messageLog=a.messageLog||{};const prev=a.messageLog[type]||{};a.messageLog[type]={lastSentAt:new Date().toISOString(),count:Number(prev.count||0)+1};const base=MESSAGE_HISTORY_LABELS[type]||'Mensagem enviada';addHistory(a,'message_sent',`${base}${a.messageLog[type].count>1?` • reenvio ${a.messageLog[type].count}`:''}`,{messageType:type});store.save('message.sent',{appointmentId:a.id,messageType:type,count:a.messageLog[type].count});}
function procedureRequiresMaintenance(id){return !!currentData().procedures.find(p=>p.id===id)?.requiresMaintenance;}
function appointmentRequiresMaintenance(a){if(typeof a?.requiresMaintenance==='boolean')return a.requiresMaintenance;return (a?.procedureIds||[]).some(procedureRequiresMaintenance);}
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
function appointmentBalance(a){if(!a)return 0;return Math.max(0,Number(a.totalValue||0)-paymentTotalForAppointment(a.id)-Number(a.transferredOut||0));}
function clientPendingAppointments(clientId){return currentData().appointments.filter(a=>a.type!=='personal'&&a.clientId===clientId&&a.status!=='cancelled'&&appointmentBalance(a)>0);}

function walletTransactions(c){c.walletTransactions=c.walletTransactions||[];return c.walletTransactions;}
function walletBalance(c){return walletTransactions(c).reduce((sum,t)=>sum+Number(t.amount||0),0);}
function allWalletTransactions(){return currentData().clients.flatMap(c=>walletTransactions(c).map(t=>({...t,clientId:c.id,clientName:c.name})));}
function walletFinanceTransactionsInRange(start,end){return allWalletTransactions().filter(t=>t.financeEffect&&t.financeEffect!=='none'&&new Date(t.at)>=start&&new Date(t.at)<=end);}
function isWalletPayment(p){return p?.method==='Saldo em carteira'||p?.kind==='wallet';}
function cashPaymentTotalForAppointment(id){return currentData().payments.filter(p=>p.appointmentId===id&&!isWalletPayment(p)).reduce((s,p)=>s+Number(p.amount),0);}
function serviceValueForAppointment(a){if(a?.procedureItems?.length)return a.procedureItems.reduce((s,i)=>s+Number(i.value||0),0);return Math.max(0,Number(a?.totalValue||0)-Number(a?.carryOver?.total||0));}
function paymentSuggestionParts(a){const balance=appointmentBalance(a),paid=paymentTotalForAppointment(a.id),carry=Math.max(0,Number(a?.carryOver?.total||0)),service=serviceValueForAppointment(a),signal=Math.round(service*.30*100)/100;if(paid>0)return {carry,service,signal,suggested:balance,label:'Saldo restante'};return {carry,service,signal,suggested:Math.min(balance,carry+signal),label:carry>0?'Saldo anterior + sinal do novo serviço':'Sinal / Entrada sugerida (30%)'};}


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
  const data=currentData(), now=new Date();
  const periodStart=state.dashboardPeriod==='month'?new Date(state.selectedWeek.getFullYear(),state.selectedWeek.getMonth(),1):startOfWeek(state.selectedWeek);
  const periodEnd=state.dashboardPeriod==='month'?new Date(state.selectedWeek.getFullYear(),state.selectedWeek.getMonth()+1,0,23,59,59):endOfWeek(state.selectedWeek);
  const all=data.appointments.filter(a=>new Date(a.start)>=periodStart&&new Date(a.start)<=periodEnd);
  const services=all.filter(a=>a.type!=='personal'), personals=all.filter(a=>a.type==='personal');
  const realized=services.filter(a=>a.status==='completed').length;
  const awaiting=services.filter(a=>a.status==='awaiting_confirmation').length;
  const ongoing=services.filter(a=>a.status==='scheduled').length;
  const cancelled=services.filter(a=>a.status==='cancelled').length;
  const tomorrowKey=toLocalDateKey(new Date(now.getFullYear(),now.getMonth(),now.getDate()+1));
  const tomorrow= data.appointments.filter(a=>a.type!=='personal'&&a.status==='scheduled'&&toLocalDateKey(new Date(a.start))===tomorrowKey);
  const verse=BIBLE_MESSAGES[new Date().getDate()%BIBLE_MESSAGES.length];
  const list=state.dashboardTab==='personal'?personals:services.filter(a=>a.status!=='cancelled');
  return `<main class="content dashboard-content">
    <section class="verse-card dashboard-verse">${escapeHtml(verse)}</section>
    <section class="hero-card dashboard-hero"><div><span class="eyebrow">PAINEL</span><h1>Hoje e sua agenda</h1><p>O que precisa da sua atenção.</p></div></section>
    <div class="period-tabs"><button data-period="week" class="${state.dashboardPeriod==='week'?'active':''}">Semana</button><button data-period="month" class="${state.dashboardPeriod==='month'?'active':''}">Mês</button></div>
    <section class="status-grid">
      <button class="status-card" data-status-list="completed"><span>Realizados</span><strong>${realized}</strong></button>
      <button class="status-card attention" data-status-list="awaiting_confirmation"><span>Aguardando confirmação</span><strong>${awaiting}</strong></button>
      <button class="status-card" data-status-list="scheduled"><span>Em andamento</span><strong>${ongoing}</strong></button>
      <button class="status-card" data-status-list="cancelled"><span>Cancelados</span><strong>${cancelled}</strong></button>
      <button class="status-card tomorrow-card" id="tomorrowCard"><span>Amanhã</span><strong>${tomorrow.length}</strong><small>confirmados</small></button>
    </section>
    <section class="section-card">
      <div class="section-head"><div><span class="eyebrow">PROGRAMAÇÃO</span><h2>${state.dashboardPeriod==='week'?weekLabel(state.selectedWeek):new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(state.selectedWeek)}</h2></div><div class="week-controls"><button id="prevWeek">‹</button><button id="thisWeek">Hoje</button><button id="nextWeek">›</button></div></div>
      <div class="agenda-tabs"><button data-dashboard-tab="service" class="${state.dashboardTab==='service'?'active':''}">Atendimentos</button><button data-dashboard-tab="personal" class="personal-tab ${state.dashboardTab==='personal'?'active':''}">Particular</button></div>
      <div class="appointment-list ${state.dashboardTab==='personal'?'personal-list':''}">${list.length?list.sort((a,b)=>new Date(a.start)-new Date(b.start)).map(appointmentRow).join(''):`<div class="empty">Nenhum ${state.dashboardTab==='personal'?'compromisso particular':'atendimento'} neste período.</div>`}</div>
    </section>
  </main>`;
}

function appointmentRow(a) {
  if(a.type==='personal'){const done=a.status==='completed';return `<div class="personal-dashboard-wrap"><button class="appointment-row personal-row" data-appointment="${a.id}"><div class="date-box"><b>${fmtDayShort(a.start).split(' ')[0]}</b><small>${fmtTime(a.start)}–${fmtTime(a.end)}</small></div><div class="appointment-main"><strong>${escapeHtml(a.personalKind||'Particular')}</strong><span>${escapeHtml(a.notes||'Compromisso pessoal')}</span></div><span class="chevron">›</span></button><button class="personal-status-action ${done?'done':''}" ${done?'disabled':`data-personal-conclude="${a.id}"`}>${done?'✓ Concluído':'Em andamento • Concluir'}</button></div>`;}
  const client=currentData().clients.find(c=>c.id===a.clientId),paid=paymentTotalForAppointment(a.id);
  const settled=paid+Number(a.transferredOut||0);const status=a.status==='awaiting_confirmation'?'Aguardando':a.status==='completed'?(settled>=Number(a.totalValue||0)&&a.totalValue>0?'Realizado • Pago':settled>0?'Realizado • Parcial':'Realizado • A receber'):settled>=Number(a.totalValue||0)&&a.totalValue>0?'Confirmado • Pago':settled>0?'Confirmado • Parcial':'Confirmado';
  return `<button class="appointment-row ${a.status==='completed'&&paid>=Number(a.totalValue||0)&&Number(a.totalValue||0)>0?'realized-paid-row':''}" data-appointment="${a.id}"><div class="date-box"><b>${fmtDayShort(a.start).split(' ')[0]}</b><small>${fmtTime(a.start)}–${fmtTime(a.end)}</small></div><div class="appointment-main"><strong>${escapeHtml(client?.name||'Cliente')}</strong><span>${escapeHtml(a.procedureNames?.join(', ')||'Atendimento')}</span></div><div class="payment-state">${status}</div><span class="chevron">›</span></button>`;
}

function calendar() {
  if (state.agendaMode === 'month') return monthCalendar();
  return weekCalendar();
}

function weekCalendar() {
  const weekStart=startOfWeek(state.selectedWeek);
  const days=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(d.getDate()+i);return d;});
  const label=`${days[0].toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} — ${days[6].toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}`;
  const hourLines=Array.from({length:9},(_,i)=>8+i*2);
  return `<main class="content ${state.calendarSelectionMode?'calendar-selecting':''}"><section class="section-card calendar-card weekly-card ${state.calendarSelectionMode?'selection-focus':''}">
    <div class="section-head"><div><span class="eyebrow">AGENDA • SEMANA</span><h1 class="capitalize">${label}</h1></div><div class="week-controls"><button id="prevAgendaWeek">‹</button><button id="todayAgendaWeek">Hoje</button><button id="nextAgendaWeek">›</button></div></div>
    <div class="agenda-view-tabs"><button data-agenda-mode="week" class="active">Semana</button><button data-agenda-mode="month">Mês</button></div>
    ${state.calendarSelectionMode?`<div class="calendar-selection-hint"><button id="cancelCalendarSelection" class="calendar-selection-close" aria-label="Voltar">×</button><span>${state.calendarSelectionMode==='maintenance'?'Escolha o dia do retorno':'Toque no dia desejado'}</span></div>`:''}
    <div class="week-timeline-wrap">
      <div class="time-axis">${hourLines.map((h,i)=>`<span style="top:${i*12.5}%">${String(h).padStart(2,'0')}h</span>`).join('')}</div>
      <div class="week-columns">${days.map(weekDayColumn).join('')}</div>
    </div>
    <div class="weekly-help">Toque no dia para ampliar • blocos mostram o tempo realmente ocupado</div>
  </section>${state.expandedDayKey?expandedDayOverlay(state.expandedDayKey):''}</main>`;
}

function weekDayColumn(date){
  const key=toLocalDateKey(date), today=key===toLocalDateKey(new Date());
  const aps=currentData().appointments.filter(a=>toLocalDateKey(new Date(a.start))===key&&a.status!=='cancelled');
  return `<div class="week-day ${today?'today':''}"><button class="week-day-head" data-expand-day="${key}"><b>${['DOM','SEG','TER','QUA','QUI','SEX','SÁB'][date.getDay()]}</b><span>${date.getDate()}</span></button><button class="day-track" data-expand-day="${key}" aria-label="Abrir ${key}">${aps.map(timelineBlock).join('')}</button></div>`;
}

function timelineBlock(a){
  const s=new Date(a.start),e=new Date(a.end);let sm=(s.getHours()*60+s.getMinutes())-480, em=(e.getHours()*60+e.getMinutes())-480;
  sm=Math.max(0,Math.min(960,sm));em=Math.max(sm+4,Math.min(960,em));
  const top=sm/960*100,height=Math.max(1.4,(em-sm)/960*100),cls=a.type==='personal'?'personal':'service';
  return `<span class="timeline-block ${cls}" style="top:${top}%;height:${height}%" title="${fmtTime(a.start)}–${fmtTime(a.end)}"></span>`;
}

function expandedDayOverlay(key){
  const d=new Date(key+'T12:00:00'),day=d.getDay(),idx=day===0?6:day-1;
  if(idx<0||idx>6){state.expandedDayKey=null;return ''}
  const aps=currentData().appointments.filter(a=>toLocalDateKey(new Date(a.start))===key&&a.status!=='cancelled').sort((a,b)=>new Date(a.start)-new Date(b.start));
  const hourLines=Array.from({length:17},(_,i)=>8+i);
  const focusTitle=`${d.toLocaleDateString('pt-BR',{weekday:'long'}).toUpperCase()} • ${d.toLocaleDateString('pt-BR',{day:'2-digit',month:'long'}).toUpperCase()}`;
  return `<div class="day-focus-backdrop" id="dayFocus" data-day-index="${idx}"><div class="day-focus-panel">
    <div class="day-focus-head"><button type="button" id="closeDayFocus" aria-label="Fechar">×</button><button type="button" id="prevFocusDay" class="focus-nav" aria-label="Dia anterior">‹</button><strong class="focus-date-title">${focusTitle}</strong><button type="button" id="nextFocusDay" class="focus-nav" aria-label="Próximo dia">›</button><small>${idx+1}/7</small></div>
    <div class="focus-timeline"><div class="focus-axis">${hourLines.map((h,i)=>`<span style="top:${i/16*100}%">${h===24?'00':String(h).padStart(2,'0')}h</span>`).join('')}</div><div class="focus-track" data-free-day="${key}">${hourLines.slice(0,-1).map((h,i)=>`<i style="top:${i/16*100}%"></i>`).join('')}${aps.map(focusBlock).join('')}</div></div>
    <div class="swipe-hint">‹ deslize para trocar de dia ›</div>
  </div></div>`;
}

function focusBlock(a){
  const s=new Date(a.start),e=new Date(a.end);let sm=(s.getHours()*60+s.getMinutes())-480,em=(e.getHours()*60+e.getMinutes())-480;sm=Math.max(0,Math.min(960,sm));em=Math.max(sm+4,Math.min(960,em));
  const top=sm/960*100,height=Math.max(2.2,(em-sm)/960*100),label=a.type==='personal'?(a.personalKind||'Particular'):(currentData().clients.find(c=>c.id===a.clientId)?.name||'Atendimento');
  return `<button class="focus-block ${a.type==='personal'?'personal':'service'}" data-focus-appt="${a.id}" style="top:${top}%;height:${height}%"><b>${fmtTime(a.start)}–${fmtTime(a.end)}</b><span>${escapeHtml(label)}</span></button>`;
}

function monthCalendar() {
  const d = state.selectedMonth;
  const year = d.getFullYear(), month = d.getMonth();
  const first = new Date(year,month,1), last = new Date(year,month+1,0);
  const offset = first.getDay(), cells=[];
  for(let i=0;i<offset;i++)cells.push(null);for(let day=1;day<=last.getDate();day++)cells.push(new Date(year,month,day));while(cells.length%7)cells.push(null);
  const monthLabel=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(d);
  return `<main class="content ${state.calendarSelectionMode?'calendar-selecting':''}"><section class="section-card calendar-card ${state.calendarSelectionMode?'selection-focus':''}"><div class="section-head"><div><span class="eyebrow">AGENDA • MÊS</span><h1 class="capitalize">${monthLabel}</h1></div><div class="week-controls"><button id="prevMonth">‹</button><button id="todayMonth">Hoje</button><button id="nextMonth">›</button></div></div><div class="agenda-view-tabs"><button data-agenda-mode="week">Semana</button><button data-agenda-mode="month" class="active">Mês</button></div>${state.calendarSelectionMode?`<div class="calendar-selection-hint"><button id="cancelCalendarSelection" class="calendar-selection-close" aria-label="Voltar">×</button><span>${state.calendarSelectionMode==='maintenance'?'Escolha o dia do retorno':'Toque no dia desejado'}</span></div>`:''}<div class="legend"><span><i class="dot free"></i>Livre</span><span><i class="dot booked"></i>Atendimento</span><span><i class="dot personal"></i>Particular</span><span><i class="dot mixed"></i>Misto</span></div><div class="calendar-grid dow">${['DOM','SEG','TER','QUA','QUI','SEX','SÁB'].map(x=>`<b>${x}</b>`).join('')}</div><div class="calendar-grid">${cells.map(calCell).join('')}</div></section></main>`;
}

function calCell(date) {
  if (!date) return '<div></div>';
  const key=toLocalDateKey(date),aps=currentData().appointments.filter(a=>toLocalDateKey(new Date(a.start))===key&&a.status!=='cancelled'),personal=aps.filter(a=>a.type==='personal'),service=aps.filter(a=>a.type!=='personal');
  const cls=personal.length&&service.length?'mixed':personal.length?'personal':service.length?'booked':'free',today=key===toLocalDateKey(new Date());
  return `<button class="day-cell ${cls} ${today?'today':''} ${state.calendarSelectionMode?'awaiting-choice':''}" data-day="${key}"><span class="day-number">${date.getDate()}</span>${aps.length?`<span class="count-badge">${aps.length}</span>`:''}<i class="dot ${cls}"></i></button>`;
}

function financeReportRange(){
  const a=new Date(state.financeReportAnchor||new Date());
  if(state.financeReportMode==='month')return {start:new Date(a.getFullYear(),a.getMonth(),1,0,0,0,0),end:new Date(a.getFullYear(),a.getMonth()+1,0,23,59,59,999),label:new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(a)};
  if(state.financeReportMode==='year')return {start:new Date(a.getFullYear(),0,1,0,0,0,0),end:new Date(a.getFullYear(),11,31,23,59,59,999),label:String(a.getFullYear())};
  const st=startOfWeek(a),en=endOfWeek(a);return {start:st,end:en,label:weekLabel(a)};
}
function financeReportNavigator(rr){
  const a=new Date(state.financeReportAnchor||new Date());
  if(state.financeReportMode==='week') return `<div class="report-period-nav"><button id="reportPrev">‹</button><div><small>SEMANA</small><strong>De ${rr.start.toLocaleDateString('pt-BR')} até ${rr.end.toLocaleDateString('pt-BR')}</strong></div><button id="reportNext">›</button></div><button class="report-current" id="reportCurrent">Semana atual</button>`;
  if(state.financeReportMode==='month') return `<div class="report-period-nav"><button id="reportPrev">‹</button><div><small>MÊS</small><strong class="capitalize">${new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(a)}</strong></div><button id="reportNext">›</button></div><button class="report-current" id="reportCurrent">Mês atual</button>`;
  return `<div class="report-period-nav"><button id="reportPrev">‹</button><div><small>ANO</small><strong>${a.getFullYear()}</strong></div><button id="reportNext">›</button></div><button class="report-current" id="reportCurrent">Ano atual</button>`;
}
function annualFinanceTimeline(year){
  const data=currentData(), months=Array.from({length:12},(_,m)=>{const st=new Date(year,m,1),en=new Date(year,m+1,0,23,59,59,999);const cash=data.payments.filter(p=>new Date(p.at)>=st&&new Date(p.at)<=en&&!isWalletPayment(p)).reduce((x,p)=>x+Number(p.amount||0),0);const wf=walletFinanceTransactionsInRange(st,en);const wi=wf.filter(t=>t.financeEffect==='income').reduce((x,t)=>x+Number(t.financeValue??Math.abs(t.amount)),0);const we=wf.filter(t=>t.financeEffect==='expense').reduce((x,t)=>x+Number(t.financeValue??Math.abs(t.amount)),0);const ex=data.expenses.filter(x=>new Date(x.date)>=st&&new Date(x.date)<=en).reduce((x,e)=>x+Number(e.value||0),0)+we;return {m,income:cash+wi,expense:ex};});
  return `<div class="annual-timeline"><div class="annual-line"></div>${months.map(x=>`<button class="annual-month" data-report-month="${x.m}"><i></i><strong>${['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][x.m]}</strong><span>Entrada ${brl(x.income)}</span><span>Saída ${brl(x.expense)}</span><b>${brl(x.income-x.expense)}</b></button>`).join('')}</div>`;
}
function finance() {
  const data=currentData(),start=startOfWeek(state.selectedWeek),end=endOfWeek(state.selectedWeek);
  const pays=data.payments.filter(p=>new Date(p.at)>=start&&new Date(p.at)<=end&&!isWalletPayment(p)),received=pays.reduce((s,p)=>s+Number(p.amount),0);
  const aps=data.appointments.filter(a=>a.type!=='personal'&&a.status!=='cancelled'&&new Date(a.start)>=start&&new Date(a.start)<=end);
  const receivable=aps.reduce((s,a)=>s+appointmentBalance(a),0);
  const exps=data.expenses.filter(x=>new Date(x.date)>=start&&new Date(x.date)<=end),expenses=exps.reduce((s,x)=>s+Number(x.value||0),0);
  const rr=financeReportRange(),rpays=data.payments.filter(p=>new Date(p.at)>=rr.start&&new Date(p.at)<=rr.end&&!isWalletPayment(p)),walletFin=walletFinanceTransactionsInRange(rr.start,rr.end),walletIncome=walletFin.filter(t=>t.financeEffect==='income').reduce((s,t)=>s+Number(t.financeValue??Math.abs(t.amount)),0),walletExpense=walletFin.filter(t=>t.financeEffect==='expense').reduce((s,t)=>s+Number(t.financeValue??Math.abs(t.amount)),0),reportIncome=rpays.reduce((s,p)=>s+Number(p.amount),0)+walletIncome,reportExpenses=data.expenses.filter(x=>new Date(x.date)>=rr.start&&new Date(x.date)<=rr.end).reduce((s,x)=>s+Number(x.value||0),0)+walletExpense,completed=data.appointments.filter(a=>a.type!=='personal'&&a.status==='completed'&&new Date(a.start)>=rr.start&&new Date(a.start)<=rr.end),cancelled=data.appointments.filter(a=>a.type!=='personal'&&a.status==='cancelled'&&new Date(a.start)>=rr.start&&new Date(a.start)<=rr.end);
  return `<main class="content"><section class="hero-card"><span class="eyebrow">FINANCEIRO</span><h1>Entradas e gastos</h1><p>${weekLabel(state.selectedWeek)}</p><div class="week-controls finance-week"><button id="prevWeek">‹</button><button id="thisWeek">Esta semana</button><button id="nextWeek">›</button></div></section>
    <section class="metric-grid"><button class="metric metric-button" id="receivedCard"><span>Recebido</span><strong>${brl(received)}</strong></button><button class="metric metric-button" id="receivableCard"><span>A receber</span><strong>${brl(receivable)}</strong></button><article class="metric"><span>Gastos produtos</span><strong>${brl(expenses)}</strong></article><article class="metric"><span>Resultado</span><strong>${brl(received-expenses)}</strong></article></section>
    <section class="section-card finance-report-card"><div class="section-head"><div><span class="eyebrow">RELATÓRIO GERAL</span><h2>Acompanhamento visual</h2><p>${rr.label}</p></div></div><div class="finance-report-tabs"><button data-fin-report="week" class="${state.financeReportMode==='week'?'active':''}">SEMANA</button><button data-fin-report="month" class="${state.financeReportMode==='month'?'active':''}">MÊS</button><button data-fin-report="year" class="${state.financeReportMode==='year'?'active':''}">ANO</button></div>${financeReportNavigator(rr)}<section class="metric-grid"><button class="metric metric-button" id="reportIncomeCard"><span>Entradas</span><strong>${brl(reportIncome)}</strong><small>Ver procedimentos</small></button><article class="metric"><span>Saídas</span><strong>${brl(reportExpenses)}</strong></article><article class="metric"><span>Resultado</span><strong>${brl(reportIncome-reportExpenses)}</strong></article><article class="metric"><span>Atendimentos</span><strong>${completed.length}</strong></article><article class="metric"><span>Cancelamentos</span><strong>${cancelled.length}</strong></article></section>${state.financeReportMode==='year'?annualFinanceTimeline(new Date(state.financeReportAnchor).getFullYear()):''}${walletIncome||walletExpense?`<div class="note-box">Carteira lançada no financeiro neste período: <b>${brl(walletIncome)}</b> em entradas e <b>${brl(walletExpense)}</b> em saídas.</div>`:''}</section>
    <section class="section-card"><div class="section-head"><div><span class="eyebrow">GASTOS COM PRODUTOS</span><h2>Lançamentos</h2></div><button class="primary small" id="addExpense">+ Gasto</button></div><div class="simple-list">${exps.length?exps.slice().reverse().map(x=>`<button class="simple-row expense-edit-row" data-expense-edit="${x.id}"><div><strong>${escapeHtml(x.description)}</strong><span>${dateWithWeekday(x.date+'T12:00:00')} • toque para editar</span></div><b>${brl(x.value)}</b></button>`).join(''):'<div class="empty">Nenhum gasto nesta semana.</div>'}</div></section></main>`;
}
function openProcedureReport(){const {start,end,label}=financeReportRange(),aps=currentData().appointments.filter(a=>a.type!=='personal'&&a.status==='completed'&&new Date(a.start)>=start&&new Date(a.start)<=end),rows=new Map();for(const a of aps){const items=a.procedureItems?.length?a.procedureItems:(a.procedureIds||[]).map((id,i)=>({id,name:a.procedureNames?.[i]||currentData().procedures.find(p=>p.id===id)?.name||'Procedimento',value:Number(a.totalValue||0)/(a.procedureIds?.length||1)}));for(const i of items){const isExtra=i.category==='extra'||String(i.id||'').startsWith('extra-'),key=isExtra?'extra':(i.id||i.name),r=rows.get(key)||{name:isExtra?'Extra':(i.name||currentData().procedures.find(p=>p.id===i.id)?.name||'Procedimento'),qty:0,value:0};r.qty+=Number(i.qty||1);r.value+=Number(i.value||0);rows.set(key,r);}}const list=[...rows.values()].sort((a,b)=>b.qty-a.qty||b.value-a.value);state.modal=`<div class="modal-head"><div><span class="eyebrow">PROCEDIMENTOS REALIZADOS</span><h2>${escapeHtml(label)}</h2></div><button data-close-modal>×</button></div><div class="received-total">Atendimentos concluídos: <b>${aps.length}</b></div><div class="simple-list">${list.length?list.map(r=>`<div class="receipt-row"><div><strong>${escapeHtml(r.name)}</strong><span>${r.qty} ${r.qty===1?'procedimento':'procedimentos'} realizados</span></div><b>${brl(r.value)}</b></div>`).join(''):'<div class="empty">Nenhum procedimento concluído neste período.</div>'}</div>`;render();}

function clients() {
  const data = currentData();
  return `<main class="content"><section class="section-card"><div class="section-head"><div><span class="eyebrow">CLIENTES</span><h1>Clientes</h1></div><button class="primary small" id="addClient">+ Cliente</button></div>
    <div class="simple-list">${data.clients.length?data.clients.map(c=>`<button class="client-row client-columns" data-client="${c.id}"><strong>${escapeHtml(c.name)}</strong><span class="client-phone">${escapeHtml(formatPhone(c.whatsapp||''))}</span><span class="chevron">›</span></button>`).join(''):'<div class="empty">Nenhuma cliente cadastrada.</div>'}</div>
  </section></main>`;
}

function publicCatalogUrl() { return PUBLIC_CATALOG_SHORT_URL; }


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
  app.innerHTML=`<main class="public-catalog"><header class="public-catalog-head"><img src="./assets/logo-juliane-boone.png" alt="Juliane Boone Nail Designer"><p>Meu catálogo foi pensado para você escolher aquele cuidado que vai renovar suas unhas, sua autoestima e deixar seu dia ainda mais especial. ✨</p></header><section class="catalog-showcase">${catalogCards(true)}</section><div class="public-actions"><button class="secondary full" id="howToGet">📍 Como chegar</button></div><footer>Juliane Boone • Nail Designer</footer></main>`;
  document.querySelectorAll('[data-catalog-procedure]').forEach(btn=>btn.onclick=()=>{
    const p=currentData().procedures.find(x=>x.id===btn.dataset.catalogProcedure);
    const msg=`Olá! 😊 Vi seu catálogo e me interessei por ${p?.name||'um procedimento'} – ${brl(p?.value||0)}. Gostaria de saber sobre disponibilidade. 💅`;
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
    confirmDialog(`Entrar no ambiente ${next==='sandbox'?'de TESTES':'OFICIAL'}?`,()=>{store.switchEnvironment(next);state.view='dashboard';navigationStack=['dashboard'];render();});
  });
  document.querySelector('#newAppointment')?.addEventListener('click', openNewRecordChoice);
  document.querySelector('#prevWeek')?.addEventListener('click',()=>{state.selectedWeek=new Date(state.selectedWeek);state.selectedWeek.setDate(state.selectedWeek.getDate()-(state.dashboardPeriod==='month'?30:7));render();});
  document.querySelector('#nextWeek')?.addEventListener('click',()=>{state.selectedWeek=new Date(state.selectedWeek);state.selectedWeek.setDate(state.selectedWeek.getDate()+(state.dashboardPeriod==='month'?30:7));render();});
  document.querySelector('#thisWeek')?.addEventListener('click',()=>{state.selectedWeek=startOfWeek(new Date());render();});
  document.querySelector('#prevMonth')?.addEventListener('click',()=>{state.selectedMonth=new Date(state.selectedMonth.getFullYear(),state.selectedMonth.getMonth()-1,1);render();});
  document.querySelector('#nextMonth')?.addEventListener('click',()=>{state.selectedMonth=new Date(state.selectedMonth.getFullYear(),state.selectedMonth.getMonth()+1,1);render();});
  document.querySelector('#todayMonth')?.addEventListener('click',()=>{const n=new Date();state.selectedMonth=new Date(n.getFullYear(),n.getMonth(),1);render();});
  document.querySelectorAll('[data-agenda-mode]').forEach(b=>b.onclick=()=>{state.agendaMode=b.dataset.agendaMode;if(state.agendaMode==='week')state.selectedWeek=startOfWeek(new Date());render();});
  document.querySelector('#prevAgendaWeek')?.addEventListener('click',()=>{state.selectedWeek=new Date(state.selectedWeek);state.selectedWeek.setDate(state.selectedWeek.getDate()-7);render();});
  document.querySelector('#nextAgendaWeek')?.addEventListener('click',()=>{state.selectedWeek=new Date(state.selectedWeek);state.selectedWeek.setDate(state.selectedWeek.getDate()+7);render();});
  document.querySelector('#todayAgendaWeek')?.addEventListener('click',()=>{state.selectedWeek=startOfWeek(new Date());render();});
  document.querySelectorAll('[data-expand-day]').forEach(b=>b.onclick=(e)=>{e.stopPropagation();const key=b.dataset.expandDay;if(state.calendarSelectionMode){openDay(key,true);}else{state.expandedDayKey=key;render();}});
  document.querySelector('#closeDayFocus')?.addEventListener('click',()=>{state.expandedDayKey=null;render();});
  document.querySelector('#prevFocusDay')?.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();moveFocusedDay(-1);});
  document.querySelector('#nextFocusDay')?.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();moveFocusedDay(1);});
  document.querySelectorAll('[data-free-day]').forEach(track=>track.addEventListener('click',handleFreeSlotClick));
  document.querySelectorAll('[data-focus-appt]').forEach(b=>b.onclick=(e)=>{e.stopPropagation();openAppointment(b.dataset.focusAppt);});
  bindDaySwipe();
  document.querySelector('#cancelCalendarSelection')?.addEventListener('click',()=>{const ret=state.returnAppointmentId;state.calendarSelectionMode=null;state.calendarEditAppointmentId=null;state.calendarEditKind=null;state.draftAppointment=null;state.returnAppointmentId=null;if(ret){openCompletionNext(ret);return;}state.view='dashboard';navigationStack=['dashboard'];render();});
  document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>openDay(b.dataset.day,!!state.calendarSelectionMode));
  document.querySelectorAll('[data-appointment]').forEach(b=>b.onclick=()=>openAppointment(b.dataset.appointment));
  document.querySelectorAll('[data-personal-conclude]').forEach(b=>b.onclick=()=>completePersonalFlow(b.dataset.personalConclude));
  document.querySelectorAll('[data-client]').forEach(b=>b.onclick=()=>openClient(b.dataset.client));
  document.querySelectorAll('[data-procedure]').forEach(b=>b.onclick=()=>editProcedure(b.dataset.procedure));
  document.querySelector('#addClient')?.addEventListener('click', addClient);
  document.querySelector('#addExpense')?.addEventListener('click', addExpense);
  document.querySelectorAll('[data-expense-edit]').forEach(b=>b.onclick=()=>editExpense(b.dataset.expenseEdit));
  document.querySelector('#receivableCard')?.addEventListener('click', openReceivables);
  document.querySelector('#receivedCard')?.addEventListener('click', openReceivedLedger);
  document.querySelectorAll('[data-fin-report]').forEach(b=>b.onclick=()=>{state.financeReportMode=b.dataset.finReport;render();});
  document.querySelector('#reportPrev')?.addEventListener('click',()=>{const a=new Date(state.financeReportAnchor);if(state.financeReportMode==='week')a.setDate(a.getDate()-7);else if(state.financeReportMode==='month')a.setMonth(a.getMonth()-1);else a.setFullYear(a.getFullYear()-1);state.financeReportAnchor=a;render();});document.querySelector('#reportNext')?.addEventListener('click',()=>{const a=new Date(state.financeReportAnchor);if(state.financeReportMode==='week')a.setDate(a.getDate()+7);else if(state.financeReportMode==='month')a.setMonth(a.getMonth()+1);else a.setFullYear(a.getFullYear()+1);state.financeReportAnchor=a;render();});document.querySelector('#reportCurrent')?.addEventListener('click',()=>{state.financeReportAnchor=new Date();render();});document.querySelectorAll('[data-report-month]').forEach(b=>b.onclick=()=>{const y=new Date(state.financeReportAnchor).getFullYear();state.financeReportMode='month';state.financeReportAnchor=new Date(y,Number(b.dataset.reportMonth),1,12);render();});
  document.querySelector('#reportIncomeCard')?.addEventListener('click',openProcedureReport);
  document.querySelectorAll('[data-status-list]').forEach(b=>b.onclick=()=>openStatusList(b.dataset.statusList));
  document.querySelector('#tomorrowCard')?.addEventListener('click',openTomorrowList);
  document.querySelectorAll('[data-dashboard-tab]').forEach(b=>b.onclick=()=>{state.dashboardTab=b.dataset.dashboardTab;render();});
  document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{state.dashboardPeriod=b.dataset.period;render();});
  document.querySelector('#shareCatalog')?.addEventListener('click', shareCatalog);
  document.querySelector('#resetSandbox')?.addEventListener('click',()=>confirmDialog('Resetar todos os dados do Sandbox?',()=>{store.resetSandbox();render();}));
  document.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=()=>{state.modal=null;if(state.calendarSelectionMode){state.view='calendar';}render();});
}


function moveFocusedDay(delta){
  const el=document.querySelector('#dayFocus');if(!el)return;
  const idx=Number(el.dataset.dayIndex),next=idx+delta;
  if(next<0||next>6){el.classList.add('edge-bump');setTimeout(()=>el.classList.remove('edge-bump'),220);return;}
  const d=new Date(startOfWeek(state.selectedWeek));d.setDate(d.getDate()+next);
  state.expandedDayKey=toLocalDateKey(d);render();
}

function bindDaySwipe(){
  const el=document.querySelector('#dayFocus');if(!el)return;
  let x0=null,y0=null;
  const start=(x,y,target)=>{if(target.closest('button'))return false;x0=x;y0=y;return true;};
  const finish=(x,y,e)=>{if(x0===null)return;const dx=x-x0,dy=y-y0;x0=y0=null;if(Math.abs(dx)<45||Math.abs(dx)<=Math.abs(dy))return;e.preventDefault();e.stopPropagation();moveFocusedDay(dx<0?1:-1);};
  el.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const t=e.touches[0];start(t.clientX,t.clientY,e.target);},{passive:true});
  el.addEventListener('touchend',e=>{if(!e.changedTouches.length)return;const t=e.changedTouches[0];finish(t.clientX,t.clientY,e);},{passive:false});
  el.addEventListener('touchcancel',()=>{x0=y0=null;},{passive:true});
  el.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||(e.pointerType==='mouse'&&e.button!==0))return;start(e.clientX,e.clientY,e.target);});
  el.addEventListener('pointerup',e=>{if(e.pointerType==='touch')return;finish(e.clientX,e.clientY,e);});
  el.addEventListener('pointercancel',e=>{if(e.pointerType!=='touch')x0=y0=null;});
}

function slotTimeFromTrack(track,clientY){
  const r=track.getBoundingClientRect();let ratio=(clientY-r.top)/r.height;ratio=Math.max(0,Math.min(.999,ratio));
  let mins=Math.round((ratio*960)/15)*15;mins=Math.max(0,Math.min(945,mins));
  const total=480+mins;return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}
function handleFreeSlotClick(e){
  if(e.target.closest('[data-focus-appt]'))return;
  const track=e.currentTarget,key=track.dataset.freeDay,time=slotTimeFromTrack(track,e.clientY);
  state.selectedDateKey=key;state.slotPrefillTime=time;
  if(state.calendarSelectionMode){const mode=state.calendarSelectionMode,editId=state.calendarEditAppointmentId,editKind=state.calendarEditKind;state.calendarSelectionMode=null;state.calendarEditAppointmentId=null;state.calendarEditKind=null;if(editId){openScheduleTimeEditor(editId,key,editKind,time);return;}if(mode==='personal'){openPersonalForm(null,key,time);}else{openNewAppointmentForm();}return;}
  openNewRecordChoiceForSlot(key,time);
}

function openDay(key, selectable=false) {
  const aps=currentData().appointments.filter(a=>toLocalDateKey(new Date(a.start))===key&&a.status!=='cancelled').sort((a,b)=>new Date(a.start)-new Date(b.start));
  state.modal=`<div class="modal-head"><div><span class="eyebrow">${selectable?'ESCOLHA O DIA':'AGENDA DO DIA'}</span><h2>${new Date(key+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})}</h2></div><button data-close-modal>×</button></div><div class="day-agenda">${aps.length?aps.map(a=>`<button class="day-slot day-slot-button" data-day-appointment="${a.id}"><b>${fmtTime(a.start)}–${fmtTime(a.end)}</b><span>${escapeHtml(a.type==='personal'?(a.personalKind||'Particular'):`${a.procedureNames?.join(', ')||'Atendimento'} — ${currentData().clients.find(c=>c.id===a.clientId)?.name||'Cliente'}`)}</span><i>›</i></button>`).join(''):'<div class="empty">Nenhum compromisso neste dia.</div>'}</div>${selectable?`<button class="primary full" id="selectThisDay">Selecionar este dia</button>`:''}`;
  render();
  document.querySelectorAll('[data-day-appointment]').forEach(b=>b.onclick=()=>openAppointment(b.dataset.dayAppointment));
  if(selectable)document.querySelector('#selectThisDay')?.addEventListener('click',()=>{const mode=state.calendarSelectionMode,editId=state.calendarEditAppointmentId,editKind=state.calendarEditKind;state.selectedDateKey=key;state.modal=null;state.calendarSelectionMode=null;state.calendarEditAppointmentId=null;state.calendarEditKind=null;if(editId){openScheduleTimeEditor(editId,key,editKind);return;}if(mode==='personal')openPersonalForm(null,key);else openNewAppointmentForm();});
}

function startPersonalFlow() {
  state.modal=null;
  state.agendaMode='week';
  state.selectedWeek=startOfWeek(new Date());
  state.calendarSelectionMode='personal';
  state.selectionOrigin='personal';
  state.view='calendar';
  navigationStack=['dashboard','calendar'];
  render();
}

function startAppointmentFlow(clientId=null, origin='new', debtDecision=null) {
  if(clientId && !debtDecision){const pending=clientPendingAppointments(clientId);if(pending.length){const total=pending.reduce((sum,a)=>sum+appointmentBalance(a),0);state.modal=`<div class="modal-head"><div><span class="eyebrow">SALDO PENDENTE</span><h2>Antes do novo agendamento</h2></div><button data-close-modal>×</button></div><div class="warning">Esta cliente possui <b>${brl(total)}</b> a receber de atendimento anterior.</div><p class="muted">Você pode quitar agora ou transferir o saldo para o novo atendimento. O valor continuará discriminado para não duplicar o financeiro.</p><button class="primary full" id="payPendingBeforeSchedule">Quitar antes</button><button class="secondary full" id="carryPendingAndSchedule">Transferir saldo e agendar</button>`;render();document.querySelector('#payPendingBeforeSchedule').onclick=()=>registerPayment(pending[0].id);document.querySelector('#carryPendingAndSchedule').onclick=()=>startAppointmentFlow(clientId,origin,{items:pending.map(a=>({appointmentId:a.id,amount:appointmentBalance(a)})),total});return;}}
  state.modal=null;
  state.agendaMode='week';
  state.selectedWeek=startOfWeek(new Date());
  state.selectedMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
  state.draftAppointment = { procedureIds: [], notes:'', totalValue:0, clientId, origin, carryOver:debtDecision||null };
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
  state.modal=`<div class="modal-head"><div><span class="eyebrow">NOVO AGENDAMENTO</span><h2>${dateWithWeekday(state.selectedDateKey+'T12:00:00')}</h2></div><button data-close-modal>×</button></div>
  <label>Cliente<select id="apptClient"><option value="">Selecione</option>${clients.map(c=>`<option value="${c.id}" ${c.id===preClient?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}</select></label>
  <button class="secondary full compact" id="newClientFromAppointment">+ Cadastrar nova cliente</button>
  ${cycle>=2?`<div class="cycle-alert"><b>${cycle} manutenções desde a última aplicação.</b><span>Avaliar necessidade de nova aplicação.</span></div>`:''}
  ${state.draftAppointment?.carryOver?`<div class="warning"><b>Saldo anterior transferido: ${brl(state.draftAppointment.carryOver.total)}</b><br>Será somado ao novo atendimento e ficará discriminado no histórico.</div>`:''}
  ${state.selectionOrigin==='maintenance'?`<label class="check-row new-application-choice"><input type="checkbox" id="newApplicationChoice"><span><b>Nova aplicação</b><small>Marque se será necessário remover/refazer tudo.</small></span></label>`:''}
  <fieldset><legend>Procedimentos</legend>${procs.map(p=>`<div class="procedure-choice"><label class="check-row"><input type="checkbox" value="${p.id}" class="proc-check" ${(state.selectionOrigin==='maintenance'&&p.id==='manutencao')?'checked':''}><span>${escapeHtml(p.name)}</span><b>${brl(p.value)}</b></label>${p.id==='reposicao-quebrada'?`<div class="qty-control" data-qty-wrap="${p.id}"><button type="button" data-qty-minus="${p.id}">−</button><strong data-qty="${p.id}">1</strong><button type="button" data-qty-plus="${p.id}">+</button><small>unidade(s)</small></div>`:''}</div>`).join('')}</fieldset>
  <button class="secondary full compact" type="button" id="addAppointmentExtra">+ Adicionar extra</button>
  <div id="appointmentExtras"></div>
  <div class="two-col"><label>Início<input type="time" id="apptStart" value="${state.slotPrefillTime||'09:00'}" step="60"></label><label>Fim<input type="time" id="apptEnd" value="${state.slotPrefillTime||'09:00'}" step="60"></label></div>
  <label>Valor do atendimento<input type="number" id="apptValue" step="0.01" value="0"></label>
  <label>Anotações (opcional)<textarea id="apptNotes"></textarea></label>
  <button class="primary full" id="saveAppointment">Confirmar agendamento</button>`;
  render();
  const qtyFor=id=>Number(document.querySelector(`[data-qty="${id}"]`)?.textContent||1);const readExtras=()=>[...document.querySelectorAll('[data-appointment-extra]')].map(row=>({description:row.querySelector('[data-extra-description]')?.value.trim()||'',value:Number(row.querySelector('[data-extra-value]')?.value||0)})).filter(x=>x.description||x.value>0);const refreshCalc=()=>{const selected=[...document.querySelectorAll('.proc-check:checked')].map(x=>currentData().procedures.find(p=>p.id===x.value));const extras=readExtras(),serviceTotal=selected.reduce((s,p)=>s+Number(p.value||0)*(p.id==='reposicao-quebrada'?qtyFor(p.id):1),0)+extras.reduce((s,x)=>s+Number(x.value||0),0),total=serviceTotal+Number(state.draftAppointment?.carryOver?.total||0),mins=selected.reduce((s,p)=>s+Number(p.durationMin||0)*(p.id==='reposicao-quebrada'?qtyFor(p.id):1),0);document.querySelector('#apptValue').value=total.toFixed(2);const startVal=document.querySelector('#apptStart').value||'09:00';const d=new Date(`${state.selectedDateKey}T${startVal}:00`),e=addMinutes(d,mins);document.querySelector('#apptEnd').value=`${String(e.getHours()).padStart(2,'0')}:${String(e.getMinutes()).padStart(2,'0')}`;};
  const addExtraRow=()=>{const wrap=document.querySelector('#appointmentExtras'),row=document.createElement('div');row.className='procedure-choice';row.dataset.appointmentExtra='1';row.innerHTML=`<label>Descrição do extra<input data-extra-description placeholder="Ex.: Reparo especial"></label><div class="two-col"><label>Valor<input data-extra-value type="number" min="0.01" step="0.01" placeholder="0,00"></label><button type="button" class="secondary" data-remove-extra>Remover</button></div>`;wrap.appendChild(row);row.querySelectorAll('input').forEach(i=>i.addEventListener('input',refreshCalc));row.querySelector('[data-remove-extra]').onclick=()=>{row.remove();refreshCalc();};};
  document.querySelector('#addAppointmentExtra').onclick=addExtraRow;
  document.querySelector('#newClientFromAppointment').onclick=()=>addClient('appointment');
  document.querySelectorAll('.proc-check').forEach(x=>x.onchange=refreshCalc);document.querySelectorAll('[data-qty-plus]').forEach(b=>b.onclick=()=>{const q=document.querySelector(`[data-qty="${b.dataset.qtyPlus}"]`);q.textContent=Number(q.textContent)+1;refreshCalc();});document.querySelectorAll('[data-qty-minus]').forEach(b=>b.onclick=()=>{const q=document.querySelector(`[data-qty="${b.dataset.qtyMinus}"]`);q.textContent=Math.max(1,Number(q.textContent)-1);refreshCalc();});document.querySelector('#apptStart').onchange=refreshCalc;
  document.querySelector('#newApplicationChoice')?.addEventListener('change',e=>{const m=document.querySelector('.proc-check[value="manutencao"]'),a=document.querySelector('.proc-check[value="alongamento"]');if(e.target.checked){if(m)m.checked=false;if(a)a.checked=true;}else{if(a)a.checked=false;if(m)m.checked=true;}refreshCalc();});
  document.querySelector('#saveAppointment').onclick=saveAppointment;refreshCalc();
}

function saveAppointment() {
  const clientId=document.querySelector('#apptClient').value,checks=[...document.querySelectorAll('.proc-check:checked')],procIds=checks.map(x=>x.value),extraRows=[...document.querySelectorAll('[data-appointment-extra]')],extraItems=extraRows.map((row,i)=>({id:`extra-${uid('item')}`,category:'extra',name:row.querySelector('[data-extra-description]')?.value.trim()||'',qty:1,unitValue:Number(row.querySelector('[data-extra-value]')?.value||0),value:Number(row.querySelector('[data-extra-value]')?.value||0),durationMin:0})).filter(x=>x.name||x.value>0);
  if(!clientId||(!procIds.length&&!extraItems.length)){alert('Selecione pelo menos um procedimento ou adicione um extra.');return;}if(extraItems.some(x=>!x.name||x.value<=0)){alert('Preencha a descrição e o valor de cada extra.');return;}
  const startTime=document.querySelector('#apptStart').value,endTime=document.querySelector('#apptEnd').value,start=new Date(`${state.selectedDateKey}T${startTime}:00`);let end=new Date(`${state.selectedDateKey}T${endTime}:00`);if(end<=start)end.setDate(end.getDate()+1);
  const procedureItems=[...procIds.map(id=>{const p=currentData().procedures.find(x=>x.id===id),qty=id==='reposicao-quebrada'?Number(document.querySelector(`[data-qty="${id}"]`)?.textContent||1):1;return {id,name:p.name,qty,unitValue:Number(p.value),value:Number(p.value)*qty,durationMin:Number(p.durationMin)*qty};}),...extraItems];
  const appointment={id:uid('appt'),clientId,type:'service',procedureIds:procIds,procedureItems,procedureNames:procedureItems.map(i=>i.qty>1?`${i.name} ×${i.qty}`:i.name),start:start.toISOString(),end:end.toISOString(),totalValue:Number(document.querySelector('#apptValue').value||0),notes:document.querySelector('#apptNotes').value,carryOver:state.draftAppointment?.carryOver||null,status:'awaiting_confirmation',createdAt:new Date().toISOString(),history:[]};
  const conflict=hasConflict(appointment);if(conflict){const cc=currentData().clients.find(c=>c.id===conflict.clientId);alert(`Horário indisponível. Já existe ${cc?.name||conflict.personalKind||'um compromisso'} das ${fmtTime(conflict.start)} às ${fmtTime(conflict.end)}.`);return;}
  if(appointment.carryOver?.items?.length){for(const item of appointment.carryOver.items){const src=currentData().appointments.find(x=>x.id===item.appointmentId);if(src){src.transferredOut=Number(src.transferredOut||0)+Number(item.amount||0);src.transferredTo=appointment.id;addHistory(src,'balance_transferred',`Saldo ${brl(item.amount)} transferido para novo atendimento`,{toAppointmentId:appointment.id});}}addHistory(appointment,'balance_carried',`Saldo anterior transferido: ${brl(appointment.carryOver.total)}`);}addHistory(appointment,'reserved','Horário reservado aguardando confirmação');finalizeAppointment(appointment,0,'',false);
}

function finalizeAppointment(appointment, initialPayment=0, method='PIX', noDeposit=false) {
  appointment.noDeposit=!!noDeposit;
  appointment.status=(initialPayment>0||noDeposit)?'scheduled':'awaiting_confirmation';
  if(!currentData().appointments.some(a=>a.id===appointment.id)) currentData().appointments.push(appointment);
  if(initialPayment>0){currentData().payments.push({id:uid('pay'),appointmentId:appointment.id,amount:initialPayment,method,kind:'signal',at:new Date().toISOString()});addHistory(appointment,'payment',`Recebimento ${brl(initialPayment)}`,{amount:initialPayment,method});}
  store.save('appointment.create',{appointmentId:appointment.id,initialPayment,noDeposit});state.calendarSelectionMode=null;state.view='dashboard';navigationStack=['dashboard'];openReservationActions(appointment.id);
}

function openBookingPayment(appointment) { finalizeAppointment(appointment,0,'',false); }

function addClient(origin='clients'){
  const fromAppointment = origin === 'appointment';
  state.modal=`<div class="modal-head"><div><span class="eyebrow">CLIENTE</span><h2>Nova cliente</h2></div><button data-close-modal>×</button></div><label>Nome<input id="clientName"></label><label>WhatsApp<input id="clientWhatsapp" inputmode="tel"></label><label>Observações<textarea id="clientNotes"></textarea></label><label class="check-row"><input id="clientWalletEnabled" type="checkbox"><span><b>Esta cliente utiliza saldo em carteira</b><small>Ative somente para clientes que fazem troca de serviços.</small></span></label><button class="primary full" id="saveClient">Salvar cliente</button>`;render();
  document.querySelector('#saveClient').onclick=()=>{const name=document.querySelector('#clientName').value.trim();if(!name){alert('Informe o nome.');return;}const c={id:uid('client'),name,whatsapp:document.querySelector('#clientWhatsapp').value.trim(),notes:document.querySelector('#clientNotes').value.trim(),walletEnabled:!!document.querySelector('#clientWalletEnabled')?.checked,walletTransactions:[],createdAt:new Date().toISOString()};currentData().clients.push(c);store.save('client.create',{clientId:c.id,origin});state.modal=null;if(fromAppointment){openNewAppointmentForm();setTimeout(()=>{const sel=document.querySelector('#apptClient');if(sel)sel.value=c.id;},0);}else render();};
}
function openClient(id){
  const c=currentData().clients.find(x=>x.id===id);const aps=currentData().appointments.filter(a=>a.clientId===id).sort((a,b)=>new Date(b.start)-new Date(a.start));const pays=currentData().payments.filter(p=>aps.some(a=>a.id===p.appointmentId));const cashPays=pays.filter(p=>!isWalletPayment(p));const cycle=maintenanceCount(id),wallet=walletBalance(c);
  state.modal=`<div class="modal-head"><div><span class="eyebrow">CLIENTE</span><h2>${escapeHtml(c.name)}</h2></div><button data-close-modal>×</button></div><div class="tab-grid"><article><span>Histórico</span><strong>${aps.length}</strong></article><article><span>Recebido</span><strong>${brl(cashPays.reduce((s,p)=>s+Number(p.amount),0))}</strong></article></div>${cycle?`<div class="cycle-alert"><b>${cycle} ${cycle===1?'manutenção':'manutenções'} desde a última aplicação</b>${cycle>=2?'<span>Avaliar nova aplicação no próximo retorno.</span>':''}</div>`:''}${c.walletEnabled?`<div class="cycle-alert"><b>Saldo em carteira: ${brl(wallet)}</b><span>Créditos de troca de serviços.</span></div><button class="secondary full" id="clientWallet">Carteira da cliente</button>`:`<button class="secondary full" id="enableClientWallet">Ativar saldo em carteira</button>`}<button class="primary full" id="clientSchedule">AGENDAR</button><button class="secondary full" id="clientSendRules">Enviar regras de agendamento</button><h3 class="history-title">Histórico de atendimentos</h3><div class="simple-list">${aps.length?aps.map(a=>{const paid=paymentTotalForAppointment(a.id);return `<div class="client-history-wrap"><button class="client-history history-columns" data-appointment="${a.id}"><span class="history-date">${dateWithWeekday(a.start)}<small>${fmtTime(a.start)}–${fmtTime(a.end)}</small></span><span class="history-proc">${escapeHtml(a.procedureNames?.join(', ')||'')}</span><b class="history-money">${brl(paid)} <small>de ${brl(a.totalValue)}</small></b></button>${a.status==='scheduled'?`<button class="history-conclude" data-conclude-client="${a.id}">Concluir</button>`:''}</div>`}).join(''):'<div class="empty">Sem atendimentos.</div>'}</div>`;render();
  document.querySelector('#clientSchedule').onclick=()=>openClientScheduleChoice(id);document.querySelector('#clientSendRules').onclick=()=>shareBookingRulesImage();document.querySelector('#clientWallet')?.addEventListener('click',()=>openClientWallet(id));document.querySelector('#enableClientWallet')?.addEventListener('click',()=>{confirmDialog('Ativar saldo em carteira para esta cliente?',()=>{c.walletEnabled=true;c.walletTransactions=c.walletTransactions||[];store.save('client.wallet.enable',{clientId:id});openClient(id);});});document.querySelectorAll('[data-appointment]').forEach(b=>b.onclick=()=>openAppointment(b.dataset.appointment));document.querySelectorAll('[data-conclude-client]').forEach(b=>b.onclick=()=>completeAppointment(b.dataset.concludeClient));
}

function openClientScheduleChoice(clientId){const n=maintenanceCount(clientId);state.modal=`<div class="modal-head"><div><span class="eyebrow">AGENDAR</span><h2>Procedimento / manutenção</h2></div><button data-close-modal>×</button></div>${n>=2?`<div class="cycle-alert"><b>${n} manutenções desde a última aplicação.</b><span>Avaliar nova aplicação.</span></div>`:''}<button class="primary full" id="newProcedureChoice">Novo procedimento</button><button class="secondary full" id="maintenanceChoice">Manutenção / retorno</button>`;render();document.querySelector('#newProcedureChoice').onclick=()=>startAppointmentFlow(clientId,'new');document.querySelector('#maintenanceChoice').onclick=()=>startAppointmentFlow(clientId,'maintenance');}

function openAppointment(id){
  const a=currentData().appointments.find(x=>x.id===id);if(!a)return;
  if(a.type==='personal'){openPersonalDetail(id);return;}
  const c=currentData().clients.find(x=>x.id===a.clientId),paid=paymentTotalForAppointment(id),balance=appointmentBalance(a),completed=a.status==='completed',cancelled=a.status==='cancelled',awaiting=a.status==='awaiting_confirmation';
  const care=(a.procedureIds||[]).some(x=>x==='alongamento'||x==='manutencao'),needsMaintenance=appointmentRequiresMaintenance(a);
  const financeButton=!completed&&!cancelled&&balance>0?(paid<=0?'<button class="primary full" id="registerPayment">Ir para Financeiro</button>':'<button class="secondary full" id="registerPayment">Registrar outro valor antecipado</button>'):'';
  state.modal=`<div class="modal-head"><div><span class="eyebrow">AGENDAMENTO${completed?' • CONCLUÍDO':cancelled?' • CANCELADO':awaiting?' • AGUARDANDO CONFIRMAÇÃO':''}</span><h2>${escapeHtml(c?.name||'Cliente')}</h2></div><button data-close-modal>×</button></div><div class="detail-grid"><span>Data</span><b>${dateWithWeekday(a.start)}</b><span>Horário</span><b>${fmtTime(a.start)}–${fmtTime(a.end)}</b><span>Procedimentos</span><b>${escapeHtml(a.procedureNames?.join(', ')||'')}</b><span>Valor</span><b>${brl(a.totalValue)}</b>${a.carryOver?.total?`<span>Inclui saldo anterior</span><b>${brl(a.carryOver.total)}</b>`:''}${a.transferredOut?`<span>Saldo transferido</span><b>${brl(a.transferredOut)}</b>`:''}<span class="received-band ${balance<=0?'received-paid':'received-pending'}">Recebido</span><b class="received-band ${balance<=0?'received-paid':'received-pending'}">${brl(paid)}</b><span>A receber</span><b>${brl(balance)}</b></div>${a.notes?`<div class="note-box">${escapeHtml(a.notes)}</div>`:''}${awaiting?`<button class="primary full" id="reservationActions">Reserva / sinal</button><button class="secondary full" id="remindConfirmation">${messageButtonLabel(a,'confirmation_reminder')} • lembrete de confirmação</button>`:''}${!cancelled?`${financeButton}${!completed?'<button class="success-action full" id="completeAppointment">✓ Concluir atendimento</button>':''}${completed&&balance>0?`<button class="primary full" id="payCompletedBalance">Finalizar recebimento • ${brl(balance)}</button>`:''}${completed&&needsMaintenance?'<button class="secondary full" id="scheduleMaintenance">Agendar próxima manutenção</button>':''}${completed&&care?'<button class="secondary full" id="sendPostCare">Enviar cuidados pós-atendimento</button>':''}${!completed?'<div class="action-pair"><button class="secondary" id="editSchedule">Alterar data / horário</button><button class="secondary" id="rescheduleCancel">Reagendar / cancelar</button></div>':''}${paid<=0&&!completed?'<button class="danger full" id="deleteAppointment">Excluir agendamento</button>':''}`:''}${a.history?.length?`<details class="appointment-history"><summary>Ver histórico do agendamento</summary>${a.history.slice().reverse().map(h=>`<div><b>${dateWithWeekday(h.at,true)}</b><span>${escapeHtml(friendlyHistoryLabel(h))}</span></div>`).join('')}</details>`:''}`;render();
  document.querySelector('#payCompletedBalance')?.addEventListener('click',()=>registerPayment(a.id));document.querySelector('#reservationActions')?.addEventListener('click',()=>openReservationActions(a.id));document.querySelector('#remindConfirmation')?.addEventListener('click',()=>sendConfirmationReminder(a.id));document.querySelector('#registerPayment')?.addEventListener('click',()=>registerPayment(a.id));document.querySelector('#completeAppointment')?.addEventListener('click',()=>openCompletionReview(a.id));document.querySelector('#scheduleMaintenance')?.addEventListener('click',()=>startMaintenanceFromCompletion(a.id));document.querySelector('#sendPostCare')?.addEventListener('click',()=>sharePostCare(a.id));document.querySelector('#editSchedule')?.addEventListener('click',()=>editSchedule(a.id,'alteracao'));document.querySelector('#rescheduleCancel')?.addEventListener('click',()=>rescheduleOrCancel(a.id));document.querySelector('#deleteAppointment')?.addEventListener('click',()=>deleteAppointmentFlow(a.id));
}
function confirmMoneyLaunch({amount,method,kind,onConfirm,onCancel}){state.modal=`<div class="modal-head"><div><span class="eyebrow">CONFIRMAR RECEBIMENTO</span><h2>${escapeHtml(kind)}</h2></div><button data-close-modal>×</button></div><div class="payment-summary"><span>Valor</span><b>${brl(amount)}</b><span>Forma</span><b>${escapeHtml(method)}</b></div><div class="warning"><b>Só clique em continuar se você realmente recebeu este valor.</b><br>Ao confirmar, ele será registrado como recebido e deduzido do saldo do atendimento.</div><button class="primary full" id="confirmMoney">CONFIRMAR RECEBIMENTO</button><button class="secondary full" id="cancelMoneyConfirm">Cancelar</button>`;render();document.querySelector('#confirmMoney').onclick=onConfirm;document.querySelector('#cancelMoneyConfirm').onclick=()=>onCancel?onCancel():(state.modal=null,render());}

function registerPayment(appointmentId){
  const a=currentData().appointments.find(x=>x.id===appointmentId),paid=paymentTotalForAppointment(appointmentId),balance=appointmentBalance(a);if(balance<=0){alert('Este atendimento já está quitado.');return;}const first=paid<=0,parts=paymentSuggestionParts(a),suggested=parts.suggested,label=parts.label;
  const composition=first?`<div class="warning"><b>Composição do valor sugerido</b><br>${parts.carry>0?`Saldo pendente anterior: <b>${brl(parts.carry)}</b><br>`:''}Novo serviço: <b>${brl(parts.service)}</b><br>Sinal do novo serviço (30%): <b>${brl(parts.signal)}</b><br><b>Valor sugerido para lançar: ${brl(suggested)}</b><br>Após o sugerido: <b>${brl(Math.max(0,balance-suggested))} a receber</b></div>`:'';
  state.modal=`<div class="modal-head"><div><span class="eyebrow">FINANCEIRO</span><h2>Registrar pagamento</h2></div><button data-close-modal>×</button></div><div class="payment-summary"><span>Valor do atendimento</span><b>${brl(a.totalValue)}</b><span>Já recebido</span><b>${brl(paid)}</b><span>${label}</span><b>${brl(suggested)}</b><span>Saldo atual</span><b>${brl(balance)}</b></div>${composition}<label>Valor para lançar<input id="payAmount" type="number" step="0.01" min="0.01" max="${balance}" value="${suggested.toFixed(2)}"></label><label>Forma<select id="payMethod"><option>PIX</option><option>Dinheiro</option><option>Cartão</option></select></label><div class="live-payment-result"><span>Após este lançamento</span><strong id="paymentResult"></strong></div><button class="primary full" id="savePayment">LANÇAR</button>`;render();const input=document.querySelector('#payAmount');const refresh=()=>{const amount=Math.max(0,Number(input.value||0));document.querySelector('#paymentResult').textContent=`Recebido ${brl(paid+amount)} • A receber ${brl(Math.max(0,balance-amount))}`};input.oninput=refresh;refresh();document.querySelector('#savePayment').onclick=()=>{const amount=Number(input.value||0),method=document.querySelector('#payMethod').value;if(amount<=0||amount>balance){alert(`Informe um valor entre R$ 0,01 e ${brl(balance)}.`);return;}const kind=first&&Math.abs(amount-suggested)<.01?'Sinal / Entrada':amount>=balance?'Pagamento integral':'Pagamento parcial';confirmMoneyLaunch({amount,method,kind,onConfirm:()=>savePaymentRecord(a,amount,method,kind),onCancel:()=>registerPayment(a.id)});};
}

function savePaymentRecord(a,amount,method,kind){
  const wasCompleted=a.status==='completed';
  currentData().payments.push({id:uid('pay'),appointmentId:a.id,amount,method,kind:kind.toLowerCase(),at:new Date().toISOString()});
  addHistory(a,'payment',`${kind}: ${brl(amount)}`,{amount,method});
  if(a.status==='awaiting_confirmation'){a.status='scheduled';addHistory(a,'confirmed','Agendamento confirmado após recebimento');}
  store.save('payment.create',{appointmentId:a.id,amount,kind});
  const newPaid=paymentTotalForAppointment(a.id),client=currentData().clients.find(c=>c.id===a.clientId),balance=appointmentBalance(a);
  if(wasCompleted){
    a.status='completed';
    const msg=`Olá, ${client?.name||''}! 😊\nSeu atendimento foi concluído. 💅\n\n💅 ${a.procedureNames?.join(', ')||'Atendimento'}\n💰 Valor total: ${brl(a.totalValue)}\n✅ Recebido: ${brl(newPaid)}${balance>0?`\n💰 Restante: ${brl(balance)}`:'\n💰 Pagamento QUITADO'}\n\nMuito obrigada pela preferência! 💕\n\n⭐ Sua opinião é muito importante e ajuda outras clientes a conhecerem meu trabalho. Se puder, deixe sua avaliação no Google — faz uma grande diferença para mim! ✨\nhttps://share.google/L0ZcsGsZoRLc4l6XZ\n\nJuliane Boone Nail Designer`;
    state.modal=`<div class="modal-head"><div><span class="eyebrow">ATENDIMENTO CONCLUÍDO • ${balance<=0?'PAGO':'PARCIAL'}</span><h2>${escapeHtml(client?.name||'Cliente')}</h2></div><button data-close-modal>×</button></div><div class="message-preview">${escapeHtml(msg).replace(/\n/g,'<br>')}</div><button class="primary full" id="sendWhatsapp">${messageButtonLabel(a,'completion_payment')}</button><button class="secondary full" id="afterPaymentNext">Próximos passos</button>`;render();
    document.querySelector('#sendWhatsapp').onclick=()=>{openWhatsApp(client?.whatsapp,msg);markMessageSent(a,'completion_payment');};
    document.querySelector('#afterPaymentNext').onclick=()=>openCompletionNext(a.id);
    return;
  }
  const msg=`Olá, ${client?.name||''}! 😊\nSeu agendamento está CONFIRMADO.\n\n📅 ${dateWithWeekday(a.start)}\n⏰ ${fmtTime(a.start)}–${fmtTime(a.end)}\n💅 ${a.procedureNames?.join(', ')||'Atendimento'}\n✅ Recebido: ${brl(amount)}${balance>0?`\n💰 Restante: ${brl(balance)}`:'\n💰 Pagamento quitado'}\n\nObrigada! Juliane Boone Nail Designer 💅`;
  state.modal=`<div class="modal-head"><div><span class="eyebrow">AGENDAMENTO CONFIRMADO</span><h2>${escapeHtml(client?.name||'Cliente')}</h2></div><button data-close-modal>×</button></div><div class="message-preview">${escapeHtml(msg).replace(/\n/g,'<br>')}</div><button class="primary full" id="sendWhatsapp">${messageButtonLabel(a,'appointment_confirmation')}</button>`;render();document.querySelector('#sendWhatsapp').onclick=()=>{openWhatsApp(client?.whatsapp,msg);markMessageSent(a,'appointment_confirmation');};
}

function openReceivables(){const start=startOfWeek(state.selectedWeek),end=endOfWeek(state.selectedWeek),items=currentData().appointments.filter(a=>a.type!=='personal'&&a.status!=='cancelled'&&new Date(a.start)>=start&&new Date(a.start)<=end).map(a=>({a,paid:paymentTotalForAppointment(a.id)})).filter(x=>appointmentBalance(x.a)>0);state.modal=`<div class="modal-head"><div><span class="eyebrow">A RECEBER</span><h2>Pendentes e parciais da semana</h2></div><button data-close-modal>×</button></div><div class="receivable-list">${items.length?items.map(({a,paid})=>{const c=currentData().clients.find(x=>x.id===a.clientId),bal=appointmentBalance(a);return `<button class="receivable-row" data-receive="${a.id}"><div><strong>${escapeHtml(c?.name||'Cliente')}</strong><span>${dateWithWeekday(a.start)} • ${escapeHtml(a.procedureNames?.join(', ')||'')}</span></div><div><em>${paid>0?'PARCIAL':a.status==='awaiting_confirmation'?'AGUARDANDO':'PENDENTE'}</em><b>${brl(bal)}</b></div></button>`}).join(''):'<div class="empty">Nenhum valor a receber nesta semana.</div>'}</div>`;render();document.querySelectorAll('[data-receive]').forEach(b=>b.onclick=()=>registerPayment(b.dataset.receive));}

function completeAppointment(id){ openCompletionReview(id); }

function editSchedule(id,kind='alteracao'){
  const a=currentData().appointments.find(x=>x.id===id);if(!a)return;
  state.modal=null;state.agendaMode='week';state.selectedWeek=startOfWeek(new Date(a.start));state.selectedMonth=new Date(new Date(a.start).getFullYear(),new Date(a.start).getMonth(),1);state.calendarSelectionMode='edit_schedule';state.calendarEditAppointmentId=id;state.calendarEditKind=kind;state.view='calendar';navigationStack=['dashboard','calendar'];render();
}
function openScheduleTimeEditor(id,key,kind='alteracao',prefillTime=null){const a=currentData().appointments.find(x=>x.id===id);if(!a)return;const originalMinutes=Math.max(15,Math.round((new Date(a.end)-new Date(a.start))/60000)),st=prefillTime||fmtTime(a.start),base=new Date(`${key}T${st}:00`),autoEnd=addMinutes(base,originalMinutes),et=`${String(autoEnd.getHours()).padStart(2,'0')}:${String(autoEnd.getMinutes()).padStart(2,'0')}`;state.modal=`<div class="modal-head"><div><span class="eyebrow">${kind==='reagendamento'?'REAGENDAR':'ALTERAR AGENDAMENTO'}</span><h2>${dateWithWeekday(key+'T12:00:00')}</h2></div><button data-close-modal>×</button></div><p class="muted">Data escolhida pela sua Agenda. Agora confirme o horário.</p><div class="two-col"><label>Início<input id="editStart" type="time" value="${st}"></label><label>Fim<input id="editEnd" type="time" value="${et}"></label></div><button class="primary full" id="saveScheduleEdit">Salvar ${kind==='reagendamento'?'reagendamento':'alteração'}</button>`;render();document.querySelector('#saveScheduleEdit').onclick=()=>{const old=`${dateWithWeekday(a.start)} ${fmtTime(a.start)}–${fmtTime(a.end)}`,sv=document.querySelector('#editStart').value,ev=document.querySelector('#editEnd').value,sn=new Date(`${key}T${sv}:00`),en=new Date(`${key}T${ev}:00`);if(en<=sn)en.setDate(en.getDate()+1);const candidate={...a,start:sn.toISOString(),end:en.toISOString()},conflict=hasConflict(candidate,a.id);if(conflict){alert(`Horário indisponível: já existe compromisso das ${fmtTime(conflict.start)} às ${fmtTime(conflict.end)}.`);return;}a.start=candidate.start;a.end=candidate.end;addHistory(a,kind==='reagendamento'?'rescheduled':'schedule_change',`${kind==='reagendamento'?'Reagendado':'Data/horário alterado'}: ${old} → ${dateWithWeekday(a.start)} ${fmtTime(a.start)}–${fmtTime(a.end)}`);store.save('appointment.schedule.update',{appointmentId:id,kind});openAppointment(id);};}
function rescheduleOrCancel(id){const a=currentData().appointments.find(x=>x.id===id),paid=Math.max(0,paymentTotalForAppointment(id));state.modal=`<div class="modal-head"><div><span class="eyebrow">REAGENDAR / CANCELAR</span><h2>O que aconteceu?</h2></div><button data-close-modal>×</button></div>${paid>0?`<div class="warning">Há ${brl(paid)} recebido. Em caso de cancelamento, informe quanto foi devolvido e quanto ficou retido para manter o financeiro correto.</div>`:''}<button class="primary full" id="moveAppointment">Reagendar para outra data</button><button class="danger full" id="cancelAppointment">Cancelar atendimento</button>`;render();document.querySelector('#moveAppointment').onclick=()=>{addHistory(a,'reschedule','Reagendamento iniciado');store.save('appointment.reschedule.start',{appointmentId:id});editSchedule(id,'reagendamento');};document.querySelector('#cancelAppointment').onclick=()=>paid>0?openCancelFinancial(id):finishCancellation(id,0,0);}
function openCancelFinancial(id){const a=currentData().appointments.find(x=>x.id===id),paid=Math.max(0,paymentTotalForAppointment(id));state.modal=`<div class="modal-head"><div><span class="eyebrow">CANCELAMENTO • FINANCEIRO</span><h2>Destino do valor recebido</h2></div><button data-close-modal>×</button></div><div class="payment-summary"><span>Total recebido</span><b>${brl(paid)}</b></div><p class="muted">Informe quanto foi devolvido e quanto ficou retido.</p><label>Valor devolvido<input type="number" inputmode="decimal" id="cancelRefund" min="0" max="${paid}" step="0.01" placeholder="R$ 0,00"></label><label>Valor retido<input type="number" inputmode="decimal" id="cancelRetained" min="0" max="${paid}" step="0.01" placeholder="R$ 0,00"></label><div class="warning" id="cancelMoneyInfo">Devolvido + retido deve ser exatamente ${brl(paid)} e nunca pode ultrapassar o recebido.</div><button class="danger full" id="confirmCancelFinancial">Confirmar cancelamento</button><button class="secondary full" id="backCancelFinancial">Voltar</button>`;render();const refund=document.querySelector('#cancelRefund'),retained=document.querySelector('#cancelRetained');const normalize=(el)=>{if(el.value==='')return;let v=Number(el.value);if(!Number.isFinite(v))v=0;v=Math.max(0,Math.min(paid,v));el.value=String(Math.round(v*100)/100);};refund.onblur=()=>normalize(refund);retained.onblur=()=>normalize(retained);document.querySelector('#backCancelFinancial').onclick=()=>rescheduleOrCancel(id);document.querySelector('#confirmCancelFinancial').onclick=()=>{const r=Number(refund.value||0),t=Number(retained.value||0);if(r<0||t<0||r>paid||t>paid||r+t>paid+0.005){alert('O valor devolvido + retido não pode ultrapassar o total recebido.');return;}if(Math.abs((r+t)-paid)>0.01){alert(`Distribua todo o valor recebido (${brl(paid)}) entre devolvido e retido.`);return;}confirmDialog(`Confirmar cancelamento?\nDevolvido: ${brl(r)}\nRetido: ${brl(t)}`,()=>finishCancellation(id,r,t));};}
function finishCancellation(id,refund=0,retained=0){const a=currentData().appointments.find(x=>x.id===id),paid=Math.max(0,paymentTotalForAppointment(id));if(refund>paid){alert('Não é permitido devolver valor maior do que o recebido.');return;}if(refund>0)currentData().payments.push({id:uid('pay'),appointmentId:id,amount:-refund,method:'Devolução',kind:'refund',at:new Date().toISOString()});a.status='cancelled';a.cancellationFinancial={received:paid,refunded:refund,retained,at:new Date().toISOString()};addHistory(a,'cancelled',`Atendimento cancelado • recebido ${brl(paid)} • devolvido ${brl(refund)} • retido ${brl(retained)}`,{paid,refund,retained});store.save('appointment.cancel',{appointmentId:id,paid,refund,retained});openAppointment(id);}

function deleteAppointmentFlow(id){const a=currentData().appointments.find(x=>x.id===id);state.modal=`<div class="modal-head"><div><span class="eyebrow">EXCLUIR AGENDAMENTO</span><h2>Escolha como excluir</h2></div><button data-close-modal>×</button></div><div class="warning">Disponível porque ainda não há recebimento financeiro neste agendamento.</div><button class="danger full" id="deleteKeepHistory">Excluir e registrar no histórico</button><button class="secondary full" id="deleteNoHistory">Excluir sem registro</button>`;render();document.querySelector('#deleteKeepHistory').onclick=()=>{a.status='cancelled';addHistory(a,'deleted_registered','Agendamento excluído e registrado no histórico');store.save('appointment.delete.registered',{appointmentId:id});state.modal=null;render();};document.querySelector('#deleteNoHistory').onclick=()=>{currentData().appointments=currentData().appointments.filter(x=>x.id!==id);store.save('appointment.delete',{appointmentId:id});state.modal=null;render();};}

function addExpense(){
  state.modal=`<div class="modal-head"><div><span class="eyebrow">GASTO</span><h2>Novo gasto com produto</h2></div><button data-close-modal>×</button></div><label>Descrição<input id="expenseDesc" placeholder="Ex.: Gel construtor"></label><label>Valor<input id="expenseValue" type="number" step="0.01"></label><label>Data<input id="expenseDate" type="date" value="${toLocalDateKey(new Date())}"></label><button class="primary full" id="saveExpense">Salvar gasto</button>`;render();document.querySelector('#saveExpense').onclick=()=>{const description=document.querySelector('#expenseDesc').value.trim();const value=Number(document.querySelector('#expenseValue').value||0);if(!description||value<=0)return;currentData().expenses.push({id:uid('exp'),description,value,date:document.querySelector('#expenseDate').value});store.save('expense.create',{value});state.modal=null;render();};
}

function editExpense(id){const x=currentData().expenses.find(e=>e.id===id);if(!x)return;state.modal=`<div class="modal-head"><div><span class="eyebrow">GASTO</span><h2>Editar lançamento</h2></div><button data-close-modal>×</button></div><label>Descrição<input id="expenseDesc" value="${escapeHtml(x.description)}"></label><label>Valor<input id="expenseValue" type="number" step="0.01" value="${Number(x.value).toFixed(2)}"></label><label>Data<input id="expenseDate" type="date" value="${x.date}"></label><button class="primary full" id="saveExpenseEdit">Salvar alteração</button>`;render();document.querySelector('#saveExpenseEdit').onclick=()=>{const d=document.querySelector('#expenseDesc').value.trim(),v=Number(document.querySelector('#expenseValue').value||0);if(!d||v<=0){alert('Informe descrição e valor.');return;}x.description=d;x.value=v;x.date=document.querySelector('#expenseDate').value;store.save('expense.update',{expenseId:id,value:v});state.modal=null;render();};}

function editProcedure(id){
  const p=currentData().procedures.find(x=>x.id===id);state.modal=`<div class="modal-head"><div><span class="eyebrow">ADM • PROCEDIMENTO</span><h2>${escapeHtml(p.name)}</h2></div><button data-close-modal>×</button></div><label>Valor padrão<input id="procValue" type="number" step="0.01" value="${p.value}"></label><div class="two-col"><label>Horas<input id="procHours" type="number" min="0" step="1" value="${Math.floor(p.durationMin/60)}"></label><label>Minutos<input id="procMinutes" type="number" min="0" max="59" step="5" value="${p.durationMin%60}"></label></div><label class="check-row maintenance-setting"><input id="procRequiresMaintenance" type="checkbox" ${p.requiresMaintenance?'checked':''}><span>Requer manutenção periódica</span></label><label>Descrição do catálogo<textarea id="procDescription">${escapeHtml(p.description||'')}</textarea></label><label>Imagem do catálogo<input id="procImageFile" type="file" accept="image/*"></label><div class="catalog-image-preview"><img id="procImagePreview" src="${escapeHtml(p.image||'./assets/logo-juliane-boone.png')}" alt="Prévia"></div><div class="warning">Ao salvar, o novo padrão será usado em <b>novos agendamentos</b> e no <b>Catálogo</b>. Histórico e agendamentos já salvos não serão alterados.</div><button class="primary full" id="saveProcedure">Salvar alterações</button>`;render();
  let newImage=p.image;
  document.querySelector('#procImageFile').onchange=(ev)=>{const file=ev.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');const max=900;const scale=Math.min(1,max/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);newImage=canvas.toDataURL('image/jpeg',.82);document.querySelector('#procImagePreview').src=newImage;};img.src=reader.result;};reader.readAsDataURL(file);};
  document.querySelector('#saveProcedure').onclick=()=>{confirmDialog('Salvar alterações deste procedimento?',()=>{const h=Math.max(0,Number(document.querySelector('#procHours').value||0));const m=Math.min(59,Math.max(0,Number(document.querySelector('#procMinutes').value||0)));p.value=Number(document.querySelector('#procValue').value);p.durationMin=h*60+m;p.requiresMaintenance=document.querySelector('#procRequiresMaintenance').checked;p.description=document.querySelector('#procDescription').value.trim();p.image=newImage;store.save('procedure.update',{procedureId:id});state.modal=null;render();});};
}
function shareCatalog(){
  const url=publicCatalogUrl();
  const text='Olá! 😊✨\nPreparei meu catálogo com muito carinho para você conhecer cada procedimento e encontrar aquele cuidado que combina com você. 💅\n\nEscolha o seu favorito e dê um toque especial às suas unhas e à sua autoestima. 💕\n\n👇 Acesse meu catálogo:';
  if(navigator.share){navigator.share({title:'Catálogo Juliane Boone',text,url}).catch(()=>{});}else{const txt=`${text}\n${url}`;navigator.clipboard?.writeText(txt);alert('Link do catálogo copiado para a área de transferência.');}
}



function openWhatsApp(phone,msg){const d=String(phone||'').replace(/\D/g,'');const text=encodeURIComponent(msg);const ua=navigator.userAgent||'';if(/Android/i.test(ua)){window.location.href=`intent://send?phone=${d}&text=${text}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;return;}if(/iPhone|iPad|iPod/i.test(ua)){window.location.href=`whatsapp-business://send?phone=${d}&text=${text}`;return;}window.open(`https://wa.me/${d}?text=${text}`,'_blank');}
function reservationText(a,compact=false){const c=currentData().clients.find(x=>x.id===a.clientId),parts=paymentSuggestionParts(a),signal=parts.signal,suggested=parts.carry+signal,after=Math.max(0,Number(a.totalValue||0)-suggested);return `Olá, ${c?.name||''}! 😊
Seu horário foi reservado para ${dateWithWeekday(a.start)} às ${fmtTime(a.start)}.
💅 ${a.procedureNames?.join(', ')||'Atendimento'}
💰 Valor do novo serviço: ${brl(parts.service)}${parts.carry>0?`
📌 Saldo anterior: ${brl(parts.carry)}`:''}
🔐 Sinal do novo serviço (30%): ${brl(signal)}${parts.carry>0?`
💵 Valor sugerido agora (saldo anterior + sinal): ${brl(suggested)}`:''}
💵 Restante após este pagamento: ${brl(after)}

PIX — CPF: ${PIX_KEY}
${PIX_NAME}

Envie o comprovante aqui para confirmação e controle financeiro.${compact?`\n\nO sinal confirma a reserva e será abatido do valor final.`:''}

Importante: caso não haja confirmação ou pagamento do sinal até o final do dia de hoje, o horário reservado voltará a ficar disponível.`;}
function openReservationActions(id){const a=currentData().appointments.find(x=>x.id===id),c=currentData().clients.find(x=>x.id===a.clientId),parts=paymentSuggestionParts(a),signal=parts.signal,suggested=parts.carry+signal,remaining=Math.max(0,a.totalValue-suggested);state.modal=`<div class="modal-head"><div><span class="eyebrow">RESERVA DE HORÁRIO</span><h2>${escapeHtml(c?.name||'Cliente')}</h2></div><button data-close-modal>×</button></div><div class="payment-summary"><span>Novo serviço</span><b>${brl(parts.service)}</b>${parts.carry>0?`<span>Saldo anterior</span><b>${brl(parts.carry)}</b>`:''}<span>Sinal do novo serviço (30%)</span><b>${brl(signal)}</b>${parts.carry>0?`<span>Sugerido agora</span><b>${brl(suggested)}</b>`:''}<span>Restante</span><b>${brl(remaining)}</b></div><button class="primary full" id="sendFullRules">${messageButtonLabel(a,'reservation_full')} • regras + sinal</button><button class="secondary full" id="sendSignalOnly">${messageButtonLabel(a,'reservation_signal')} • somente sinal</button><button class="secondary full" id="goFinanceReservation">Já recebi • ir ao Financeiro</button><button class="secondary full" id="confirmNoDeposit">Confirmar sem necessidade de sinal</button>`;render();document.querySelector('#sendFullRules').onclick=()=>shareRulesAndText(a);document.querySelector('#sendSignalOnly').onclick=()=>{openWhatsApp(c?.whatsapp,reservationText(a,true));markMessageSent(a,'reservation_signal');};document.querySelector('#goFinanceReservation').onclick=()=>registerPayment(a.id);document.querySelector('#confirmNoDeposit').onclick=()=>{confirmDialog('Confirmar este agendamento sem necessidade de sinal?',()=>{a.noDeposit=true;a.status='scheduled';addHistory(a,'confirmed','Agendamento confirmado sem necessidade de sinal');store.save('appointment.confirm.no_deposit',{appointmentId:a.id});openAppointment(a.id);});};}
async function shareAssetWithText(assetUrl,fileName,mimeType,text){try{const r=await fetch(assetUrl);if(!r.ok)throw new Error('arquivo');const blob=await r.blob();const file=new File([blob],fileName,{type:mimeType||blob.type});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],text});return true;}window.open(assetUrl,'_blank');if(navigator.clipboard)await navigator.clipboard.writeText(text);alert('Arquivo aberto. O texto foi copiado para você colar no WhatsApp.');return true;}catch(e){if(e?.name==='AbortError')return false;alert('Não foi possível preparar o anexo. Tente novamente.');return false;}}
async function shareRulesAndText(a){const ok=await shareAssetWithText(BOOKING_RULES_IMAGE,'regras-agendamento-juliane-boone.jpg','image/jpeg',reservationText(a,false));if(ok)markMessageSent(a,'reservation_full');}
async function shareBookingRulesImage() {
  await shareAssetWithText(
    BOOKING_RULES_IMAGE,
    'regras-agendamento-juliane-boone.jpg',
    'image/jpeg',
    'Regras de agendamento \u2022 Juliane Boone Nail Designer'
  );
}
function sendConfirmationReminder(id){const a=currentData().appointments.find(x=>x.id===id),c=currentData().clients.find(x=>x.id===a.clientId);const msg=`Oi, ${c?.name||''}! 😊 Passando para lembrar que seu horário ainda está reservado, mas estou aguardando a confirmação do sinal.\n\nCaso queira manter o agendamento, peço que realize a confirmação até o final do dia de hoje. Após esse período, sem a confirmação, o horário volta a ficar disponível.\n\nSe precisar de alguma informação, pode falar comigo. 💅\nJuliane Boone Nail Designer`;openWhatsApp(c?.whatsapp,msg);a.confirmationReminderAt=new Date().toISOString();markMessageSent(a,'confirmation_reminder');}
function openStatusList(status){const start=state.dashboardPeriod==='month'?new Date(state.selectedWeek.getFullYear(),state.selectedWeek.getMonth(),1):startOfWeek(state.selectedWeek),end=state.dashboardPeriod==='month'?new Date(state.selectedWeek.getFullYear(),state.selectedWeek.getMonth()+1,0,23,59,59):endOfWeek(state.selectedWeek);const items=currentData().appointments.filter(a=>a.type!=='personal'&&a.status===status&&new Date(a.start)>=start&&new Date(a.start)<=end);const titles={completed:'Atendimentos realizados',awaiting_confirmation:'Aguardando confirmação',scheduled:'Em andamento',cancelled:'Cancelados'};state.modal=`<div class="modal-head"><div><span class="eyebrow">PAINEL</span><h2>${titles[status]}</h2></div><button data-close-modal>×</button></div><div class="simple-list">${items.length?items.map(a=>{const c=currentData().clients.find(x=>x.id===a.clientId);return `<div class="status-list-row"><button data-open-status="${a.id}"><b>${escapeHtml(c?.name||'Cliente')}</b><span>${dateWithWeekday(a.start)} • ${fmtTime(a.start)} • ${escapeHtml(a.procedureNames?.join(', ')||'')}</span></button>${status==='awaiting_confirmation'?`<button class="small-reminder" data-remind="${a.id}">${messageButtonLabel(a,'confirmation_reminder')}</button>`:''}</div>`}).join(''):'<div class="empty">Nenhum registro.</div>'}</div>`;render();document.querySelectorAll('[data-open-status]').forEach(b=>b.onclick=()=>openAppointment(b.dataset.openStatus));document.querySelectorAll('[data-remind]').forEach(b=>b.onclick=()=>sendConfirmationReminder(b.dataset.remind));}
function openTomorrowList(){const d=new Date(),key=toLocalDateKey(new Date(d.getFullYear(),d.getMonth(),d.getDate()+1)),items=currentData().appointments.filter(a=>a.type!=='personal'&&a.status==='scheduled'&&toLocalDateKey(new Date(a.start))===key);state.modal=`<div class="modal-head"><div><span class="eyebrow">AMANHÃ</span><h2>Clientes para lembrar</h2></div><button data-close-modal>×</button></div><div class="simple-list">${items.length?items.map(a=>{const c=currentData().clients.find(x=>x.id===a.clientId);return `<div class="status-list-row"><button data-open-status="${a.id}"><b>${escapeHtml(c?.name||'Cliente')}</b><span>${fmtTime(a.start)}–${fmtTime(a.end)} • ${escapeHtml(a.procedureNames?.join(', ')||'')}</span>${a.tomorrowReminderAt?'<small>✓ Lembrete enviado</small>':''}</button><button class="small-reminder" data-tomorrow-remind="${a.id}">${messageButtonLabel(a,'tomorrow_reminder')}</button></div>`}).join(''):'<div class="empty">Nenhum atendimento confirmado para amanhã.</div>'}</div>`;render();document.querySelectorAll('[data-open-status]').forEach(b=>b.onclick=()=>openAppointment(b.dataset.openStatus));document.querySelectorAll('[data-tomorrow-remind]').forEach(b=>b.onclick=()=>sendTomorrowReminder(b.dataset.tomorrowRemind));}
function sendTomorrowReminder(id){const a=currentData().appointments.find(x=>x.id===id),c=currentData().clients.find(x=>x.id===a.clientId);const msg=`Oi, ${c?.name||''}! 💅 Passando para lembrar do seu procedimento confirmado para amanhã, às ${fmtTime(a.start)}.\n\nPeço atenção ao horário combinado, pois o cumprimento do horário é muito importante. A próxima cliente depende da finalização do seu atendimento e, por isso, cada minuto conta.\n\nObrigada pela compreensão. ❤️\nJuliane Boone Nail Designer`;openWhatsApp(c?.whatsapp,msg);a.tomorrowReminderAt=new Date().toISOString();markMessageSent(a,'tomorrow_reminder');}
function openReceivedLedger(){const start=startOfWeek(state.selectedWeek),end=endOfWeek(state.selectedWeek),pays=currentData().payments.filter(p=>new Date(p.at)>=start&&new Date(p.at)<=end&&!isWalletPayment(p)).sort((a,b)=>new Date(b.at)-new Date(a.at));state.modal=`<div class="modal-head"><div><span class="eyebrow">RECEBIDO</span><h2>Extrato da semana</h2></div><button data-close-modal>×</button></div><div class="received-total">Total: <b>${brl(pays.reduce((s,p)=>s+Number(p.amount),0))}</b></div><div class="simple-list">${pays.length?pays.map(p=>{const a=currentData().appointments.find(x=>x.id===p.appointmentId),c=currentData().clients.find(x=>x.id===a?.clientId);return `<button class="receipt-row" data-payment-edit="${p.id}"><div><strong>${escapeHtml(c?.name||'Cliente')}</strong><span>${escapeHtml(a?.procedureNames?.join(', ')||'Atendimento')} • ${dateWithWeekday(p.at)} • toque para editar</span></div><b>${brl(p.amount)}</b></button>`}).join(''):'<div class="empty">Nenhum recebimento nesta semana.</div>'}</div>`;render();document.querySelectorAll('[data-payment-edit]').forEach(b=>b.onclick=()=>editPaymentRecord(b.dataset.paymentEdit));}
function editPaymentRecord(id){const p=currentData().payments.find(x=>x.id===id);if(!p)return;const a=currentData().appointments.find(x=>x.id===p.appointmentId);state.modal=`<div class="modal-head"><div><span class="eyebrow">RECEBIMENTO</span><h2>Editar lançamento</h2></div><button data-close-modal>×</button></div><div class="warning">Edite somente para corrigir um recebimento já registrado.</div><label>Valor<input id="editPayAmount" type="number" step="0.01" value="${Number(p.amount).toFixed(2)}"></label><label>Forma<select id="editPayMethod"><option ${p.method==='PIX'?'selected':''}>PIX</option><option ${p.method==='Dinheiro'?'selected':''}>Dinheiro</option><option ${p.method==='Cartão'?'selected':''}>Cartão</option><option ${p.method==='Devolução'?'selected':''}>Devolução</option></select></label><label>Data<input id="editPayDate" type="date" value="${toLocalDateKey(new Date(p.at))}"></label><button class="primary full" id="savePayEdit">Salvar correção</button>`;render();document.querySelector('#savePayEdit').onclick=()=>{const v=Number(document.querySelector('#editPayAmount').value||0);if(!v){alert('Informe um valor válido.');return;}const old=Number(p.amount);p.amount=v;p.method=document.querySelector('#editPayMethod').value;const oldAt=new Date(p.at),date=document.querySelector('#editPayDate').value;p.at=new Date(`${date}T${String(oldAt.getHours()).padStart(2,'0')}:${String(oldAt.getMinutes()).padStart(2,'0')}:00`).toISOString();if(a)addHistory(a,'payment_edited',`Recebimento corrigido: ${brl(old)} → ${brl(v)}`,{paymentId:id});store.save('payment.update',{paymentId:id,amount:v});openReceivedLedger();};}
function openNewRecordChoiceForSlot(key,time){
  state.selectedDateKey=key;state.slotPrefillTime=time;
  state.modal=`<div class="modal-head"><div><span class="eyebrow">${new Date(key+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})} • ${time}</span><h2>O que deseja adicionar?</h2></div><button data-close-modal>×</button></div><div class="record-choice"><button class="record-service" id="chooseService"><b>Atendimento</b><span>Cliente e procedimento</span></button><button class="record-personal" id="choosePersonal"><b>Particular</b><span>Compromisso pessoal</span></button></div>`;
  render();
  document.querySelector('#chooseService').onclick=()=>{state.modal=null;state.draftAppointment={procedureIds:[],notes:'',totalValue:0,clientId:null,origin:'slot'};openNewAppointmentForm();};
  document.querySelector('#choosePersonal').onclick=()=>openPersonalForm(null,key,time);
}
function openNewRecordChoice(){state.modal=`<div class="modal-head"><div><span class="eyebrow">NOVO REGISTRO</span><h2>O que deseja adicionar?</h2></div><button data-close-modal>×</button></div><div class="record-choice"><button class="record-service" id="chooseService"><b>Atendimento</b><span>Cliente e procedimento</span></button><button class="record-personal" id="choosePersonal"><b>Particular</b><span>Compromisso pessoal</span></button></div>`;render();document.querySelector('#chooseService').onclick=()=>startAppointmentFlow();document.querySelector('#choosePersonal').onclick=startPersonalFlow;}
function openPersonalForm(existingId=null,prefillKey=null,prefillTime=null){const a=existingId?currentData().appointments.find(x=>x.id===existingId):null,key=a?toLocalDateKey(new Date(a.start)):(prefillKey||toLocalDateKey(new Date())),kind=a?.personalKind||PERSONAL_TYPES[0],allDay=a?.allDay??false,startValue=a?fmtTime(a.start):(prefillTime||'08:00');const plusTwo=(time)=>{const [h,m]=String(time||'08:00').split(':').map(Number),mins=(h*60+m+120)%(24*60);return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;};const endValue=a?fmtTime(a.end):plusTwo(startValue);state.modal=`<div class="modal-head personal-head"><div><span class="eyebrow">PARTICULAR</span><h2>${a?'Editar':'Novo'} compromisso</h2></div><button data-close-modal>×</button></div><fieldset><legend>Tipo do compromisso</legend>${PERSONAL_TYPES.map(x=>`<label class="check-row"><input type="radio" name="personalKind" value="${escapeHtml(x)}" ${x===kind?'checked':''}><span>${escapeHtml(x)}</span></label>`).join('')}</fieldset><label class="check-row personal-all-day"><input type="checkbox" id="personalAllDay" ${allDay?'checked':''}><span><b>Bloquear o dia inteiro</b><small>Usa todo o horário de funcionamento.</small></span></label><label>Data<input id="personalDate" type="date" value="${key}"></label><div class="two-col"><label>Início<input id="personalStart" type="time" value="${startValue}"></label><label>Fim<input id="personalEnd" type="time" value="${endValue}"></label></div><label>Observações<textarea id="personalNotes">${escapeHtml(a?.notes||'')}</textarea></label>${!a?`<label>Repetir compromisso<select id="personalRepeat"><option value="none">Não repetir</option><option value="weekly">Semanalmente • mesmo dia e horário</option><option value="daily">Todos os dias • mesmo horário</option></select></label><label id="personalRepeatUntilWrap" style="display:none">Repetir até<input id="personalRepeatUntil" type="date" min="${key}"></label>`:''}<button class="primary full" id="savePersonal">Salvar compromisso</button>`;render();const start=document.querySelector('#personalStart'),end=document.querySelector('#personalEnd');const toggle=()=>{const on=document.querySelector('#personalAllDay').checked;start.disabled=on;end.disabled=on;};document.querySelector('#personalAllDay').onchange=toggle;start.onchange=()=>{if(!document.querySelector('#personalAllDay').checked)end.value=plusTwo(start.value);};toggle();const rep=document.querySelector('#personalRepeat'),repWrap=document.querySelector('#personalRepeatUntilWrap');if(rep)rep.onchange=()=>{repWrap.style.display=rep.value==='none'?'none':'';};document.querySelector('#savePersonal').onclick=()=>savePersonal(existingId);}
function savePersonal(existingId=null){const old=existingId?currentData().appointments.find(x=>x.id===existingId):null,date=document.querySelector('#personalDate').value,allDay=document.querySelector('#personalAllDay').checked,st=allDay?'08:00':document.querySelector('#personalStart').value,et=allDay?'23:00':document.querySelector('#personalEnd').value,s0=new Date(`${date}T${st}:00`),e0=new Date(`${date}T${et}:00`),kind=document.querySelector('input[name="personalKind"]:checked')?.value||'Outros';if(e0<=s0){alert('O horário final deve ser depois do início.');return;}const notes=document.querySelector('#personalNotes').value.trim(),repeat=old?'none':(document.querySelector('#personalRepeat')?.value||'none'),until=document.querySelector('#personalRepeatUntil')?.value;if(repeat!=='none'&&!until){alert('Informe até quando o compromisso deve repetir.');return;}const dates=[];let cur=new Date(s0),endLimit=until?new Date(`${until}T23:59:59`):new Date(s0);while(cur<=endLimit){dates.push(new Date(cur));cur.setDate(cur.getDate()+(repeat==='daily'?1:repeat==='weekly'?7:99999));if(repeat==='none')break;}const duration=e0-s0,candidates=dates.map((sd,i)=>({id:i===0&&old?old.id:uid('personal'),type:'personal',personalKind:kind,procedureNames:[kind],start:sd.toISOString(),end:new Date(sd.getTime()+duration).toISOString(),allDay,notes,status:old?.status||'scheduled',createdAt:old?.createdAt||new Date().toISOString(),history:i===0&&old?(old.history||[]):[],recurrenceId:repeat!=='none'?(old?.recurrenceId||uid('rec')):null,recurrenceType:repeat}));const conflicts=candidates.map(c=>({c,hit:hasConflict(c,old?.id)})).filter(x=>x.hit);let toSave=candidates;if(conflicts.length){const sample=conflicts.slice(0,4).map(x=>dateWithWeekday(x.c.start)).join('\n');confirmDialog(`${conflicts.length} data(s) possuem conflito:\n${sample}${conflicts.length>4?'\n...':''}\n\nDeseja salvar somente as datas livres?`,()=>{const free=candidates.filter(c=>!hasConflict(c,old?.id));if(!free.length){alert('Nenhuma data livre para salvar.');return;}savePersonalCandidates(old,free,repeat);});return;}savePersonalCandidates(old,toSave,repeat);}
function savePersonalCandidates(old,toSave,repeat){if(old){Object.assign(old,toSave[0]);addHistory(old,'personal_saved','Compromisso particular alterado');}else{for(const cand of toSave){addHistory(cand,'personal_saved',repeat==='none'?'Compromisso particular criado':`Compromisso recorrente criado • ${repeat==='daily'?'diariamente':'semanalmente'}`);currentData().appointments.push(cand);}}store.save('personal.save',{appointmentId:old?.id||toSave[0]?.id,repeat,count:toSave.length});state.modal=null;state.view='dashboard';render();}
function openPersonalDetail(id){const a=currentData().appointments.find(x=>x.id===id);const done=a.status==='completed';state.modal=`<div class="modal-head personal-head"><div><span class="eyebrow">PARTICULAR${done?' • CONCLUÍDO':''}</span><h2>${escapeHtml(a.personalKind||'Compromisso')}</h2></div><button data-close-modal>×</button></div><div class="detail-grid"><span>Data</span><b>${dateWithWeekday(a.start)}</b><span>Horário</span><b>${a.allDay?'Dia inteiro':`${fmtTime(a.start)}–${fmtTime(a.end)}`}</b><span>Status</span><b>${done?'Concluído':'Em andamento'}</b></div>${a.notes?`<div class="note-box">${escapeHtml(a.notes)}</div>`:''}${!done?'<button class="success-action full" id="completePersonal">✓ Concluir compromisso</button>':''}<button class="secondary full" id="editPersonal">Alterar</button><button class="danger full" id="deletePersonal">Excluir</button>`;render();document.querySelector('#editPersonal').onclick=()=>openPersonalForm(id);document.querySelector('#completePersonal')?.addEventListener('click',()=>completePersonalFlow(id));document.querySelector('#deletePersonal').onclick=()=>{if(a.recurrenceId){state.modal=`<div class="modal-head personal-head"><div><span class="eyebrow">PARTICULAR • RECORRENTE</span><h2>Excluir compromisso</h2></div><button data-close-modal>×</button></div><div class="warning">O que deseja excluir?</div><button class="secondary full" id="deleteOnlyThis">Somente este compromisso</button><button class="danger full" id="deleteThisAndNext">Este e os próximos</button>`;render();document.querySelector('#deleteOnlyThis').onclick=()=>deletePersonalScope(a,false);document.querySelector('#deleteThisAndNext').onclick=()=>deletePersonalScope(a,true);return;}confirmDialog('Excluir este compromisso particular?',()=>deletePersonalScope(a,false));};}

function deletePersonalScope(a,andNext){const start=new Date(a.start);currentData().appointments=currentData().appointments.filter(x=>{if(x.id===a.id)return false;if(andNext&&a.recurrenceId&&x.recurrenceId===a.recurrenceId&&new Date(x.start)>=start)return false;return true;});store.save('personal.delete',{appointmentId:a.id,scope:andNext?'this_and_next':'this'});state.modal=null;render();}
function completePersonalFlow(id){const a=currentData().appointments.find(x=>x.id===id);if(!a)return;const now=new Date(),sameDay=toLocalDateKey(now)===toLocalDateKey(new Date(a.start)),canRelease=sameDay&&now<new Date(a.end);state.modal=`<div class="modal-head personal-head"><div><span class="eyebrow">PARTICULAR</span><h2>Concluir compromisso</h2></div><button data-close-modal>×</button></div><div class="cycle-alert"><b>Marcar como concluído?</b><span>O compromisso continuará no histórico.</span></div>${canRelease?'<div class="warning"><b>Deseja liberar o restante do dia para atendimentos?</b><br>Ao liberar, a Agenda voltará a aceitar clientes a partir de agora.</div><button class="primary full" id="completeReleasePersonal">Concluir e liberar restante do dia</button>':''}<button class="secondary full" id="completeKeepPersonal">Concluir e manter bloqueio original</button>`;render();document.querySelector('#completeKeepPersonal').onclick=()=>finishPersonal(id,false);document.querySelector('#completeReleasePersonal')?.addEventListener('click',()=>finishPersonal(id,true));}
function finishPersonal(id,release){const a=currentData().appointments.find(x=>x.id===id);a.status='completed';a.completedAt=new Date().toISOString();if(release){const now=new Date();if(now>new Date(a.start)&&now<new Date(a.end)){a.originalEnd=a.end;a.end=now.toISOString();a.releasedAfterCompletion=true;}}addHistory(a,'personal_completed',release?'Compromisso particular concluído • restante do dia liberado':'Compromisso particular concluído • bloqueio original mantido');store.save('personal.complete',{appointmentId:id,release});openPersonalDetail(id);}
function openCompletionReview(id){const a=currentData().appointments.find(x=>x.id===id);if(!a)return;const names=(a.procedureNames||[]).join(', ')||'Atendimento',defaultMaint=appointmentRequiresMaintenance(a)||(a.procedureIds||[]).includes('alongamento');state.modal=`<div class="modal-head"><div><span class="eyebrow">CONCLUIR ATENDIMENTO</span><h2>Conferir o que foi realizado</h2></div><button data-close-modal>×</button></div><div class="cycle-alert"><b>${escapeHtml(names)} já está OK.</b><span>Valor atual: ${brl(a.totalValue)}</span></div><label class="check-row maintenance-setting"><input id="completionMaintenance" type="checkbox" ${defaultMaint?'checked':''}><span><b>Este atendimento terá manutenção / retorno</b><small>Alongamento já vem marcado automaticamente.</small></span></label><div class="warning"><b>Foi realizado algum procedimento além do que já estava agendado?</b></div><button class="primary full" id="addExtraProcedure">Sim, adicionar outro procedimento</button><button class="secondary full" id="finishAsBooked">Não, concluir como está</button>`;render();const finish=()=>{a.requiresMaintenance=document.querySelector('#completionMaintenance')?.checked??defaultMaint;a.status='completed';a.completedAt=new Date().toISOString();addHistory(a,'completed','Atendimento concluído');store.save('appointment.complete',{appointmentId:id,total:a.totalValue,requiresMaintenance:a.requiresMaintenance});openCompletionNext(id);};document.querySelector('#finishAsBooked').onclick=finish;document.querySelector('#addExtraProcedure').onclick=()=>openExtraProcedureReview(id,document.querySelector('#completionMaintenance')?.checked??defaultMaint);}
function openExtraProcedureReview(id,requiresMaintenance){const a=currentData().appointments.find(x=>x.id===id),existingIds=new Set(a.procedureIds||[]),procs=currentData().procedures.filter(p=>p.active&&!existingIds.has(p.id));state.modal=`<div class="modal-head"><div><span class="eyebrow">CONCLUIR ATENDIMENTO</span><h2>Adicionar procedimento realizado</h2></div><button data-close-modal>×</button></div><div class="cycle-alert"><b>Já agendado: ${escapeHtml((a.procedureNames||[]).join(', '))}</b><span>Selecione abaixo somente o que foi feito a mais.</span></div><fieldset>${procs.map(p=>`<div class="procedure-choice"><label class="check-row"><input type="checkbox" class="finish-extra-proc" value="${p.id}"><span>${escapeHtml(p.name)}</span><b>${brl(p.value)}</b></label>${p.id==='reposicao-quebrada'?`<div class="qty-control"><button type="button" data-finish-minus>−</button><strong id="finishRepairQty">1</strong><button type="button" data-finish-plus>+</button><small>unidade(s)</small></div>`:''}</div>`).join('')}</fieldset><div class="finish-free-extra"><button type="button" class="secondary full" id="addFinishFreeExtra">+ Adicionar extra</button><div id="finishFreeExtras"></div></div><div class="completion-total">Total final <strong id="finishTotal">${brl(a.totalValue)}</strong></div><button class="primary full" id="confirmCompletion">Adicionar e concluir</button><button class="secondary full" id="backCompletion">Voltar</button>`;render();const readFree=()=>[...document.querySelectorAll('[data-finish-free-extra]')].map(r=>({description:r.querySelector('[data-finish-extra-desc]')?.value.trim()||'',value:Number(r.querySelector('[data-finish-extra-value]')?.value||0)})).filter(x=>x.description||x.value>0);const calc=()=>{const qty=Number(document.querySelector('#finishRepairQty')?.textContent||1),items=[...document.querySelectorAll('.finish-extra-proc:checked')].map(x=>currentData().procedures.find(p=>p.id===x.value)),free=readFree(),extra=items.reduce((sum,p)=>sum+p.value*(p.id==='reposicao-quebrada'?qty:1),0)+free.reduce((sum,x)=>sum+x.value,0);document.querySelector('#finishTotal').textContent=brl(Number(a.totalValue)+extra);return {items,qty,free,extra};};document.querySelector('#addFinishFreeExtra')?.addEventListener('click',()=>{const box=document.querySelector('#finishFreeExtras'),row=document.createElement('div');row.className='extra-entry';row.setAttribute('data-finish-free-extra','');row.innerHTML='<input data-finish-extra-desc placeholder="Descrição do extra"><input data-finish-extra-value type="number" min="0" step="0.01" placeholder="Valor"><button type="button" data-remove-finish-extra>×</button>';box.appendChild(row);row.querySelectorAll('input').forEach(i=>i.addEventListener('input',calc));row.querySelector('[data-remove-finish-extra]').onclick=()=>{row.remove();calc();};});document.querySelectorAll('.finish-extra-proc').forEach(x=>x.onchange=calc);document.querySelector('[data-finish-plus]')?.addEventListener('click',()=>{const q=document.querySelector('#finishRepairQty');q.textContent=Number(q.textContent)+1;calc();});document.querySelector('[data-finish-minus]')?.addEventListener('click',()=>{const q=document.querySelector('#finishRepairQty');q.textContent=Math.max(1,Number(q.textContent)-1);calc();});document.querySelector('#backCompletion').onclick=()=>openCompletionReview(id);document.querySelector('#confirmCompletion').onclick=()=>{const {items,qty,free,extra}=calc();if(!items.length&&!free.length){alert('Selecione um procedimento ou adicione um extra.');return;}if(free.some(x=>!x.description||x.value<=0)){alert('Preencha a descrição e o valor de cada extra.');return;}const extras=items.map(p=>({id:p.id,name:p.name,qty:p.id==='reposicao-quebrada'?qty:1,unitValue:p.value,value:p.value*(p.id==='reposicao-quebrada'?qty:1),durationMin:p.durationMin*(p.id==='reposicao-quebrada'?qty:1)})).concat(free.map(x=>({id:uid('extra'),name:x.description,description:x.description,qty:1,unitValue:x.value,value:x.value,durationMin:0,category:'extra'})));a.procedureItems=[...(a.procedureItems||[]),...extras];a.procedureIds=[...(a.procedureIds||[]),...extras.map(x=>x.id)];a.procedureNames=[...(a.procedureNames||[]),...extras.map(i=>i.qty>1?`${i.name} ×${i.qty}`:i.name)];a.totalValue=Number(a.totalValue)+extra;a.requiresMaintenance=!!requiresMaintenance||extras.some(x=>procedureRequiresMaintenance(x.id));a.status='completed';a.completedAt=new Date().toISOString();addHistory(a,'completed',`Atendimento concluído • procedimento adicional: ${extras.map(x=>x.name).join(', ')}`);store.save('appointment.complete',{appointmentId:id,total:a.totalValue,requiresMaintenance:a.requiresMaintenance});openCompletionNext(id);};calc();}
function startMaintenanceFromCompletion(id){const a=currentData().appointments.find(x=>x.id===id);if(!a)return;state.returnAppointmentId=id;startAppointmentFlow(a.clientId,'maintenance');}

function openClientWallet(clientId){const c=currentData().clients.find(x=>x.id===clientId);if(!c)return;const tx=walletTransactions(c).slice().sort((a,b)=>new Date(b.at)-new Date(a.at));state.modal=`<div class="modal-head"><div><span class="eyebrow">CARTEIRA DA CLIENTE</span><h2>${escapeHtml(c.name)}</h2></div><button data-close-modal>×</button></div><div class="cycle-alert"><b>Saldo atual: ${brl(walletBalance(c))}</b></div><button class="primary full" id="addWalletCredit">+ Adicionar saldo</button><button class="secondary full" id="toggleWalletOff">Desativar saldo em carteira</button><div class="simple-list">${tx.length?tx.map(t=>`<div class="receipt-row"><div><strong>${escapeHtml(t.description||'Movimentação')}</strong><span>${dateWithWeekday(t.at)}${t.appointmentId?' • atendimento':''}</span></div><b>${t.amount>=0?'+ ': '− '}${brl(Math.abs(t.amount))}<small> • saldo ${brl(t.balanceAfter??0)}</small></b></div>`).join(''):'<div class="empty">Nenhuma movimentação na carteira.</div>'}</div>`;render();document.querySelector('#addWalletCredit').onclick=()=>openWalletCreditForm(clientId);document.querySelector('#toggleWalletOff').onclick=()=>{confirmDialog('Desativar saldo em carteira? O saldo e todo o histórico serão preservados.',()=>{c.walletEnabled=false;store.save('client.wallet.disable',{clientId});openClient(clientId);});};}
function openWalletCreditForm(clientId){const c=currentData().clients.find(x=>x.id===clientId);state.modal=`<div class="modal-head"><div><span class="eyebrow">CARTEIRA</span><h2>Adicionar saldo</h2></div><button data-close-modal>×</button></div><label>Valor<input id="walletCreditValue" type="number" min="0.01" step="0.01" placeholder="R$ 0,00"></label><label>Data<input id="walletCreditDate" type="date" value="${toLocalDateKey(new Date())}"></label><label>Identificação / descrição<input id="walletCreditDesc" placeholder="Ex.: Cabelo, cílios, troca de serviços"></label><label>Lançar também no Financeiro?<select id="walletFinanceEffect"><option value="none">Não lançar no Financeiro</option><option value="income">Sim — como Entrada</option><option value="expense">Sim — como Saída</option></select></label><div class="note-box">A carteira sempre será atualizada. Esta opção define apenas se esta movimentação também aparece nos relatórios financeiros.</div><button class="primary full" id="saveWalletCredit">Adicionar saldo</button><button class="secondary full" id="backWallet">Voltar</button>`;render();document.querySelector('#backWallet').onclick=()=>openClientWallet(clientId);document.querySelector('#saveWalletCredit').onclick=()=>{const amount=Number(document.querySelector('#walletCreditValue').value||0),desc=document.querySelector('#walletCreditDesc').value.trim(),date=document.querySelector('#walletCreditDate').value,effect=document.querySelector('#walletFinanceEffect').value;if(amount<=0||!desc){alert('Informe o valor e a identificação do crédito.');return;}const at=new Date(`${date}T12:00:00`).toISOString(),before=walletBalance(c),t={id:uid('wallet'),amount,description:desc,at,balanceAfter:before+amount,financeEffect:effect,financeValue:amount};walletTransactions(c).push(t);store.save('client.wallet.credit',{clientId,amount,description:desc,at,financeEffect:effect});openClientWallet(clientId);};}

function useWalletForAppointment(appointmentId){const a=currentData().appointments.find(x=>x.id===appointmentId),c=currentData().clients.find(x=>x.id===a?.clientId);if(!a||!c)return;const available=walletBalance(c),balance=appointmentBalance(a),amount=Math.min(available,balance);if(amount<=0){alert('Não há saldo disponível na carteira.');return;}state.modal=`<div class="modal-head"><div><span class="eyebrow">SALDO EM CARTEIRA</span><h2>Usar ${brl(amount)}</h2></div><button data-close-modal>×</button></div><div class="payment-summary"><span>Saldo disponível</span><b>${brl(available)}</b><span>Abatimento</span><b>${brl(amount)}</b><span>Saldo após uso</span><b>${brl(available-amount)}</b></div><label>Refletir este abatimento no Financeiro?<select id="walletDebitFinance"><option value="none">Não lançar no Financeiro</option><option value="income">Sim — como Entrada</option><option value="expense">Sim — como Saída</option></select></label><button class="primary full" id="confirmWalletDebit">Confirmar uso da carteira</button><button class="secondary full" id="cancelWalletDebit">Cancelar</button>`;render();document.querySelector('#cancelWalletDebit').onclick=()=>openCompletionNext(appointmentId);document.querySelector('#confirmWalletDebit').onclick=()=>{const effect=document.querySelector('#walletDebitFinance').value,before=available,at=new Date().toISOString();walletTransactions(c).push({id:uid('wallet'),amount:-amount,description:`${a.procedureNames?.join(', ')||'Atendimento'}`,at,appointmentId:a.id,balanceAfter:before-amount,financeEffect:effect,financeValue:amount});currentData().payments.push({id:uid('pay'),appointmentId:a.id,amount,method:'Saldo em carteira',kind:'wallet',at});addHistory(a,'wallet_payment',`Pagamento com saldo em carteira: ${brl(amount)}${effect!=='none'?` • financeiro: ${effect==='income'?'entrada':'saída'}`:''}`,{amount,financeEffect:effect});store.save('client.wallet.debit',{clientId:c.id,appointmentId:a.id,amount,financeEffect:effect});openCompletionNext(a.id);};}


function sendCompletionMessage(id){const a=currentData().appointments.find(x=>x.id===id),c=currentData().clients.find(x=>x.id===a.clientId),paid=paymentTotalForAppointment(id),balance=appointmentBalance(a);const msg=`Olá, ${c?.name||''}! 😊\nSeu atendimento foi concluído. 💅\n\n💅 ${a.procedureNames?.join(', ')||'Atendimento'}\n💰 Valor total: ${brl(a.totalValue)}\n✅ Recebido: ${brl(paid)}${balance>0?`\n💰 Restante: ${brl(balance)}`:'\n💰 Pagamento QUITADO'}\n\nMuito obrigada pela preferência! 💕\n\n⭐ Sua opinião é muito importante e ajuda outras clientes a conhecerem meu trabalho. Se puder, deixe sua avaliação no Google — faz uma grande diferença para mim! ✨\nhttps://share.google/L0ZcsGsZoRLc4l6XZ\n\nJuliane Boone Nail Designer`;openWhatsApp(c?.whatsapp,msg);markMessageSent(a,'completion_payment');openCompletionNext(id);}
function openCompletionNext(id){const a=currentData().appointments.find(x=>x.id===id),balance=appointmentBalance(a),client=currentData().clients.find(c=>c.id===a.clientId),wallet=client?.walletEnabled?walletBalance(client):0,care=a.procedureIds.some(x=>x==='alongamento'||x==='manutencao'),needsMaintenance=appointmentRequiresMaintenance(a);state.modal=`<div class="modal-head"><div><span class="eyebrow">ATENDIMENTO CONCLUÍDO</span><h2>Próximos passos</h2></div><button data-close-modal>×</button></div>${balance>0?`<div class="warning">Saldo a receber: <b>${brl(balance)}</b></div>${wallet>0?`<div class="cycle-alert"><b>Saldo em carteira disponível: ${brl(wallet)}</b></div><button class="primary full" id="finishWallet">Usar saldo da carteira</button>`:''}<button class="primary full" id="finishFinance">Ir para Financeiro</button>`:`<div class="cycle-alert"><b>Pagamento quitado.</b></div><button class="primary full" id="finishCompletionMessage">${messageButtonLabel(a,'completion_payment')} • atendimento concluído</button>`}${care?`<button class="secondary full" id="finishCare">${messageButtonLabel(a,'post_care')} • cuidados pós-atendimento</button>`:''}${needsMaintenance?'<div class="cycle-alert"><b>Este atendimento possui manutenção.</b><span>Deseja programar o próximo retorno?</span></div><button class="secondary full" id="finishSchedule">Agendar próxima manutenção</button>':''}<button class="secondary full" id="finishClose">Finalizar por agora</button>`;render();document.querySelector('#finishWallet')?.addEventListener('click',()=>useWalletForAppointment(id));document.querySelector('#finishFinance')?.addEventListener('click',()=>registerPayment(id));document.querySelector('#finishCompletionMessage')?.addEventListener('click',()=>sendCompletionMessage(id));document.querySelector('#finishCare')?.addEventListener('click',()=>sharePostCare(id));document.querySelector('#finishSchedule')?.addEventListener('click',()=>startMaintenanceFromCompletion(a.id));document.querySelector('#finishClose').onclick=()=>{state.modal=null;render();};}

async function sharePostCare(id){const a=currentData().appointments.find(x=>x.id===id),c=currentData().clients.find(x=>x.id===a.clientId),text=`Oi, ${c?.name||''}! 💅 Seguem os cuidados pós-atendimento para conservar seu alongamento/manutenção. Qualquer dúvida, estou à disposição. ❤️`;const ok=await shareAssetWithText(POST_CARE_PDF,'cuidados-pos-atendimento-juliane-boone.pdf','application/pdf',text);if(ok)markMessageSent(a,'post_care');}
history.replaceState({juliane:true},'');history.pushState({juliane:true},'');window.addEventListener('popstate',()=>{if(state.view!=='dashboard'||state.modal||state.calendarSelectionMode){history.pushState({juliane:true},'');goBack();}});
registerSW();
render();
