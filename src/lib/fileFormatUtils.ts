export interface FileTypeInfo {
  category: 'pdf' | 'excel' | 'doc' | 'presentation' | 'video' | 'image' | 'archive' | 'geo' | 'other';
  label: string;
  extension: string;
  badgeBg: string;
  badgeText?: string;
  iconBg: string;
  iconColor: string;
}

export function detectFileType(fileNameOrUrl: string): FileTypeInfo {
  const clean = (fileNameOrUrl || '').split('?')[0].split('#')[0].toLowerCase();
  const extMatch = clean.match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : '';

  switch (ext) {
    case 'pdf':
      return {
        category: 'pdf',
        label: 'Documento PDF',
        extension: 'PDF',
        badgeBg: 'bg-red-500/10 dark:bg-red-950/40 border-red-500/20 text-red-600 dark:text-red-400',
        iconBg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40',
        iconColor: 'text-red-500',
      };

    case 'xlsx':
    case 'xls':
    case 'csv':
      return {
        category: 'excel',
        label: ext === 'csv' ? 'Archivo CSV' : 'Planilla Excel',
        extension: ext.toUpperCase(),
        badgeBg: 'bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40',
        iconColor: 'text-emerald-500',
      };

    case 'doc':
    case 'docx':
    case 'odt':
    case 'rtf':
    case 'txt':
      return {
        category: 'doc',
        label: 'Documento de Texto',
        extension: ext.toUpperCase(),
        badgeBg: 'bg-blue-500/10 dark:bg-blue-950/40 border-blue-500/20 text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40',
        iconColor: 'text-blue-500',
      };

    case 'ppt':
    case 'pptx':
    case 'odp':
      return {
        category: 'presentation',
        label: 'Presentación',
        extension: ext.toUpperCase(),
        badgeBg: 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/20 text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40',
        iconColor: 'text-amber-500',
      };

    case 'mp4':
    case 'webm':
    case 'mov':
    case 'avi':
    case 'mkv':
      return {
        category: 'video',
        label: 'Video Descargable',
        extension: ext.toUpperCase(),
        badgeBg: 'bg-purple-500/10 dark:bg-purple-950/40 border-purple-500/20 text-purple-600 dark:text-purple-400',
        iconBg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/40',
        iconColor: 'text-purple-500',
      };

    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return {
        category: 'archive',
        label: 'Archivo Comprimido',
        extension: ext.toUpperCase(),
        badgeBg: 'bg-orange-500/10 dark:bg-orange-950/40 border-orange-500/20 text-orange-600 dark:text-orange-400',
        iconBg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/40',
        iconColor: 'text-orange-500',
      };

    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
    case 'svg':
    case 'gif':
      return {
        category: 'image',
        label: 'Imagen / Gráfico',
        extension: ext.toUpperCase(),
        badgeBg: 'bg-cyan-500/10 dark:bg-cyan-950/40 border-cyan-500/20 text-cyan-600 dark:text-cyan-400',
        iconBg: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-900/40',
        iconColor: 'text-cyan-500',
      };

    case 'shp':
    case 'kml':
    case 'kmz':
    case 'geojson':
    case 'json':
      return {
        category: 'geo',
        label: 'Prescripción / Capa SIG',
        extension: ext.toUpperCase(),
        badgeBg: 'bg-teal-500/10 dark:bg-teal-950/40 border-teal-500/20 text-teal-600 dark:text-teal-400',
        iconBg: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/40',
        iconColor: 'text-teal-500',
      };

    default:
      return {
        category: 'other',
        label: ext ? `Archivo .${ext.toUpperCase()}` : 'Archivo de Recurso',
        extension: ext ? ext.toUpperCase() : 'DOC',
        badgeBg: 'bg-zinc-500/10 dark:bg-zinc-800 border-zinc-500/20 text-zinc-600 dark:text-zinc-400',
        iconBg: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700',
        iconColor: 'text-zinc-500 dark:text-zinc-400',
      };
  }
}
