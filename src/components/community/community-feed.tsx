"use client";

import { FormEvent, useEffect, useState } from "react";

interface FeedPost {
  id: string;
  body: string;
  audience: "CHAPTER" | "NATIONAL";
  createdAt: string;
  isPinned: boolean;
  authorUserId: string;
  author: { id: string; displayName: string };
  chapter: { id: string; code: string; name: string } | null;
  images: Array<{ id: string; url: string; mimeType: string; sizeBytes: number }>;
  comments: Array<{ id: string; body: string; createdAt: string; author: { id: string; displayName: string } }>;
}

export function CommunityFeed({ currentUserId, canPostNational }: { currentUserId: string; canPostNational: boolean }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"CHAPTER" | "NATIONAL">("CHAPTER");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/community/posts", { headers: { Accept: "application/json" }, cache: "no-store" });
      const payload = (await response.json()) as { posts?: FeedPost[]; message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to load community feed.");
      setPosts(payload.posts ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load community feed.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function createPost(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = new FormData();
      data.set("body", body);
      data.set("audience", audience);
      files.forEach((file) => data.append("images", file));
      const response = await fetch("/api/community/posts", { method: "POST", body: data });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Unable to create post.");
      setBody("");
      setFiles([]);
      setAudience("CHAPTER");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create post.");
    } finally {
      setSubmitting(false);
    }
  }

  async function addComment(postId: string, text: string) {
    const response = await fetch(`/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ body: text }),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) throw new Error(payload.message ?? "Unable to add comment.");
    await load();
  }

  async function deletePost(postId: string) {
    if (!window.confirm("Delete this post?")) return;
    const response = await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
    if (!response.ok) return;
    setPosts((current) => current.filter((post) => post.id !== postId));
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <form className="app-panel" onSubmit={createPost} style={{ display: "grid", gap: 13 }}>
        <h2 style={{ margin: 0 }}>Share an Update</h2>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Share an update with your PSP community…"
          required
          style={{ width: "100%", border: "1px solid #ddd5c1", borderRadius: 14, padding: 13, font: "inherit", resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontWeight: 800 }}>
            Audience&nbsp;
            <select value={audience} onChange={(event) => setAudience(event.target.value as "CHAPTER" | "NATIONAL")} style={{ minHeight: 40, borderRadius: 10, border: "1px solid #ddd5c1", padding: "0 9px" }}>
              <option value="CHAPTER">My Chapter</option>
              {canPostNational ? <option value="NATIONAL">All Members</option> : null}
            </select>
          </label>
          <label className="btn" style={{ border: "1px solid #ddd5c1", background: "#fff", cursor: "pointer" }}>
            Add Images
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              hidden
              onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 4))}
            />
          </label>
          {files.length ? <span style={{ color: "#6b665c", fontSize: ".85rem" }}>{files.length} image(s) selected</span> : null}
          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ marginLeft: "auto" }}>
            {submitting ? "Posting…" : "Post Update"}
          </button>
        </div>
      </form>

      {error ? <div role="alert" style={{ padding: 13, borderRadius: 12, background: "#fff1f1", color: "#7b2424" }}>{error}</div> : null}
      {loading ? <div className="app-panel">Loading community…</div> : null}

      {posts.map((post) => (
        <article className="app-panel" key={post.id} style={{ display: "grid", gap: 13 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <strong>{post.author.displayName}</strong>
              <div style={{ color: "#7a7368", fontSize: ".82rem", marginTop: 3 }}>
                {post.audience === "NATIONAL" ? "All Members" : post.chapter?.name ?? "Chapter"} · {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(post.createdAt))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {post.isPinned ? <span style={{ fontSize: ".75rem", fontWeight: 900, color: "#806500" }}>PINNED</span> : null}
              {post.authorUserId === currentUserId ? <button type="button" className="btn" onClick={() => void deletePost(post.id)} style={{ background: "#fff", border: "1px solid #ddd5c1" }}>Delete</button> : null}
            </div>
          </div>
          <p style={{ margin: 0, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{post.body}</p>
          {post.images.length ? (
            <div style={{ display: "grid", gridTemplateColumns: post.images.length === 1 ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 8 }}>
              {post.images.map((image) => <img key={image.id} src={image.url} alt="Post attachment" style={{ width: "100%", maxHeight: 520, objectFit: "cover", borderRadius: 12 }} />)}
            </div>
          ) : null}
          <div style={{ borderTop: "1px solid #eee7d8", paddingTop: 11, display: "grid", gap: 9 }}>
            {post.comments.map((comment) => (
              <div key={comment.id} style={{ padding: "9px 11px", borderRadius: 12, background: "#f7f3e9" }}>
                <strong style={{ fontSize: ".85rem" }}>{comment.author.displayName}</strong>
                <div style={{ marginTop: 3 }}>{comment.body}</div>
              </div>
            ))}
            <CommentComposer onSubmit={(text) => addComment(post.id, text)} />
          </div>
        </article>
      ))}

      {!loading && posts.length === 0 ? <div className="app-panel"><p style={{ margin: 0, color: "#6b665c" }}>No community posts yet. Be the first to share an update.</p></div> : null}
    </div>
  );
}

function CommentComposer({ onSubmit }: { onSubmit: (text: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim()) return;
        setBusy(true);
        void onSubmit(text).then(() => setText("")).finally(() => setBusy(false));
      }}
      style={{ display: "flex", gap: 8 }}
    >
      <input value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} placeholder="Write a comment…" style={{ flex: 1, minWidth: 0, border: "1px solid #ddd5c1", borderRadius: 12, padding: "10px 12px" }} />
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "…" : "Comment"}</button>
    </form>
  );
}
