import { useState, useRef, useEffect } from "react";
import {
  Sparkles, Send, Loader2, Table2, Code2, Bot, User,
  Lightbulb, AlertCircle, Cpu, Download, Upload, Trash2,
  FileJson, FileSpreadsheet, CheckCircle2,
} from "lucide-react";
import { Card, Badge } from "../components/ui/primitives";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_IMPORT_QUESTIONS = 20;

const WELCOME = {
  role: "assistant",
  type: "welcome",
  content:
    "Hi! Ask me anything about your data in plain English. I'll generate the SQL and return live results from MySQL.",
};

/* ─────────────── Export / import helpers ─────────────── */

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCsv(rows) {
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  return lines.join("\r\n");
}

function slug(text) {
  return (
    (text || "query-result")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "query-result"
  );
}

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

function exportRowsCsv(rows, question) {
  // BOM so Excel opens UTF-8 correctly
  downloadFile(`${slug(question)}.csv`, "\uFEFF" + rowsToCsv(rows), "text/csv;charset=utf-8");
}

function exportRowsJson(rows, question) {
  downloadFile(`${slug(question)}.json`, JSON.stringify(rows, null, 2), "application/json");
}

function isValidMessage(m) {
  if (!m || typeof m !== "object") return false;
  if (m.role === "user") return typeof m.content === "string" && m.content.trim() !== "";
  if (m.role === "assistant") {
    if (m.type === "welcome" || m.type === "error") return typeof m.content === "string";
    if (m.type === "result") return m.data && typeof m.data === "object";
  }
  return false;
}

/**
 * Turn an uploaded file into either a saved chat or a list of questions.
 * Returns { kind: "chat", messages } or { kind: "questions", questions }.
 */
function parseImport(text, filename) {
  const isJson = filename.toLowerCase().endsWith(".json");

  if (isJson) {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : data?.messages;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error("JSON file has no messages or questions.");
    }

    // Plain array of strings → questions
    if (list.every((x) => typeof x === "string")) {
      const questions = list.map((s) => s.trim()).filter(Boolean);
      return { kind: "questions", questions: questions.slice(0, MAX_IMPORT_QUESTIONS) };
    }

    // Saved chat
    const messages = list.filter(isValidMessage);
    if (messages.length === 0) {
      throw new Error("No valid chat messages found in this file.");
    }
    if (messages[0].type !== "welcome") messages.unshift(WELCOME);
    return { kind: "chat", messages };
  }

  // .txt / .csv → one question per line
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^"(.*)"$/, "$1").trim())
    .filter(Boolean);
  if (lines.length && /^(question|questions|q)$/i.test(lines[0])) lines.shift();
  if (lines.length === 0) throw new Error("No questions found in this file.");
  return { kind: "questions", questions: lines.slice(0, MAX_IMPORT_QUESTIONS) };
}

/* ─────────────── Page ─────────────── */

export default function AiAssistant() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [examples, setExamples] = useState([]);
  const [provider, setProvider] = useState(null);
  const [notice, setNotice] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/ai/examples`)
      .then((r) => r.json())
      .then((d) => setExamples(d.examples || []))
      .catch(() => {});

    fetch(`${API_BASE}/api/ai/provider`)
      .then((r) => r.json())
      .then(setProvider)
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send one question and append the user + assistant messages.
  const runQuestion = async (question) => {
    setMessages((m) => [...m, { role: "user", content: question }]);
    try {
      const res = await fetch(`${API_BASE}/api/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: question }),
      });
      const data = await res.json();
      if (!res.ok && !data.error) throw new Error(`Request failed (${res.status})`);
      setMessages((m) => [...m, { role: "assistant", type: "result", question, data }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", type: "error", content: e.message }]);
    }
  };

  const ask = async (question) => {
    if (!question.trim() || loading) return;
    setInput("");
    setNotice(null);
    setLoading(true);
    try {
      await runQuestion(question.trim());
    } finally {
      setLoading(false);
    }
  };

  /* ── Export whole chat ── */
  const hasConversation = messages.some((m) => m.role === "user");

  const exportChat = () => {
    const payload = {
      app: "ai-assistant",
      version: 1,
      exportedAt: new Date().toISOString(),
      messages,
    };
    downloadFile(`ai-chat-${stamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
    setNotice({ type: "success", text: "Chat exported. You can import this file later to restore it." });
  };

  /* ── Import chat or questions ── */
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file || loading) return;

    setNotice(null);

    if (file.size > MAX_IMPORT_BYTES) {
      setNotice({ type: "error", text: "File is too large (max 5 MB)." });
      return;
    }

    let parsed;
    try {
      parsed = parseImport(await file.text(), file.name);
    } catch (err) {
      setNotice({ type: "error", text: `Import failed: ${err.message}` });
      return;
    }

    if (parsed.kind === "chat") {
      if (hasConversation && !window.confirm("Replace the current conversation with the imported chat?")) {
        return;
      }
      setMessages(parsed.messages);
      setNotice({
        type: "success",
        text: `Imported ${parsed.messages.length - 1} messages from ${file.name}.`,
      });
      return;
    }

    // Question list → run one by one
    setLoading(true);
    setNotice({
      type: "info",
      text: `Running ${parsed.questions.length} question${parsed.questions.length !== 1 ? "s" : ""} from ${file.name}…`,
    });
    try {
      for (const q of parsed.questions) {
        await runQuestion(q);
      }
      setNotice({
        type: "success",
        text: `Finished ${parsed.questions.length} question${parsed.questions.length !== 1 ? "s" : ""} from ${file.name}.`,
      });
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (!hasConversation || window.confirm("Clear this conversation?")) {
      setMessages([WELCOME]);
      setNotice(null);
    }
  };

  const noticeStyle = {
    success: "border-ok/30 bg-ok/5 text-ok",
    error: "border-err/30 bg-err/5 text-err",
    info: "border-accent/30 bg-accent/5 text-accent",
  };

  const toolbarBtn =
    "focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="accent">
            <Sparkles className="h-3 w-3" /> AI Assistant
          </Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            Ask Your Data
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Natural language → SQL → Live MySQL results
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {provider && (
            <div className="flex items-center gap-3 rounded-lg border border-line bg-bg-elevated px-3 py-2">
              <Cpu className="h-3.5 w-3.5 text-accent" />
              <div>
                <div className="text-2xs uppercase tracking-wider text-ink-mute">
                  Provider
                </div>
                <div className="text-xs font-semibold capitalize text-ink">
                  {provider.provider}
                </div>
              </div>
              <div className="border-l border-line pl-3">
                <div className="text-2xs uppercase tracking-wider text-ink-mute">
                  Model
                </div>
                <div className="mono-num text-2xs text-ink-soft">
                  {provider.model}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import / export toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt,.csv"
          className="hidden"
          onChange={handleImport}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className={toolbarBtn}
          title="Import a saved chat (.json) or a list of questions (.txt, .csv, .json)"
        >
          <Upload className="h-3.5 w-3.5" /> Import
        </button>
        <button
          onClick={exportChat}
          disabled={!hasConversation}
          className={toolbarBtn}
          title="Download this conversation as JSON"
        >
          <Download className="h-3.5 w-3.5" /> Export chat
        </button>
        <button
          onClick={clearChat}
          disabled={loading || !hasConversation}
          className={toolbarBtn}
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
        <span className="text-2xs text-ink-mute">
          Import: saved chat (.json) or questions, one per line (.txt / .csv) · max {MAX_IMPORT_QUESTIONS}
        </span>
      </div>

      {notice && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-xs ${noticeStyle[notice.type]}`}>
          {notice.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : notice.type === "error" ? (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
          )}
          <span className="text-ink-soft">{notice.text}</span>
        </div>
      )}

      <Card className="flex h-[calc(100vh-340px)] min-h-[500px] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-6 scrollbar-thin">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-bg">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-bg-hover/40 px-4 py-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                <span className="text-sm text-ink-soft">Generating SQL…</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {messages.length <= 1 && examples.length > 0 && (
          <div className="border-t border-line px-6 py-4">
            <div className="mb-2 flex items-center gap-2 text-2xs font-semibold uppercase tracking-widest text-ink-mute">
              <Lightbulb className="h-3 w-3" /> Try these
            </div>
            <div className="flex flex-wrap gap-2">
              {examples.slice(0, 8).map((ex, i) => (
                <button
                  key={i}
                  onClick={() => ask(ex)}
                  className="rounded-lg border border-line bg-bg-hover/40 px-3 py-1.5 text-xs text-ink-soft transition hover:border-accent/40 hover:text-accent"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-line bg-bg-subtle/50 px-4 py-3">
          <input
            type="text"
            placeholder="Ask about your data…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
            disabled={loading}
            className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink placeholder-ink-mute outline-none focus:border-accent"
          />
          <button
            onClick={() => ask(input)}
            disabled={loading || !input.trim()}
            className="focus-ring grid h-9 w-9 place-items-center rounded-lg bg-accent text-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ─────────────── Message bubble ─────────────── */

function MessageBubble({ msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex gap-3">
        <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
          <User className="h-4 w-4" />
        </div>
        <div className="flex-1 rounded-lg bg-accent/5 px-4 py-3 text-sm text-ink">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === "welcome") {
    return (
      <div className="flex gap-3">
        <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-accent text-bg">
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1 rounded-lg bg-bg-hover/40 px-4 py-3 text-sm text-ink-soft">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === "error") {
    return (
      <div className="flex gap-3">
        <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-err/15 text-err">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="flex-1 rounded-lg border border-err/30 bg-err/5 px-4 py-3 text-sm text-err">
          {msg.content}
        </div>
      </div>
    );
  }

  if (msg.type === "result") {
    const d = msg.data;
    const hasRows = Array.isArray(d.rows) && d.rows.length > 0;
    return (
      <div className="flex gap-3">
        <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-accent text-bg">
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          {d.error ? (
            <div className="rounded-lg border border-err/30 bg-err/5 px-4 py-3">
              <div className="text-xs font-semibold text-err">Error</div>
              <div className="mt-1 text-xs text-ink-soft">{d.error}</div>
              {d.sql && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-2xs font-semibold uppercase tracking-wider text-ink-mute">
                    Attempted SQL
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded bg-bg px-3 py-2 font-mono text-2xs text-ink-soft">
                    {d.sql}
                  </pre>
                </details>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-bg-hover/40 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-accent" />
                    <span className="text-xs font-semibold text-accent">
                      Query Result
                    </span>
                  </div>
                  {d.provider && (
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-accent">
                      {d.provider}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-2xs text-ink-mute">
                    {d.row_count} row{d.row_count !== 1 ? "s" : ""} returned
                  </div>
                  {hasRows && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportRowsCsv(d.rows, msg.question)}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-elevated px-2.5 py-1 text-2xs font-semibold text-ink-soft transition hover:border-accent/40 hover:text-accent"
                        title="Download all rows as CSV"
                      >
                        <FileSpreadsheet className="h-3 w-3" /> CSV
                      </button>
                      <button
                        onClick={() => exportRowsJson(d.rows, msg.question)}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-elevated px-2.5 py-1 text-2xs font-semibold text-ink-soft transition hover:border-accent/40 hover:text-accent"
                        title="Download all rows as JSON"
                      >
                        <FileJson className="h-3 w-3" /> JSON
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {d.sql && (
                <details className="rounded-lg border border-line bg-bg-subtle/40">
                  <summary className="cursor-pointer px-4 py-2 text-2xs font-semibold uppercase tracking-widest text-ink-mute hover:text-ink-soft">
                    <Code2 className="mr-2 inline h-3 w-3" /> View Generated SQL
                  </summary>
                  <pre className="overflow-x-auto scrollbar-thin px-4 py-3 font-mono text-2xs text-ink-soft">
                    {d.sql}
                  </pre>
                </details>
              )}

              {hasRows && (
                <div className="overflow-hidden rounded-lg border border-line">
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-bg-subtle/60">
                        <tr>
                          {Object.keys(d.rows[0]).map((k) => (
                            <th
                              key={k}
                              className="whitespace-nowrap px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-ink-mute"
                            >
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {d.rows.slice(0, 25).map((row, i) => (
                          <tr key={i} className="hover:bg-bg-hover/40">
                            {Object.values(row).map((v, j) => (
                              <td
                                key={j}
                                className="whitespace-nowrap px-3 py-2 text-ink-soft"
                              >
                                {v === null ? "—" : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {d.rows.length > 25 && (
                    <div className="border-t border-line px-3 py-2 text-center text-2xs text-ink-mute">
                      Showing first 25 of {d.rows.length} rows · exports include all rows
                    </div>
                  )}
                </div>
              )}

              {d.rows && d.rows.length === 0 && (
                <div className="rounded-lg border border-line bg-bg-hover/30 px-4 py-3 text-center text-xs text-ink-mute">
                  <Table2 className="mx-auto mb-2 h-5 w-5" />
                  Query returned 0 rows
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}