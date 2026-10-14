import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const pickImageFromGallery = async (): Promise<string | null> => {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permissionResult.granted === false) {
    alert('Se requiere permiso para acceder a tus fotos para adjuntar el comprobante.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
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
    quality: 0.8,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    return result.assets[0].uri;
  }

  return null;
};

export const uploadImage = async (imageUri: string, defaultName = 'upload.jpg'): Promise<string> => {
  if (!imageUri) throw new Error('No se proporcionó imagen');

  const filename = imageUri.split('/').pop() || defaultName;
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

  // 1. Intentar subir directo a ImgBB via native fetch
  try {
    const imgbbApiKey = '6dfbf7cb3ce7d636c4e9b06b5a89624e';
    const form = new FormData();
    form.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
      method: 'POST',
      body: form,
    });
    const resData = await res.json();
    if (resData && resData.success && resData.data) {
      return resData.data.url || resData.data.display_url;
    }
  } catch (err) {
    console.warn('Fallo subida directa a ImgBB con fetch, usando backend:', err);
  }

  // 2. Fallback a endpoint del backend via native fetch (evita bug de Axios boundary en React Native)
  try {
    const backendForm = new FormData();
    backendForm.append('file', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const backendUrl = `${API_URL || 'https://igoback.onrender.com'}/api/files/products`;
    const backendRes = await fetch(backendUrl, {
      method: 'POST',
      body: backendForm,
    });
    const backendData = await backendRes.json();
    if (backendData && backendData.secureUrl) {
      return backendData.secureUrl;
    }
    throw new Error(backendData?.message || 'Error en la respuesta del backend');
  } catch (err: any) {
    console.error('Error final al subir imagen:', err);
    throw new Error(err.message || 'No se pudo subir la imagen.');
  }
};

export const uploadReceiptImage = async (imageUri: string): Promise<string> => {
  return uploadImage(imageUri, 'comprobante_pago.jpg');
};
