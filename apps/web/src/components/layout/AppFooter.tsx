import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../i18n/formatters';

export const AppFooter: React.FC = () => {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [currentDate] = useState(() => new Date('2026-05-24T15:32:12-03:00')); // consistent date format as requested in specs

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const userPart = user?.name ? ` · Usuário: ${user.name}` : '';
  const dateStr = formatDateTime(currentDate);

  return (
    <footer className="h-6 bg-surface-container-lowest border-t border-outline-variant/30 flex items-center px-md z-40 select-none select-text text-[10px] text-on-surface-variant font-mono">
      <div className="flex items-center justify-between w-full">
        <p>
          2026 Peanut OS · Ambiente: Homologação · Última atualização: {dateStr}{userPart}
        </p>
      </div>
    </footer>
  );
};

export default AppFooter;
