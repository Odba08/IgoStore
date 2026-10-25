/**
 * Utilidades para cálculo de distancia Haversine y tiempo estimado de entrega
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

export function calculateDistanceKm(from?: LatLng | null, to?: LatLng | null): number | null {
  if (!from?.latitude || !from?.longitude || !to?.latitude || !to?.longitude) {
    return null;
  }

  const R = 6371; // Radio de la Tierra en km
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null || isNaN(distanceKm) || distanceKm <= 0) {
    return 'Cerca de ti';
  }

  if (distanceKm < 1) {
    const meters = Math.max(50, Math.round(distanceKm * 1000));
    return `${meters} mts`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

export function estimateDeliveryTime(distanceKm: number | null): string {
  if (distanceKm === null || isNaN(distanceKm) || distanceKm <= 0) {
    return '25-35 min';
  }

  if (distanceKm <= 1.0) {
    return '15-25 min';
  } else if (distanceKm <= 3.0) {
    return '20-35 min';
  } else if (distanceKm <= 6.0) {
    return '30-45 min';
  } else {
    return '45-60 min';
  }
}
