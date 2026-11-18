'use client';

import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  PlayCircle, 
  BookOpen, 
  Layers, 
  ChevronRight, 
  Trophy,
  Download,
  Paperclip,
  Search,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Video,
  Presentation,
  FolderArchive,
  Image as ImageIcon,
  MapPin,
  FileCheck,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { detectFileType, FileTypeInfo } from '@/lib/fileFormatUtils';

export interface LessonItem {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  video_youtube_id: string;
  zoom_link?: string | null;
  zoom_date?: string | null;
  attachment_urls?: any;
  order_index: number;
  completed?: boolean;
}

interface CourseCurriculumProps {
  courseTitle: string;
  lessons: LessonItem[];
  currentLessonId: string;
  onSelectLesson: (lessonId: string) => void;
  progressPercentage: number;
  completedCount: number;
}

interface ExtractedMaterial {
  id: string;
  lessonId: string;
  lessonTitle: string;
  lessonIndex: number;
  name: string;
  url: string;
  fileInfo: FileTypeInfo;
}

export const CourseCurriculum: React.FC<CourseCurriculumProps> = ({
  courseTitle,
  lessons,
  currentLessonId,
  onSelectLesson,
  progressPercentage,
  completedCount,
}) => {
  const [activeTab, setActiveTab] = useState<'lessons' | 'materials'>('lessons');
  const [materialSearch, setMaterialSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedLessonMaterials, setExpandedLessonMaterials] = useState<Record<string, boolean>>({});

  // Recopilar y clasificar la totalidad de materiales de todas las lecciones del curso
  const allMaterials = useMemo<ExtractedMaterial[]>(() => {
    const list: ExtractedMaterial[] = [];

    lessons.forEach((lesson, lIdx) => {
      const rawAtts = lesson.attachment_urls;
      if (!rawAtts) return;

      const attsArray = Array.isArray(rawAtts) ? rawAtts : [];
      attsArray.forEach((att, aIdx) => {
        const rawUrl = typeof att === 'string' ? att : att.url;
        if (!rawUrl) return;

        let rawName = typeof att === 'string'
          ? (att.split('/').pop()?.split('?')[0] || `Material_${aIdx + 1}`)
          : (att.name || `Material_${aIdx + 1}`);

        const name = decodeURIComponent(rawName);
        const fileInfo = detectFileType(name);

        list.push({
          id: `${lesson.id}-${aIdx}`,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonIndex: lIdx + 1,
          name,
          url: rawUrl,
          fileInfo,
        });
      });
    });

    return list;
  }, [lessons]);

  // Filtrado de materiales según búsqueda y categoría
  const filteredMaterials = useMemo(() => {
    return allMaterials.filter((item) => {
      const matchesSearch = 
        item.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
        item.lessonTitle.toLowerCase().includes(materialSearch.toLowerCase()) ||
        item.fileInfo.extension.toLowerCase().includes(materialSearch.toLowerCase());

      const matchesCategory = 
        categoryFilter === 'all' || item.fileInfo.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [allMaterials, materialSearch, categoryFilter]);

  const toggleLessonMaterials = (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedLessonMaterials((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  const renderIcon = (category: string, className = "w-4 h-4") => {
    switch (category) {
      case 'excel':
        return <FileSpreadsheet className={`${className} text-emerald-500`} />;
      case 'pdf':
        return <FileText className={`${className} text-red-500`} />;
      case 'video':
        return <Video className={`${className} text-purple-500`} />;
      case 'presentation':
        return <Presentation className={`${className} text-amber-500`} />;
      case 'archive':
        return <FolderArchive className={`${className} text-orange-500`} />;
      case 'image':
        return <ImageIcon className={`${className} text-cyan-500`} />;
      case 'geo':
        return <MapPin className={`${className} text-teal-500`} />;
      default:
        return <FileCheck className={`${className} text-zinc-500`} />;
    }
  };

  return (
    <aside className="w-full h-full flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Cabecera del Contenido del Programa */}
      <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60">
        <div className="flex items-center gap-2 text-xs font-bold text-agro-600 dark:text-agro-400 uppercase tracking-wider mb-1">
          <Layers className="w-4 h-4" />
          <span>Contenido del Programa</span>
        </div>
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
          {courseTitle}
        </h2>

        {/* Barra de Progreso General */}
        <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800/80">
          <div className="flex items-center justify-between text-xs mb-1 font-medium">
            <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Progreso
            </span>
            <span className="text-agro-600 dark:text-agro-400 font-bold">
              {progressPercentage}%
            </span>
          </div>

          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-agro-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
            <span>{completedCount} de {lessons.length} clases</span>
            <span>{allMaterials.length} recursos disponibles</span>
          </div>
        </div>

        {/* PESTAÑAS: Clases vs Todo el Material */}
        <div className="grid grid-cols-2 gap-1.5 p-1 mt-3 bg-zinc-200/60 dark:bg-zinc-800/80 rounded-xl">
          <button
            onClick={() => setActiveTab('lessons')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'lessons'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Clases ({lessons.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('materials')}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'materials'
                ? 'bg-white dark:bg-zinc-900 text-agro-600 dark:text-agro-400 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Materiales ({allMaterials.length})</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO DE LA PESTAÑA 1: LISTADO DE CLASES */}
      {activeTab === 'lessons' && (
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {lessons.map((lesson, idx) => {
            const isActive = lesson.id === currentLessonId;
            const isCompleted = Boolean(lesson.completed);
            
            // Materiales de esta lección
            const lessonAtts = Array.isArray(lesson.attachment_urls) ? lesson.attachment_urls : [];
            const hasAttachments = lessonAtts.length > 0;
            const isExpanded = Boolean(expandedLessonMaterials[lesson.id]);

            return (
              <div
                key={lesson.id}
                className={`transition-colors ${
                  isActive
                    ? 'bg-agro-50/70 dark:bg-agro-950/30'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                }`}
              >
                <div
                  onClick={() => onSelectLesson(lesson.id)}
                  className="w-full text-left p-3.5 sm:p-4 flex items-start gap-3 cursor-pointer group relative"
                >
                  {/* Borde activo */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-agro-500 rounded-r" />
                  )}

                  {/* Estado completado / activo / pendiente */}
                  <div className="shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-agro-500 fill-agro-100 dark:fill-agro-950" />
                    ) : isActive ? (
                      <PlayCircle className="w-5 h-5 text-agro-600 animate-pulse" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400" />
                    )}
                  </div>

                  {/* Información de la Lección */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                        Clase {idx + 1}
                      </span>
                      {isCompleted && (
                        <span className="text-[10px] font-bold text-agro-700 dark:text-agro-400 bg-agro-100/80 dark:bg-agro-900/40 px-1.5 py-0.2 rounded">
                          Completada
                        </span>
                      )}
                    </div>

                    <p className={`text-xs sm:text-sm font-semibold truncate ${
                      isActive ? 'text-agro-900 dark:text-agro-200' : 'text-zinc-800 dark:text-zinc-200'
                    }`}>
                      {lesson.title}
                    </p>

                    {/* Insignias de contenido: Zoom y Materiales adjuntos */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {lesson.zoom_link && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-1.5 py-0.5 rounded font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-0.5" />
                          Zoom en vivo
                        </span>
                      )}

                      {hasAttachments && (
                        <button
                          type="button"
                          onClick={(e) => toggleLessonMaterials(lesson.id, e)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-agro-700 dark:text-agro-400 bg-agro-100/60 dark:bg-agro-900/30 hover:bg-agro-200/80 dark:hover:bg-agro-800/50 border border-agro-300/50 dark:border-agro-700/50 px-1.5 py-0.5 rounded transition-all"
                          title="Ver y descargar materiales de esta lección"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>{lessonAtts.length} {lessonAtts.length === 1 ? 'material' : 'materiales'}</span>
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3 rotate-180 transition-transform" />
                          ) : (
                            <ChevronDown className="w-3 h-3 transition-transform" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 text-zinc-300 group-hover:text-zinc-500 shrink-0 mt-1 transition-transform ${
                    isActive ? 'text-agro-600 rotate-90' : ''
                  }`} />
                </div>

                {/* Desplegable interactivo de materiales de la lección */}
                {hasAttachments && isExpanded && (
                  <div className="px-4 pb-3 pt-1 space-y-1.5 bg-zinc-100/60 dark:bg-zinc-950/50 border-t border-zinc-200/50 dark:border-zinc-800/50 animate-in fade-in duration-150">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Descargas disponibles:
                    </p>
                    {lessonAtts.map((att: any, aIdx: number) => {
                      const url = typeof att === 'string' ? att : att.url;
                      const rawName = typeof att === 'string'
                        ? (att.split('/').pop()?.split('?')[0] || `Material_${aIdx + 1}`)
                        : (att.name || `Material_${aIdx + 1}`);
                      const name = decodeURIComponent(rawName);
                      const fileInfo = detectFileType(name);

                      return (
                        <a
                          key={aIdx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-agro-500 hover:bg-agro-50/30 dark:hover:bg-agro-950/30 transition-all text-left group/item shadow-2xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <div className="shrink-0">
                              {renderIcon(fileInfo.category, "w-3.5 h-3.5")}
                            </div>
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate group-hover/item:text-agro-600 dark:group-hover/item:text-agro-400">
                              {name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-[9px] font-bold px-1 py-0.2 rounded border ${fileInfo.badgeBg}`}>
                              {fileInfo.extension}
                            </span>
                            <Download className="w-3.5 h-3.5 text-zinc-400 group-hover/item:text-agro-500" />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CONTENIDO DE LA PESTAÑA 2: BIBLIOTECA GLOBAL DE MATERIALES */}
      {activeTab === 'materials' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra de Búsqueda y Filtros */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 space-y-2 bg-zinc-50/50 dark:bg-zinc-950/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                placeholder="Buscar archivo por nombre o clase..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-agro-500"
              />
            </div>

            {/* Chips de filtro rápido */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'pdf', label: 'PDFs' },
                { id: 'excel', label: 'Excel' },
                { id: 'video', label: 'Videos' },
                { id: 'doc', label: 'Docs' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setCategoryFilter(f.id)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-all shrink-0 ${
                    categoryFilter === f.id
                      ? 'bg-agro-500 text-white shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listado consolidado de todos los recursos */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-zinc-100 dark:divide-zinc-800/40">
            {filteredMaterials.length === 0 ? (
              <div className="py-12 px-4 text-center text-zinc-400 space-y-2">
                <Paperclip className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {allMaterials.length === 0
                    ? 'No hay archivos adjuntos en este curso.'
                    : 'No se encontraron materiales con ese criterio de búsqueda.'}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {allMaterials.length === 0
                    ? 'El material de estudio estará disponible aquí a medida que el docente lo vincule.'
                    : 'Intenta limpiar el buscador o seleccionar otro filtro.'}
                </p>
              </div>
            ) : (
              filteredMaterials.map((item) => (
                <div
                  key={item.id}
                  className="pt-2 first:pt-0 group flex items-start justify-between gap-3 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-agro-500/50 bg-white dark:bg-zinc-900 hover:bg-agro-50/20 dark:hover:bg-agro-950/20 transition-all shadow-2xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${item.fileInfo.iconBg}`}>
                      {renderIcon(item.fileInfo.category, "w-4 h-4")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-agro-600 dark:hover:text-agro-400 transition-colors line-clamp-1 block"
                        title={item.name}
                      >
                        {item.name}
                      </a>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border uppercase ${item.fileInfo.badgeBg}`}>
                          {item.fileInfo.extension}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('lessons');
                            onSelectLesson(item.lessonId);
                          }}
                          className="text-[10px] text-zinc-500 hover:text-agro-600 dark:hover:text-agro-400 truncate flex items-center gap-1 transition-colors"
                          title={`Ir a la Clase ${item.lessonIndex}: ${item.lessonTitle}`}
                        >
                          <span>Clase {item.lessonIndex}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white bg-zinc-100 hover:bg-agro-500 dark:bg-zinc-800 dark:hover:bg-agro-600 transition-all shrink-0"
                    title={`Descargar ${item.name}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
