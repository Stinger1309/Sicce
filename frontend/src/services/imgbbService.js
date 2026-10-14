// src/services/imgbbService.js
// Subida de imágenes: servidor local (prioridad). ImgBB opcional si vuelve a estar disponible.

const IMGBB_API_KEY = '09b5479106c1d5bd6370e88c8d9c70f9';
/** Poner true solo cuando ImgBB esté operativo de nuevo */
const USE_IMGBB = false;

const getApiOrigin = () => {
  if (import.meta.env.DEV) return 'http://localhost:3000';
  if (import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, '');
  }
  if (import.meta.env.PROD) return 'https://iadey-1.onrender.com';
  return 'http://localhost:3000';
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });

/**
 * Guarda en el servidor local (backend /api/upload/imagen)
 */
const uploadToLocalBackend = async (file) => {
  const dataUrl = await fileToDataUrl(file);
  const origin = getApiOrigin();

  const response = await fetch(`${origin}/api/upload/imagen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: dataUrl,
      filename: file?.name || 'comprobante.jpg',
      mimeType: file?.type || 'image/jpeg',
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.success || !data?.data?.url) {
    throw new Error(
      data?.error ||
        `Error al guardar el comprobante en el servidor (HTTP ${response.status})`
    );
  }

  return {
    url: data.data.url,
    thumbnail: data.data.url,
    delete_url: null,
    size: data.data.size,
    name: data.data.name || file.name,
    provider: 'local',
  };
};

/**
 * Sube imagen a ImgBB (opcional)
 */
const uploadToImgBBRemote = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();

  if (data?.success && data?.data?.url) {
    return {
      url: data.data.url,
      thumbnail: data.data.thumb?.url,
      delete_url: data.data.delete_url,
      size: data.data.size,
      name: data.data.image?.filename || file.name,
      provider: 'imgbb',
    };
  }

  throw new Error(
    data?.error?.message || data?.status_txt || 'Error al subir imagen a ImgBB'
  );
};

/**
 * Sube una imagen al servidor local (no depende de ImgBB).
 * @param {File} file
 */
export const uploadToImgBB = async (file) => {
  if (!(file instanceof File) && !(file instanceof Blob)) {
    throw new Error('Archivo de imagen inválido');
  }

  // Prioridad: almacenamiento local (siempre disponible)
  try {
    return await uploadToLocalBackend(file);
  } catch (localError) {
    console.error('Fallo subida local:', localError);

    if (USE_IMGBB) {
      try {
        return await uploadToImgBBRemote(file);
      } catch (imgbbError) {
        throw new Error(
          localError?.message ||
            imgbbError?.message ||
            'No se pudo subir el comprobante'
        );
      }
    }

    throw new Error(
      localError?.message ||
        'No se pudo subir el comprobante. Verifique que el backend esté en ejecución.'
    );
  }
};

/**
 * Sube múltiples imágenes
 * @param {File[]} files
 */
export const uploadMultipleToImgBB = async (files) => {
  return Promise.all(files.map((file) => uploadToImgBB(file)));
};
