import { useState, useEffect } from "react";

const STORAGE_KEY = "tony-tasks-v1";

const CATEGORIES = {
  work: { label: "Work", color: "#e8d5b0" },
  personal: { label: "Personal", color: "#b0d5e8" },
  gear: { label: "Gear", color: "#d5b0e8" },
  music: { label: "Music", color: "#b0e8c8" },
  urgent: { label: "Urgent", color: "#e8b0b0" },
};

const REPEAT_OPTIONS = {
  none: "Без повтора",
  daily: "Каждый день",
  weekly: "Каждую неделю",
};

function getTodayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
}

function isDueToday(task) {
  if (!task.date) return true;
  return task.date <= getTodayStr();
}

function formatDate(date, time) {
  if (!date && !time) return null;
  return [date, time].filter(Boolean).join(" ");
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("today");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ text: "", category: "work", date: "", time: "", repeat: "none" });
  const [loaded, setLoaded] = useState(false);
  const [snoozeId, setSnoozeId] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setTasks(JSON.parse(saved));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks, loaded]);

  function addTask() {
    if (!newTask.text.trim()) return;
    const task = {
      id: Date.now(),
      text: newTask.text.trim(),
      category: newTask.category,
      date: newTask.date || getTodayStr(),
      time: newTask.time || "",
      repeat: newTask.repeat,
      done: false,
      created: getTodayStr(),
    };
    setTasks(prev => [task, ...prev]);
    setNewTask({ text: "", category: "work", date: "", time: "", repeat: "none" });
    setShowAdd(false);
  }

  function toggleDone(id) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (t.done) return { ...t, done: false, doneDate: null };
      if (t.repeat === "none") return { ...t, done: true, doneDate: getTodayStr() };
      const next = new Date(t.date || getTodayStr());
      if (t.repeat === "daily") next.setDate(next.getDate() + 1);
      if (t.repeat === "weekly") next.setDate(next.getDate() + 7);
      const nd = next.getFullYear() + "-" + String(next.getMonth()+1).padStart(2,"0") + "-" + String(next.getDate()).padStart(2,"0");
      return { ...t, date: nd };
    }));
  }

  function snooze(id, hours) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const next = new Date();
      next.setHours(next.getHours() + hours);
      const nd = next.getFullYear() + "-" + String(next.getMonth()+1).padStart(2,"0") + "-" + String(next.getDate()).padStart(2,"0");
      const nt = String(next.getHours()).padStart(2,"0") + ":" + String(next.getMinutes()).padStart(2,"0");
      return { ...t, date: nd, time: nt, done: false };
    }));
    setSnoozeId(null);
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
    setSnoozeId(null);
  }

  const active = tasks.filter(t => !t.done);
  const doneList = tasks.filter(t => t.done);
  const todayList = active.filter(isDueToday);
  const displayed = view === "today" ? todayList : view === "all" ? active : doneList;

  const C = {
    bg: "#0d0d0d",
    surface: "#111",
    border: "#1e1e1e",
    border2: "#2a2a2a",
    text: "#d4d0c8",
    textDim: "#888",
    textFaint: "#555",
    accent: "#e8d5b0",
    font: "'Courier New', monospace",
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: C.font, maxWidth: 480, margin: "0 auto", paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ padding: "24px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ color: C.accent, fontSize: 14, letterSpacing: 3 }}>TONY.TASKS</span>
        <span style={{ color: C.textDim, fontSize: 11 }}>{todayList.length} на сегодня</span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", padding: "20px 20px 0", borderBottom: "1px solid " + C.border }}>
        {[["today", "Сегодня"], ["all", "Все"], ["done", "Готово"]].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} style={{ background: "none", border: "none", borderBottom: view === key ? "1px solid " + C.accent : "1px solid transparent", color: view === key ? C.accent : C.textDim, fontFamily: C.font, fontSize: 11, letterSpacing: 2, padding: "8px 16px 10px", cursor: "pointer" }}>{label}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: "8px 20px" }}>
        {displayed.length === 0 && (
          <div style={{ color: C.textFaint, fontSize: 12, marginTop: 40, textAlign: "center" }}>
            {view === "done" ? "Нет выполненных" : "Нет задач"}
          </div>
        )}
        {displayed.map(task => (
          <div key={task.id}>
            <div style={{ borderBottom: "1px solid " + C.border, padding: "14px 0", display: "flex", gap: 12, alignItems: "flex-start" }}>
              {/* Checkbox */}
              <button onClick={() => toggleDone(task.id)} style={{ width: 20, height: 20, border: "1px solid " + (task.done ? C.accent : "#444"), background: task.done ? C.accent : "none", cursor: "pointer", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#0d0d0d", fontSize: 12 }}>
                {task.done ? "✓" : ""}
              </button>

              <div style={{ flex: 1 }} onClick={() => setSnoozeId(snoozeId === task.id ? null : task.id)}>
                <div style={{ fontSize: 13, color: task.done ? C.textFaint : C.text, textDecoration: task.done ? "line-through" : "none", cursor: "pointer" }}>{task.text}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: CATEGORIES[task.category]?.color || C.textDim }}>{CATEGORIES[task.category]?.label}</span>
                  {task.date && <span style={{ fontSize: 10, color: C.textDim }}>{task.date}{task.time ? " " + task.time : ""}</span>}
                  {task.repeat !== "none" && <span style={{ fontSize: 10, color: C.textFaint }}>↻ {REPEAT_OPTIONS[task.repeat]}</span>}
                  {task.done && task.doneDate && <span style={{ fontSize: 10, color: C.textFaint }}>✓ {task.doneDate}</span>}
                </div>
              </div>

              <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: C.textFaint, cursor: "pointer", fontSize: 16, padding: "0 4px", flexShrink: 0 }}>×</button>
            </div>

            {/* Snooze panel */}
            {snoozeId === task.id && !task.done && (
              <div style={{ background: C.surface, padding: "10px 12px", marginBottom: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: C.textDim, alignSelf: "center", marginRight: 4 }}>Отложить:</span>
                {[["1ч", 1], ["3ч", 3], ["8ч", 8], ["1д", 24], ["2д", 48]].map(([label, h]) => (
                  <button key={label} onClick={() => snooze(task.id, h)} style={{ background: "none", border: "1px solid " + C.border2, color: C.textDim, fontFamily: C.font, fontSize: 10, padding: "4px 10px", cursor: "pointer" }}>{label}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{ position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: C.surface, borderTop: "1px solid " + C.border, padding: "16px 20px", boxSizing: "border-box" }}>
          <input autoFocus value={newTask.text} onChange={e => setNewTask(p => ({ ...p, text: e.target.value }))} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Текст задачи..." style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid " + C.border2, color: C.accent, fontFamily: C.font, fontSize: 13, padding: "8px 0", outline: "none", boxSizing: "border-box", marginBottom: 12 }} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {Object.entries(CATEGORIES).map(([key, val]) => (
              <button key={key} onClick={() => setNewTask(p => ({ ...p, category: key }))} style={{ background: newTask.category === key ? "#1e1e1e" : "none", border: "1px solid " + (newTask.category === key ? val.color : C.border2), color: val.color, fontFamily: C.font, fontSize: 10, padding: "4px 10px", cursor: "pointer" }}>{val.label}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <input type="date" value={newTask.date} onChange={e => setNewTask(p => ({ ...p, date: e.target.value }))} style={{ background: "transparent", border: "1px solid " + C.border2, color: C.textDim, fontFamily: C.font, fontSize: 11, padding: "4px 8px" }} />
            <input type="time" value={newTask.time} onChange={e => setNewTask(p => ({ ...p, time: e.target.value }))} style={{ background: "transparent", border: "1px solid " + C.border2, color: C.textDim, fontFamily: C.font, fontSize: 11, padding: "4px 8px" }} />
            <select value={newTask.repeat} onChange={e => setNewTask(p => ({ ...p, repeat: e.target.value }))} style={{ background: C.surface, border: "1px solid " + C.border2, color: C.textDim, fontFamily: C.font, fontSize: 11, padding: "4px 8px" }}>
              {Object.entries(REPEAT_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addTask} style={{ background: C.accent, color: "#0d0d0d", border: "none", fontFamily: C.font, fontSize: 11, letterSpacing: 2, padding: "8px 20px", cursor: "pointer" }}>ДОБАВИТЬ</button>
            <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "1px solid " + C.border2, color: C.textDim, fontFamily: C.font, fontSize: 11, padding: "8px 16px", cursor: "pointer" }}>отмена</button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setShowAdd(p => !p)} style={{ position: "fixed", bottom: 24, right: 24, width: 52, height: 52, borderRadius: "50%", background: C.accent, border: "none", color: "#0d0d0d", fontSize: 24, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>{showAdd ? "×" : "+"}</button>
    </div>
  );
}
