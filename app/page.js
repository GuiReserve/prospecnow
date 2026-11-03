import Link from 'next/link';
import s from './landing.module.css';

export default function Home() {
  return (
    <main>
      <header className={s.nav}>
        <Link href="/" className="logo"><i /><span>Prospec<b>Now</b></span></Link>
        <nav className={s.links}>
          <a href="#como">Como funciona</a>
          <a href="#duvidas">Dúvidas</a>
        </nav>
        <div className="row">
          <Link href="/app" className="btn sm">Abrir o ProspecNow</Link>
        </div>
      </header>

      <section className={s.hero}>
        <div className={s.heroText}>
          <p className={s.kicker}>Prospecção pelo mapa</p>
          <h1>Ache clientes no mapa da sua cidade e mande a primeira mensagem hoje.</h1>
          <p className={s.lead}>Você escolhe a cidade, a região ou o país. O ProspecNow varre o mapa, mostra quem tem telefone e quem não tem site e coloca tudo no mapa. Um clique abre o negócio, outro abre o WhatsApp com a mensagem pronta.</p>
          <div className="row">
            <Link href="/app" className="btn">Abrir o ProspecNow</Link>
            <a href="#como" className="btn ghost">Ver como funciona</a>
          </div>
          <p className={s.note}>Sem cadastro e sem cartão. O envio é sempre feito por você, uma conversa por vez.</p>
        </div>
        <div className={s.shot} aria-label="Ilustração do ProspecNow">
          <div className={s.mapArt}>
            <span className={s.road1} /><span className={s.road2} /><span className={s.road3} />
            {[[22, 30, '#2F7FD1'], [38, 52, '#2F7FD1'], [61, 34, '#E39B0B'], [70, 62, '#1E9E5A'], [48, 74, '#2F7FD1'], [30, 66, '#80868B'], [80, 24, '#2F7FD1']].map(([x, y, c], i) => (
              <i key={i} className={s.pin} style={{ left: x + '%', top: y + '%', background: c }} />
            ))}
          </div>
          <div className={s.panelArt}>
            <div className={s.cover}>BB<small>BARBEARIA</small></div>
            <div className={s.pBody}>
              <b>Barbearia Exemplo</b>
              <span>4,8 ★★★★★ · Barbearia</span>
              <em>Ainda não contatado</em>
              <div className={s.msg}>Olá, Barbearia Exemplo! Tudo bem? Encontrei vocês aqui pela região e acho que posso ajudar…</div>
              <div className={s.waBtn}>Enviar no WhatsApp</div>
            </div>
          </div>
          <p className={s.caption}>Ilustração com dados de exemplo</p>
        </div>
      </section>

      <section id="como" className={s.section}>
        <h2>Como funciona</h2>
        <div className={s.steps}>
          <div><b>1</b><h3>Diga onde procurar</h3><p>Digite uma cidade, uma região ("região de Jundiaí") ou um país. O ProspecNow monta a lista de cidades pelo mapa e você escolhe os segmentos.</p></div>
          <div><b>2</b><h3>Veja tudo no mapa</h3><p>Os negócios aparecem como pins no mapa, em 2D ou 3D. A cor mostra a situação de cada um: novo, acompanhar hoje, em conversa ou fechado.</p></div>
          <div><b>3</b><h3>Mande e acompanhe</h3><p>Clique no pin, crie a oportunidade e envie pelo WhatsApp. O ProspecNow lembra do 1º acompanhamento em 4 dias e do último em mais 7.</p></div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.features}>
          <div><h3>Para qualquer serviço</h3><p>Sites, redes sociais, tráfego pago, fotografia, contabilidade: você diz o que oferece e filtra por segmento, cidade e por quem tem ou não tem site.</p></div>
          <div><h3>Tudo do negócio num painel</h3><p>Endereço, telefone, site, Instagram, rota e a mensagem da etapa certa num só lugar.</p></div>
          <div><h3>Mensagens com a sua cara</h3><p>Você define seu nome, o que oferece, seu link e os três textos. Cada mensagem já sai com o nome do negócio, o segmento e a cidade.</p></div>
          <div><h3>Nada de disparo em massa</h3><p>Cada mensagem abre no seu WhatsApp e você aperta enviar. Isso protege seu número e segue as regras do WhatsApp.</p></div>
        </div>
      </section>

      <section id="duvidas" className={s.section}>
        <h2>Dúvidas</h2>
        <div className={s.faq}>
          <details><summary>De onde vêm os dados?</summary><p>Do OpenStreetMap, o mapa aberto e colaborativo usado por milhares de apps. São dados públicos de empresas. Alguns negócios não têm telefone ou site cadastrado; o ProspecNow mostra primeiro quem tem telefone e deixa um botão para pesquisar o resto.</p></details>
          <details><summary>O ProspecNow manda mensagens sozinho?</summary><p>Não. O botão abre a conversa no seu WhatsApp com o texto pronto, e você decide se envia. Disparo em massa pode bloquear seu número.</p></details>
          <details><summary>Preciso criar conta?</summary><p>Não. Você abre o app e usa. Seus contatos ficam salvos no seu navegador, e você pode baixar uma cópia de segurança para guardar ou levar para outro aparelho.</p></details>
          <details><summary>Quanto custa?</summary><p>Por enquanto, nada. O ProspecNow está em fase de testes e é gratuito.</p></details>
          <details><summary>E a LGPD?</summary><p>Usamos dados públicos de empresas para contato comercial. Qualquer negócio pode pedir para sair da lista pelo e-mail indicado na política de privacidade.</p></details>
        </div>
      </section>

      <footer className={s.footer}>
        <span className="logo"><i /><span>Prospec<b>Now</b></span></span>
        <span className="muted">Mapa: OpenFreeMap. Dados: © colaboradores do OpenStreetMap.</span>
        <span className="spacer" />
        <Link href="/privacidade">Privacidade</Link>
        <Link href="/termos">Termos</Link>
      </footer>
    </main>
  );
}
