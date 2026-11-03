// Monta a linha do contato salva no banco a partir de um resultado do OpenStreetMap.
const cut = (v, n) => String(v || '').slice(0, n);
export function leadRow(userId, r) {
  const lat = Number(r.lat), lng = Number(r.lng);
  return {
    user_id: userId,
    place_id: String(r.place_id),
    nome: cut(r.nome, 120),
    telefone: cut(r.telefone, 40),
    digits: /^\d{8,15}$/.test(r.digits || '') ? r.digits : null,
    site: /^https?:\/\//i.test(r.site || '') ? cut(r.site, 300) : null,
    endereco: cut(r.endereco, 200),
    instagram: cut(r.instagram, 120),
    horario: cut(r.horario, 120),
    segmento: cut(r.segmento, 40),
    cidade: cut(r.cidade, 80),
    pais: /^[A-Z]{2}$/.test(r.pais || '') ? r.pais : 'BR',
    lat: Math.abs(lat) <= 90 ? lat : null,
    lng: Math.abs(lng) <= 180 ? lng : null,
    coords_at: new Date().toISOString(),
    sem_site: !r.site
  };
}
