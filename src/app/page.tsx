"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import Image from "next/image";

export default function Home() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // 新規予定入力用状態
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState("");
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [customItems, setCustomItems] = useState<string[]>([]);

  const timeSlots = [
    { label: "11:00 ~ 12:00", start: "11:00", end: "12:00" },
    { label: "12:10 ~ 13:10", start: "12:10", end: "13:10" },
    { label: "13:20 ~ 14:20", start: "13:20", end: "14:20" },
    { label: "14:30 ~ 15:30", start: "14:30", end: "15:30" },
    { label: "15:30 ~ 16:30", start: "15:30", end: "16:30" },
    { label: "16:40 ~ 17:40", start: "16:40", end: "17:40" },
    { label: "17:50 ~ 18:50", start: "17:50", end: "18:50" },
    { label: "19:00 ~ 20:00", start: "19:00", end: "20:00" },
  ];

  useEffect(() => {
    if (session) {
      fetchEvents();
      fetchTasks();
      
      const tzoffset = (new Date()).getTimezoneOffset() * 60000;
      const localISODate = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
      setDate(localISODate);

      const saved = localStorage.getItem("customCalendarItems");
      if (saved) {
        setCustomItems(JSON.parse(saved));
      }
    }
  }, [session]);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    }
  };

  const handleSaveCustomItem = () => {
    if (!summary) return;
    if (customItems.includes(summary)) return;
    const newItems = [...customItems, summary];
    setCustomItems(newItems);
    localStorage.setItem("customCalendarItems", JSON.stringify(newItems));
  };
  
  const handleRemoveCustomItem = (itemToRemove: string) => {
    const newItems = customItems.filter(item => item !== itemToRemove);
    setCustomItems(newItems);
    localStorage.setItem("customCalendarItems", JSON.stringify(newItems));
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch("/api/calendar");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Failed to fetch events", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary || !date || selectedTimeSlots.length === 0) {
      alert("内容、日付、時間帯をすべて入力してください。");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 選択された時間枠すべてに対して非同期で予定作成リクエストを送信
      const promises = selectedTimeSlots.map(idx => {
        const slot = timeSlots[idx];
        const startIso = `${date}T${slot.start}:00+09:00`;
        const endIso = `${date}T${slot.end}:00+09:00`;

        return fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary,
            start: startIso,
            end: endIso
          })
        }).then(async res => {
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to add event");
          }
          return res;
        });
      });

      await Promise.all(promises);
      
      setSummary("");
      setSelectedTimeSlots([]);
      fetchEvents(); // 予定を再取得して画面更新
      alert("選択した予定がすべて追加されました！");
    } catch (err: any) {
      console.error(err);
      alert(`エラー: ${err.message || "予定の追加でエラーが発生しました。"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  if (!session) {
    return (
      <main className={styles.container}>
        <div className={styles.loginCard}>
          <h1 className={styles.title}>Calendar Sync</h1>
          <p className={styles.subtitle}>Googleアカウントでログインして、スマートなスケジュール管理を始めましょう。</p>
          <button onClick={() => signIn("google")} className={styles.loginButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Googleでログイン
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title} style={{ margin: 0, fontSize: "1.5rem" }}>Calendar Sync</h1>
        <div className={styles.userInfo}>
          <span style={{ fontWeight: 500 }}>{session.user?.name}</span>
          {session.user?.image && (
             <img src={session.user.image} alt="アバター" className={styles.avatar} />
          )}
          <button onClick={() => signOut()} className={styles.logoutButton}>ログアウト</button>
        </div>
      </header>

      <div className={styles.dashboard}>
        {/* 今日の予定リスト（メインダッシュボード） */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>今日の予定</h2>
          
          {loadingEvents ? (
            <p className={styles.emptyState}>読み込み中...</p>
          ) : events.length === 0 ? (
            <p className={styles.emptyState}>今日の予定はありません。素晴らしい1日を！</p>
          ) : (
            <ul className={styles.eventList}>
              {events.map((event) => {
                const isAllDay = event.start.date;
                const startDate = new Date(event.start.dateTime || event.start.date);
                const endDate = new Date(event.end.dateTime || event.end.date);
                
                return (
                  <li key={event.id} className={styles.eventItem}>
                    <div className={styles.eventTitle}>{event.summary}</div>
                    <div className={styles.eventTime}>
                      {isAllDay ? (
                        "終日"
                      ) : (
                        `${startDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 予定作成フォーム */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>予定を追加</h2>
          <form onSubmit={handleAddEvent}>
            <div className={styles.formGroup}>
              <label className={styles.label}>内容</label>

              {/* 選択肢エリア */}
              {(tasks.length > 0 || customItems.length > 0) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.8rem" }}>
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSummary(task.title)}
                      style={{
                        padding: "0.4rem 0.8rem", borderRadius: "16px", border: "1px solid #fbbc05",
                        background: "#fffdf0", color: "#b98300", fontSize: "0.85rem", cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      ☑️ {task.title}
                    </button>
                  ))}
                  {customItems.map((cItem, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", background: "#f1f3f4", border: "1px solid #ddd", borderRadius: "16px", overflow: "hidden" }}>
                      <button
                        type="button"
                        onClick={() => setSummary(cItem)}
                        style={{ padding: "0.4rem 0.8rem", border: "none", background: "transparent", color: "#555", fontSize: "0.85rem", cursor: "pointer" }}
                      >
                        ⭐ {cItem}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomItem(cItem)}
                        style={{ padding: "0.4rem 0.6rem", border: "none", borderLeft: "1px solid #ddd", background: "#e8eaed", color: "#888", fontSize: "0.85rem", cursor: "pointer" }}
                        title="削除"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="例: 三者面談, ミーティング"
                  className={styles.input}
                  required
                />
                <button 
                  type="button" 
                  onClick={handleSaveCustomItem}
                  disabled={!summary}
                  style={{ 
                    whiteSpace: "nowrap", padding: "0 1rem", background: "#f8f9fa", border: "1px solid #ddd", 
                    borderRadius: "8px", cursor: summary ? "pointer" : "not-allowed", color: summary ? "#4285f4" : "#aaa",
                    fontWeight: 600
                  }}
                >
                  保存
                </button>
              </div>
              <small style={{ color: "#777", marginTop: "0.3rem", display: "block" }}>
                入力して「保存」を押すとよく使う項目に追加されます。TODOリストも自動連携されます。
              </small>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>日付</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>時間帯 (複数選択可)</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {timeSlots.map((slot, idx) => {
                  const isSelected = selectedTimeSlots.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedTimeSlots(selectedTimeSlots.filter(i => i !== idx));
                        } else {
                          setSelectedTimeSlots([...selectedTimeSlots, idx]);
                        }
                      }}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "8px",
                        border: `1px solid ${isSelected ? "#4285f4" : "#ddd"}`,
                        background: isSelected ? "#e8f0fe" : "white",
                        color: isSelected ? "#174ea6" : "#333",
                        cursor: "pointer",
                        fontWeight: isSelected ? 600 : 400,
                        transition: "all 0.2s ease"
                      }}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isSubmitting || !summary || selectedTimeSlots.length === 0}
            >
              {isSubmitting ? "追加中..." : "カレンダーに追加する"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
