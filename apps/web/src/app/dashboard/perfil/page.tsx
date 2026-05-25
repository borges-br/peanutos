'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/configuracoes/perfil');
  }, [router]);

  return (
    <div className="flex h-[200px] items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}
