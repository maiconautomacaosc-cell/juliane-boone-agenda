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

## v0.1.6
- Corrige o modal de “Novo registro” permanecendo sobre a seleção de data.
- Agenda abre em visão semanal proporcional (08h–00h), com Semana/Mês.
- Dia ampliado centralizado com fundo ofuscado e swipe SEG–DOM, travado dentro da semana.
- Blocos de atendimento/particular ocupam proporcionalmente a duração real e abrem os detalhes.


## v0.1.7
- Toque em espaço livre da visão diária ampliada inicia novo registro com data/horário pré-selecionados.
- Navegação do dia ampliado corrigida para avançar e retroceder um dia por vez, sem pular dias.
- Swipe limitado à semana atual (SEG–DOM), com botões anterior/próximo como alternativa.

## v0.1.12 — fluxo de atendimento e mensagens
- mensagens de atendimento com estado ENVIAR/REENVIAR e direcionamento ao WhatsApp Business quando suportado pelo aparelho;
- texto de reserva ajustado para “até o final do dia de hoje”;
- conclusão e financeiro separados: pagamento não regride atendimento concluído para confirmação;
- status combinado de atendimento + financeiro no painel;
- próxima manutenção liberada somente após conclusão e conforme “Requer manutenção periódica”;
- Alongamento vem com manutenção periódica ativa por padrão;
- seleção de próxima manutenção inicia na visão Semana/Mês;
- X durante escolha de dia retorna à seleção sem abandonar o fluxo;
- catálogo e compartilhamento com linguagem em primeira pessoa e foco em autoestima.
