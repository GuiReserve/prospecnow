// Planos do ProspecNow. Preços em reais por mês.
// scans = varreduras de cidade por mês (cada uma faz até 10 buscas no Google, uma por segmento)
// details = contatos abertos por mês (cada abertura busca nome, telefone e foto no Google)
export const PLANS = {
  trial: { id: 'trial', name: 'Teste grátis', price: 0, scans: 1, details: 50, ai: 50, search: true },
  essencial: { id: 'essencial', name: 'Essencial', price: 29, scans: 0, details: 100, ai: 100, search: true },
  pro: { id: 'pro', name: 'Pro', price: 67, scans: 8, details: 200, ai: 400, search: true },
  agencia: { id: 'agencia', name: 'Agência', price: 147, scans: 25, details: 500, ai: 1000, search: true },
  expirado: { id: 'expirado', name: 'Sem plano ativo', price: 0, scans: 0, details: 0, ai: 0, search: false }
};

export const PAID = ['essencial', 'pro', 'agencia'];
export const TRIAL_DAYS = 7;
export const MAX_SEGMENTS = 10;

export const SEGMENTOS_BR = ['Barbearia', 'Salão de beleza', 'Manicure', 'Hamburgueria', 'Pizzaria', 'Confeitaria', 'Estética automotiva', 'Fotógrafo', 'Nutricionista', 'Pet shop', 'Academia', 'Dentista', 'Oficina mecânica', 'Restaurante', 'Floricultura'];
export const SEGMENTOS_PT = ['Barbearia', 'Cabeleireiro', 'Manicure', 'Hamburgueria', 'Pizzaria', 'Pastelaria', 'Estética automóvel', 'Fotógrafo', 'Nutricionista', 'Tosquia e banhos', 'Ginásio', 'Dentista', 'Oficina', 'Restaurante', 'Florista'];

export function effectivePlan(profile, now = new Date()) {
  if (!profile) return PLANS.expirado;
  if (profile.paid_until && new Date(profile.paid_until) > now && PAID.includes(profile.plan)) return PLANS[profile.plan];
  if (profile.trial_ends_at && new Date(profile.trial_ends_at) > now) return PLANS.trial;
  return PLANS.expirado;
}

export function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7);
}

export const DEFAULT_SETTINGS = {
  meu_nome: '',
  servico: '',
  link: '',
  m0: 'Olá, {nome}! Tudo bem? Aqui é {meu_nome}, trabalho com {servico} para negócios de {cidade} e região.\n\nVi vocês no Google e acho que posso ajudar. Alguns trabalhos meus:\n{link}\n\nPosso te mostrar uma ideia do que eu faria para vocês?\n\nVamos mostrar que o seu trabalho é realmente bom?',
  m1: 'Oi, {nome}! Só passando para ver se a minha mensagem sobre {servico} chegou aí. Se quiser, preparo uma ideia rápida para vocês verem como ficaria.',
  m2: 'Oi, {nome}! Essa é a minha última mensagem, para não incomodar. Se mais para frente fizer sentido falar sobre {servico}, é só me chamar por aqui.'
};
