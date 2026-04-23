const WORKER_URL = "https://tony-push.tonyfedchenko.workers.dev";
const VAPID_PUBLIC = "BNsmUv9nDrRMKto91GSxuuBWiaiKi9MY-ypfMbKSzUlruq84k9qRcxATPPgx8eDm1FFeUyU4nF1PeTTye9Z7z_I";

export async function requestPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export async function subscribePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
  }
  await fetch(WORKER_URL + "/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub),
  });
  return sub;
}

export async function syncTasks(tasks) {
  await fetch(WORKER_URL + "/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tasks),
  }).catch(() => {});
}

export function scheduleChecks(tasks) {
  const now = new Date();
  const todayStr = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
  tasks.filter(t => !t.done && t.time && t.date === todayStr).forEach(task => {
    const [h, m] = task.time.split(":").map(Number);
    const taskTime = new Date();
    taskTime.setHours(h, m, 0, 0);
    const diff = taskTime - now;
    if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        try {
          const ctx = new AudioContext();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g); g.connect(ctx.destination);
          o.frequency.value = 528;
          g.gain.setValueAtTime(0.3, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
          o.start(); o.stop(ctx.currentTime + 1.5);
        } catch(e) {}
      }, diff);
    }
  });
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}
