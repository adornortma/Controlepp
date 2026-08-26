import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seguimiento de Proyectos',
  description: 'Tablero de gestión y seguimiento de proyectos de infraestructura',
};

export default function ProyectosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
