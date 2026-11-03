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
      <h2>Gratuito, em testes</h2>
      <p>O ProspecNow está em fase de testes e é gratuito. Seus contatos ficam salvos só no seu navegador; baixe uma cópia de segurança para não perdê-los.</p>
      <h2>Responsabilidades</h2>
      <p>Os dados dos negócios vêm do OpenStreetMap, um mapa colaborativo, e podem estar incompletos ou desatualizados. Confira antes de enviar. Você é responsável pelas mensagens que envia. Podemos tirar o serviço do ar a qualquer momento.</p>
    </main>
  );
}
