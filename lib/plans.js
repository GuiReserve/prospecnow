// Planos do ProspecNow (preços em reais por mês).
// scans = cidades varridas por mês. Os mesmos números estão em supabase/prospecnow.sql (limite_varreduras).
export const PLANS = {
  trial: { id: 'trial', name: 'Teste grátis', price: 0, scans: 3 },
  essencial: { id: 'essencial', name: 'Essencial', price: 29, scans: 0 },
  pro: { id: 'pro', name: 'Pro', price: 67, scans: 20 },
  agencia: { id: 'agencia', name: 'Agência', price: 147, scans: 60 },
  expirado: { id: 'expirado', name: 'Sem plano ativo', price: 0, scans: 0 }
};
export const PAID = ['essencial', 'pro', 'agencia'];
export const TRIAL_DAYS = 7;

// o que cada plano inclui (página de vendas e página de planos)
export const ITENS = {
  essencial: ['Mapa 2D e 3D com seus contatos', 'Busca e adiciona negócios um a um', 'Mensagens prontas e acompanhamentos', 'Planilha com os contatos'],
  pro: ['Tudo do Essencial', `Varredura automática: ${PLANS.pro.scans} cidades por mês`, 'Regiões inteiras ("região de Jundiaí")', 'Até 10 segmentos por cidade'],
  agencia: ['Tudo do Pro', `${PLANS.agencia.scans} cidades por mês`, 'Estados e países inteiros', 'Para quem prospecta para vários clientes']
};


export function effectivePlan(profile, now = new Date()) {
  if (!profile) return PLANS.expirado;
  if (profile.paid_until && new Date(profile.paid_until) > now && PAID.includes(profile.plan)) return PLANS[profile.plan];
  if (profile.trial_ends_at && new Date(profile.trial_ends_at) > now) return PLANS.trial;
  return PLANS.expirado;
}
export function monthKey(d = new Date()) { return d.toISOString().slice(0, 7); }

export const MAX_SEGMENTS = 10;

export const SEGMENTOS_BR = ['Barbearia', 'Salão de beleza', 'Manicure', 'Hamburgueria', 'Pizzaria', 'Confeitaria', 'Estética automotiva', 'Fotógrafo', 'Nutricionista', 'Pet shop', 'Academia', 'Dentista', 'Oficina mecânica', 'Restaurante', 'Floricultura'];
export const SEGMENTOS_PT = ['Barbearia', 'Cabeleireiro', 'Manicure', 'Hamburgueria', 'Pizzaria', 'Pastelaria', 'Estética automóvel', 'Fotógrafo', 'Nutricionista', 'Tosquia e banhos', 'Ginásio', 'Dentista', 'Oficina', 'Restaurante', 'Florista'];

export const DEFAULT_SETTINGS = {
  meu_nome: '',
  servico: '',
  link: '',
  m0: 'Olá, {nome}! Tudo bem? Aqui é {meu_nome}, trabalho com {servico} para negócios de {cidade} e região.\n\nEncontrei vocês aqui pela região e acho que posso ajudar. Alguns trabalhos meus:\n{link}\n\nPosso te mostrar uma ideia do que eu faria para vocês?\n\nVamos mostrar que o seu trabalho é realmente bom?',
  m1: 'Oi, {nome}! Só passando para ver se a minha mensagem sobre {servico} chegou aí. Se quiser, preparo uma ideia rápida para vocês verem como ficaria.',
  m2: 'Oi, {nome}! Essa é a minha última mensagem, para não incomodar. Se mais para frente fizer sentido falar sobre {servico}, é só me chamar por aqui.'
};
