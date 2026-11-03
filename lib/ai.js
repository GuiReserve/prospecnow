import { MOCK } from './server';

const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

async function claude(system, user, maxTokens = 800) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL(), max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || 'Falha na IA');
  return (j.content || []).map(c => c.text || '').join('').trim();
}

function parseJson(t) {
  const m = t.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : t);
}

// O agente transforma "região de Jundiaí" ou "Portugal" numa lista de cidades para varrer.
export async function planArea(area, maxCities) {
  if (MOCK || !process.env.ANTHROPIC_API_KEY) {
    const parts = area.split(/,| e /).map(s => s.trim()).filter(Boolean).slice(0, maxCities);
    return { pais: /portugal|lisboa|porto|braga|faro|coimbra/i.test(area) ? 'PT' : 'BR', cidades: parts.map(c => ({ cidade: c, busca: c })), nota: MOCK ? 'Modo de demonstração: as cidades foram separadas pelo texto digitado.' : 'Sem chave da IA: as cidades foram separadas pelo texto digitado.' };
  }
  const system = 'Você planeja varreduras de prospecção de pequenos negócios. Responda só com JSON válido, sem comentários.';
  const user = `Área pedida pelo usuário: "${area}".
Liste até ${maxCities} cidades reais para varrer, priorizando as maiores e mais relevantes dessa área. Se a área já for uma única cidade, devolva só ela.
Formato: {"pais":"BR" ou "PT" ou código ISO de 2 letras,"cidades":[{"cidade":"Nome","busca":"Nome, UF ou região, País"}],"nota":"uma frase curta explicando a escolha"}`;
  const out = parseJson(await claude(system, user, 700));
  out.cidades = (out.cidades || []).slice(0, maxCities);
  return out;
}

// Reescreve a mensagem para um negócio específico, mantendo as regras de tom.
export async function writeMessage({ base, negocio, segmento, cidade, etapa, pais }) {
  if (MOCK || !process.env.ANTHROPIC_API_KEY) return base;
  const pt = pais === 'PT' ? 'português de Portugal' : 'português do Brasil';
  const system = `Você escreve mensagens curtas de WhatsApp para um profissional que cria sites para pequenos negócios. Escreva em ${pt}, tom direto e educado.
Regras: não invente fatos sobre o negócio; não use urgência falsa, escassez ou "poucas vagas"; não use "sem compromisso"; não use emojis em excesso (no máximo 1); mantenha o link exatamente como está; no primeiro contato, termine com a pergunta de fechamento que estiver no texto base. Responda só com a mensagem.`;
  const user = `Etapa: ${etapa}. Negócio: ${negocio}. Segmento: ${segmento}. Cidade: ${cidade}.
Texto base (mantenha a ideia e o link, deixe mais natural e específico para o segmento):
${base}`;
  return await claude(system, user, 600);
}
