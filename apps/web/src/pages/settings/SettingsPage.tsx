import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIcon, DatabaseIcon, FileTextIcon, FlaskConicalIcon, PaletteIcon, PlusIcon, SettingsIcon, ShieldCheckIcon, SlidersHorizontalIcon, WalletCardsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { tradingPiApi } from "@/api/client";
import type { ThemeMode } from "@/core/types";
import { useSettingsStore } from "@/lib/settingsStore";
import { Field, Info, Panel, SaveButton, SavedLine } from "./components";
import { useLocalSetting } from "./useLocalSetting";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({ queryKey: ["config"], queryFn: () => tradingPiApi.config().catch(() => null) });
  const { data: rules } = useQuery({ queryKey: ["user-rules"], queryFn: () => tradingPiApi.userRules().catch(() => []) });
  const { data: systemPrompt } = useQuery({ queryKey: ["system-prompt"], queryFn: () => fetch("/api/agent/system-prompt").then((r) => r.json()).catch(() => null) });

  // ── All settings state from global store (single source of truth) ──
  // Model / thinking / compaction — read from store, sync from backend config
  const modelId = useSettingsStore((s) => s.currentModel?.id ?? "default");
  const setModelId = (id: string) => useSettingsStore.getState().setCurrentModel({ id });
  const thinkingLevel = useSettingsStore((s) => s.thinkingLevel);
  const setThinkingLevel = useSettingsStore((s) => s.setThinkingLevel);
  const autoCompaction = useSettingsStore((s) => s.autoCompaction);
  const setAutoCompaction = useSettingsStore((s) => s.setAutoCompaction);
  const showThinking = useSettingsStore((s) => s.showThinking);
  const setShowThinking = useSettingsStore((s) => s.setShowThinking);

  // Trading preferences — also unified into store reads
  const [maxSize, setMaxSize] = useLocalSetting("tp-max-position-size", "1");
  const [maxPositions, setMaxPositions] = useLocalSetting("tp-max-positions", "3");
  const [dailyLoss, setDailyLoss] = useLocalSetting("tp-daily-loss-limit", "3");
  const [deepResearchSteps, setDeepResearchSteps] = useLocalSetting("tp-deep-research-steps", "5");
  const [deepResearchMode, setDeepResearchMode] = useLocalSetting("tp-deep-research-mode", "builtin");
  const [deepResearchEnabled, setDeepResearchEnabled] = useLocalSetting("tp-deep-research-enabled", "true");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: "",
    exa: "",
    jina: "",
    reddit: "",
    polymarket: "",
    openrouter: "",
  });

  const [rule, setRule] = useState("");
  const [ruleEditor, setRuleEditor] = useState("");
  const [saved, setSaved] = useState("");

  // UI settings from store
  const themeMode = useSettingsStore((store) => store.themeMode);
  const setThemeMode = useSettingsStore((store) => store.setThemeMode);
  const sidebarOpen = useSettingsStore((store) => store.sidebarOpen);
  const setSidebarOpen = useSettingsStore((store) => store.setSidebarOpen);

  // Sync backend config → store on mount/config change
  useEffect(() => {
    if (!config) return;
    if (config.modelId && config.modelId !== modelId) {
      setModelId(config.modelId as string);
    }
    if (config.thinkingLevel && config.thinkingLevel !== thinkingLevel) {
      setThinkingLevel(config.thinkingLevel as string);
    }
    if (config.autoCompaction !== undefined && Boolean(config.autoCompaction) !== autoCompaction) {
      setAutoCompaction(Boolean(config.autoCompaction));
    }
    if (config.showThinking !== undefined && Boolean(config.showThinking) !== showThinking) {
      setShowThinking(Boolean(config.showThinking));
    }
    if (config.deepResearch?.mode && config.deepResearch.mode !== deepResearchMode) {
      setDeepResearchMode(String(config.deepResearch.mode));
    }
    if (config.deepResearch?.maxSteps && String(config.deepResearch.maxSteps) !== deepResearchSteps) {
      setDeepResearchSteps(String(config.deepResearch.maxSteps));
    }
    if (config.deepResearch?.enabled !== undefined && String(Boolean(config.deepResearch.enabled)) !== deepResearchEnabled) {
      setDeepResearchEnabled(String(Boolean(config.deepResearch.enabled)));
    }
  }, [config]);

  useEffect(() => {
    const nextKeys = { ...apiKeys };
    for (const key of Object.keys(nextKeys)) {
      nextKeys[key] = localStorage.getItem(`tp-api-key-${key}`) ?? "";
    }
    setApiKeys(nextKeys);
  }, []);

  const { data: pendingApprovals } = useQuery({
    queryKey: ["approvals-pending"],
    queryFn: () => tradingPiApi.approvals().catch(() => []),
    refetchInterval: 5_000,
  });
  const pendingApprovalList = Array.isArray(pendingApprovals)
    ? (pendingApprovals as Array<{ id?: string; toolName?: string; description?: string; riskLevel?: string; createdAt?: string; status?: string }>)
        .filter((a) => a.status === "pending")
    : [];

  useEffect(() => {
    if (!Array.isArray(rules)) return;
    setRuleEditor(rules.map((item: any) => String(item.value ?? "")).filter(Boolean).join("\n"));
  }, [rules]);

  const updateApiKey = (key: string, value: string) => {
    setApiKeys((current) => ({ ...current, [key]: value }));
    localStorage.setItem(`tp-api-key-${key}`, value);
  };

  const saveConfig = useMutation({
    mutationFn: () => tradingPiApi.setConfig({ modelId, thinkingLevel, autoCompaction, showThinking }),
    onSuccess: () => {
      setSaved("config");
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });
  const saveDataSources = useMutation({
    mutationFn: () => tradingPiApi.setConfig({ apiKeys }),
    onSuccess: () => {
      setSaved("data-sources");
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });
  const saveDeepResearch = useMutation({
    mutationFn: () =>
      tradingPiApi.setConfig({
        deepResearch: {
          enabled: deepResearchEnabled === "true",
          mode: deepResearchMode === "openrouter" ? "openrouter" : "builtin",
          maxSteps: Number(deepResearchSteps),
        },
      }),
    onSuccess: () => {
      setSaved("deep-research");
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });
  const createRule = useMutation({
    mutationFn: (value: string) => tradingPiApi.createUserRule({ value }),
    onSuccess: () => {
      setRule("");
      setSaved("rule");
      queryClient.invalidateQueries({ queryKey: ["user-rules"] });
    },
  });
  const saveRuleEditor = useMutation({
    mutationFn: async () => {
      const lines = ruleEditor.split("\n").map((line) => line.trim()).filter(Boolean);
      for (const line of lines) {
        await tradingPiApi.createUserRule({ value: line });
      }
      return lines;
    },
    onSuccess: () => {
      setSaved("rules-editor");
      queryClient.invalidateQueries({ queryKey: ["user-rules"] });
    },
  });
  const aiPing = useMutation({
    mutationFn: () => tradingPiApi.aiPing(),
  });

  return (
    <main className="mx-auto w-full max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Model controls, data-source readiness, risk defaults, appearance, rules, and research preferences.</p>
      </div>

      {pendingApprovalList.length > 0 && (
        <Panel icon={ShieldCheckIcon} title={`Pending Approvals (${pendingApprovalList.length})`}>
          <div className="space-y-2">
            {pendingApprovalList.slice(0, 5).map((approval) => (
              <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-3 text-sm" key={approval.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{approval.toolName ?? approval.description ?? "Unknown action"}</span>
                  <span className="text-xs text-muted-foreground">{approval.riskLevel ?? "?"}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Awaiting your response. Open the chat to approve or deny.
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel icon={SettingsIcon} title="AI Model">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Model">
              <input className="w-full rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setModelId(event.target.value)} value={modelId} />
            </Field>
            <Field label="Thinking">
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => {
                const value = event.target.value;
                setThinkingLevel(value);
                tradingPiApi.setConfig({ thinkingLevel: value }).catch(() => undefined);
              }} value={thinkingLevel}>
                {["off", "minimal", "low", "medium", "high", "xhigh"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Auto compaction">
              <button className={`w-full rounded-md border px-3 py-2 text-sm ${autoCompaction ? "border-cyan-400/40 text-cyan-200" : ""}`} onClick={() => setAutoCompaction(!autoCompaction)} type="button">
                {autoCompaction ? "on" : "off"}
              </button>
            </Field>
            <Field label="Show thinking">
              <button className={`w-full rounded-md border px-3 py-2 text-sm ${showThinking ? "border-cyan-400/40 text-cyan-200" : ""}`} onClick={() => setShowThinking(!showThinking)} type="button">
                {showThinking ? "on" : "off"}
              </button>
            </Field>
          </div>
          <SaveButton busy={saveConfig.isPending} saved={saved === "config"} onClick={() => saveConfig.mutate()} />
        </Panel>

        <Panel icon={DatabaseIcon} title="Data Sources">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["openai", "OpenAI"],
              ["exa", "Exa"],
              ["jina", "Jina"],
              ["reddit", "Reddit client-id"],
              ["polymarket", "Polymarket"],
              ["openrouter", "OpenRouter"],
            ].map(([key, name]) => (
              <Field label={`${name}${(config as any)?.apiKeys?.[key]?.configured ? " configured" : ""}`} key={key}>
                <input
                  autoComplete="off"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  onChange={(event) => updateApiKey(key, event.target.value)}
                  placeholder={(config as any)?.apiKeys?.[key]?.configured ? "Saved for this session" : `${name} key`}
                  type="password"
                  value={apiKeys[key] ?? ""}
                />
              </Field>
            ))}
          </div>
          <SaveButton busy={saveDataSources.isPending} saved={saved === "data-sources"} onClick={() => saveDataSources.mutate()} />
        </Panel>

        <Panel icon={ActivityIcon} title="AI Health">
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
              disabled={aiPing.isPending}
              onClick={() => aiPing.mutate()}
              type="button"
            >
              <ActivityIcon className="size-4" />
              {aiPing.isPending ? "Pinging" : "Ping AI"}
            </button>
            {aiPing.isSuccess && <span className="text-xs text-emerald-300">AI online</span>}
            {aiPing.isError && <span className="text-xs text-red-300">AI unavailable</span>}
          </div>
          {aiPing.data ? (
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
              <Info label="Model" value={String((aiPing.data as any).model ?? "unknown")} />
              <Info label="Reply" value={String((aiPing.data as any).text ?? "").slice(0, 80)} />
              <Info label="Tokens" value={String((aiPing.data as any).usage?.totalTokens ?? "n/a")} />
            </div>
          ) : null}
          {aiPing.error ? <p className="mt-3 text-xs text-red-300">{aiPing.error instanceof Error ? aiPing.error.message : String(aiPing.error)}</p> : null}
        </Panel>

        <Panel icon={FileTextIcon} title="System Prompt">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Version: <span className="text-foreground">{String((systemPrompt as any)?.version ?? "loading")}</span></span>
            <button
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-white/5 disabled:opacity-50"
              disabled={!(systemPrompt as any)?.content}
              onClick={() => {
                const text = String((systemPrompt as any)?.content ?? "");
                if (text && navigator.clipboard) navigator.clipboard.writeText(text).catch(() => undefined);
              }}
              type="button"
            >
              Copy
            </button>
          </div>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-black/30 p-3 text-xs leading-relaxed text-foreground">
            {String((systemPrompt as any)?.content ?? "Loading...")}
          </pre>
        </Panel>

        <Panel icon={WalletCardsIcon} title="Trading">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Default position size %"><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setMaxSize(event.target.value)} value={maxSize} /></Field>
            <Field label="Max positions"><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setMaxPositions(event.target.value)} value={maxPositions} /></Field>
            <Field label="Daily loss limit %"><input className="w-full rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setDailyLoss(event.target.value)} value={dailyLoss} /></Field>
          </div>
        </Panel>

        <Panel icon={PaletteIcon} title="Appearance">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Theme">
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setThemeMode(event.target.value as ThemeMode)} value={themeMode}>
                <option value="system">system</option>
                <option value="dark">dark</option>
                <option value="light">light</option>
              </select>
            </Field>
            <Field label="Font size"><select className="w-full rounded-md border bg-background px-3 py-2 text-sm"><option>normal</option><option>compact</option><option>large</option></select></Field>
            <Field label="Sidebar default">
              <button className="w-full rounded-md border px-3 py-2 text-sm" onClick={() => setSidebarOpen(!sidebarOpen)} type="button">{sidebarOpen ? "expanded" : "collapsed"}</button>
            </Field>
          </div>
        </Panel>

        <Panel icon={ShieldCheckIcon} title="User Rules">
          <Field label="Rules editor (one rule per line)">
            <textarea
              className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50"
              onChange={(event) => setRuleEditor(event.target.value)}
              placeholder="Before confirming a decision, write the invalidation criterion."
              value={ruleEditor}
            />
          </Field>
          <SaveButton busy={saveRuleEditor.isPending} saved={saved === "rules-editor"} onClick={() => saveRuleEditor.mutate()} />
          <div className="flex gap-2">
            <input className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-cyan-400/50" onChange={(event) => setRule(event.target.value)} placeholder="e.g. max position size 1%" value={rule} />
            <button className="inline-flex items-center gap-2 rounded-md bg-cyan-400 px-3 py-2 text-sm font-medium text-black disabled:opacity-50" disabled={!rule.trim() || createRule.isPending} onClick={() => createRule.mutate(rule.trim())} type="button">
              <PlusIcon className="size-4" />
              Add
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {Array.isArray(rules) && rules.length > 0 ? rules.map((item: any) => (
              <div className="rounded-md border border-white/10 p-3 text-sm" key={`${item.scope}:${item.key}`}>
                <div className="font-medium">{item.key}</div>
                <div className="mt-1 text-muted-foreground">{item.value}</div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No user rules yet.</p>}
          </div>
          {saved === "rule" && <SavedLine />}
        </Panel>

        <Panel icon={FlaskConicalIcon} title="Deep Research">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Enabled"><button className={`w-full rounded-md border px-3 py-2 text-sm ${deepResearchEnabled === "true" ? "border-cyan-400/40 text-cyan-200" : ""}`} onClick={() => setDeepResearchEnabled(deepResearchEnabled === "true" ? "false" : "true")} type="button">{deepResearchEnabled === "true" ? "enabled" : "disabled"}</button></Field>
            <Field label="Mode">
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" onChange={(event) => setDeepResearchMode(event.target.value)} value={deepResearchMode}>
                <option value="builtin">Builtin</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </Field>
            <Field label="Max steps">
              <input className="w-full accent-cyan-400" max="10" min="3" onChange={(event) => setDeepResearchSteps(event.target.value)} type="range" value={deepResearchSteps} />
              <div className="mt-1 text-xs text-muted-foreground">{deepResearchSteps} steps</div>
            </Field>
          </div>
          <SaveButton busy={saveDeepResearch.isPending} saved={saved === "deep-research"} onClick={() => saveDeepResearch.mutate()} />
        </Panel>

        <Panel icon={SlidersHorizontalIcon} title="About">
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <Info label="Version" value="0.1.0" />
            <Info label="Architecture" value="Single main agent" />
            <Info label="Storage" value="Local SQLite" />
          </div>
        </Panel>
      </div>
    </main>
  );
}
