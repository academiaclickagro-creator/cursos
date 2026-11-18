import type { Metadata } from 'next';
import './globals.css';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';
import { MaintenanceBanner } from '@/components/public/MaintenanceBanner';

export const metadata: Metadata = {
  title: 'Academia Click Agro - Formación y Tecnología Agropecuaria',
  description: 'Plataforma educativa para profesionales, productores y técnicos del sector agropecuario.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-[#FAFAFA] text-zinc-900">
        <MaintenanceBanner />
        {children}
        <WhatsAppButton />
      </body>
    </html>
  );
}
