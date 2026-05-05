type ServiceWorkerLike = Pick<ServiceWorkerContainer, 'register'> | undefined;

interface RegisterServiceWorkerOptions {
  isProd: boolean;
  serviceWorker: ServiceWorkerLike;
}

export async function registerServiceWorker({
  isProd,
  serviceWorker,
}: RegisterServiceWorkerOptions) {
  if (!isProd || !serviceWorker) {
    return;
  }

  try {
    await serviceWorker.register('/sw.js');
  } catch (error) {
    console.error('SignalDesk service worker registration failed.', error);
  }
}
