import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { igoApi } from '@/infrastructure/api/igo.api';

const base64Cache = new Map<string, string>();

export const pickImageFromGallery = async (): Promise<string | null> => {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permissionResult.granted === false) {
    alert('Se requiere permiso para acceder a tus fotos para adjuntar el comprobante.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.7,
    base64: true,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    const asset = result.assets[0];
    if (asset.base64) {
      base64Cache.set(asset.uri, asset.base64);
    }
    return asset.uri;
  }

  return null;
};

export const takePhotoWithCamera = async (): Promise<string | null> => {
  const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

  if (permissionResult.granted === false) {
    alert('Se requiere permiso para usar la cámara y tomar foto del comprobante.');
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.7,
    base64: true,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    const asset = result.assets[0];
    if (asset.base64) {
      base64Cache.set(asset.uri, asset.base64);
    }
    return asset.uri;
  }

  return null;
};

/**
 * Sube una imagen utilizando expo-file-system nativo.
 * Nivel 1: uploadAsync nativo directo a ImgBB.
 * Nivel 2: uploadAsync nativo a backend /files/products (Multer nativo).
 * Nivel 3: readAsStringAsync nativo en Base64 seguro a /files/base64.
 */
export const uploadImage = async (imageUri: string, defaultName = 'upload.jpg'): Promise<string> => {
  if (!imageUri) throw new Error('No se proporcionó imagen');

  const filename = imageUri.split('/').pop() || defaultName;

  // 1. Intento Nativo Nivel 1: FileSystem.uploadAsync directo a ImgBB
  try {
    const imgbbApiKey = '6dfbf7cb3ce7d636c4e9b06b5a89624e';
    const uploadRes = await FileSystem.uploadAsync(
      `https://api.imgbb.com/1/upload?key=${imgbbApiKey}`,
      imageUri,
      {
        fieldName: 'image',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      }
    );

    if (uploadRes.status === 200 && uploadRes.body) {
      const data = JSON.parse(uploadRes.body);
      if (data?.success && data?.data?.url) {
        return data.data.url || data.data.display_url;
      }
    }
  } catch (err) {
    console.warn('Fallo subida nativa directa a ImgBB:', err);
  }

  // 2. Intento Nativo Nivel 2: FileSystem.uploadAsync al endpoint del backend (/api/files/products)
  try {
    const backendBase = (process.env.EXPO_PUBLIC_API_URL || 'https://igoback.onrender.com').replace(/\/$/, '');
    const backendUrl = backendBase.endsWith('/api')
      ? `${backendBase}/files/products`
      : `${backendBase}/api/files/products`;

    const uploadRes = await FileSystem.uploadAsync(
      backendUrl,
      imageUri,
      {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      }
    );

    if (uploadRes.status >= 200 && uploadRes.status < 300 && uploadRes.body) {
      const data = JSON.parse(uploadRes.body);
      if (data?.secureUrl) {
        return data.secureUrl;
      }
    }
  } catch (err) {
    console.warn('Fallo subida nativa a backend /files/products:', err);
  }

  // 3. Intento Nativo Nivel 3: Base64 nativo seguro a /api/files/base64
  try {
    const base64 = base64Cache.get(imageUri) || await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    const res = await igoApi.post('/files/base64', {
      base64,
      name: filename,
    });

    if (res.data?.secureUrl) {
      return res.data.secureUrl;
    }
    throw new Error(res.data?.message || 'Error en respuesta del backend');
  } catch (err: any) {
    console.error('Error final al subir imagen:', err?.response?.data || err?.message);
    throw new Error(err?.response?.data?.message || err?.message || 'No se pudo subir la imagen.');
  }
};

export const uploadReceiptImage = async (imageUri: string): Promise<string> => {
  return uploadImage(imageUri, 'comprobante_pago.jpg');
};
