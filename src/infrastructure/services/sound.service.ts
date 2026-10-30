import { Platform, Vibration } from 'react-native';
import { Audio } from 'expo-av';

let soundInstance: Audio.Sound | null = null;
let isAudioConfigured = false;

/**
 * Servicio centralizado para reproducción de alertas sonoras y vibración
 * Funciona de forma 100% offline tanto en dispositivos móviles (iOS / Android) como en Web.
 */
class SoundService {
  private static isPlaying = false;

  private static async configureAudioMode(): Promise<void> {
    if (isAudioConfigured || Platform.OS === 'web') return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      isAudioConfigured = true;
    } catch (e) {
      console.warn('⚠️ [SoundService] Error configurando modo de audio:', e);
    }
  }

  /**
   * Reproduce el tono de alerta de nuevo pedido / notificación urgente
   * Incluye vibración continua para no pasar desapercibido.
   */
  static async playOrderAlertSound(): Promise<void> {
    try {
      // 1. Vibración intensa (patrón: esperar 0, vibrar 600ms, esperar 200ms, vibrar 600ms)
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 600, 200, 600, 200, 600]);
      }

      // 2. Si está en Web, reproducir mediante Web Audio API sintetizado
      if (Platform.OS === 'web') {
        this.playWebChime();
        return;
      }

      // 3. Configurar modo de audio nativo
      await this.configureAudioMode();

      // Si ya hay un sonido cargado, detenerlo antes de crear otro
      if (soundInstance) {
        try {
          await soundInstance.stopAsync();
          await soundInstance.unloadAsync();
        } catch {}
        soundInstance = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        require('../../../assets/sounds/order_alert.wav'),
        {
          shouldPlay: true,
          volume: 1.0,
          isLooping: false,
        }
      );

      soundInstance = sound;
      this.isPlaying = true;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded || status.didJustFinish) {
          this.isPlaying = false;
        }
      });
    } catch (error) {
      console.warn('⚠️ [SoundService] Error reproduciendo alerta sonora:', error);
      // Fallback: al menos vibrar
      if (Platform.OS !== 'web') {
        Vibration.vibrate(1000);
      }
    }
  }

  /**
   * Detiene la reproducción actual y cancela la vibración
   */
  static async stopOrderAlertSound(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
      if (soundInstance) {
        await soundInstance.stopAsync();
        await soundInstance.unloadAsync();
        soundInstance = null;
      }
      this.isPlaying = false;
    } catch (e) {
      // ignore
    }
  }

  /**
   * Sintetizador Web Audio API para navegador
   */
  private static playWebChime(): void {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Chime de 3 tonos C5, E5, G5, C6
      playTone(523.25, 0.0, 0.35);
      playTone(659.25, 0.2, 0.40);
      playTone(783.99, 0.4, 0.45);
      playTone(1046.5, 0.6, 0.60);
    } catch (err) {
      console.log('Web audio not triggered:', err);
    }
  }
}

export default SoundService;
