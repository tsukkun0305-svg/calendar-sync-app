"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import Image from "next/image";

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

export default function Home() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  const [date, setDate] = useState("");
  const [slotContents, setSlotContents] = useState<Record<number, string>>({});
  const [focusedSlot, setFocusedSlot] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [newCustomTitle, setNewCustomTitle] = useState(""); // TODO/お気に入り追加用の一時保管

  useEffect(() => {
    if (session) {
      if (!date) {
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localISODate = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
        setDate(localISODate);
      }
      
      fetchTasks();
      
      const saved = localStorage.getItem("customCalendarItems");
      if (saved) {
        setCustomItems(JSON.parse(saved));
      }
    }
  }, [session]);

  useEffect(() => {
    if (session && date) {
      loadEventsForDate(date);
      setSlotContents({}); // 日付が変わったら入力内容をリセット
    }
  }, [date, session]);

  const loadEventsForDate = async (targetDate: string) => {
    setLoadingEvents(true);
    try {
      const startOfDay = `${targetDate}T00:00:00+09:00`;
      const endOfDay = `${targetDate}T23:59:59+09:00`;
      const res = await fetch(`/api/calendar?timeMin=${encodeURIComponent(startOfDay)}&timeMax=${encodeURIComponent(endOfDay)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const nonAllDayEvents = (data.events || []).filter((e: any) => !e.start.date);
        setEvents(nonAllDayEvents);
      } else {
        const errorData = await res.json();
        console.error("Calendar API Error:", errorData);
        const errMsg = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
        alert(`【カレンダー連携エラー】\n${errMsg}\n\n※一度右上の「ログアウト」から再ログインをお試しください。`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks", { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      } else {
        const errorData = await res.json();
        console.error("Failed to fetch tasks:", errorData);
        const errMsg = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
        alert(`【TODO連携エラー】\n${errMsg}\n\n※Google Tasks APIが有効でないか、再ログインが必要です。`);
      }
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    }
  };

  const handleSaveCustomItem = () => {
    if (!newCustomTitle) return;
    if (customItems.includes(newCustomTitle)) return;
    const newItems = [...customItems, newCustomTitle];
    setCustomItems(newItems);
    localStorage.setItem("customCalendarItems", JSON.stringify(newItems));
    setNewCustomTitle("");
  };
  
  const handleRemoveCustomItem = (itemToRemove: string) => {
    const newItems = customItems.filter(item => item !== itemToRemove);
    setCustomItems(newItems);
    localStorage.setItem("customCalendarItems", JSON.stringify(newItems));
  };

  const handleChipClick = (text: string) => {
    if (focusedSlot !== null) {
      setSlotContents({ ...slotContents, [focusedSlot]: text });
    } else {
      // 最初の空いている枠を探して入れる
      const emptyIdx = timeSlots.findIndex((_, idx) => {
        const booked = getBookedEvent(idx);
        const currentText = slotContents[idx] !== undefined ? slotContents[idx] : (booked?.summary || "");
        return currentText === "";
      });
      if (emptyIdx !== -1) {
        setSlotContents({ ...slotContents, [emptyIdx]: text });
        setFocusedSlot(emptyIdx);
      } else {
        alert("空いている場所がありません。");
      }
    }
  };

  const handleBatchSubmit = async () => {
    const tasksToRun: Promise<any>[] = [];

    timeSlots.forEach((slot, idx) => {
      const bookedEvent = getBookedEvent(idx);
      const originalText = bookedEvent?.summary || "";
      const currentText = slotContents[idx] !== undefined ? slotContents[idx] : originalText;

      if (currentText === originalText) return;

      const startIso = `${date}T${slot.start}:00+09:00`;
      const endIso = `${date}T${slot.end}:00+09:00`;

      if (bookedEvent && currentText.trim() === "") {
        // 削除
        tasksToRun.push(fetch(`/api/calendar?eventId=${bookedEvent.id}`, { method: "DELETE" }).then(res => res.json()));
      } else if (bookedEvent && currentText.trim() !== "") {
        // 更新 (PUT)
        tasksToRun.push(fetch("/api/calendar", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: bookedEvent.id, summary: currentText, start: startIso, end: endIso })
        }).then(res => res.json()));
      } else if (!bookedEvent && currentText.trim() !== "") {
        // 新規作成 (POST)
        tasksToRun.push(fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ summary: currentText, start: startIso, end: endIso })
        }).then(res => res.json()));
      }
    });

    if (tasksToRun.length === 0) {
      alert("変更された予定がありません。");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await Promise.all(tasksToRun);
      setSlotContents({});
      setFocusedSlot(null);
      loadEventsForDate(date);
      alert("変更をGoogleカレンダーに反映しました！");
    } catch (err: any) {
      console.error(err);
      alert("予定の更新でエラーが発生しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBookedEvent = (slotIndex: number) => {
    const slot = timeSlots[slotIndex];
    if (!date) return null;
    
    const slotStartObj = new Date(`${date}T${slot.start}:00+09:00`);
    const slotEndObj = new Date(`${date}T${slot.end}:00+09:00`);

    return events.find(event => {
      // 終日予定の場合はブロック判定をしない（好みに応じて変更可能）
      if (event.start.date) return false;
      
      const eventStart = new Date(event.start.dateTime || event.start.date);
      const eventEnd = new Date(event.end.dateTime || event.end.date);
      
      // 時間が少しでも被っていれば予約済みとする
      return eventStart < slotEndObj && eventEnd > slotStartObj;
    });
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
        <section className={styles.card} style={{ gridColumn: "1 / -1" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "2px solid #f0f0f0", paddingBottom: "1rem" }}>
            <h2 className={styles.cardTitle} style={{ margin: 0, border: "none", padding: 0 }}>予定を一括登録</h2>
            <div className={styles.datePickerWrapper}>
              <label style={{ marginRight: "0.5rem", fontWeight: 600, color: "#333" }}>対象日:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={styles.input}
                style={{ width: "auto" }}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr) 2fr", gap: "2rem" }}>
            
            {/* 左パネル: TODO & カスタム項目 */}
            <div className={styles.chipsPanel}>
              <h3 style={{ fontSize: "1rem", color: "#555", marginBottom: "1rem" }}>選択肢（クリックで入力枠に挿入）</h3>
              
              {(tasks.length > 0 || customItems.length > 0) ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                  {tasks.map((task) => (
                    <button key={task.id} type="button" onClick={() => handleChipClick(task.title)} className={styles.taskChip}>
                      ☑️ {task.title}
                    </button>
                  ))}
                  {customItems.map((cItem, i) => (
                    <div key={i} className={styles.customChip}>
                      <button type="button" onClick={() => handleChipClick(cItem)} className={styles.customChipText}>
                        ⭐ {cItem}
                      </button>
                      <button type="button" onClick={() => handleRemoveCustomItem(cItem)} className={styles.customChipDelete} title="削除">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#aaa", fontSize: "0.9rem" }}>TODOがありません</p>
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}>
                <input type="text" value={newCustomTitle} onChange={(e) => setNewCustomTitle(e.target.value)} placeholder="よく使う項目を追加..." className={styles.input} style={{ flex: 1, padding: "0.5rem" }} />
                <button type="button" onClick={handleSaveCustomItem} disabled={!newCustomTitle} className={styles.saveBtn} style={{ cursor: newCustomTitle ? "pointer" : "not-allowed" }}>保存</button>
              </div>
            </div>

            {/* 右パネル: タイムスロット一覧 */}
            <div className={styles.slotsPanel}>
              <div className={styles.slotGrid}>
                {timeSlots.map((slot, idx) => {
                  const bookedEvent = getBookedEvent(idx);
                  const isBooked = !!bookedEvent;
                  const isFocused = focusedSlot === idx;

                  return (
                    <div key={idx} className={`${styles.slotRow} ${isFocused ? styles.slotRowFocused : ''}`}>
                      <div className={styles.slotTime}>{slot.label}</div>
                      <div className={styles.slotInputWrapper}>
                        {loadingEvents ? (
                          <div className={styles.loadingSlot}>確認中...</div>
                        ) : (
                          <div style={{ display: 'flex', width: '100%', alignItems: 'center', backgroundColor: isBooked ? "#fef2f2" : "transparent" }}>
                            {isBooked && (
                              <span style={{ 
                                fontWeight: "bold", 
                                color: "#ef4444", 
                                paddingLeft: "1rem",
                                fontSize: "0.9rem",
                                whiteSpace: "nowrap"
                              }}>
                                [予定あり]
                              </span>
                            )}
                            <input
                              type="text"
                              placeholder={isBooked ? "予定を空にして保存すると削除されます" : "予定の内容を入力..."}
                              value={slotContents[idx] !== undefined ? slotContents[idx] : (bookedEvent?.summary || "")}
                              onFocus={() => setFocusedSlot(idx)}
                              onChange={(e) => setSlotContents({ ...slotContents, [idx]: e.target.value })}
                              className={styles.slotInput}
                              style={{ 
                                backgroundColor: "transparent", 
                                color: isBooked ? "#333" : "inherit", 
                                paddingLeft: isBooked ? "0.5rem" : "1rem" 
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: "2rem", textAlign: "right" }}>
                <button 
                  type="button" 
                  onClick={handleBatchSubmit}
                  className={styles.submitButton}
                  disabled={isSubmitting || !timeSlots.some((slot, idx) => {
                    const originalText = getBookedEvent(idx)?.summary || "";
                    const currentText = slotContents[idx] !== undefined ? slotContents[idx] : originalText;
                    return currentText !== originalText;
                  })}
                  style={{ width: "auto", minWidth: "200px" }}
                >
                  {isSubmitting ? "処理中..." : "変更をまとめて反映する"}
                </button>
              </div>
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}
