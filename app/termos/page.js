import Link from 'next/link';
import s from '../legal.module.css';

export const metadata = { title: 'Termos de uso · ProspecNow' };

export default function Termos() {
  return (
    <main className={s.wrap}>
      <Link href="/" className="logo"><i /><span>Prospec<b>Now</b></span></Link>
      <h1>Termos de uso</h1>
      <h2>O serviço</h2>
      <p>O ProspecNow ajuda a encontrar negócios no mapa, organizar contatos e preparar mensagens. O envio das mensagens é sempre feito por você, no seu próprio WhatsApp.</p>
      <h2>Uso permitido</h2>
      <ul>
        <li>Use o ProspecNow para contato comercial individual e respeitoso.</li>
        <li>Não use para disparo em massa, spam, assédio ou qualquer finalidade ilegal.</li>
        <li>Respeite quem pedir para não receber mais mensagens.</li>
        <li>Não revenda nem exporte em massa os dados mostrados no app. Os dados de negócios vêm do OpenStreetMap (licença ODbL) e devem manter a atribuição.</li>
      </ul>
      <h2>Começo de 7 dias e planos</h2>
      <p>O acesso de 7 dias custa R$ 10, é um pagamento único e não renova sozinho. Os planos mensais são mensais, cobrados pelo Asaas, e renovam até você cancelar. Ao cancelar, o acesso continua até o fim do período pago. O limite de varreduras reinicia todo mês e não acumula.</p>
      <h2>Responsabilidades</h2>
      <p>Os dados dos negócios vêm do OpenStreetMap, um mapa colaborativo, e podem estar incompletos ou desatualizados. Confira antes de enviar. Você é responsável pelas mensagens que envia. Podemos suspender contas que descumprirem estes termos.</p>
    </main>
  );
}
