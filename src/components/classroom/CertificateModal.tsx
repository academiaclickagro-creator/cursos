'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Award, Download, CheckCircle, Sparkles, X } from 'lucide-react';
import jsPDF from 'jspdf';

interface CertificateModalProps {
  courseTitle: string;
  studentName: string;
  completionDate?: string;
  courseId: string;
  userId: string;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  courseTitle,
  studentName,
  completionDate = new Date().toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
  courseId,
  userId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDFCertificate = async () => {
    setIsGenerating(true);
    try {
      // 0. Cargar imagen del Logo de Academia Click Agro
      let logoDataUrl = '';
      try {
        const response = await fetch('/logo.png');
        if (response.ok) {
          const blob = await response.blob();
          logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (imgErr) {
        console.warn('No se pudo cargar /logo.png para el certificado:', imgErr);
      }

      // Formato A4 apaisado (Landscape): 297mm ancho x 210mm alto
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const width = 297;
      const height = 210;

      // 1. Fondos y Marcos Elegantes
      doc.setFillColor(253, 253, 252);
      doc.rect(0, 0, width, height, 'F');

      // Marco Exterior Verde Agro (#1E8754)
      doc.setDrawColor(30, 135, 84);
      doc.setLineWidth(3.5);
      doc.rect(10, 10, width - 20, height - 20);

      // Marco Interior Dorado (#D97706)
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.8);
      doc.rect(14, 14, width - 28, height - 28);

      // 2. Encabezado Institucional: Logo + Texto con alineación izquierda y centrados verticalmente
      const logoWidth = 15;
      const logoHeight = 14.15; // Proporción original (1024 x 966)
      const gap = 4.5; // Espaciado entre logo y texto

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      const textTitle = 'ACADEMIA CLICK AGRO';
      const titleWidth = doc.getTextWidth(textTitle);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const textSubtitle = 'CENTRO DE FORMACIÓN Y TECNOLOGÍA AGROPECUARIA';
      const subtitleWidth = doc.getTextWidth(textSubtitle);

      const maxTextWidth = Math.max(titleWidth, subtitleWidth);
      const totalBlockWidth = (logoDataUrl ? logoWidth + gap : 0) + maxTextWidth;
      const blockStartX = (width - totalBlockWidth) / 2;

      // Centro vertical en la franja del encabezado institucional
      const blockCenterY = 38;

      let textStartX = blockStartX;

      if (logoDataUrl) {
        const logoX = blockStartX;
        const logoY = blockCenterY - (logoHeight / 2);
        doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
        textStartX = logoX + logoWidth + gap;
      }

      // Texto institucional con alineación izquierda
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 135, 84);
      doc.text(textTitle, textStartX, blockCenterY - 2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(115, 115, 115);
      doc.text(textSubtitle, textStartX, blockCenterY + 4);

      // 3. Título Central "CERTIFICADO DE FINALIZACIÓN"
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(24, 24, 27);
      doc.text('CERTIFICADO DE APROBACIÓN', width / 2, 62, { align: 'center' });

      // Línea divisoria ornamental
      doc.setDrawColor(30, 135, 84);
      doc.setLineWidth(1);
      doc.line((width / 2) - 40, 68, (width / 2) + 40, 68);

      // 4. Texto declaratorio
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(82, 82, 91);
      doc.text('Por cuanto se certifica que con dedicación y excelencia académica:', width / 2, 82, { align: 'center' });

      // 5. Nombre del Alumno
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(25, 107, 68);
      doc.text(studentName.toUpperCase(), width / 2, 98, { align: 'center' });

      // 6. Detalle del Curso Aprobado
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(82, 82, 91);
      doc.text('Ha completado satisfactoriamente el programa académico de formación:', width / 2, 112, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(24, 24, 27);
      doc.text(`"${courseTitle}"`, width / 2, 126, { align: 'center' });

      // 7. Fechas y Credenciales de Verificación
      const certId = `CA-${courseId.slice(0, 4).toUpperCase()}-${userId.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(113, 113, 122);
      doc.text(`Expedido el ${completionDate} | Código de Autenticidad: ${certId}`, width / 2, 142, { align: 'center' });

      // 8. Firmas Institucionales
      const sigLineY = 175;

      // Firma Dirección Académica
      doc.setDrawColor(161, 161, 170);
      doc.setLineWidth(0.5);
      doc.line(45, sigLineY, 110, sigLineY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(39, 39, 42);
      doc.text('Dirección Académica', 77.5, sigLineY + 6, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122);
      doc.text('Academia Click Agro', 77.5, sigLineY + 10, { align: 'center' });

      // Firma Comité Evaluador
      doc.line(width - 110, sigLineY, width - 45, sigLineY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(39, 39, 42);
      doc.text('Comité Docente y Especialistas', width - 77.5, sigLineY + 6, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(113, 113, 122);
      doc.text('Validación Oficial de Competencias', width - 77.5, sigLineY + 10, { align: 'center' });

      // Guardar el archivo PDF
      const sanitizedCourse = courseTitle.replace(/[^a-zA-Z0-9]/g, '_');
      
      // Enlace de verificación pública en el pie de página del PDF
      const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://clickagro.com.ar';
      const verifyUrl = `${originUrl}/validar/${certId}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 135, 84);
      doc.text(`Constancia verificable online en: ${verifyUrl}`, width / 2, 191, { align: 'center' });

      doc.save(`Certificado_ClickAgro_${sanitizedCourse}.pdf`);

      // Registrar emisión oficial en Supabase en segundo plano
      try {
        fetch('/api/certificates/issue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_id: courseId,
            user_id: userId,
            certificate_code: certId,
          }),
        }).catch(() => {});
      } catch {}
    } catch (error) {
      console.error('Error generando el certificado PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Banner Principal de Felicitaciones y Desbloqueo de Certificado */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-agro-900 via-agro-800 to-emerald-900 text-white p-6 sm:p-7 shadow-xl my-6 border border-agro-400/30">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-agro-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                ¡Felicitaciones! Has completado el 100% del curso
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                Tu Certificado Oficial está listo para emitirse
              </h3>
              <p className="text-xs sm:text-sm text-agro-100/90 mt-1 max-w-xl">
                Has finalizado con éxito todas las lecciones de <strong className="text-white">{courseTitle}</strong>. 
                Obtén tu acreditación formal firmada por la dirección académica.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setIsOpen(true)}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-sm transition-all shadow-lg hover:shadow-amber-400/25 hover:scale-[1.02]"
            >
              <Award className="w-4 h-4" />
              <span>Ver y Descargar Certificado</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Previsualización y Descarga */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-agro-100 dark:bg-agro-900/40 text-agro-600 dark:text-agro-400 flex items-center justify-center mx-auto mb-3">
                <Award className="w-9 h-9" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Certificado de Aprobación
              </h3>
              <p className="text-sm text-zinc-500">
                Documento con código de autenticidad emitido para:
              </p>
              <p className="text-lg font-bold text-agro-600 dark:text-agro-400">
                {studentName}
              </p>
            </div>

            {/* Ficha resumen del certificado */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2.5">
              <div className="flex items-center gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div className="relative w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700 bg-white">
                  <Image src="/logo.png" alt="Click Agro" fill sizes="36px" className="object-contain p-0.5" />
                </div>
                <div className="text-left">
                  <p className="font-black text-xs text-zinc-900 dark:text-white leading-tight">
                    ACADEMIA <span className="text-agro-600 dark:text-agro-400">CLICK AGRO</span>
                  </p>
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                    Centro de Formación y Tecnología Agropecuaria
                  </p>
                </div>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-zinc-500">Programa formativo:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{courseTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Fecha de emisión:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{completionDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Entidad emisora:</span>
                <span className="font-semibold text-agro-600 dark:text-agro-400">Academia Click Agro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Formato:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">PDF Oficial en Alta Resolución (A4)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={generatePDFCertificate}
                disabled={isGenerating}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-agro-500 hover:bg-agro-600 text-white font-bold text-sm transition-all shadow-md hover:shadow-agro-500/25 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isGenerating ? 'Generando Certificado...' : 'Descargar en PDF'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-6 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 font-semibold text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
