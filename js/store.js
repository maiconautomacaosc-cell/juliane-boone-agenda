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
    const raw = localStorage.getItem(keyFor(env));
    if (!raw) {
      const initial = deepClone(INITIAL_STATE);
      initial.settings.environment = env;
      localStorage.setItem(keyFor(env), JSON.stringify(initial));
      return initial;
    }
    const saved = JSON.parse(raw);
    // Migração não destrutiva: acrescenta novos campos de catálogo sem alterar valores/tempos já personalizados.
    saved.procedures = (saved.procedures || []).map(p => ({ ...BASE_PROCEDURES.find(b => b.id === p.id), ...p }));
    BASE_PROCEDURES.forEach(base => { if (!saved.procedures.some(p => p.id === base.id)) saved.procedures.push(deepClone(base)); });
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
