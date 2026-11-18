'use client';

import React, { useState } from 'react';
import { ShieldCheck, Video, Play, AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  youtubeId?: string | null;
  videoUrl?: string | null;
  title: string;
}

/**
 * Extrae el ID de 11 caracteres de cualquier URL o ID de YouTube
 */
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

/**
 * Analiza la fuente del video y determina si es YouTube o archivo directo residual
 */
export function parseVideoSource(src?: string | null) {
  if (!src || !src.trim()) return { type: 'none' as const, url: '' };

  const trimmed = src.trim();

  // 1. Detección prioritaria de YouTube
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return { type: 'youtube' as const, id: ytId };
  }

  // 2. Archivo directo legacy (.mp4, .webm, storage de supabase, etc.)
  if (
    trimmed.endsWith('.mp4') ||
    trimmed.endsWith('.webm') ||
    trimmed.endsWith('.mov') ||
    trimmed.includes('/storage/v1/object/public/') ||
    (trimmed.startsWith('http') && !trimmed.includes('youtube.com') && !trimmed.includes('youtu.be'))
  ) {
    return { type: 'direct' as const, url: trimmed };
  }

  return { type: 'youtube' as const, id: trimmed };
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ youtubeId, videoUrl, title }) => {
  // Tomar videoUrl o youtubeId como fuente
  const rawSource = videoUrl || youtubeId;
  const parsed = parseVideoSource(rawSource);

  // Parámetros seguros para YouTube Embedded Player
  const ytEmbedUrl = parsed.type === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${parsed.id}?controls=1&modestbranding=1&rel=0&disablekb=1&playsinline=1&iv_load_policy=3&enablejsapi=1`
    : '';

  // CASO 1: No hay video asignado
  if (parsed.type === 'none') {
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
        <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-agro-400 mb-3">
          <Video className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-zinc-200">
          Contenido Teórico y Material Práctico
        </h3>
        <p className="text-xs text-zinc-400 max-w-md mt-1">
          Esta lección no requiere video pregrabado. Puedes consultar los archivos descargables, lecturas y la sala en vivo adjuntos abajo.
        </p>
      </div>
    );
  }

  // CASO 2: Archivo de Video Directo (.MP4 / WebM / Supabase Storage)
  if (parsed.type === 'direct') {
    return (
      <div 
        className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-zinc-800 select-none group flex items-center justify-center"
        onContextMenu={(e) => {
          e.preventDefault();
          return false;
        }}
      >
        <video
          src={parsed.url}
          controls
          controlsList="nodownload"
          playsInline
          preload="metadata"
          className="w-full h-full object-contain bg-black"
          title={title}
        >
          Tu navegador no soporta la reproducción de video HTML5.
        </video>

        {/* Badge de seguridad para el alumno */}
        <div className="absolute top-3 left-3 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/85 backdrop-blur-md rounded-full text-[11px] font-medium text-agro-300 border border-agro-500/30">
          <ShieldCheck className="w-3.5 h-3.5 text-agro-400" />
          <span>Reproductor Seguro Click Agro • Video MP4</span>
        </div>
      </div>
    );
  }

  // CASO 3: Video de YouTube
  return (
    <div 
      className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950 shadow-2xl border border-zinc-800 select-none group"
      onContextMenu={(e) => {
        e.preventDefault();
        return false;
      }}
    >
      <iframe
        src={ytEmbedUrl}
        title={title}
        className="w-full h-full border-0 pointer-events-auto"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />

      {/* Capas de protección de zonas críticas (anti-leak) */}
      <div 
        className="absolute top-0 left-0 right-0 h-16 z-20 cursor-default bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        title="Contenido protegido por Academia Click Agro"
      />
      <div 
        className="absolute bottom-0 right-0 w-32 h-14 z-20 cursor-default bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      />
      <div 
        className="absolute top-0 right-0 w-44 h-20 z-20 cursor-default bg-transparent"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      />

      <div className="absolute top-3 left-3 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900/85 backdrop-blur-md rounded-full text-[11px] font-medium text-agro-300 border border-agro-500/30">
        <ShieldCheck className="w-3.5 h-3.5 text-agro-400" />
        <span>Reproductor Seguro Click Agro</span>
      </div>
    </div>
  );
};
