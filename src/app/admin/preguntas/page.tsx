'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  CornerDownRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const { data: authData } = await supabaseBrowser.auth.getUser();
      setCurrentUser(authData?.user);

      // Traer todos los comentarios principales (parent_id IS NULL)
      const { data: commentsData } = await supabaseBrowser
        .from('comments')
        .select(`
          id, content, created_at, user_id, lesson_id,
          profiles(id, full_name, email, role),
          lessons(id, title, course_id, courses(id, title))
        `)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      // Traer respuestas asociadas
      const { data: repliesData } = await supabaseBrowser
        .from('comments')
        .select('id, parent_id, content, created_at, profiles(full_name, role)')
        .not('parent_id', 'is', null);

      const questionsWithReplies = (commentsData || []).map((q: any) => ({
        ...q,
        replies: (repliesData || []).filter((r: any) => r.parent_id === q.id),
      }));

      setQuestions(questionsWithReplies);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  // Enviar respuesta oficial del profesor/admin
  const handleSendReply = async (questionId: string, lessonId: string) => {
    const text = replyTextMap[questionId];
    if (!text || !text.trim() || isSubmitting) return;

    setIsSubmitting(questionId);
    try {
      const { data: authData } = await supabaseBrowser.auth.getUser();
      const userId = authData?.user?.id || currentUser?.id;

      const { data: newReply, error } = await supabaseBrowser
        .from('comments')
        .insert({
          lesson_id: lessonId,
          user_id: userId,
          content: text.trim(),
          parent_id: questionId,
        })
        .select('id, parent_id, content, created_at, profiles(full_name, role)')
        .single();

      if (error) throw error;

      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id === questionId) {
            return {
              ...q,
              replies: [...(q.replies || []), newReply || {
                id: crypto.randomUUID(),
                content: text.trim(),
                created_at: new Date().toISOString(),
                profiles: { full_name: 'Equipo Docente Click Agro', role: 'teacher' }
              }],
            };
          }
          return q;
        })
      );

      setReplyTextMap((prev) => ({ ...prev, [questionId]: '' }));
    } catch (err: any) {
      alert(`Error al enviar respuesta: ${err?.message || err}`);
    } finally {
      setIsSubmitting(null);
    }
  };

  // Moderar / Eliminar comentario
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('¿Eliminar este comentario del foro?')) return;
    try {
      await supabaseBrowser.from('comments').delete().eq('id', commentId);
      setQuestions((prev) => prev.filter((q) => q.id !== commentId));
    } catch (err: any) {
      alert(`Error al eliminar: ${err?.message || err}`);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* 1. Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
          Centro de Moderación y Dudas de Alumnos
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          Supervisa las preguntas generadas en cada lección y responde directamente con tu perfil de docente.
        </p>
      </div>

      {/* 2. Lista de Preguntas */}
      <div className="space-y-6">
        {questions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-agro-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
              ¡Al día con las consultas!
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              No hay preguntas pendientes o sin moderar en las lecciones de Academia Click Agro.
            </p>
          </div>
        ) : (
          questions.map((q) => {
            const hasReplies = q.replies && q.replies.length > 0;
            const courseTitle = q.lessons?.courses?.title || 'Curso';
            const lessonTitle = q.lessons?.title || 'Lección';

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 p-5 sm:p-6 shadow-sm space-y-4"
              >
                {/* Metadatos del curso y lección */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-700/60 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-agro-600 dark:text-agro-400 uppercase tracking-wide">
                      {courseTitle}
                    </span>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      🎬 {lessonTitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      hasReplies
                        ? 'bg-agro-100 text-agro-700 dark:bg-agro-900/40 dark:text-agro-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {hasReplies ? 'Respondida' : 'Pendiente'}
                    </span>
                    <button
                      onClick={() => handleDeleteComment(q.id)}
                      className="p-1 text-zinc-400 hover:text-red-500 rounded"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Pregunta del Alumno */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-[10px]">
                      {q.profiles?.full_name?.charAt(0) || 'A'}
                    </div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {q.profiles?.full_name || q.profiles?.email || 'Alumno'}
                    </span>
                    <span className="text-[11px] text-zinc-400 ml-auto flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(q.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 pl-8 leading-relaxed">
                    {q.content}
                  </p>
                </div>

                {/* Respuestas anteriores en el hilo */}
                {hasReplies && (
                  <div className="pl-8 space-y-2 pt-1">
                    {q.replies.map((r: any) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-xl bg-agro-50/50 dark:bg-agro-950/20 border border-agro-500/20 text-xs"
                      >
                        <div className="flex items-center gap-1.5 mb-1 font-bold text-zinc-900 dark:text-zinc-100">
                          <CornerDownRight className="w-3.5 h-3.5 text-agro-500" />
                          <span>{r.profiles?.full_name || 'Profesor'}</span>
                          <span className="text-[10px] bg-agro-500 text-white px-1.5 py-0.2 rounded font-semibold">
                            Docente
                          </span>
                        </div>
                        <p className="pl-5 text-zinc-700 dark:text-zinc-300">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Caja de respuesta docente */}
                <div className="pt-2 flex gap-2">
                  <input
                    type="text"
                    value={replyTextMap[q.id] || ''}
                    onChange={(e) =>
                      setReplyTextMap({ ...replyTextMap, [q.id]: e.target.value })
                    }
                    placeholder="Escribe la respuesta del equipo docente..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-agro-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSendReply(q.id, q.lesson_id);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleSendReply(q.id, q.lesson_id)}
                    disabled={isSubmitting === q.id || !replyTextMap[q.id]?.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-agro-500 hover:bg-agro-600 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting === q.id ? 'Publicando...' : 'Responder'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
