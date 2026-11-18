'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  FileSpreadsheet, 
  File, 
  Image as ImageIcon, 
  Trash2, 
  ExternalLink, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Plus,
  Video,
  Play
} from 'lucide-react';

export interface UploadedFileItem {
  id?: string;
  name: string;
  url: string;
  size?: number | string;
  type?: string;
  uploading?: boolean;
  error?: string;
}

/**
 * Formatea el tamaño en bytes a un formato legible humano (KB, MB)
 */
export function formatFileSize(bytes?: number | string): string {
  if (!bytes) return '';
  const num = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (isNaN(num)) return '';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Detecta si un archivo o URL corresponde a un tipo específico
 */
export function getFileTypeBadge(fileNameOrUrl: string, mimeType?: string) {
  const lower = (fileNameOrUrl || '').toLowerCase();
  const isExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv') || (mimeType && mimeType.includes('sheet'));
  const isPdf = lower.endsWith('.pdf') || (mimeType && mimeType.includes('pdf'));
  const isImage = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || (mimeType && mimeType.startsWith('image/'));

  if (isExcel) {
    return {
      type: 'excel',
      label: 'Excel / Planilla',
      icon: FileSpreadsheet,
      colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    };
  }
  if (isPdf) {
    return {
      type: 'pdf',
      label: 'PDF',
      icon: FileText,
      colorClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    };
  }
  if (isImage) {
    return {
      type: 'image',
      label: 'Imagen',
      icon: ImageIcon,
      colorClass: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    };
  }
  return {
    type: 'doc',
    label: 'Archivo',
    icon: File,
    colorClass: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  };
}

// ==============================================================================
// 1. COMPONENTE: ImageUploadZone (Portada del Curso / Combo)
// ==============================================================================
interface ImageUploadZoneProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
  label = 'Imagen de Portada',
  value,
  onChange,
  folder = 'covers',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al subir la imagen');
      }

      onChange(data.url);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al conectar con el servidor.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="font-semibold text-zinc-700 dark:text-zinc-300 block text-xs">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShowManualUrl(!showManualUrl)}
          className="text-[11px] text-agro-600 dark:text-agro-400 hover:underline"
        >
          {showManualUrl ? 'Subir desde dispositivo' : 'Pegar URL manual'}
        </button>
      </div>

      {showManualUrl ? (
        <div className="space-y-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-agro-500"
          />
          {value && (
            <div className="relative w-full h-44 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 flex items-center justify-center p-2">
              <img src={value} alt="Preview" className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>
      ) : (
        <div>
          {value ? (
            <div className="relative group rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-950 h-48 sm:h-56 flex items-center justify-center p-2">
              <img src={value} alt="Portada del Curso" className="max-w-full max-h-full object-contain" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-zinc-900 font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Cambiar
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Quitar
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-agro-500 bg-agro-50/50 dark:bg-agro-950/20'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-agro-500 hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center py-2">
                  <Loader2 className="w-6 h-6 text-agro-500 animate-spin mb-1.5" />
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Subiendo imagen...
                  </span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-agro-100 dark:bg-agro-900/40 text-agro-600 dark:text-agro-400 flex items-center justify-center mb-1.5">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Sube una portada desde tu dispositivo
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Arrastra aquí o haz clic (PNG, JPG, WebP hasta 50MB)
                  </p>
                </>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleUpload(e.target.files[0]);
              }
            }}
          />
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-500 pt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// 2. COMPONENTE: MultiResourceUploadZone (PDFs, Excel, Documentos)
// ==============================================================================
interface MultiResourceUploadZoneProps {
  files: UploadedFileItem[];
  onChange: (files: UploadedFileItem[]) => void;
  folder?: string;
}

export const MultiResourceUploadZone: React.FC<MultiResourceUploadZoneProps> = ({
  files,
  onChange,
  folder = 'materials',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadSingleFile = async (file: File): Promise<UploadedFileItem> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || `Error al subir ${file.name}`);
    }

    return {
      name: file.name,
      url: data.url,
      size: file.size,
      type: file.type,
    };
  };

  const handleFiles = async (fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    const newUploaded: UploadedFileItem[] = [];
    const errors: string[] = [];

    for (const file of fileArray) {
      try {
        const item = await uploadSingleFile(file);
        newUploaded.push(item);
      } catch (err: any) {
        errors.push(err.message || `Error con ${file.name}`);
      }
    }

    if (newUploaded.length > 0) {
      onChange([...files, ...newUploaded]);
    }

    if (errors.length > 0) {
      setUploadError(errors.join('. '));
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (indexToRemove: number) => {
    onChange(files.filter((_, idx) => idx !== indexToRemove));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3">
      {/* Botón / Zona Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-agro-500 bg-agro-50/50 dark:bg-agro-950/20'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-agro-500 hover:bg-zinc-50 dark:hover:bg-zinc-950/60'
        } ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.ppt,.pptx,image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleFiles(e.target.files);
            }
          }}
        />

        {isUploading ? (
          <div className="flex flex-col items-center py-2">
            <Loader2 className="w-6 h-6 text-agro-500 animate-spin mb-1.5" />
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              Subiendo archivos a la nube...
            </span>
            <span className="text-[10px] text-zinc-400">Por favor espera un momento</span>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-agro-100 dark:bg-agro-900/40 text-agro-600 dark:text-agro-400 flex items-center justify-center mb-1.5">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              Subir Archivos, Planillas Excel, PDFs o Documentos
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Arrastra archivos aquí o haz clic para buscarlos en tu dispositivo (puedes elegir varios)
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                PDF
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                Excel (.xlsx, .csv)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
                Imágenes
              </span>
            </div>
          </>
        )}
      </div>

      {uploadError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Lista de Archivos Adjuntados */}
      {files.length > 0 && (
        <div className="space-y-2 mt-2">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-semibold px-1">
            <span>Archivos listos para el curso ({files.length}):</span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {files.map((item, idx) => {
              const badge = getFileTypeBadge(item.name || item.url, item.type);
              const IconComp = badge.icon;

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${badge.colorClass}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                        <span className="uppercase font-mono">{badge.label}</span>
                        {item.size ? (
                          <>
                            <span>•</span>
                            <span>{formatFileSize(item.size)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-agro-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Ver o descargar archivo"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Eliminar archivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// 3. COMPONENTE: YouTubeVideoInput (Exclusivo para URLs o IDs de YouTube)
// ==============================================================================
export function extractYouTubeId(urlOrId?: string | null): string | null {
  if (!urlOrId || !urlOrId.trim()) return null;
  const str = urlOrId.trim();

  // 1. Si ya es exactamente un ID de 11 caracteres alfanuméricos/guiones
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // 2. Regex que cubre todos los formatos de URLs de YouTube (watch, embed, shorts, live, youtu.be, m.youtube, youtube-nocookie)
  const match = str.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:(?:watch\/?\?(?:.*&)?v=)|(?:embed\/)|(?:v\/)|(?:shorts\/)|(?:live\/))|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (match && match[1]) {
    return match[1];
  }

  // 3. Fallback: extraer parámetro 'v' si existe
  try {
    const urlObj = new URL(str.startsWith('http') ? str : `https://${str}`);
    const vParam = urlObj.searchParams.get('v');
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
      return vParam;
    }
  } catch {}

  return null;
}

export interface YouTubeVideoInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
}

export const YouTubeVideoInput: React.FC<YouTubeVideoInputProps> = ({
  value,
  onChange,
  placeholder = 'https://www.youtube.com/watch?v=... o https://youtu.be/...',
  label = 'Enlace de Video de YouTube',
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const ytId = extractYouTubeId(value);
  const hasValue = Boolean(value && value.trim());
  const isValid = Boolean(ytId);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-semibold text-zinc-700 dark:text-zinc-300 block text-xs flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
          <span>{label}</span>
        </label>
        {isValid && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-[11px] font-semibold text-agro-600 dark:text-agro-400 hover:underline flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              <span>{showPreview ? 'Ocultar vista previa' : 'Ver vista previa'}</span>
            </button>
            <a
              href={`https://www.youtube.com/watch?v=${ytId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-400 hover:text-red-500 flex items-center gap-0.5"
              title="Abrir en YouTube"
            >
              <ExternalLink className="w-3 h-3" />
              <span>YouTube</span>
            </a>
          </div>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pr-20 rounded-xl border bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-xs focus:outline-none focus:ring-2 ${
            hasValue && !isValid
              ? 'border-amber-400 dark:border-amber-500/50 focus:ring-amber-500'
              : isValid
              ? 'border-emerald-400 dark:border-emerald-500/50 focus:ring-emerald-500'
              : 'border-zinc-200 dark:border-zinc-700 focus:ring-agro-500'
          }`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {hasValue && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 text-zinc-400 hover:text-rose-500 transition-colors"
              title="Borrar enlace"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {isValid && (
            <span title="Video de YouTube identificado">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </span>
          )}
        </div>
      </div>

      {hasValue && !isValid && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900/50">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>No pudimos detectar el ID de YouTube. Pega una URL completa (ej: https://www.youtube.com/watch?v=... o https://youtu.be/...)</span>
        </div>
      )}

      {/* Miniatura / Vista previa interactiva si el ID es válido */}
      {isValid && (
        <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 p-2.5 space-y-2">
          {showPreview ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`}
                title="Vista previa de YouTube"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div 
                onClick={() => setShowPreview(true)}
                className="relative w-28 h-16 rounded-lg overflow-hidden bg-zinc-900 shrink-0 cursor-pointer group border border-zinc-800"
              >
                <img
                  src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                  alt="Miniatura del video"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Video de YouTube vinculado</span>
                </div>
                <p className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
                  ID: {ytId}
                </p>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="text-[11px] text-agro-600 dark:text-agro-400 hover:underline font-semibold mt-1 inline-flex items-center gap-1"
                >
                  <Play className="w-3 h-3" />
                  Probar reproducción aquí
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-zinc-400">
        Compatible con enlaces públicos y No Listados de YouTube (watch, share, shorts o ID de 11 caracteres).
      </p>
    </div>
  );
};

// Alias para retrocompatibilidad
export const VideoUploadZone = YouTubeVideoInput;


