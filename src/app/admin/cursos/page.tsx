'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Layers, 
  Edit3, 
  Trash2, 
  Eye, 
  Video, 
  Calendar, 
  FileText, 
  Check, 
  X,
  UploadCloud,
  DollarSign,
  Loader2,
  FileCheck,
  ArrowUp,
  ArrowDown,
  ListPlus,
  Link2,
  Play
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { 
  ImageUploadZone, 
  MultiResourceUploadZone, 
  YouTubeVideoInput,
  UploadedFileItem 
} from '@/components/admin/FileUploadZone';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'courses' | 'combos'>('courses');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modales
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [showBulkUrlModal, setShowBulkUrlModal] = useState(false);
  const [bulkUrlsInput, setBulkUrlsInput] = useState('');

  // Interfaz de clases en video de YouTube
  interface CourseLessonInput {
    id?: string;
    title: string;
    video_url: string;
  }

  // Estado del Formulario de Curso
  const [courseForm, setCourseForm] = useState({
    id: '',
    title: '',
    slug: '',
    description: '',
    price: 0,
    image_url: '',
    is_published: false,
    lessons: [
      { id: '', title: '1. Introducción al Programa', video_url: '' }
    ] as CourseLessonInput[],
  });

  // Funciones para manipular clases en video de YouTube
  const handleAddLesson = () => {
    setCourseForm((prev) => ({
      ...prev,
      lessons: [
        ...prev.lessons,
        {
          id: '',
          title: `${prev.lessons.length + 1}. Clase ${prev.lessons.length + 1}`,
          video_url: '',
        },
      ],
    }));
  };

  const handleRemoveLesson = (indexToRemove: number) => {
    if (courseForm.lessons.length <= 1) return;
    setCourseForm((prev) => ({
      ...prev,
      lessons: prev.lessons.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleUpdateLesson = (index: number, field: 'title' | 'video_url', val: string) => {
    setCourseForm((prev) => {
      const updated = [...prev.lessons];
      updated[index] = { ...updated[index], [field]: val };
      return { ...prev, lessons: updated };
    });
  };

  const handleMoveLesson = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= courseForm.lessons.length) return;
    setCourseForm((prev) => {
      const updated = [...prev.lessons];
      const temp = updated[index];
      updated[index] = updated[newIndex];
      updated[newIndex] = temp;
      return { ...prev, lessons: updated };
    });
  };

  const handleApplyBulkUrls = () => {
    const lines = bulkUrlsInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => Boolean(l));

    if (lines.length === 0) return;

    setCourseForm((prev) => {
      // Si la primera lección existente no tiene URL y solo había una lección, la reemplazamos
      const isInitialEmpty =
        prev.lessons.length === 1 &&
        !prev.lessons[0].video_url.trim() &&
        (!prev.lessons[0].id || prev.lessons[0].id === '');

      const baseList = isInitialEmpty ? [] : [...prev.lessons];

      const newLessons: CourseLessonInput[] = lines.map((url, idx) => ({
        id: '',
        title: `${baseList.length + idx + 1}. Clase ${baseList.length + idx + 1}`,
        video_url: url,
      }));

      return {
        ...prev,
        lessons: [...baseList, ...newLessons],
      };
    });

    setBulkUrlsInput('');
    setShowBulkUrlModal(false);
  };

  // Lista de archivos adjuntos (PDFs, Excel, etc.)
  const [courseResources, setCourseResources] = useState<UploadedFileItem[]>([]);

  // Estado del Formulario de Combo
  const [comboForm, setComboForm] = useState({
    title: '',
    slug: '',
    description: '',
    price: 0,
    image_url: '',
    is_published: true,
    selectedCourseIds: [] as string[],
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const coursesRes = await fetch('/api/admin/courses');
      const coursesJson = await coursesRes.json();
      const coursesData = coursesJson?.courses || [];

      const { data: combosData } = await supabaseBrowser
        .from('combos')
        .select('*, combo_courses(course_id, courses(id, title))')
        .order('created_at', { ascending: false });

      setCourses(coursesData || []);
      setCombos(combosData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Abrir modal de creación limpia
  const handleOpenNewCourse = () => {
    setCourseResources([]);
    setCourseForm({
      id: '',
      title: '',
      slug: '',
      description: '',
      price: 25000,
      image_url: '',
      is_published: true,
      lessons: [
        { id: '', title: '1. Introducción al Programa', video_url: '' },
      ],
    });
    setIsCourseModalOpen(true);
  };

  // Abrir modal de edición con carga de lecciones y recursos asociados vía API segura
  const handleOpenEditCourse = async (course: any) => {
    setCourseForm({
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description || '',
      price: course.price,
      image_url: course.cover_image || course.image_url || '',
      is_published: course.is_published,
      lessons: [
        { id: '', title: '1. Introducción al Programa', video_url: '' },
      ],
    });
    setCourseResources([]);
    setIsCourseModalOpen(true);

    try {
      const editRes = await fetch(`/api/admin/courses?id=${course.id}`);
      const editJson = await editRes.json();

      if (editJson?.lessons && Array.isArray(editJson.lessons) && editJson.lessons.length > 0) {
        setCourseForm((prev) => ({
          ...prev,
          lessons: editJson.lessons.map((l: any, idx: number) => ({
            id: l.id || '',
            title: l.title || `Clase ${idx + 1}`,
            video_url: l.youtube_video_id || '',
          })),
        }));
      } else if (editJson?.lesson) {
        const l = editJson.lesson;
        setCourseForm((prev) => ({
          ...prev,
          lessons: [
            {
              id: l.id || '',
              title: l.title || '1. Introducción al Programa',
              video_url: l.youtube_video_id || '',
            },
          ],
        }));
      }

      if (editJson?.resources && Array.isArray(editJson.resources)) {
        setCourseResources(
          editJson.resources.map((r: any) => ({
            id: r.id,
            name: r.name || r.title,
            url: r.url || r.file_url,
          }))
        );
      }
    } catch (err) {
      console.error('Error al precargar lecciones y recursos:', err);
    }
  };

  // Guardar Curso (Crear o Editar) vía API del servidor
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...courseForm,
          resources: courseResources,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar curso');
      }

      setIsCourseModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Error al guardar curso: ${err?.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Guardar Combo de Cursos vía API del servidor
  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comboForm.selectedCourseIds.length < 2) {
      alert('Un combo debe incluir al menos 2 cursos.');
      return;
    }

    try {
      const res = await fetch('/api/admin/combos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comboForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear combo');
      }

      setIsComboModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(`Error al crear combo: ${err?.message || err}`);
    }
  };

  // Alternar publicación rápida vía API
  const togglePublishCourse = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_published: !currentStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_published: !currentStatus } : c))
      );
    } catch (err: any) {
      alert(`Error al cambiar estado de publicación: ${err.message || err}`);
    }
  };

  // Eliminar curso vía API
  const handleDeleteCourse = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este curso? Se borrarán sus lecciones y archivos asociados.')) return;
    try {
      const res = await fetch(`/api/admin/courses?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(`Error al eliminar curso: ${err.message || err}`);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* 1. Header con Pestañas y Botones de Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
            Gestor de Cursos, Combos y Lecciones
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Administra los programas académicos, clases en video (YouTube o subidas directas) y materiales descargables (PDFs, Excel, imágenes).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenNewCourse}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Curso</span>
          </button>

          <button
            onClick={() => {
              setComboForm({
                title: '',
                slug: '',
                description: '',
                price: 45000,
                image_url: '',
                is_published: true,
                selectedCourseIds: [],
              });
              setIsComboModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs sm:text-sm shadow-sm transition-all"
          >
            <Layers className="w-4 h-4 text-agro-400" />
            <span>Crear Combo</span>
          </button>
        </div>
      </div>

      {/* 2. Pestañas de Vista */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'courses'
              ? 'bg-agro-500 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          Cursos Individuales ({courses.length})
        </button>
        <button
          onClick={() => setActiveTab('combos')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'combos'
              ? 'bg-agro-500 text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
        >
          Paquetes / Combos ({combos.length})
        </button>
      </div>

      {/* 3. Contenido de Cursos */}
      {activeTab === 'courses' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 overflow-hidden shadow-sm flex flex-col justify-between group hover:border-agro-500/40 transition-colors"
            >
              {course.cover_image && (
                <div className="relative w-full h-44 bg-zinc-950 border-b border-zinc-100 dark:border-zinc-700/60 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={course.cover_image}
                    alt={course.title}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      course.is_published 
                        ? 'bg-agro-100 text-agro-700 dark:bg-agro-900/40 dark:text-agro-300' 
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'
                    }`}>
                      {course.is_published ? 'Publicado' : 'Borrador'}
                    </span>
                    <span className="text-sm font-black text-agro-600 dark:text-agro-400">
                      ${Number(course.price).toLocaleString('es-AR')} ARS
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-900 dark:text-white line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                    {course.description || 'Sin descripción'}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-2 font-mono">
                    slug: /{course.slug}
                  </p>
                </div>

                {/* Botonera de Gestión */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-700/50">
                  <button
                    onClick={() => togglePublishCourse(course.id, course.is_published)}
                    className="text-xs font-semibold text-zinc-500 hover:text-agro-600 dark:hover:text-agro-400"
                  >
                    {course.is_published ? 'Ocultar' : 'Publicar'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEditCourse(course)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      title="Editar curso y materiales"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Eliminar curso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Vista de Combos */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 overflow-hidden shadow-sm"
            >
              {combo.cover_image && (
                <div className="relative w-full h-44 bg-zinc-950 border-b border-zinc-100 dark:border-zinc-700/60 overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={combo.cover_image}
                    alt={combo.title}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}

              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    Combo Pack
                  </span>
                  <span className="text-sm font-black text-agro-600 dark:text-agro-400">
                    ${Number(combo.price).toLocaleString('es-AR')} ARS
                  </span>
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {combo.title}
                </h3>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                  {combo.description}
                </p>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-700/50">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase">
                    Cursos que incluye:
                  </span>
                  <ul className="mt-1 space-y-1">
                    {(combo.combo_courses || []).map((cc: any, idx: number) => (
                      <li key={idx} className="text-xs text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-agro-500" />
                        <span>{cc.courses?.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CREAR / EDITAR CURSO                                                */}
      {/* ========================================================================= */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCourseModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              {courseForm.id ? 'Editar Curso' : 'Nuevo Curso en Academia Click Agro'}
            </h2>

            <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
              {/* Título y Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Título del Curso *
                  </label>
                  <input
                    type="text"
                    required
                    value={courseForm.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setCourseForm({
                        ...courseForm,
                        title: newTitle,
                        slug: courseForm.id 
                          ? courseForm.slug 
                          : newTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
                      });
                    }}
                    placeholder="Ej: Pulverización de Precisión con Drones"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-agro-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Slug URL (Único) *
                  </label>
                  <input
                    type="text"
                    required
                    value={courseForm.slug}
                    onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 font-mono text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Precio y Portada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Precio Oficial (ARS) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={courseForm.price}
                    onChange={(e) => setCourseForm({ ...courseForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Subida de Imagen de Portada desde dispositivo */}
                <ImageUploadZone
                  label="Imagen de Portada del Curso"
                  value={courseForm.image_url}
                  onChange={(url) => setCourseForm({ ...courseForm, image_url: url })}
                  folder="covers"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Descripción General
                </label>
                <textarea
                  rows={2}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Detalles y objetivos del programa formativo..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {/* Sección Contenido de Clases en Video (Múltiples clases de YouTube) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base">
                        Clases y Videos en YouTube del Curso
                      </h4>
                      <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-full">
                        {courseForm.lessons.length} {courseForm.lessons.length === 1 ? 'clase' : 'clases'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Las clases en video se reproducen desde YouTube (público o no listado). Puedes agregar tantas URLs de video como desees para este curso.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => setShowBulkUrlModal(!showBulkUrlModal)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition-colors"
                      title="Pegar varios enlaces de YouTube juntos"
                    >
                      <ListPlus className="w-3.5 h-3.5 text-red-600" />
                      <span>{showBulkUrlModal ? 'Cerrar lote' : 'Pegar varias URLs'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLesson}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-xs shadow-xs transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Clase</span>
                    </button>
                  </div>
                </div>

                {/* Importador Rápido por Lote de URLs de YouTube */}
                {showBulkUrlModal && (
                  <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Link2 className="w-4 h-4 text-red-600" />
                        Importar múltiples URLs de YouTube a la vez
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowBulkUrlModal(false)}
                        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Pega aquí los enlaces de YouTube (uno por cada renglón). Se crearán automáticamente las clases correspondientes.
                    </p>
                    <textarea
                      rows={4}
                      value={bulkUrlsInput}
                      onChange={(e) => setBulkUrlsInput(e.target.value)}
                      placeholder={`https://www.youtube.com/watch?v=VIDEO_1\nhttps://www.youtube.com/watch?v=VIDEO_2\nhttps://youtu.be/VIDEO_3`}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBulkUrlsInput('');
                          setShowBulkUrlModal(false);
                        }}
                        className="px-3 py-1 text-xs rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={!bulkUrlsInput.trim()}
                        onClick={handleApplyBulkUrls}
                        className="px-3.5 py-1 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors"
                      >
                        Agregar estos videos al curso
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de Clases configuradas */}
                <div className="space-y-4">
                  {courseForm.lessons.map((lesson, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                            Clase #{idx + 1}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            de {courseForm.lessons.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Reordenar posición */}
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveLesson(idx, 'up')}
                              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Mover arriba"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < courseForm.lessons.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveLesson(idx, 'down')}
                              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Mover abajo"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {courseForm.lessons.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLesson(idx)}
                              className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-semibold p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-1"
                              title="Eliminar esta clase"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Quitar</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                          Título de la Clase
                        </label>
                        <input
                          type="text"
                          value={lesson.title}
                          onChange={(e) => handleUpdateLesson(idx, 'title', e.target.value)}
                          placeholder={`Ej: ${idx + 1}. Introducción y Conceptos`}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-agro-500"
                        />
                      </div>

                      <div>
                        <YouTubeVideoInput
                          value={lesson.video_url}
                          onChange={(val) => handleUpdateLesson(idx, 'video_url', val)}
                          label={`Video de YouTube de la Clase #${idx + 1}`}
                          placeholder="https://www.youtube.com/watch?v=... o https://youtu.be/..."
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-[11px] text-zinc-400">
                    Puedes agregar tantas clases en video de YouTube como necesites.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkUrlModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition-colors"
                    >
                      <ListPlus className="w-3.5 h-3.5 text-red-600" />
                      <span>Importar lote de URLs</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLesson}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-agro-500/40 text-agro-600 dark:text-agro-400 hover:bg-agro-50 dark:hover:bg-agro-950/30 font-bold text-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar otra clase en video</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Zona de Subida de Archivos desde el Dispositivo (PDFs, Excel, etc.) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <label className="font-bold text-zinc-800 dark:text-zinc-200 block text-xs sm:text-sm flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-agro-500" />
                  Materiales y Archivos Adjuntos del Curso (Subir desde dispositivo)
                </label>
                <MultiResourceUploadZone
                  files={courseResources}
                  onChange={setCourseResources}
                  folder="materials"
                />
              </div>

              {/* Publicación */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="publishedCheck"
                  checked={courseForm.is_published}
                  onChange={(e) => setCourseForm({ ...courseForm, is_published: e.target.checked })}
                  className="rounded text-agro-600 focus:ring-agro-500"
                />
                <label htmlFor="publishedCheck" className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Publicar en catálogo inmediatamente
                </label>
              </div>

              {/* Botonera de Guardado */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold disabled:opacity-50 transition-all shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando Curso...</span>
                    </>
                  ) : (
                    <span>Guardar Curso</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CREADOR DE COMBOS                                                   */}
      {/* ========================================================================= */}
      {isComboModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-2xl my-8">
            <button
              onClick={() => setIsComboModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              Crear Paquete Especial (Combo de Cursos)
            </h2>

            <form onSubmit={handleSaveCombo} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Título del Combo *
                </label>
                <input
                  type="text"
                  required
                  value={comboForm.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    setComboForm({
                      ...comboForm,
                      title: val,
                      slug: val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
                    });
                  }}
                  placeholder="Ej: Diplomatura Integral en Agricultura de Precisión"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Precio Total del Paquete (ARS) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={comboForm.price}
                    onChange={(e) => setComboForm({ ...comboForm, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                {/* Subida de Imagen para Combo */}
                <ImageUploadZone
                  label="Portada del Combo (Opcional)"
                  value={comboForm.image_url}
                  onChange={(url) => setComboForm({ ...comboForm, image_url: url })}
                  folder="combos"
                />
              </div>

              {/* Selección Múltiple de Cursos */}
              <div>
                <label className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Selecciona los Cursos Incluidos (Mínimo 2):
                </label>
                <div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                  {courses.map((c) => {
                    const isChecked = comboForm.selectedCourseIds.includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setComboForm({
                              ...comboForm,
                              selectedCourseIds: isChecked
                                ? comboForm.selectedCourseIds.filter((id) => id !== c.id)
                                : [...comboForm.selectedCourseIds, c.id],
                            });
                          }}
                          className="rounded text-agro-600 focus:ring-agro-500"
                        />
                        <span className="text-zinc-800 dark:text-zinc-200">{c.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsComboModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold"
                >
                  Publicar Combo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
