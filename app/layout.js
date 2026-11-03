import './globals.css';

export const metadata = {
  title: 'ProspecNow · Encontre clientes no mapa',
  description: 'Ache clientes para o seu serviço na sua cidade, veja tudo no mapa e mande a primeira mensagem pelo WhatsApp em minutos.'
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0B0F14' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
