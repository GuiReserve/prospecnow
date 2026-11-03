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
        <li>Nome, e-mail e senha (guardada com criptografia) para criar e acessar a conta.</li>
        <li>CPF ou CNPJ e dados de pagamento, tratados pelo Asaas para cobrar a assinatura. Não guardamos dados de cartão.</li>
        <li>Os contatos que você salva, a situação de cada um, suas anotações e seus textos de mensagem.</li>
      </ul>
      <h2>Dados dos negócios mostrados no mapa</h2>
      <p>São informações públicas de empresas obtidas pela API oficial do Google Maps (nome, endereço, telefone comercial, site, avaliações e fotos). Elas são usadas para contato comercial, com base no legítimo interesse. Seguindo as regras do Google, guardamos apenas o identificador do lugar e, por até 30 dias, a localização; o restante é consultado de novo quando o contato é aberto.</p>
      <h2>Pedir para sair</h2>
      <p>Se você é dono de um negócio e não quer aparecer no ProspecNow, escreva para <a href={'mailto:' + EMAIL}>{EMAIL}</a> com o nome e o endereço do negócio. Ele será bloqueado em novas varreduras.</p>
      <h2>Seus direitos</h2>
      <p>Você pode pedir acesso, correção ou exclusão dos seus dados pelo mesmo e-mail. Ao excluir a conta, apagamos seus contatos e anotações.</p>
      <h2>Serviços usados</h2>
      <p>Supabase (banco de dados e login), Vercel (hospedagem), Google Maps Platform (mapas e dados de lugares), Anthropic (escrita das mensagens pela IA) e Asaas (cobrança).</p>
    </main>
  );
}
