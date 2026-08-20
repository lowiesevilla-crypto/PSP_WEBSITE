"use client";

import Link from "next/link";
import { useState } from "react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | Date | null;
  createdAt: string | Date;
}

export function NotificationList({ initial }: { initial: NotificationItem[] }) {
  const [items, setItems] = useState(initial);

  async function markRead(id: string) {
    const response = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
    );
  }

  if (items.length === 0) {
    return <div className="app-panel"><p style={{ margin: 0, color: "#6b665c" }}>No notifications yet.</p></div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item) => (
        <article
          key={item.id}
          className="app-panel"
          style={{ borderLeft: item.readAt ? "4px solid #ddd5c1" : "4px solid #fec009" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <small style={{ color: "#806500", fontWeight: 900 }}>{item.type}</small>
              <h2 style={{ margin: "6px 0 8px", fontSize: "1.1rem" }}>{item.title}</h2>
              <p style={{ margin: 0, color: "#6b665c", lineHeight: 1.55 }}>{item.body}</p>
              <small style={{ display: "block", marginTop: 9, color: "#8a8378" }}>
                {new Intl.DateTimeFormat("en-PH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Manila",
                }).format(new Date(item.createdAt))}
              </small>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!item.readAt ? (
                <button className="btn" type="button" onClick={() => void markRead(item.id)} style={{ background: "#fff", border: "1px solid #ddd5c1" }}>
                  Mark read
                </button>
              ) : null}
              {item.href ? (
                <Link className="btn btn-primary" href={item.href} onClick={() => void markRead(item.id)}>
                  Open
                </Link>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
