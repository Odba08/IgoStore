import * as ImagePicker from 'expo-image-picker';
import { igoApi } from '@/infrastructure/api/igo.api';

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
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0].uri;
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
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0].uri;
  }

  return null;
};

/**
 * Convierte cualquier URI local de archivo (file://, content://, etc.) a base64 puro
 * utilizando FileReader nativo de React Native.
 */
export const uriToBase64 = async (uri: string): Promise<string> => {
  if (uri.startsWith('data:image')) {
    return uri.split(',')[1];
  }
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (e) => reject(new Error('Error al convertir imagen a base64: ' + e));
    reader.onloadend = () => {
      const res = (reader.result as string) || '';
      const base64 = res.includes(',') ? res.split(',')[1] : res;
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
};

/**
 * Sube una imagen primero directamente a ImgBB mediante base64 puro (sin objetos incompatibles de FormData)
 * y en caso de fallo, usa el endpoint seguro JSON del backend (/files/base64).
 */
export const uploadImage = async (imageUri: string, defaultName = 'upload.jpg'): Promise<string> => {
  if (!imageUri) throw new Error('No se proporcionó imagen');

  const filename = imageUri.split('/').pop() || defaultName;

  // 1. Convertir la imagen a base64 puro
  let base64 = '';
  try {
    base64 = await uriToBase64(imageUri);
  } catch (err) {
    console.warn('Error convirtiendo URI a base64:', err);
  }

  // 2. Intentar subir directo a ImgBB con base64 (string puro en FormData, 100% compatible con Expo)
  if (base64) {
    try {
      const imgbbApiKey = '6dfbf7cb3ce7d636c4e9b06b5a89624e';
      const form = new FormData();
      form.append('image', base64);
      form.append('name', filename.split('.')[0] || 'upload');

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: form,
      });
      const resData = await res.json();
      if (resData && resData.success && resData.data) {
        return resData.data.url || resData.data.display_url;
      }
    } catch (err) {
      console.warn('Fallo subida directa a ImgBB con base64, usando backend fallback:', err);
    }
  }

  // 3. Fallback a endpoint del backend via JSON seguro con igoApi (cero problemas de FormData)
  try {
    if (!base64) {
      base64 = await uriToBase64(imageUri);
    }

    const res = await igoApi.post('/files/base64', {
      base64,
      name: filename,
    });

    if (res.data && res.data.secureUrl) {
      return res.data.secureUrl;
    }
    throw new Error(res.data?.message || 'Error en la respuesta del backend');
  } catch (err: any) {
    console.error('Error final al subir imagen:', err?.response?.data || err?.message);
    throw new Error(err.response?.data?.message || err.message || 'No se pudo subir la imagen.');
  }
};

export const uploadReceiptImage = async (imageUri: string): Promise<string> => {
  return uploadImage(imageUri, 'comprobante_pago.jpg');
};
