/**
 * Único ponto de registro do Service Worker do NexPonto.
 *
 * Regras:
 * - Nunca registra em dev, dentro de iframe ou nos previews da Lovable.
 * - `?sw=off` funciona como kill-switch: desregistra e sai.
 * - Atualização automática: o SW novo assume o controle sozinho (skipWaiting +
 *   clientsClaim) e a página é recarregada uma única vez.
 * - Nenhum dado local é apagado: apenas caches do próprio SW são limpos pelo
 *   Workbox (cleanupOutdatedCaches). IndexedDB/localStorage ficam intactos.
 */

const SW_URL = "/sw.js";
const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

function isPreviewHost(hostname: string) {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").includes(SW_URL))
      .map((r) => r.unregister()),
  );
}

function shouldRegister(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  if (isPreviewHost(window.location.hostname)) return false;
  if (new URLSearchParams(window.location.search).has("sw") ) {
    return new URLSearchParams(window.location.search).get("sw") !== "off";
  }
  return true;
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (!shouldRegister()) {
    void unregisterAppServiceWorkers();
    return;
  }

  const onLoad = async () => {
    try {
      const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });

      // Recarrega uma única vez quando o novo SW assume o controle.
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      const checkForUpdate = () => {
        if (navigator.onLine) void registration.update().catch(() => {});
      };

      // Detecção de nova versão: periodicamente, ao voltar para o app e ao reconectar.
      // Essencial no iOS, onde o PWA fica suspenso em segundo plano.
      const interval = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
      window.addEventListener("online", checkForUpdate);
      window.addEventListener("focus", checkForUpdate);
      window.addEventListener("pagehide", () => window.clearInterval(interval));

      checkForUpdate();
    } catch (error) {
      console.error("Falha ao registrar o Service Worker:", error);
    }
  };

  if (document.readyState === "complete") void onLoad();
  else window.addEventListener("load", () => void onLoad(), { once: true });
}
