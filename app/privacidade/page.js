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
      <ul>
        <li>Nome, e-mail e senha (guardada com criptografia pelo Supabase) para criar e acessar a conta.</li>
        <li>Os contatos que você salva, a situação de cada um, suas anotações e seus textos de mensagem. Só você vê esses dados.</li>
        <li>Pagamento: feito na página do Asaas, que recebe seu CPF/CNPJ e os dados do cartão ou PIX. Não guardamos dados de cartão nem CPF/CNPJ.</li>
      </ul>
      <h2>Dados dos negócios mostrados no mapa</h2>
      <p>São informações públicas de empresas do OpenStreetMap (nome, endereço, telefone comercial, site, Instagram e horário), com licença aberta ODbL. A busca é feita pelo seu navegador, direto nos serviços do OpenStreetMap, e os resultados ficam só na conta de quem buscou. São usados para contato comercial, com base no legítimo interesse.</p>
      <h2>Pedir para sair</h2>
      <p>Se você é dono de um negócio e não quer receber contato, escreva para <a href={'mailto:' + EMAIL}>{EMAIL}</a>. Como os dados vêm do OpenStreetMap, você também pode corrigir ou retirar as informações do seu negócio diretamente em openstreetmap.org.</p>
      <h2>Seus direitos</h2>
      <p>Você pode pedir acesso, correção ou exclusão dos seus dados pelo e-mail acima. Ao excluir a conta, apagamos seus contatos e anotações.</p>
      <h2>Serviços usados</h2>
      <p>Supabase (login e banco de dados), Vercel (hospedagem), Asaas (cobrança), OpenFreeMap (desenho do mapa), OpenStreetMap, Nominatim e Overpass (dados de lugares).</p>
    </main>
  );
}
