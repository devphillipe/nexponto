export interface GeoCoords {
  latitude: number;
  longitude: number;
}

/**
 * Tenta obter a localização atual do dispositivo.
 * Nunca lança erro — retorna null quando indisponível, negado ou timeout,
 * para que a batida de ponto nunca seja bloqueada pela geolocalização.
 */
export async function getCurrentCoords(timeoutMs = 5000): Promise<GeoCoords | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return null;

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => resolve(null), timeoutMs + 500);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timeout);
        const { latitude, longitude } = pos.coords;
        if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
          resolve({ latitude, longitude });
        } else {
          resolve(null);
        }
      },
      () => {
        window.clearTimeout(timeout);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 30_000,
      }
    );
  });
}
