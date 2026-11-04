// Planos do ProspecNow (preços em reais por mês).
// scans = cidades varridas por mês. Os mesmos números estão em supabase/prospecnow.sql (limite_varreduras).
export const PLANS = {
  trial: { id: 'trial', name: 'Teste grátis', price: 0, scans: 3 },
  essencial: { id: 'essencial', name: 'Essencial', price: 29, scans: 0 },
  pro: { id: 'pro', name: 'Pro', price: 67, scans: 20 },
  agencia: { id: 'agencia', name: 'Agência', price: 147, scans: 60 },
  semana: { id: 'semana', name: '7 dias', price: 10, scans: 5, dias: 7 },   // pagamento único, não renova
  admin: { id: 'admin', name: 'Admin (ilimitado)', price: 0, scans: 100000 },   // só o dono, liberado pelo banco (supabase/admin.sql)
  expirado: { id: 'expirado', name: 'Sem plano ativo', price: 0, scans: 0 }
};
export const PAID = ['essencial', 'pro', 'agencia'];   // mensais
export const SEMANA = PLANS.semana;
export const TRIAL_DAYS = 7;

// o que cada plano inclui (página de vendas e página de planos)
export const ITENS = {
  essencial: ['Mapa 2D e 3D com seus contatos', 'Busca e adiciona negócios um a um', 'Mensagens prontas e acompanhamentos', 'Planilha com os contatos'],
  pro: ['Tudo do Essencial', `Varredura automática: ${PLANS.pro.scans} cidades por mês`, 'Regiões inteiras ("região de Jundiaí")', 'Até 10 segmentos por cidade'],
  agencia: ['Tudo do Pro', `${PLANS.agencia.scans} cidades por mês`, 'Estados e países inteiros', 'Para quem prospecta para vários clientes']
};


export function effectivePlan(profile, now = new Date()) {
  if (!profile) return PLANS.expirado;
  if (profile.paid_until && new Date(profile.paid_until) > now && (PAID.includes(profile.plan) || profile.plan === 'semana' || profile.plan === 'admin')) return PLANS[profile.plan];
  if (profile.trial_ends_at && new Date(profile.trial_ends_at) > now) return PLANS.trial;
  return PLANS.expirado;
}
export function monthKey(d = new Date()) { return d.toISOString().slice(0, 7); }

export const MAX_SEGMENTS = 10;

export const SEGMENTOS_BR = ['Barbearia', 'Salão de beleza', 'Manicure', 'Hamburgueria', 'Pizzaria', 'Confeitaria', 'Estética automotiva', 'Fotógrafo', 'Nutricionista', 'Pet shop', 'Academia', 'Dentista', 'Oficina mecânica', 'Restaurante', 'Floricultura', 'Transportadora', 'Locadora de veículos', 'Autoescola', 'Lava-rápido'];
export const SEGMENTOS_PT = ['Barbearia', 'Cabeleireiro', 'Manicure', 'Hamburgueria', 'Pizzaria', 'Pastelaria', 'Estética automóvel', 'Fotógrafo', 'Nutricionista', 'Tosquia e banhos', 'Ginásio', 'Dentista', 'Oficina', 'Restaurante', 'Florista', 'Transportadora', 'Rent-a-car', 'Escola de condução', 'Lavagem auto'];

export const DEFAULT_SETTINGS = {
  meu_nome: '',
  servico: '',
  link: '',
  m0: 'Olá, {nome}! Tudo bem? Aqui é {meu_nome}, trabalho com {servico} para negócios de {cidade} e região.\n\nEncontrei vocês aqui pela região e acho que posso ajudar. Alguns trabalhos meus:\n{link}\n\nPosso te mostrar uma ideia do que eu faria para vocês?\n\nVamos mostrar que o seu trabalho é realmente bom?',
  m1: 'Oi, {nome}! Só passando para ver se a minha mensagem sobre {servico} chegou aí. Se quiser, preparo uma ideia rápida para vocês verem como ficaria.',
  m2: 'Oi, {nome}! Essa é a minha última mensagem, para não incomodar. Se mais para frente fizer sentido falar sobre {servico}, é só me chamar por aqui.'
};

// Idioma das mensagens: vem do país do negócio.
export const LANGS = { 'pt-BR': 'Português (Brasil)', 'pt-PT': 'Português (Portugal)', es: 'Espanhol', en: 'Inglês' };
export function langOf(pais) {
  const p = String(pais || 'BR').toUpperCase();
  if (p === 'BR') return 'pt-BR';
  if (['PT', 'AO', 'MZ', 'CV'].includes(p)) return 'pt-PT';
  if (['ES', 'AR', 'MX', 'CL', 'CO', 'PE', 'UY', 'PY', 'BO', 'EC', 'VE'].includes(p)) return 'es';
  return 'en';
}
export const MSG_DEFAULTS = {
  'pt-BR': { m0: DEFAULT_SETTINGS.m0, m1: DEFAULT_SETTINGS.m1, m2: DEFAULT_SETTINGS.m2 },
  'pt-PT': {
    m0: 'Olá, {nome}! Tudo bem? Fala {meu_nome}, trabalho com {servico} para negócios de {cidade} e arredores.\n\nEncontrei-vos aqui na zona e acho que posso ajudar. Alguns trabalhos meus:\n{link}\n\nPosso mostrar-vos uma ideia do que faria para vocês?\n\nVamos mostrar que o vosso trabalho é mesmo bom?',
    m1: 'Olá, {nome}! Só para confirmar se a minha mensagem sobre {servico} chegou. Se quiserem, preparo uma ideia rápida para verem como ficaria.',
    m2: 'Olá, {nome}! Esta é a minha última mensagem, para não incomodar. Se mais à frente fizer sentido falar sobre {servico}, é só dizer por aqui.'
  },
  es: {
    m0: '¡Hola, {nome}! ¿Qué tal? Soy {meu_nome}, trabajo con {servico} para negocios de {cidade} y alrededores.\n\nLos encontré por la zona y creo que puedo ayudarles. Algunos de mis trabajos:\n{link}\n\n¿Les puedo mostrar una idea de lo que haría para ustedes?\n\n¿Mostramos que su trabajo es realmente bueno?',
    m1: '¡Hola, {nome}! Solo quería saber si les llegó mi mensaje sobre {servico}. Si quieren, preparo una idea rápida para que vean cómo quedaría.',
    m2: '¡Hola, {nome}! Este es mi último mensaje, para no molestar. Si más adelante tiene sentido hablar de {servico}, me escriben por aquí.'
  },
  en: {
    m0: 'Hi {nome}! This is {meu_nome}. I work with {servico} for businesses in {cidade} and nearby.\n\nI came across you in the area and I think I can help. Some of my work:\n{link}\n\nCan I show you a quick idea of what I would do for you?\n\nShall we show how good your work really is?',
    m1: 'Hi {nome}! Just checking that my message about {servico} reached you. If you like, I can put together a quick idea so you can see how it would look.',
    m2: 'Hi {nome}! This is my last message, I do not want to bother you. If talking about {servico} makes sense later on, just message me here.'
  }
};
// Texto da etapa (0, 1 ou 2) no idioma do negócio: o que a pessoa salvou, ou o padrão daquele idioma.
export function textoDaEtapa(settings, lang, step) {
  const k = 'm' + step;
  if (lang === 'pt-BR') return settings[k] || MSG_DEFAULTS['pt-BR'][k];
  return settings.msgs?.[lang]?.[k] || MSG_DEFAULTS[lang][k];
}
export function servicoNoIdioma(settings, lang) {
  return (lang !== 'pt-BR' && settings.msgs?.[lang]?.servico) || settings.servico || '';
}
