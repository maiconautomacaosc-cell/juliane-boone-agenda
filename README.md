# Juliane Boone • Agenda PWA — v0.1.0

Primeira base funcional do projeto.

## O que já existe nesta versão

- PWA instalável e compatível com GitHub Pages.
- Painel inicial com semana selecionável.
- Agenda mensal com contador de compromissos por dia.
- Visualização do dia em card/modal antes de selecionar a data.
- Novo agendamento com cliente, múltiplos procedimentos, soma automática de valor e duração.
- Horário final e valor editáveis por atendimento.
- Cadastro simples de clientes.
- Financeiro com pagamentos parciais/integral e mensagem automática de confirmação via WhatsApp.
- Gastos com produtos.
- Ficha da cliente com histórico e financeiro resumido.
- ADM de procedimentos com valor e duração-base editáveis.
- Catálogo alimentado pela mesma base de procedimentos.
- Ambiente Oficial e Sandbox separados e persistentes.
- Auditoria local básica de alterações.
- Fluxo inicial de “Agendar próxima manutenção”.

## Importante

Nesta v0.1.0 os dados são persistidos localmente no navegador (localStorage) para validar o fluxo e a interface.
A sincronização entre aparelhos, login Google e backup em nuvem serão ligados em uma etapa própria usando backend/autenticação (Firebase/Google), sem mudar a experiência das telas.

## GitHub Pages

Basta enviar todos os arquivos deste diretório para um repositório e ativar **Settings → Pages → Deploy from branch**.

Como o projeto é estático e sem build, ele funciona diretamente no GitHub Pages.

## Próxima etapa sugerida

1. Testar no celular.
2. Validar Painel, Agenda mensal e fluxo de novo agendamento.
3. Ajustar identidade visual e navegação.
4. Depois conectar Google/Firebase e backup remoto.


## v0.1.4
Fluxo operacional de reservas/confirmacao, mensagens WhatsApp, painel de status e amanha, compromissos particulares, conclusao com procedimentos realizados, reposicao por unidade, cuidados pos-atendimento e financeiro semanal detalhado.
