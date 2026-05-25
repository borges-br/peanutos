'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WebhookExecutionsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/webhooks');
  }, [router]);
  return null;
}
