export const BASE_PROCEDURES = [
  { id: 'alongamento', name: 'Alongamento', value: 160, durationMin: 135, active: true },
  { id: 'banho-gel', name: 'Banho de Gel', value: 120, durationMin: 105, active: true },
  { id: 'esmaltacao-gel', name: 'Esmaltação em gel', value: 120, durationMin: 105, active: true },
  { id: 'manicure', name: 'Manicure Tradicional', value: 37, durationMin: 60, active: true },
  { id: 'manutencao', name: 'Manutenção', value: 120, durationMin: 105, active: true },
  { id: 'pedicure', name: 'Pedicure', value: 45, durationMin: 90, active: true },
  { id: 'reconstrucao-dedo', name: 'Reconstrução Dedo', value: 30, durationMin: 30, active: true },
  { id: 'remocao', name: 'Remoção', value: 50, durationMin: 60, active: true },
  { id: 'reposicao-quebrada', name: 'Reposição quebrada', value: 15, durationMin: 30, active: true },
  { id: 'vip-pe-mao', name: 'VIP Pé e Mão', value: 190, durationMin: 150, active: true }
];

export const BIBLE_MESSAGES = [
  'Tudo posso naquele que me fortalece. — Filipenses 4:13',
  'Entregue o seu caminho ao Senhor; confie nele. — Salmos 37:5',
  'O Senhor é a minha força e o meu escudo. — Salmos 28:7',
  'Seja forte e corajosa. — Josué 1:9'
];

export const INITIAL_STATE = {
  settings: {
    theme: {
      lightAccent: '#F6C28B',
      darkAccent: '#A57548',
      background: '#FAF6F0',
      card: '#FFFFFF',
      text: '#1C1C1C'
    },
    studioName: 'Juliane Boone Nail Designer',
    signalPercent: 30,
    defaultMaintenanceDays: 15,
    environment: 'official'
  },
  procedures: BASE_PROCEDURES,
  clients: [],
  appointments: [],
  payments: [],
  expenses: [],
  audit: []
};
