'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirigir directamente al registro público de técnicos
    router.replace('/registro');
  }, [router]);

  return null;
}
