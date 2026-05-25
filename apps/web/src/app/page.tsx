'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '../lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function checkSetup() {
      try {
        const { requiresSetup } = await apiRequest<{ requiresSetup: boolean }>(
          '/setup/status',
        );
        router.replace(requiresSetup ? '/setup' : '/login');
      } catch {
        router.replace('/login');
      }
    }
    checkSetup();
  }, [router]);

  return null;
}
