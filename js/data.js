export const BASE_PROCEDURES = [
  { id: 'alongamento', name: 'Alongamento', value: 160, durationMin: 135, active: true, requiresMaintenance: true, image: './assets/catalog/alongamento.jpg', description: 'Técnica ideal para quem quer unhas mais longas e resistentes, com acabamento natural e elegante.' },
  { id: 'banho-gel', name: 'Banho de Gel', value: 120, durationMin: 105, active: true, image: './assets/catalog/banho-gel.jpg', description: 'Perfeito para fortalecer as unhas naturais. Aplicamos uma camada de gel que cria proteção, melhora a resistência e ajuda no crescimento, mantendo um acabamento brilhante e alinhado.' },
  { id: 'esmaltacao-gel', name: 'Esmaltação em gel', value: 120, durationMin: 105, active: true, image: './assets/catalog/esmaltacao-gel.jpg', description: 'Esmaltação com gel e cura na cabine UV/LED, garantindo brilho intenso e maior durabilidade no dia a dia. Ideal para quem quer unhas sempre bonitas por mais tempo, com acabamento impecável.' },
  { id: 'manicure', name: 'Manicure Tradicional', value: 37, durationMin: 60, active: true, image: './assets/catalog/manicure.png', description: 'Cuidado completo para as mãos: cutilagem, lixamento, hidratação e esmaltação impecável. Ideal para quem quer unhas bem feitas, com acabamento limpo e delicado.' },
  { id: 'manutencao', name: 'Manutenção', value: 120, durationMin: 105, active: true, image: './assets/catalog/alongamento.jpg', description: 'Manutenção do alongamento para renovar estrutura, acabamento e beleza das unhas.' },
  { id: 'pedicure', name: 'Pedicure', value: 45, durationMin: 90, active: true, image: './assets/catalog/pedicure.png', description: 'Tratamento completo para os pés com remoção de cutículas, lixamento, cuidado com calosidades leves e finalização com esmaltação. Deixa os pés macios, bonitos e bem cuidados.' },
  { id: 'reconstrucao-dedo', name: 'Reconstrução Dedo', value: 30, durationMin: 30, active: true, image: './assets/catalog/alongamento.jpg', description: 'Reconstrução de unha para recuperar comprimento e acabamento de forma harmoniosa.' },
  { id: 'remocao', name: 'Remoção', value: 50, durationMin: 60, active: true, image: './assets/catalog/banho-gel.jpg', description: 'Remoção cuidadosa do produto, preservando ao máximo a unha natural.' },
  { id: 'reposicao-quebrada', name: 'Reposição quebrada', value: 15, durationMin: 30, active: true, image: './assets/catalog/alongamento.jpg', description: 'Reposição de unha quebrada para devolver uniformidade ao conjunto.' },
  { id: 'vip-pe-mao', name: 'VIP Pé e Mão', value: 190, durationMin: 150, active: true, image: './assets/catalog/vip-pe-mao.png', description: 'O combo perfeito para sair com mãos e pés renovados: cutilagem, esfoliação, massagem relaxante e esmaltação em gel. Praticidade e autocuidado em um único atendimento.' }
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
