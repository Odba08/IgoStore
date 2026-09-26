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

export const uploadReceiptImage = async (imageUri: string): Promise<string> => {
  try {
    const filename = imageUri.split('/').pop() || 'comprobante_pago.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    // 1. Intentar subir directo a ImgBB con apiKey
    const imgbbApiKey = '6dfbf7cb3ce7d636c4e9b06b5a89624e';
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const res = await axios.post(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (res.data && res.data.success && res.data.data) {
      return res.data.data.url || res.data.data.display_url;
    }
  } catch (err) {
    console.warn('Fallo subida directa a ImgBB, usando fallback backend:', err);
  }

  // 2. Fallback a endpoint del backend
  const backendFormData = new FormData();
  const filename = imageUri.split('/').pop() || 'comprobante_pago.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  backendFormData.append('file', {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const backendRes = await axios.post(`${API_URL}/api/files/products`, backendFormData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return backendRes.data.secureUrl;
};
