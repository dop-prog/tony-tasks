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
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function isDueToday(task) {
  if (!task.date) return true;
  return task.date <= getTodayStr();
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState("today");
  const [showAdd, setShowAdd] = useState(false);
  const [newTask, setNewTask] = useState({ text: "", category: "work", date: "", repeat: "none" });
  const [loaded, setLoaded] = useState(false);

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
      repeat: newTask.repeat,
      done: false,
      created: getTodayStr(),
    };
    setTasks(prev => [task, ...prev]);
    setNewTask({ text: "", category: "work", date: "", repeat: "none" });
    setShowAdd(false);
  }

  function completeTask(id) {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (t.repeat === "none") return { ...t, done: true, doneDate: getTodayStr() };
      const next = new Date(t.date || getTodayStr());
      if (t.repeat === "daily") next.setDate(next.getDate() + 1);
      if (t.repeat === "weekly") next.setDate(next.getDate() + 7);
      const nd = next.getFullYear() + "-" + String(next.getMonth()+1).padStart(2,"0") + "-" + String(next.getDate()).padStart(2,"0");
      return { ...t, date: nd };
    }));
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  const active = tasks.filter(t => !t.done);
  const doneList = tasks.filter(t => t.done);
  const todayList = active.filter(isDueToday);
  const displayed = view === "today" ? todayList : view === "all" ? active : doneList;

  return (
    <div style={{ background: "#0d0d0d", minHeight: "100vh", color: "#d4d0c8", fontFamily: "'Courier New', monospace", maxWidth: 480, margin: "0 auto", paddingBottom: 100 }}>
      <div style={{ padding: "24px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ color: "#e8d5b0", fontSize: 14, letterSpacing: 3 }}>TONY.TASKS</span>
        <span style={{ color: "#444", fontSize: 11 }}>{todayList.length} на сегодня</span>
      </div>
      <div style={{ display: "flex", padding: "20px 20px 0", borderBottom: "1px solid #1a1a1a" }}>
        {[["today", "Сегодня"], ["all", "Все"], ["done", "Готово"]].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} style={{ background: "none", border: "none", borderBottom: view === key ? "1px solid #e8d5b0" : "1px solid transparent", color: view === key ? "#e8d5b0" : "#444", fontFamily: "'Courier New', monospace", fontSize: 11, letterSpacing: 2, padding: "8px 16px 10px", cursor: "pointer" }}>{label}</button>
        ))}
      </div>
      <div style={{ padding: "16px 20px" }}>
        {displayed.length === 0 && (
          <div style={{ color: "#333", fontSize: 12, marginTop: 40, textAlign: "center" }}>
            {view === "done" ? "Нет выполненных" : "Нет задач"}
          </div>
        )}
        {displayed.map(task => (
          <div key={task.id} style={{ borderBottom: "1px solid #1a1a1a", padding: "14px 0", display: "flex", gap: 12, alignItems: "flex-start" }}>
            {view !== "done" && (
              <button onClick={() => completeTask(task.id)} style={{ width: 18, height: 18, border: "1px solid #333", background: "none", cursor: "pointer", flexShrink: 0, marginTop: 2 }} />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: task.done ? "#3a3a3a" : "#d4d0c8", textDecoration: task.done ? "line-through" : "none" }}>{task.text}</div>
              <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: CATEGORIES[task.category]?.color || "#888" }}>{CATEGORIES[task.category]?.label}</span>
                {task.date && <span style={{ fontSize: 10, color: "#444" }}>{task.date}</span>}
                {task.repeat !== "none" && <span style={{ fontSize: 10, color: "#555" }}>↻ {REPEAT_OPTIONS[task.repeat]}</span>}
              </div>
            </div>
            <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "#2a2a2a", cursor: "pointer", fontSize: 16, padding: "0 4px", flexShrink: 0 }}>×</button>
          </div>
        ))}
      </div>
      {showAdd && (
        <div style={{ position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#111", borderTop: "1px solid #1e1e1e", padding: "16px 20px", boxSizing: "border-box" }}>
          <input autoFocus value={newTask.text} onChange={e => setNewTask(p => ({ ...p, text: e.target.value }))} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Текст задачи..." style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid #2a2a2a", color: "#e8d5b0", fontFamily: "'Courier New', monospace", fontSize: 13, padding: "8px 0", outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {Object.entries(CATEGORIES).map(([key, val]) => (
              <button key={key} onClick={() => setNewTask(p => ({ ...p, category: key }))} style={{ background: newTask.category === key ? "#1e1e1e" : "none", border: "1px solid " + (newTask.category === key ? val.color : "#2a2a2a"), color: val.color, fontFamily: "'Courier New', monospace", fontSize: 10, padding: "4px 10px", cursor: "pointer" }}>{val.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input type="date" value={newTask.date} onChange={e => setNewTask(p => ({ ...p, date: e.target.value }))} style={{ background: "transparent", border: "1px solid #2a2a2a", color: "#888", fontFamily: "'Courier New', monospace", fontSize: 11, padding: "4px 8px" }} />
            <select value={newTask.repeat} onChange={e => setNewTask(p => ({ ...p, repeat: e.target.value }))} style={{ background: "#111", border: "1px solid #2a2a2a", color: "#888", fontFamily: "'Courier New', monospace", fontSize: 11, padding: "4px 8px" }}>
              {Object.entries(REPEAT_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addTask} style={{ background: "#e8d5b0", color: "#0d0d0d", border: "none", fontFamily: "'Courier New', monospace", fontSize: 11, letterSpacing: 2, padding: "8px 20px", cursor: "pointer" }}>ДОБАВИТЬ</button>
            <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "1px solid #2a2a2a", color: "#555", fontFamily: "'Courier New', monospace", fontSize: 11, padding: "8px 16px", cursor: "pointer" }}>отмена</button>
          </div>
        </div>
      )}
      <button onClick={() => setShowAdd(p => !p)} style={{ position: "fixed", bottom: 24, right: 24, width: 52, height: 52, borderRadius: "50%", background: "#e8d5b0", border: "none", color: "#0d0d0d", fontSize: 24, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>{showAdd ? "×" : "+"}</button>
    </div>
  );
}
