import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Send,
  FileText,
  Settings,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
  ChevronDown,
} from "lucide-react";

const KNOWN_TOOLS = [
  "checkRunningQueries",
  "checkDatabaseLocks",
  "explainQuery",
  "getTableSchema",
  "checkTableIndexes",
  "listTables",
  "searchTroubleshootingPlaybook",
];

function detectTools(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  return KNOWN_TOOLS.filter((t) => lower.includes(t.toLowerCase()));
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [baseUrl, setBaseUrl] = useState("http://localhost:8080");
  const [showSettings, setShowSettings] = useState(false);

  const [sources, setSources] = useState([]);
  const [pasteText, setPasteText] = useState("");
  const [uploadStatus, setUploadStatus] = useState(null); // {type:'ok'|'error', msg}
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [isInvestigating, setIsInvestigating] = useState(false);
  const threadEndRef = useRef(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isInvestigating]);

  useEffect(() => {
    if (!uploadStatus) return;
    const t = setTimeout(() => setUploadStatus(null), 4000);
    return () => clearTimeout(t);
  }, [uploadStatus]);

  async function uploadText(content, sourceName) {
    setIsUploading(true);
    setUploadStatus(null);
    try {
      const res = await fetch(
        `${baseUrl}/api/knowledge/upload?source=${encodeURIComponent(sourceName)}`,
        {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: content,
        }
      );
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Request failed (${res.status})`);
      setSources((prev) => [
        { name: sourceName, addedAt: timeNow(), chars: content.length },
        ...prev,
      ]);
      setUploadStatus({ type: "ok", msg: `Ingested "${sourceName}"` });
    } catch (err) {
      setUploadStatus({
        type: "error",
        msg: `Couldn't reach the agent backend. Check it's running and CORS is enabled. (${err.message})`,
      });
    } finally {
      setIsUploading(false);
    }
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => uploadText(String(e.target.result || ""), file.name);
    reader.onerror = () =>
      setUploadStatus({ type: "error", msg: `Couldn't read file "${file.name}"` });
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handlePasteSubmit() {
    if (!pasteText.trim()) return;
    uploadText(pasteText.trim(), `manual-note-${Date.now()}`);
    setPasteText("");
  }

  async function askAgent() {
    const q = prompt.trim();
    if (!q || isInvestigating) return;
    setPrompt("");
    setMessages((prev) => [...prev, { role: "user", text: q, at: timeNow() }]);
    setIsInvestigating(true);
    try {
      const res = await fetch(
        `${baseUrl}/api/investigate?prompt=${encodeURIComponent(q)}`
      );
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Request failed (${res.status})`);
      setMessages((prev) => [
        ...prev,
        { role: "agent", text, at: timeNow(), tools: detectTools(text) },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          error: true,
          text: `Can't reach the agent. Confirm the Spring Boot backend is running at ${baseUrl} and that CORS is enabled for this origin.\n\nDetails: ${err.message}`,
          at: timeNow(),
        },
      ]);
    } finally {
      setIsInvestigating(false);
    }
  }

  return (
    <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

        * { box-sizing: border-box; }
        .dc-scroll::-webkit-scrollbar { width: 8px; }
        .dc-scroll::-webkit-scrollbar-track { background: transparent; }
        .dc-scroll::-webkit-scrollbar-thumb { background: #2A3752; border-radius: 8px; }

        @keyframes dc-trace {
          0% { stroke-dashoffset: 400; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes dc-pulse-dot {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes dc-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dc-msg { animation: dc-fade-in 0.25s ease-out; }

        .dc-input:focus { outline: none; border-color: #F2A93B !important; }
        .dc-btn-primary:hover:not(:disabled) { background: #FFB74E !important; }
        .dc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .dc-drop:hover { border-color: #3A4A6B !important; }

        @media (prefers-reduced-motion: reduce) {
          .dc-msg, .dc-trace-path { animation: none !important; }
        }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={styles.logoMark}>
            <Database size={16} color="#F2A93B" strokeWidth={2.25} />
          </div>
          <div>
            <div style={styles.title}>Diagnostic Console</div>
            <div style={styles.subtitle}>MySQL SRE Agent · Local</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={styles.statusPill}>
            <span style={styles.statusDot} />
            Target: {baseUrl.replace(/^https?:\/\//, "")}
          </div>
          <button
            onClick={() => setShowSettings((s) => !s)}
            style={styles.iconBtn}
            aria-label="Settings"
          >
            <Settings size={16} color="#8C99B4" />
          </button>
        </div>
      </header>

      {showSettings && (
        <div style={styles.settingsBar}>
          <label style={styles.settingsLabel}>Backend base URL</label>
          <input
            className="dc-input"
            style={styles.settingsInput}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:8080"
          />
          <span style={styles.settingsHint}>
            Requires CORS enabled on the Spring Boot app for this page's origin.
          </span>
        </div>
      )}

      <div style={styles.body}>
        {/* Left: Knowledge Base */}
        <aside style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <FileText size={13} color="#8C99B4" />
            <span>Knowledge base</span>
          </div>

          <div
            className="dc-drop"
            style={{
              ...styles.dropzone,
              borderColor: dragActive ? "#F2A93B" : "#26314A",
              background: dragActive ? "rgba(242,169,59,0.06)" : "transparent",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} color="#F2A93B" />
            <div style={styles.dropText}>
              Drop a runbook, schema doc, or postmortem (.txt / .md)
            </div>
            <div style={styles.dropSubtext}>or click to browse</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          <div style={styles.pasteBlock}>
            <textarea
              className="dc-input"
              style={styles.pasteArea}
              placeholder="Or paste a note directly — e.g. a schema detail or a fix that worked."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={3}
            />
            <button
              className="dc-btn-primary"
              style={styles.pasteBtn}
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim() || isUploading}
            >
              {isUploading ? (
                <Loader2 size={13} className="dc-spin" style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                "Add to knowledge base"
              )}
            </button>
          </div>

          {uploadStatus && (
            <div
              style={{
                ...styles.statusBanner,
                borderColor: uploadStatus.type === "ok" ? "#2A5C52" : "#5C2A34",
                color: uploadStatus.type === "ok" ? "#33D6C0" : "#F2596B",
              }}
            >
              {uploadStatus.type === "ok" ? (
                <CheckCircle2 size={13} />
              ) : (
                <AlertCircle size={13} />
              )}
              <span style={{ fontSize: 12 }}>{uploadStatus.msg}</span>
            </div>
          )}

          <div style={styles.sourceListLabel}>
            Ingested this session ({sources.length})
          </div>
          <div className="dc-scroll" style={styles.sourceList}>
            {sources.length === 0 && (
              <div style={styles.emptySources}>
                Nothing uploaded yet. The agent will only cite what's in the
                knowledge base.
              </div>
            )}
            {sources.map((s, i) => (
              <div key={i} style={styles.sourceChip}>
                <FileText size={12} color="#6E7C99" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.sourceChipName}>{s.name}</div>
                  <div style={styles.sourceChipMeta}>
                    {s.addedAt} · {s.chars} chars
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Right: Investigation */}
        <main style={styles.main}>
          {isInvestigating && (
            <div style={styles.traceBar}>
              <svg width="100%" height="20" viewBox="0 0 400 20" preserveAspectRatio="none">
                <path
                  className="dc-trace-path"
                  d="M0,10 L60,10 L75,3 L90,17 L105,10 L400,10"
                  fill="none"
                  stroke="#F2A93B"
                  strokeWidth="1.5"
                  strokeDasharray="400"
                  style={{ animation: "dc-trace 1.4s linear infinite" }}
                />
              </svg>
            </div>
          )}

          <div className="dc-scroll" style={styles.thread}>
            {messages.length === 0 && (
              <div style={styles.emptyThread}>
                <svg width="120" height="40" viewBox="0 0 120 40" style={{ marginBottom: 14 }}>
                  <path
                    d="M0,20 L40,20 L48,8 L56,32 L64,20 L120,20"
                    fill="none"
                    stroke="#2A3752"
                    strokeWidth="1.5"
                  />
                </svg>
                <div style={styles.emptyTitle}>No incident reported</div>
                <div style={styles.emptySubtitle}>
                  Describe a symptom — a timeout, a hang, a slow dashboard —
                  and the agent will investigate the live database.
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className="dc-msg"
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 14,
                }}
              >
                <div style={{ maxWidth: "78%" }}>
                  <div
                    style={{
                      ...styles.bubble,
                      ...(m.role === "user"
                        ? styles.bubbleUser
                        : m.error
                        ? styles.bubbleError
                        : styles.bubbleAgent),
                    }}
                  >
                    {m.text}
                  </div>
                  <div
                    style={{
                      ...styles.bubbleMeta,
                      justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <span>{m.at}</span>
                  </div>
                  {m.tools && m.tools.length > 0 && (
                    <div style={styles.toolRow}>
                      {m.tools.map((t) => (
                        <span key={t} style={styles.toolBadge}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isInvestigating && (
              <div style={{ display: "flex", marginBottom: 14 }}>
                <div style={{ ...styles.bubble, ...styles.bubbleAgent, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={styles.pulseDot} />
                  <span style={{ color: "#8C99B4", fontSize: 13 }}>
                    Investigating live database…
                  </span>
                </div>
              </div>
            )}
            <div ref={threadEndRef} />
          </div>

          <div style={styles.inputRow}>
            <textarea
              className="dc-input"
              style={styles.chatInput}
              placeholder="e.g. The orders dashboard is timing out during checkout…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  askAgent();
                }
              }}
              rows={1}
              disabled={isInvestigating}
            />
            <button
              className="dc-btn-primary"
              style={styles.sendBtn}
              onClick={askAgent}
              disabled={isInvestigating || !prompt.trim()}
            >
              <Send size={15} color="#0B1220" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    background: "#0B1220",
    color: "#E7ECF5",
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderBottom: "1px solid #1C2740",
    background: "#0E1626",
  },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 7,
    background: "#161F35",
    border: "1px solid #26314A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "0.02em",
  },
  subtitle: { fontSize: 11, color: "#6E7C99", marginTop: 1 },
  statusPill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', monospace",
    color: "#8C99B4",
    background: "#121B2E",
    border: "1px solid #26314A",
    borderRadius: 20,
    padding: "5px 10px",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#33D6C0",
    display: "inline-block",
  },
  iconBtn: {
    background: "transparent",
    border: "1px solid #26314A",
    borderRadius: 7,
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  settingsBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 20px",
    background: "#0E1626",
    borderBottom: "1px solid #1C2740",
  },
  settingsLabel: {
    fontSize: 11,
    color: "#6E7C99",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  settingsInput: {
    background: "#121B2E",
    border: "1px solid #26314A",
    borderRadius: 6,
    color: "#E7ECF5",
    fontSize: 12,
    fontFamily: "'IBM Plex Mono', monospace",
    padding: "6px 10px",
    width: 260,
  },
  settingsHint: { fontSize: 11, color: "#54617D" },
  body: { flex: 1, display: "flex", minHeight: 0 },
  sidebar: {
    width: 300,
    borderRight: "1px solid #1C2740",
    background: "#0D1526",
    display: "flex",
    flexDirection: "column",
    padding: 16,
    gap: 12,
    minHeight: 0,
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', monospace",
    color: "#8C99B4",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  dropzone: {
    border: "1.5px dashed #26314A",
    borderRadius: 10,
    padding: "18px 14px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
  },
  dropText: { fontSize: 12, color: "#B8C2D9", marginTop: 8, lineHeight: 1.4 },
  dropSubtext: { fontSize: 11, color: "#54617D", marginTop: 4 },
  pasteBlock: { display: "flex", flexDirection: "column", gap: 6 },
  pasteArea: {
    background: "#121B2E",
    border: "1px solid #26314A",
    borderRadius: 8,
    color: "#E7ECF5",
    fontSize: 12,
    padding: "8px 10px",
    resize: "vertical",
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
  pasteBtn: {
    background: "#F2A93B",
    color: "#0B1220",
    border: "none",
    borderRadius: 7,
    fontSize: 12,
    fontWeight: 600,
    padding: "8px 10px",
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  statusBanner: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid",
    borderRadius: 7,
    padding: "6px 9px",
    background: "#0F1830",
  },
  sourceListLabel: {
    fontSize: 10,
    color: "#54617D",
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginTop: 4,
  },
  sourceList: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minHeight: 0,
  },
  emptySources: {
    fontSize: 11.5,
    color: "#54617D",
    lineHeight: 1.5,
    padding: "8px 2px",
  },
  sourceChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#121B2E",
    border: "1px solid #1C2740",
    borderRadius: 7,
    padding: "7px 9px",
  },
  sourceChipName: {
    fontSize: 12,
    color: "#DCE3F0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  sourceChipMeta: { fontSize: 10, color: "#54617D", marginTop: 1 },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 },
  traceBar: { padding: "0 20px", background: "#0B1220" },
  thread: { flex: 1, overflowY: "auto", padding: "20px 24px", minHeight: 0 },
  emptyThread: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  emptyTitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 14,
    color: "#B8C2D9",
    marginBottom: 6,
  },
  emptySubtitle: { fontSize: 12.5, color: "#54617D", maxWidth: 320, lineHeight: 1.6 },
  bubble: {
    padding: "11px 14px",
    borderRadius: 10,
    fontSize: 13.5,
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
  },
  bubbleUser: {
    background: "#1B2A44",
    border: "1px solid #2A3D5F",
    color: "#E7ECF5",
  },
  bubbleAgent: {
    background: "#121B2E",
    border: "1px solid #1C2740",
    color: "#DCE3F0",
  },
  bubbleError: {
    background: "#1F1420",
    border: "1px solid #5C2A34",
    color: "#F2A9B0",
  },
  bubbleMeta: {
    display: "flex",
    fontSize: 10,
    color: "#3F4A63",
    marginTop: 4,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  toolRow: { display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 },
  toolBadge: {
    fontSize: 10,
    fontFamily: "'IBM Plex Mono', monospace",
    color: "#F2A93B",
    background: "rgba(242,169,59,0.08)",
    border: "1px solid rgba(242,169,59,0.25)",
    borderRadius: 5,
    padding: "2px 7px",
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#F2A93B",
    display: "inline-block",
    animation: "dc-pulse-dot 1.1s ease-in-out infinite",
  },
  inputRow: {
    display: "flex",
    gap: 10,
    padding: "14px 24px 18px",
    borderTop: "1px solid #1C2740",
    background: "#0D1526",
  },
  chatInput: {
    flex: 1,
    background: "#121B2E",
    border: "1px solid #26314A",
    borderRadius: 9,
    color: "#E7ECF5",
    fontSize: 13.5,
    padding: "11px 14px",
    resize: "none",
    fontFamily: "'IBM Plex Sans', sans-serif",
  },
  sendBtn: {
    width: 42,
    background: "#F2A93B",
    border: "none",
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
};