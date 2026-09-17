import { INITIAL_STATE, BASE_PROCEDURES } from './data.js';
import { uid } from './utils.js';

const ACTIVE_ENV_KEY = 'juliane.activeEnvironment';
const keyFor = (env) => `juliane.state.${env}`;

function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

export class Store {
  constructor() {
    this.environment = localStorage.getItem(ACTIVE_ENV_KEY) || 'official';
    this.state = this.load(this.environment);
  }

  load(env) {
    const storageKey = keyFor(env);
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      const initial = deepClone(INITIAL_STATE);
      initial.settings.environment = env;
      localStorage.setItem(storageKey, JSON.stringify(initial));
      return initial;
    }

    let saved;
    try {
      saved = JSON.parse(raw);
    } catch (error) {
      // Preserva uma cópia do conteúdo antigo antes de recuperar o app.
      try { localStorage.setItem(`${storageKey}.recovery`, raw); } catch (_) {}
      saved = deepClone(INITIAL_STATE);
    }

    // Migração defensiva e não destrutiva para versões antigas.
    saved = saved && typeof saved === 'object' ? saved : {};
    saved.settings = { ...deepClone(INITIAL_STATE.settings), ...(saved.settings || {}), environment: env };
    saved.clients = Array.isArray(saved.clients) ? saved.clients : [];
    saved.appointments = Array.isArray(saved.appointments) ? saved.appointments : [];
    saved.payments = Array.isArray(saved.payments) ? saved.payments : [];
    saved.expenses = Array.isArray(saved.expenses) ? saved.expenses : [];
    saved.audit = Array.isArray(saved.audit) ? saved.audit : [];
    saved.procedures = Array.isArray(saved.procedures) ? saved.procedures : [];
    saved.procedures = saved.procedures.map(p => ({ ...(BASE_PROCEDURES.find(b => b.id === p.id) || {}), ...p }));
    BASE_PROCEDURES.forEach(base => { if (!saved.procedures.some(p => p.id === base.id)) saved.procedures.push(deepClone(base)); });
    saved.clients.forEach(c => {
      if (!Array.isArray(c.walletTransactions)) c.walletTransactions = [];
      if (typeof c.walletEnabled !== 'boolean') c.walletEnabled = false;
    });
    saved.appointments.forEach(a => { if (!Array.isArray(a.history)) a.history = []; });

    localStorage.setItem(storageKey, JSON.stringify(saved));
    return saved;
  }

  save(action = 'save', meta = {}) {
    this.state.audit.push({ id: uid('audit'), at: new Date().toISOString(), action, meta });
    localStorage.setItem(keyFor(this.environment), JSON.stringify(this.state));
  }

  switchEnvironment(env) {
    this.environment = env;
    localStorage.setItem(ACTIVE_ENV_KEY, env);
    this.state = this.load(env);
    return this.state;
  }

  resetSandbox() {
    localStorage.removeItem(keyFor('sandbox'));
    if (this.environment === 'sandbox') this.state = this.load('sandbox');
  }
}
