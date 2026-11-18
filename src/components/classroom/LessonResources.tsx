'use client';

import React from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Video, 
  Calendar, 
  Clock, 
  ExternalLink,
  FileCheck,
  FolderArchive,
  Image as ImageIcon,
  Presentation,
  MapPin,
  Paperclip
} from 'lucide-react';
import { detectFileType, FileTypeInfo } from '@/lib/fileFormatUtils';

export interface AttachmentItem {
  name: string;
  url: string;
  size?: string;
  type?: string;
}

interface LessonResourcesProps {
  attachments?: (string | AttachmentItem)[];
  zoomLink?: string | null;
  zoomDate?: string | null;
}

export const LessonResources: React.FC<LessonResourcesProps> = ({
  attachments = [],
  zoomLink,
  zoomDate,
}) => {
  // Parseo y clasificación de attachments en cualquier formato
  const parsedAttachments = (attachments || []).map((att, index) => {
    const rawUrl = typeof att === 'string' ? att : att.url;
    let rawName = typeof att === 'string' 
      ? (att.split('/').pop()?.split('?')[0] || `Recurso_${index + 1}`) 
      : (att.name || `Recurso_${index + 1}`);

    const name = decodeURIComponent(rawName);
    const fileInfo: FileTypeInfo = detectFileType(name);

    return {
      name,
      url: rawUrl,
      size: typeof att !== 'string' ? att.size : undefined,
      fileInfo,
    };
  });

  const formattedZoomDate = zoomDate ? new Date(zoomDate) : null;
  const isZoomActive = formattedZoomDate 
    ? (new Date().getTime() >= formattedZoomDate.getTime() - 15 * 60 * 1000)
    : Boolean(zoomLink);

  const hasContent = parsedAttachments.length > 0 || Boolean(zoomLink);

  if (!hasContent) {
    return null;
  }

  // Renderizar icono según categoría
  const renderIcon = (category: string) => {
    switch (category) {
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500 dark:text-red-400" />;
      case 'video':
        return <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'presentation':
        return <Presentation className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'archive':
        return <FolderArchive className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
      case 'geo':
        return <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
      default:
        return <FileCheck className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 my-6">
      {/* 1. MÓDULO CLASE EN VIVO (ZOOM) */}
      {zoomLink && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-zinc-900 to-zinc-900 border border-agro-500/30 p-5 sm:p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-agro-500/20 border border-agro-500/40 flex items-center justify-center text-agro-400 shrink-0">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-agro-500/20 text-agro-300 border border-agro-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-agro-400 animate-pulse mr-1.5" />
                    Encuentro en Vivo
                  </span>
                  {formattedZoomDate && (
                    <span className="text-xs text-zinc-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formattedZoomDate.toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white mt-1">
                  Sesión Práctica y Mentoría en Vivo por Zoom
                </h4>
                {formattedZoomDate && (
                  <p className="text-xs sm:text-sm text-zinc-300 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-agro-400" />
                    Horario: {formattedZoomDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs (Argentina)
                  </p>
                )}
              </div>
            </div>

            <a
              href={zoomLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md ${
                isZoomActive
                  ? 'bg-agro-500 hover:bg-agro-600 text-white shadow-agro-500/25 hover:scale-[1.02]'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
              }`}
            >
              <span>{isZoomActive ? 'Unirse a la clase en vivo' : 'Enlace de sala Zoom'}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* 2. MÓDULO MATERIALES Y RECURSOS EN CUALQUIER FORMATO */}
      {parsedAttachments.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-agro-600 dark:text-agro-400" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Materiales Descargables de la Lección
              </h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
              {parsedAttachments.length} {parsedAttachments.length === 1 ? 'archivo' : 'archivos'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {parsedAttachments.map((item, idx) => {
              const { fileInfo } = item;
              return (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="group flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-agro-500/50 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-agro-50/30 dark:hover:bg-agro-950/20 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${fileInfo.iconBg}`}>
                      {renderIcon(fileInfo.category)}
                    </div>
                    <div className="truncate">
                      <p className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-agro-600 dark:group-hover:text-agro-400 truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase border ${fileInfo.badgeBg}`}>
                          {fileInfo.extension}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {fileInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 group-hover:text-agro-600 dark:group-hover:text-agro-400 group-hover:bg-agro-100 dark:group-hover:bg-agro-900/40 transition-colors shrink-0 ml-2">
                    <Download className="w-4 h-4" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
