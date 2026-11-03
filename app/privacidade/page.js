import Link from 'next/link';
import s from '../legal.module.css';

export const metadata = { title: 'Privacidade · ProspecNow' };
const EMAIL = process.env.NEXT_PUBLIC_CONTATO_EMAIL || 'contato@prospecnow.com.br';

export default function Privacidade() {
  return (
    <main className={s.wrap}>
      <Link href="/" className="logo"><i /><span>Prospec<b>Now</b></span></Link>
      <h1>Política de privacidade</h1>
      <p>Esta política explica quais dados o ProspecNow usa e como, de acordo com a Lei Geral de Proteção de Dados (LGPD).</p>
      <h2>Dados de quem usa o ProspecNow</h2>
      <p>O ProspecNow não tem cadastro nem servidor de dados. Os contatos que você salva, a situação de cada um, suas anotações e seus textos de mensagem ficam guardados só no seu navegador (armazenamento local). Não recebemos nem guardamos essas informações. Se você limpar os dados do navegador, elas somem; por isso há a opção de baixar uma cópia de segurança.</p>
      <h2>Dados dos negócios mostrados no mapa</h2>
      <p>São informações públicas de empresas do OpenStreetMap (nome, endereço, telefone comercial, site, Instagram e horário), com licença aberta ODbL. A busca é feita pelo seu navegador, direto nos serviços do OpenStreetMap, e é usada para contato comercial, com base no legítimo interesse.</p>
      <h2>Pedir para sair</h2>
      <p>Se você é dono de um negócio e não quer receber contato, escreva para <a href={'mailto:' + EMAIL}>{EMAIL}</a>. Como os dados vêm do OpenStreetMap, você também pode corrigir ou retirar as informações do seu negócio diretamente em openstreetmap.org.</p>
      <h2>Serviços usados</h2>
      <p>Vercel (hospedagem do site), OpenFreeMap (desenho do mapa), OpenStreetMap, Nominatim e Overpass (dados de lugares). Esses serviços recebem o seu endereço de IP e o que você busca, como qualquer site acessado pelo navegador.</p>
    </main>
  );
}
