import { useState, useEffect } from "react";
import {
  UploadCloud, ArrowRight, CheckCircle2, XCircle, Loader2,
  Save, Trash2, RefreshCw, Layers, Sparkles, AlertCircle, Table2,
} from "lucide-react";
import { Card, SectionHeader, Badge } from "../components/ui/primitives";
import { ErrorPanel } from "../components/ui/ErrorPanel";
import { api } from "../lib/api";

const CONFIDENCE_COLOR = (c) => {
  if (c >= 0.9) return "text-ok";
  if (c >= 0.7) return "text-accent";
  if (c >= 0.5) return "text-warn";
  return "text-err";
};

export default function ColumnMapping() {
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [detection, setDetection] = useState(null);
  const [mapping, setMapping] = useState([]);
  const [targetTable, setTargetTable] = useState("");
  const [schemas, setSchemas] = useState({});
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);

  useEffect(() => {
    api.mappingSchemas().then((d) => setSchemas(d.schemas)).catch(() => {});
    api.mappingTemplates().then((d) => setTemplates(d.templates)).catch(() => {});
  }, []);

  const handleFile = async (f) => {
    if (!f || !f.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are supported");
      return;
    }
    setFile(f);
    setError(null);
    setLoading(true);
    setStep("detecting");

    try {
      const result = await api.mappingDetect(f);
      setDetection(result);
      setTargetTable(result.detected.table);
      setMapping(result.suggestions);
      setStep("mapping");
    } catch (e) {
      setError(e.message);
      setStep("upload");
    } finally {
      setLoading(false);
    }
  };

  const handleTargetChange = (newTable) => {
    setTargetTable(newTable);
    // Rebuild suggestions for the new table
    const headers = detection.headers;
    const cols = Object.keys(schemas[newTable]?.columns || {});
    const newMapping = headers.map((h) => {
      const norm = h.toUpperCase().replace(/\s+/g, "_");
      const exact = cols.find((c) => c === norm);
      return {
        csvColumn: h,
        suggestedTarget: exact || null,
        confidence: exact ? 1.0 : 0,
      };
    });
    setMapping(newMapping);
  };

  const updateMapping = (csvColumn, targetColumn) => {
    setMapping((m) =>
      m.map((item) =>
        item.csvColumn === csvColumn
          ? { ...item, suggestedTarget: targetColumn || null }
          : item
      )
    );
  };

  const handleRun = async () => {
    setRunning(true);
    setError(null);

    try {
      const payload = mapping
        .filter((m) => m.suggestedTarget)
        .map((m) => ({
          csvColumn: m.csvColumn,
          targetColumn: m.suggestedTarget,
        }));

      const res = await api.mappingRun(file, targetTable, payload);
      setResult(res);
      setStep("done");
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!saveName.trim()) return;
    try {
      const payload = {
        name: saveName,
        targetTable,
        headers: detection.headers,
        mapping: mapping.map((m) => ({
          csvColumn: m.csvColumn,
          targetColumn: m.suggestedTarget,
        })),
      };
      await api.mappingSaveTemplate(payload);
      setSaveName("");
      setShowSave(false);
      const fresh = await api.mappingTemplates();
      setTemplates(fresh.templates);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await api.mappingDeleteTemplate(id);
      setTemplates(templates.filter((t) => t.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const reset = () => {
    setFile(null);
    setDetection(null);
    setMapping([]);
    setTargetTable("");
    setResult(null);
    setError(null);
    setStep("upload");
  };

  const targetCols = schemas[targetTable]?.columns || {};
  const unmappedRequired = Object.entries(targetCols)
    .filter(([col, spec]) => spec.required && !mapping.some((m) => m.suggestedTarget === col))
    .map(([col]) => col);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="accent">
            <Layers className="h-3 w-3" /> Data Ingestion
          </Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            Column Mapping
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Auto-detect CSV columns, map them to database fields, save as templates
          </p>
        </div>
        {step !== "upload" && (
          <button
            onClick={reset}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Start Over
          </button>
        )}
      </div>

      {error && (
        <Card className="border-err/30 bg-err/5 p-4">
          <div className="flex items-center gap-3 text-sm text-err">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        </Card>
      )}

      {/* Step: Upload */}
      {step === "upload" && (
        <>
          <Card className="p-10 text-center">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              id="csv-upload"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
                <UploadCloud className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink">
                Upload a CSV to start mapping
              </h3>
              <p className="mt-2 text-sm text-ink-soft">
                We'll auto-detect the target table and suggest column mappings
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg shadow-lg shadow-accent/20 hover:brightness-110">
                <UploadCloud className="h-4 w-4" /> Choose File
              </div>
            </label>
          </Card>

          {/* Templates */}
          {templates.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-line px-6 py-5">
                <h3 className="text-md font-semibold text-ink">Saved Templates</h3>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Uploaded CSVs matching these signatures will auto-map
                </p>
              </div>
              <div className="divide-y divide-line">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 px-6 py-3">
                    <Save className="h-4 w-4 text-accent" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-ink">{t.name}</div>
                      <div className="mt-0.5 text-2xs text-ink-mute">
                        Target: <span className="mono-num">{t.targetTable}</span> · Signature {t.signature}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="rounded-lg p-2 text-err transition hover:bg-err/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Step: Detecting */}
      {step === "detecting" && (
        <Card className="flex items-center justify-center p-16">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
            <p className="mt-4 text-sm text-ink-soft">Analyzing CSV headers…</p>
          </div>
        </Card>
      )}

      {/* Step: Mapping */}
      {step === "mapping" && detection && (
        <>
          {/* Detection banner */}
          <Card className="border-accent/30 bg-accent/5 p-5">
            <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent/15 text-accent">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xs font-semibold uppercase tracking-wider text-accent">
                  Auto-detected
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-ink">
                    {schemas[detection.detected.table]?.label || detection.detected.table}
                  </span>
                  <Badge variant="accent">
                    {(detection.detected.confidence * 100).toFixed(0)}% match
                  </Badge>
                  <span className="text-2xs text-ink-soft">
                    {detection.headers.length} columns detected
                  </span>
                </div>
              </div>
              <div>
                <label className="text-2xs font-semibold uppercase tracking-wider text-ink-mute">
                  Target Table
                </label>
                <select
                  value={targetTable}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  className="mt-1 block rounded-lg border border-line bg-bg px-3 py-2 text-xs text-ink outline-none focus:border-accent"
                >
                  {Object.entries(schemas).map(([key, s]) => (
                    <option key={key} value={key}>
                      {s.label} ({key})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Missing required fields */}
          {unmappedRequired.length > 0 && (
            <Card className="border-err/30 bg-err/5 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-err" />
                <div className="text-sm">
                  <div className="font-semibold text-err">Missing required columns</div>
                  <div className="mt-1 text-xs text-ink-soft">
                    Map these before running: <span className="mono-num text-err">{unmappedRequired.join(", ")}</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Mapping grid */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <h3 className="text-md font-semibold text-ink">Column Mapping</h3>
                <p className="mt-0.5 text-xs text-ink-soft">
                  Verify or override each column
                </p>
              </div>
              <button
                onClick={() => setShowSave(!showSave)}
                className="focus-ring inline-flex items-center gap-2 rounded-lg border border-line bg-bg-elevated px-3 py-2 text-xs font-semibold text-ink-soft transition hover:border-line-strong hover:text-ink"
              >
                <Save className="h-3.5 w-3.5" /> Save as Template
              </button>
            </div>

            {showSave && (
              <div className="flex gap-2 border-b border-line bg-bg-hover/30 px-6 py-4">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Template name (e.g., 'IIFL OTP Report')"
                  className="flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-xs text-ink placeholder-ink-mute outline-none focus:border-accent"
                />
                <button
                  onClick={handleSaveTemplate}
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg hover:brightness-110"
                >
                  Save
                </button>
              </div>
            )}

            <div className="divide-y divide-line">
              {mapping.map((m) => {
                const isMapped = !!m.suggestedTarget;
                return (
                  <div key={m.csvColumn} className="grid grid-cols-1 gap-4 px-6 py-3 md:grid-cols-[1fr_auto_1fr_auto]">
                    <div>
                      <div className="text-2xs uppercase tracking-wider text-ink-mute">
                        Your CSV Column
                      </div>
                      <div className="mono-num mt-1 text-sm text-ink">{m.csvColumn}</div>
                    </div>
                    <div className="hidden items-center justify-center md:flex">
                      <ArrowRight className="h-4 w-4 text-ink-mute" />
                    </div>
                    <div>
                      <div className="text-2xs uppercase tracking-wider text-ink-mute">
                        Database Column
                      </div>
                      <select
                        value={m.suggestedTarget || ""}
                        onChange={(e) => updateMapping(m.csvColumn, e.target.value)}
                        className={`mt-1 w-full rounded-lg border bg-bg px-3 py-2 text-xs outline-none ${
                          isMapped
                            ? "border-line text-ink focus:border-accent"
                            : "border-warn/40 text-ink-mute focus:border-warn"
                        }`}
                      >
                        <option value="">— skip this column —</option>
                        {Object.entries(targetCols).map(([col, spec]) => (
                          <option key={col} value={col}>
                            {col}
                            {spec.required ? " *required" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-end md:justify-center">
                      {isMapped ? (
                        <div className="text-right">
                          <CheckCircle2 className="inline h-4 w-4 text-ok" />
                          <div className={`mono-num mt-0.5 text-2xs ${CONFIDENCE_COLOR(m.confidence || 1)}`}>
                            {((m.confidence || 1) * 100).toFixed(0)}%
                          </div>
                        </div>
                      ) : (
                        <XCircle className="h-4 w-4 text-warn" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Preview */}
          {detection.preview && detection.preview.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b border-line px-6 py-5">
                <h3 className="flex items-center gap-2 text-md font-semibold text-ink">
                  <Table2 className="h-4 w-4 text-accent" /> Source Preview
                </h3>
                <p className="mt-0.5 text-xs text-ink-soft">
                  First {detection.preview.length} rows from your CSV
                </p>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg-subtle/60">
                    <tr>
                      {detection.headers.map((h) => (
                        <th key={h} className="mono-num whitespace-nowrap px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-ink-mute">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {detection.preview.map((row, i) => (
                      <tr key={i} className="hover:bg-bg-hover/40">
                        {detection.headers.map((h) => (
                          <td key={h} className="mono-num whitespace-nowrap px-3 py-2 text-ink-soft">
                            {String(row[h] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Run button */}
          <div className="flex justify-end">
            <button
              onClick={handleRun}
              disabled={running || unmappedRequired.length > 0}
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-bg shadow-lg shadow-accent/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {running ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Running ETL…</>
              ) : (
                <>Run ETL with this Mapping <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        </>
      )}

      {/* Step: Done */}
      {step === "done" && result && (
        <>
          <Card className={`p-6 ${result.etl.status === "SUCCESS" ? "border-ok/30 bg-ok/5" : "border-err/30 bg-err/5"}`}>
            <div className="flex items-start gap-4">
              <div className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl ${result.etl.status === "SUCCESS" ? "bg-ok/15 text-ok" : "bg-err/15 text-err"}`}>
                {result.etl.status === "SUCCESS" ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-ink">
                  {result.etl.status === "SUCCESS" ? "ETL completed successfully" : "ETL failed"}
                </div>
                <div className="mt-1 text-sm text-ink-soft">{result.etl.message}</div>

                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="File" value={result.filename} mono />
                  <Stat label="Target" value={result.targetTable} mono />
                  <Stat label="Rows In" value={result.etl.rows_in.toLocaleString()} mono />
                  <Stat label="Loaded" value={result.etl.rows_loaded.toLocaleString()} mono tone="text-ok" />
                  <Stat label="Dropped" value={result.etl.rows_dropped.toLocaleString()} mono tone="text-warn" />
                  <Stat label="Duration" value={`${result.etl.duration_sec || 0}s`} mono />
                </div>
              </div>
            </div>
          </Card>

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="focus-ring rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-bg hover:brightness-110"
            >
              Map Another File
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, mono = false, tone = "text-ink" }) {
  return (
    <div>
      <div className="text-2xs font-semibold uppercase tracking-wider text-ink-mute">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold ${mono ? "mono-num" : ""} ${tone}`}>{value}</div>
    </div>
  );
}