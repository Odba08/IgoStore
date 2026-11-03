import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Servicio centralizado para reproducción de alertas sonoras, hápticas y vibración
 * Funciona de forma 100% offline tanto en dispositivos móviles (iOS / Android) como en Web.
 */
class SoundService {
  private static isPlaying = false;

  /**
   * Reproduce la alerta de nuevo pedido / notificación urgente
   * Incluye feedback háptico y vibración continua para no pasar desapercibido.
   */
  static async playOrderAlertSound(): Promise<void> {
    try {
      this.isPlaying = true;

      // 1. Si está en Web, reproducir mediante Web Audio API sintetizado
      if (Platform.OS === 'web') {
        this.playWebChime();
        return;
      }

      // 2. Feedback háptico nativo (iOS / Android) + patrón de vibración intensa
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Vibration.vibrate([0, 600, 200, 600, 200, 600]);
    } catch (error) {
      console.warn('⚠️ [SoundService] Error reproduciendo alerta:', error);
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
