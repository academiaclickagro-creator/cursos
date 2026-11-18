'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  CornerDownRight, 
  GraduationCap, 
  User, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

export interface CommentItem {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  parent_id?: string | null;
  created_at: string;
  profiles?: {
    full_name?: string;
    avatar_url?: string;
    role?: string;
  };
  replies?: CommentItem[];
}

interface LessonCommentsProps {
  lessonId: string;
  initialComments?: CommentItem[];
  currentUser?: {
    id: string;
    full_name?: string;
    role?: string;
  } | null;
}

export const LessonComments: React.FC<LessonCommentsProps> = ({
  lessonId,
  initialComments = [],
  currentUser,
}) => {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);

  // Enviar pregunta principal
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        lesson_id: lessonId,
        user_id: currentUser?.id,
        content: newCommentText.trim(),
        parent_id: null,
      };

      // Inserción en tabla comments
      const { data, error } = await supabaseBrowser
        .from('comments')
        .insert(payload)
        .select('*, profiles(full_name, avatar_url, role)')
        .single();

      if (error) {
        // Fallback optimista si las claves foráneas en cliente están en sesión
        console.error('Error al insertar comentario:', error);
      }

      const addedComment: CommentItem = data || {
        id: crypto.randomUUID(),
        lesson_id: lessonId,
        user_id: currentUser?.id || 'anon',
        content: newCommentText.trim(),
        created_at: new Date().toISOString(),
        profiles: {
          full_name: currentUser?.full_name || 'Tú',
          role: currentUser?.role || 'student',
        },
        replies: [],
      };

      setComments((prev) => [addedComment, ...prev]);
      setNewCommentText('');
      setAlertSuccess(true);
      setTimeout(() => setAlertSuccess(false), 4000);

      // Notificar al docente en segundo plano
      try {
        fetch('/api/notifications/question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lesson_id: lessonId,
            question: newCommentText.trim(),
            user_name: currentUser?.full_name || 'Alumno',
          }),
        }).catch(() => {});
      } catch {}
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enviar respuesta a un hilo (docente o alumno)
  const handlePostReply = async (parentId: string) => {
    if (!replyText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload = {
        lesson_id: lessonId,
        user_id: currentUser?.id,
        content: replyText.trim(),
        parent_id: parentId,
      };

      const { data } = await supabaseBrowser
        .from('comments')
        .insert(payload)
        .select('*, profiles(full_name, avatar_url, role)')
        .single();

      const newReply: CommentItem = data || {
        id: crypto.randomUUID(),
        lesson_id: lessonId,
        user_id: currentUser?.id || 'anon',
        content: replyText.trim(),
        parent_id: parentId,
        created_at: new Date().toISOString(),
        profiles: {
          full_name: currentUser?.full_name || 'Tú',
          role: currentUser?.role || 'teacher',
        },
      };

      setComments((prev) =>
        prev.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), newReply],
            };
          }
          return c;
        })
      );

      setReplyText('');
      setReplyToId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-sm my-6">
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-agro-100 dark:bg-agro-900/40 flex items-center justify-center text-agro-600 dark:text-agro-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Preguntas y Dudas de la Clase
            </h3>
            <p className="text-xs text-zinc-500">
              El equipo docente y la comunidad académica responden aquí
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
          {comments.length} consultas
        </span>
      </div>

      {/* Formulario para publicar nueva pregunta */}
      <form onSubmit={handlePostComment} className="mb-8">
        <div className="relative">
          <textarea
            rows={3}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="¿Tienes alguna duda sobre los conceptos o herramientas vistas en esta clase? Escríbela aquí..."
            className="w-full px-4 py-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-agro-500 focus:border-transparent transition-all resize-none"
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-zinc-400">
            Tu pregunta será notificada directamente al instructor a cargo.
          </span>
          <button
            type="submit"
            disabled={isSubmitting || !newCommentText.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-agro-500/25"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Enviando...' : 'Publicar Pregunta'}</span>
          </button>
        </div>

        {alertSuccess && (
          <div className="flex items-center gap-2 mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>¡Pregunta enviada! El equipo docente responderá a la brevedad.</span>
          </div>
        )}
      </form>

      {/* Lista de comentarios y respuestas */}
      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <p className="text-sm text-zinc-500">
              Aún no hay dudas en esta lección. ¡Sé el primero en consultar!
            </p>
          </div>
        ) : (
          comments.map((item) => {
            const isTeacher = item.profiles?.role === 'teacher' || item.profiles?.role === 'admin';
            return (
              <div 
                key={item.id} 
                className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/70 bg-zinc-50/50 dark:bg-zinc-950/30 space-y-3"
              >
                {/* Cabecera del comentario */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      isTeacher 
                        ? 'bg-agro-500 text-white shadow-sm' 
                        : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                    }`}>
                      {item.profiles?.full_name?.charAt(0) || <User className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {item.profiles?.full_name || 'Alumno de Click Agro'}
                        </span>
                        {isTeacher && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-agro-500/15 text-agro-600 dark:text-agro-400 border border-agro-500/30">
                            <GraduationCap className="w-3 h-3" />
                            Docente Click Agro
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.created_at).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setReplyToId(replyToId === item.id ? null : item.id)}
                    className="text-xs font-semibold text-zinc-500 hover:text-agro-600 dark:hover:text-agro-400 transition-colors"
                  >
                    Responder
                  </button>
                </div>

                {/* Cuerpo del comentario */}
                <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed pl-10">
                  {item.content}
                </p>

                {/* Respuestas anidadas */}
                {item.replies && item.replies.length > 0 && (
                  <div className="pl-6 sm:pl-10 space-y-3 pt-2">
                    {item.replies.map((reply) => {
                      const isReplyTeacher = reply.profiles?.role === 'teacher' || reply.profiles?.role === 'admin';
                      return (
                        <div
                          key={reply.id}
                          className={`p-3.5 rounded-xl border ${
                            isReplyTeacher
                              ? 'bg-agro-50/40 dark:bg-agro-950/20 border-agro-500/25'
                              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <CornerDownRight className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                              {reply.profiles?.full_name || 'Usuario'}
                            </span>
                            {isReplyTeacher && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-agro-500 text-white">
                                Instructor
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-400 ml-auto">
                              {new Date(reply.created_at).toLocaleDateString('es-AR', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-2 pl-5">
                            {reply.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Caja para escribir respuesta */}
                {replyToId === item.id && (
                  <div className="pl-6 sm:pl-10 pt-2 animate-in fade-in">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Escribe tu respuesta..."
                        className="flex-1 px-3 py-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-agro-500"
                      />
                      <button
                        onClick={() => handlePostReply(item.id)}
                        disabled={!replyText.trim() || isSubmitting}
                        className="px-4 py-2 bg-agro-500 hover:bg-agro-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
