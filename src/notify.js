export async function requestPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
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
        if (Notification.permission === "granted") {
          new Notification("Tony Tasks", { body: task.text, icon: "/icon-192.png" });
          // звук через Web Audio
          try {
            const ctx = new AudioContext();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = 528;
            g.gain.setValueAtTime(0.3, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
            o.start(ctx.currentTime);
            o.stop(ctx.currentTime + 1.5);
          } catch(e) {}
        }
      }, diff);
    }
  });
}
