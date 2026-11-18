'use client';

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useSiteSettings } from '@/lib/useSiteSettings';

export const MaintenanceBanner: React.FC = () => {
  const { isMaintenanceMode, maintenanceNoticeMessage } = useSiteSettings();
  const [dismissed, setDismissed] = useState(false);

  if (!isMaintenanceMode || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-500 text-zinc-950 px-4 py-2.5 text-xs font-semibold shadow-md flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2.5 max-w-7xl mx-auto flex-1 justify-center text-center">
        <AlertTriangle className="w-4 h-4 shrink-0 text-zinc-950" />
        <span>
          <strong>Aviso de Mantenimiento:</strong>{' '}
          {maintenanceNoticeMessage || 'Estamos realizando tareas técnicas en la plataforma. Volvemos en breve.'}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-amber-600 rounded-lg text-zinc-900 transition-colors"
        aria-label="Cerrar aviso de mantenimiento"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
