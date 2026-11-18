import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Límite de tamaño: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

const BUCKET_NAME = 'courses';

/**
 * Sanitiza el nombre de archivo manteniendo su extensión
 */
function sanitizeFileName(originalName: string): string {
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex !== -1 ? originalName.slice(0, dotIndex) : originalName;
  const extension = dotIndex !== -1 ? originalName.slice(dotIndex).toLowerCase() : '';

  // Limpiar caracteres acentuados y especiales
  const cleanBase = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Reemplazar caracteres raros con guiones bajos
    .replace(/_+/g, '_')
    .slice(0, 80);

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);

  return `${cleanBase}_${timestamp}_${randomSuffix}${extension}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'materials';

    if (!file) {
      return NextResponse.json(
        { error: 'No se ha seleccionado ningún archivo para subir.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo permitido de 50 MB.' },
        { status: 400 }
      );
    }

    // Asegurar que el bucket exista y sea público
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = (buckets || []).some((b) => b.name === BUCKET_NAME);
    if (!bucketExists) {
      const { error: createBucketErr } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
      });
      if (createBucketErr && !createBucketErr.message.includes('already exists')) {
        console.error('Error al crear bucket:', createBucketErr);
      }
    }

    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '') || 'materials';
    const safeFileName = sanitizeFileName(file.name);
    const storagePath = `${safeFolder}/${safeFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const contentType = file.type || 'application/octet-stream';

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[STORAGE_UPLOAD_ERROR]', uploadError);
      return NextResponse.json(
        { error: `Error al subir archivo a Supabase Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Obtener la URL pública oficial
    const { data: publicData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      url: publicData.publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
      path: storagePath,
    });
  } catch (err: any) {
    console.error('[API_UPLOAD_EXCEPTION]', err);
    return NextResponse.json(
      { error: err?.message || 'Error inesperado al procesar la subida del archivo.' },
      { status: 500 }
    );
  }
}
