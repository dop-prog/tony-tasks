import { useState, useEffect } from "react";
import { requestPermission, scheduleChecks, subscribePush, syncTasks } from "./notify.js";

const STORAGE_KEY = "tony-tasks-v1";
const CATEGORIES = {
  work: { label: "Work", color: "#e8d5b0" },
  personal: { label: "Personal", color: "#b0d5e8" },
  gear: { label: "Gear", color: "#d5b0e8" },
  music: { label: "Music", color: "#b0e8c8" },
  urgent: { label: "Urgent", color: "#e8b0b0" },
};
const REPEAT_OPTIONS = { none: "Без повтора", daily: "Каждый день", weekly: "Каждую неделю" };
const F = "'Courier New', monospace";

function getTodayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}
function formatDateInput(val) {
  const digits = val.replace(/\D/g, "").slice(0, 8);
  let r = digits;
  if (digits.length > 2) r = digits.slice(0,2) + "." + digits.slice(2);
  if (digits.length > 4) r = digits.slice(0,2) + "." + digits.slice(2,4) + "." + digits.slice(4);
  return r;
}
function formatTimeInput(val) {
  const digits = val.replace(/\D/g, "").slice(0, 4);
  if (digits.length > 2) return digits.slice(0,2) + ":" + digits.slice(2);
  return digits;
}
function parseDateInput(str) {
  const parts = str.split(".");
  if (parts.length === 3 && parts[2].length === 4) return parts[2] + "-" + parts[1] + "-" + parts[0];
  return getTodayStr();
}
function formatDateDisplay(isoStr) {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length === 3) return parts[2] + "." + parts[1] + "." + parts[0];
  return isoStr;
}
function isoToDisplay(iso) {
  if (!iso) return "";
  const p = iso.split("-");
  return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : iso;
}
function isDueToday(task) {
  if (!task.date) return true;
  return task.date <= getTodayStr();
}

const EMPTY = { text: "", category: "work", dateInput: "", timeInput: "", repeat: "none" };

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("today");
  const [screen, setScreen] = useState("list");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [snoozeId, setSnoozeId] = useState(null);
  const [notifStatus, setNotifStatus] = useState(typeof Notification !== "undefined" ? Notification.permission : "denied");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setTasks(JSON.parse(saved));
    setLoaded(true);
    requestPermission().then(ok => { if (ok) { setNotifStatus("granted"); subscribePush(); } });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
  }, []);

  useEffect(() => {
    if (loaded) { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); scheduleChecks(tasks); syncTasks(tasks); }
  }, [tasks, loaded]);

  function openAdd() {
    setEditId(null);
    setForm(EMPTY);
    setScreen("edit");
  }

  function openEdit(task) {
    setEditId(task.id);
    setForm({ text: task.text, category: task.category, dateInput: isoToDisplay(task.date), timeInput: task.time || "", repeat: task.repeat });
    setScreen("edit");
  }

  function saveTask() {
    if (!form.text.trim()) return;
    const isoDate = form.dateInput.length >= 8 ? parseDateInput(form.dateInput) : getTodayStr();
    if (editId) {
      setTasks(prev => prev.map(t => t.id === editId ? { ...t, text: form.text.trim(), category: form.category, date: isoDate, time: form.timeInput || "", repeat: form.repeat } : t));
    } else {
      setTasks(prev => [{ id: Date.now(), text: form.text.trim(), category: form.category, date: isoDate, time: form.timeInput || "", repeat: form.repeat, done: false, created: getTodayStr() }, ...prev]);
    }
    setScreen("list");
  }

  function toggleDone(id) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (t.done) return { ...t, done: false, doneDate: null };
      if (t.repeat === "none") return { ...t, done: true, doneDate: getTodayStr() };
      const next = new Date(t.date || getTodayStr());
      if (t.repeat === "daily") next.setDate(next.getDate() + 1);
      if (t.repeat === "weekly") next.setDate(next.getDate() + 7);
      return { ...t, date: next.getFullYear() + "-" + String(next.getMonth()+1).padStart(2,"0") + "-" + String(next.getDate()).padStart(2,"0") };
    }));
  }

  function snooze(id, hours) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = new Date();
      next.setHours(next.getHours() + hours);
      return { ...t, date: next.getFullYear() + "-" + String(next.getMonth()+1).padStart(2,"0") + "-" + String(next.getDate()).padStart(2,"0"), time: String(next.getHours()).padStart(2,"0") + ":" + String(next.getMinutes()).padStart(2,"0"), done: false };
    }));
    setSnoozeId(null);
  }

  function deleteTask(id) { setTasks(prev => prev.filter(t => t.id !== id)); setSnoozeId(null); }

  const active = tasks.filter(t => !t.done);
  const doneList = tasks.filter(t => t.done);
  const todayList = active.filter(isDueToday);
  const displayed = view === "today" ? todayList : view === "all" ? active : doneList;

  const inp = () => ({ background: "#111", border: "1px solid #2a2a2a", color: "#d4d0c8", fontFamily: F, fontSize: 13, padding: "10px 12px", outline: "none", width: "100%", boxSizing: "border-box" });
  const lbl = { fontSize: 9, color: "#444", letterSpacing: 2, marginBottom: 6, display: "block" };

  if (screen === "edit") {
    return (
      <div style={{ background: "#0d0d0d", minHeight: "100vh", fontFamily: F, color: "#d4d0c8", maxWidth: 480, margin: "0 auto", padding: "0 20px 60px", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 28px" }}>
          <span style={{ color: "#e8d5b0", fontSize: 12, letterSpacing: 3 }}>{editId ? "РЕДАКТИРОВАТЬ" : "НОВАЯ ЗАДАЧА"}</span>
          <div onClick={() => setScreen("list")} style={{ color: "#555", fontSize: 24, cursor: "pointer", lineHeight: 1, userSelect: "none" }}>×</div>
        </div>

        <input autoFocus value={form.text} onChange={e => setForm(p => ({ ...p, text: e.target.value }))} placeholder="Текст задачи..." style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #2a2a2a", color: "#e8d5b0", fontFamily: F, fontSize: 15, padding: "8px 0", outline: "none", boxSizing: "border-box", marginBottom: 28 }} />

        <div style={{ marginBottom: 24 }}>
          <span style={lbl}>КАТЕГОРИЯ</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <div key={k} onClick={() => setForm(p => ({ ...p, category: k }))} style={{ background: form.category === k ? "#1a1a1a" : "none", border: "1px solid " + (form.category === k ? v.color : "#2a2a2a"), color: v.color, fontFamily: F, fontSize: 10, padding: "6px 12px", cursor: "pointer", userSelect: "none" }}>{v.label}</div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <span style={lbl}>ДАТА</span>
            <input value={form.dateInput} onChange={e => setForm(p => ({ ...p, dateInput: formatDateInput(e.target.value) }))} placeholder="дд.мм.гггг" inputMode="numeric" style={inp()} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={lbl}>ВРЕМЯ</span>
            <input value={form.timeInput} onChange={e => setForm(p => ({ ...p, timeInput: formatTimeInput(e.target.value) }))} placeholder="00:00" inputMode="numeric" style={inp()} />
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <span style={lbl}>ПОВТОР</span>
          <select value={form.repeat} onChange={e => setForm(p => ({ ...p, repeat: e.target.value }))} style={inp()}>
            {Object.entries(REPEAT_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div onClick={saveTask} style={{ flex: 1, background: "#e8d5b0", color: "#0d0d0d", fontFamily: F, fontSize: 11, letterSpacing: 2, padding: "14px", cursor: "pointer", textAlign: "center", userSelect: "none" }}>{editId ? "СОХРАНИТЬ" : "ДОБАВИТЬ"}</div>
          <div onClick={() => setScreen("list")} style={{ background: "none", border: "1px solid #2a2a2a", color: "#666", fontFamily: F, fontSize: 11, padding: "14px 20px", cursor: "pointer", userSelect: "none" }}>отмена</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0d0d0d", minHeight: "100vh", color: "#d4d0c8", fontFamily: F, maxWidth: 480, margin: "0 auto", paddingBottom: 100 }}>
      <div style={{ padding: "24px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#e8d5b0", fontSize: 14, letterSpacing: 3 }}>TONY.TASKS</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {notifStatus !== "granted" && (
            <div onClick={() => { Notification.requestPermission().then(r => { setNotifStatus(r); if (r === "granted") { scheduleChecks(tasks); subscribePush(); } }); }} style={{ fontSize: 9, color: "#e8d5b0", border: "1px solid #333", padding: "4px 8px", cursor: "pointer", userSelect: "none", letterSpacing: 1 }}>🔔 ВКЛ</div>
          )}
          <span style={{ color: "#888", fontSize: 11 }}>{todayList.length} на сегодня</span>
        </div>
      </div>
      <div style={{ display: "flex", padding: "20px 20px 0", borderBottom: "1px solid #1e1e1e" }}>
        {[["today", "Сегодня"], ["all", "Все"], ["done", "Готово"]].map(([key, label]) => (
          <div key={key} onClick={() => setView(key)} style={{ borderBottom: view === key ? "1px solid #e8d5b0" : "1px solid transparent", color: view === key ? "#e8d5b0" : "#666", fontFamily: F, fontSize: 11, letterSpacing: 2, padding: "8px 16px 10px", cursor: "pointer", userSelect: "none" }}>{label}</div>
        ))}
      </div>
      <div style={{ padding: "8px 20px" }}>
        {displayed.length === 0 && <div style={{ color: "#333", fontSize: 12, marginTop: 40, textAlign: "center" }}>{view === "done" ? "Нет выполненных" : "Нет задач"}</div>}
        {displayed.map(task => (
          <div key={task.id}>
            <div style={{ borderBottom: "1px solid #1a1a1a", padding: "14px 0", display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div onClick={() => toggleDone(task.id)} style={{ width: 20, height: 20, border: "1px solid " + (task.done ? "#e8d5b0" : "#444"), background: task.done ? "#e8d5b0" : "transparent", cursor: "pointer", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", color: "#0d0d0d", fontSize: 12, userSelect: "none" }}>
                {task.done ? "✓" : ""}
              </div>
              <div style={{ flex: 1 }} onClick={() => !task.done ? openEdit(task) : setSnoozeId(snoozeId === task.id ? null : task.id)}>
                <div style={{ fontSize: 13, color: task.done ? "#444" : "#d4d0c8", textDecoration: task.done ? "line-through" : "none", cursor: "pointer" }}>{task.text}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: CATEGORIES[task.category]?.color || "#888" }}>{CATEGORIES[task.category]?.label}</span>
                  {task.date && <span style={{ fontSize: 10, color: "#888" }}>{formatDateDisplay(task.date)}{task.time ? " " + task.time : ""}</span>}
                  {task.repeat !== "none" && <span style={{ fontSize: 10, color: "#555" }}>↻ {REPEAT_OPTIONS[task.repeat]}</span>}
                  {task.done && task.doneDate && <span style={{ fontSize: 10, color: "#444" }}>✓ {formatDateDisplay(task.doneDate)}</span>}
                </div>
              </div>
              <div onClick={() => deleteTask(task.id)} style={{ color: "#333", cursor: "pointer", fontSize: 20, padding: "0 4px", flexShrink: 0, lineHeight: 1, userSelect: "none" }}>×</div>
            </div>
            {snoozeId === task.id && (
              <div style={{ background: "#111", padding: "10px 12px", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#666", marginRight: 4 }}>Отложить:</span>
                {[["1ч", 1], ["3ч", 3], ["8ч", 8], ["1д", 24], ["2д", 48]].map(([label, h]) => (
                  <div key={label} onClick={() => snooze(task.id, h)} style={{ border: "1px solid #2a2a2a", color: "#888", fontFamily: F, fontSize: 10, padding: "4px 10px", cursor: "pointer", userSelect: "none" }}>{label}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div onClick={openAdd} style={{ position: "fixed", bottom: 24, right: 24, width: 52, height: 52, borderRadius: "50%", background: "#e8d5b0", color: "#0d0d0d", fontSize: 24, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", userSelect: "none" }}>+</div>
    </div>
  );
}
