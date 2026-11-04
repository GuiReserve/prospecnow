import Link from 'next/link';
import { PLANS, PAID, ITENS, SEMANA } from '@/lib/plans';
import s from './landing.module.css';
import Calculadora from './Calculadora';
import VideoCanto from './VideoCanto';

export default function Home() {
  return (
    <main>
      <header className={s.nav}>
        <Link href="/" className="logo"><i /><span>Prospec<b>Now</b></span></Link>
        <nav className={s.links}>
          <a href="#para-quem">Para quem</a>
          <a href="#conta">Faça a conta</a>
          <a href="#planos">Planos</a>
          <a href="#duvidas">Dúvidas</a>
        </nav>
        <div className="row">
          <Link href="/entrar" className="btn ghost sm">Entrar</Link>
          <Link href="/entrar?criar=1" className="btn sm">{SEMANA.dias} dias por R$ {SEMANA.price}</Link>
        </div>
      </header>

      <section className={s.hero}>
        <div className={s.heroText}>
          <p className={s.kicker}>Prospecção pelo mapa, para quem vende serviço</p>
          <h1>Seu próximo cliente já está no mapa. Só falta a sua mensagem.</h1>
          <p className={s.lead}>O ProspecNow mostra numa tela os negócios da sua região que podem comprar de você: quem ainda não tem site, que transportadoras e locadoras rodam perto de você, quem tem telefone. Um toque abre o WhatsApp com a mensagem pronta. E ele lembra quando voltar a falar.</p>
          <div className="row">
            <Link href="/entrar?criar=1" className="btn">Testar {SEMANA.dias} dias por R$ {SEMANA.price}</Link>
            <a href="#conta" className="btn ghost">Fazer a conta</a>
          </div>
          <p className={s.note}>Pagamento único de R$ {SEMANA.price} no PIX, boleto ou cartão. Não renova sozinho. O envio é sempre seu, uma conversa por vez.</p>
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
              <span>Barbearia · Cajamar · tem telefone</span>
              <em>Sem site cadastrado</em>
              <div className={s.msg}>Olá, Barbearia Exemplo! Tudo bem? Encontrei vocês aqui pela região e acho que posso ajudar…</div>
              <div className={s.waBtn}>Enviar no WhatsApp</div>
            </div>
          </div>
          <p className={s.caption}>Ilustração com dados de exemplo</p>
        </div>
      </section>

      <section id="para-quem" className={s.section}>
        <h2>Feito para quem vive de fechar clientes</h2>
        <p className="muted">Se o seu serviço serve para negócios locais, eles já estão no mapa esperando alguém chamar.</p>
        <div className={s.publico}>
          <div>
            <span className={s.pTag}>Devs e designers</span>
            <h3>Filtre só quem não tem site.</h3>
            <p>Cada pino com &quot;sem site cadastrado&quot; é um negócio que ainda não está na internet e está a um toque de uma conversa com você. Sua mensagem já sai com o nome dele e o link do seu portfólio.</p>
            <small>Barbearias, pizzarias, oficinas, clínicas, pet shops…</small>
          </div>
          <div>
            <span className={s.pTag}>Quem vende para frotas</span>
            <h3>Todas as frotas da região, num mapa.</h3>
            <p>Rastreamento, manutenção, seguro, lavagem, combustível, gestão: encontre transportadoras, locadoras de veículos, autoescolas e lava-rápidos de cada cidade, com telefone quando cadastrado, e visite com a rota pronta.</p>
            <small>Transportadoras, locadoras, autoescolas, lava-rápidos…</small>
          </div>
          <div>
            <span className={s.pTag}>Agências e social media</span>
            <h3>Monte sua carteira por bairro.</h3>
            <p>Negócios que vivem de cliente local precisam aparecer. Varra a cidade por segmento, veja quem tem Instagram e quem não tem, e acompanhe cada conversa até fechar.</p>
            <small>Restaurantes, academias, salões, dentistas…</small>
          </div>
        </div>
      </section>

      <section id="conta" className={s.section}>
        <h2>Faça a conta com os seus números</h2>
        <p className="muted" style={{ maxWidth: '68ch' }}>Prospectar já toma o seu tempo hoje: procurar no Google Maps, copiar telefone, colar no WhatsApp, esquecer de voltar a falar. O ProspecNow junta tudo isso numa tela. A pergunta que importa é só uma: quanto vale um cliente seu?</p>
        <Calculadora />
      </section>

      <section className={s.section}>
        <div className={s.antes}>
          <div>
            <h3>Prospectar sem o ProspecNow</h3>
            <ul>
              <li>Procurar negócio por negócio no Google Maps</li>
              <li>Copiar telefone e colar no WhatsApp, um por um</li>
              <li>Escrever a mesma mensagem toda vez</li>
              <li>Esquecer quem precisava de um segundo contato</li>
              <li>Perder a lista numa planilha bagunçada</li>
            </ul>
          </div>
          <div className={s.depois}>
            <h3>Com o ProspecNow</h3>
            <ul>
              <li>A cidade inteira no mapa, por segmento</li>
              <li>Um toque abre o WhatsApp com o número certo</li>
              <li>Mensagem pronta com o nome do negócio, no idioma do país dele</li>
              <li>Lembrete do retorno em 4 dias e do último em 7</li>
              <li>Cada contato com a situação, a anotação e a planilha a um clique</li>
            </ul>
          </div>
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

      <section id="planos" className={s.section}>
        <h2>Planos</h2>
        <p className="muted">Comece com {SEMANA.dias} dias por R$ {SEMANA.price} ({SEMANA.scans} cidades, pagamento único, não renova). Depois, escolha um plano mensal (cartão ou boleto).</p>
        <div className={s.plans}>
          {PAID.map(id => {
            const p = PLANS[id], destaque = id === 'pro';
            return (
              <div key={id} className={s.plan + (destaque ? ' ' + s.best : '')}>
                {destaque && <span className={s.tag}>Com varredura automática</span>}
                <h3>{p.name}</h3>
                <p className={s.price}><b>R$ {p.price}</b>/mês</p>
                <ul>{ITENS[id].map(t => <li key={t}>{t}</li>)}</ul>
                <Link href="/entrar?criar=1" className={'btn ' + (destaque ? '' : 'ghost')}>Começar</Link>
              </div>
            );
          })}
        </div>
        <p className={s.small}>Uma varredura = uma cidade, com até 10 segmentos (barbearias, pizzarias, dentistas…). Os dados vêm do OpenStreetMap.</p>
      </section>

      <section className={s.section}>
        <div className={s.risco}>
          <div>
            <h2>O seu risco é de R$ {SEMANA.price}.</h2>
            <p>Você paga R$ {SEMANA.price} uma vez e usa o ProspecNow por {SEMANA.dias} dias, com {SEMANA.scans} varreduras de cidade. Não renova sozinho. Se não fizer sentido para você, é só parar: seus contatos continuam salvos na sua conta.</p>
            <p>Se uma única conversa virar cliente, esses R$ {SEMANA.price} voltam muitas vezes.</p>
          </div>
          <div className={s.riscoCta}>
            <b>Vamos mostrar que o seu trabalho é realmente bom?</b>
            <Link href="/entrar?criar=1" className="btn">Começar com {SEMANA.dias} dias por R$ {SEMANA.price}</Link>
          </div>
        </div>
      </section>

      <section id="duvidas" className={s.section}>
        <h2>Dúvidas</h2>
        <div className={s.faq}>
          <details><summary>De onde vêm os dados?</summary><p>Do OpenStreetMap, o mapa aberto e colaborativo usado por milhares de apps. São dados públicos de empresas. Alguns negócios não têm telefone ou site cadastrado; o ProspecNow mostra primeiro quem tem telefone e deixa um botão para pesquisar o resto.</p></details>
          <details><summary>O ProspecNow manda mensagens sozinho?</summary><p>Não. O botão abre a conversa no seu WhatsApp com o texto pronto, e você decide se envia. Disparo em massa pode bloquear seu número.</p></details>
          <details><summary>Como funciona o começo de {SEMANA.dias} dias?</summary><p>Você paga R$ {SEMANA.price} uma vez e usa o ProspecNow por {SEMANA.dias} dias, com {SEMANA.scans} varreduras de cidade e busca manual à vontade. Não renova sozinho: no fim, você escolhe um plano mensal ou para de usar, e seus contatos continuam salvos.</p></details>
          <details><summary>Como pago? Posso cancelar?</summary><p>Pelo Asaas. Os {SEMANA.dias} dias se pagam por PIX, boleto ou cartão; os planos mensais, por cartão ou boleto, todo mês. Você cancela quando quiser na página de planos e continua usando até o fim do mês já pago.</p></details>
          <details><summary>Funciona fora do Brasil?</summary><p>Sim. Você escolhe o país na varredura (Portugal, Estados Unidos, Espanha, Argentina, México…), e a mensagem sai no idioma do negócio: português, espanhol ou inglês. Você pode ajustar os textos de cada idioma em Mensagens.</p></details>
          <details><summary>Meus contatos ficam salvos?</summary><p>Sim, na sua conta. Você abre de qualquer computador ou celular e ainda pode baixar uma planilha com todos eles.</p></details>
          <details><summary>E a LGPD?</summary><p>Usamos dados públicos de empresas para contato comercial. Qualquer negócio pode pedir para sair da lista pelo e-mail indicado na política de privacidade.</p></details>
        </div>
      </section>

      <VideoCanto />
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
