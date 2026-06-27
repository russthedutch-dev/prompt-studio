// App.jsx — Prompt Studio

import { useState, useRef, useCallback } from "react";

// ── CONFIG ─────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.DEV
  ? "http://localhost:3001/api/claude"
  : "/api/claude";

const STORAGE_KEY  = "prompt-studio-characters";
const LIBRARY_KEY  = "promptLibrary";

const SD_MODELS = [
  { id: "sdxl", label: "Stable Diffusion (generic / SDXL)" },
  { id: "pony", label: "Pony Diffusion v6" },
];

const PONY_POS_PREFIX = "score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up,";
const PONY_NEG_SUFFIX = "score_1, score_2, score_3,";

// ── THEME ──────────────────────────────────────────────────────────────────
const T = {
  bg:           "#0d0f14",
  surface:      "#13161f",
  surfaceAlt:   "#1a1e2a",
  border:       "#252938",
  accent:       "#7c6ff7",
  accentDim:    "#3d3880",
  accentGlow:   "rgba(124,111,247,0.15)",
  accentWarm:   "#f7a06f",
  accentWarmDim:"rgba(247,160,111,0.12)",
  red:          "#f87171",
  redDim:       "rgba(248,113,113,0.1)",
  text:         "#e8e6f0",
  textMuted:    "#7a7a96",
  textDim:      "#4a4a66",
  success:      "#4ade80",
  successDim:   "rgba(74,222,128,0.12)",
  mono:         "'JetBrains Mono','Fira Code','Courier New',monospace",
};

// ── HELPERS ────────────────────────────────────────────────────────────────
function nameColor(name) {
  const colors = ["#7c6ff7","#f7a06f","#4ade80","#60a5fa","#f472b6","#a78bfa","#34d399","#fbbf24"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}
function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
}
function loadCharacters() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveCharacters(chars) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chars));
}
function loadLibrary() {
  try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) || "[]"); }
  catch { return []; }
}
function saveLibrary(lib) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
}
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    + " · "
    + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

// ── STEP DATA ──────────────────────────────────────────────────────────────
const STYLE_OPTIONS = {
  renderMode: ["Photorealistic","Cinematic","Oil Painting","Watercolour","Digital Illustration","Anime / Manga","Sketch / Lineart","3D Render","Concept Art","Graphic Novel"],
  colourMode: ["Full Colour","Monochrome","Duotone","Sepia","Desaturated / Bleach bypass","Infrared"],
  shootType:  ["Portrait","Candid","Studio","Editorial","Street","Landscape","Architectural","Macro / Close-up","Fashion","Documentary"],
  finish:     ["Clean","Film grain","Lomography","HDR","Matte","Bleached / Faded","High gloss"],
};

const LIGHTING_SETUP_OPTIONS = [
  "Broad lighting","Short lighting","Rembrandt","Split lighting",
  "Butterfly / Paramount","Loop lighting","Rim / Hair light",
  "Clamshell","Available light","Backlit / Silhouette","Contre-jour",
];

const LIGHTING_QUALITY_OPTIONS = {
  quality:     ["Soft & diffused","Hard & dramatic","High contrast","Low contrast / flat","Low key","High key","Chiaroscuro"],
  source:      ["Natural daylight","Overcast sky","Golden hour sun","Candlelight","Studio strobe","LED panel","Neon signs","Practical lights","Moonlight","Firelight"],
  temperature: ["Warm (golden / amber)","Cool (blue / silver)","Neutral / daylight","Mixed / split tones","Neon / vibrant"],
  tonal:       ["Full tonal range","Crushed blacks","Blown highlights","Deep shadows retained","Zone V mid-grey dominant","High key whites"],
};

const SCENE_STEPS_CHARACTER = [
  { id: "style",           label: "Style",            icon: "◍", description: "Set the visual language — everything downstream follows." },
  { id: "lighting_setup",  label: "Lighting Setup",   icon: "◎", description: "How is the subject lit? Setup shapes tonal structure." },
  {
    id: "pose", label: "Pose & Expression", icon: "◐", description: "What is the character doing?",
    fields: [
      { id: "pose",         label: "Body Pose",         type: "pose-select",       options: ["Sitting","Standing","Leaning","Lying","Crouching"] },
      { id: "expression",   label: "Facial Expression", type: "expression-select", options: ["Smiling","Frowning","Angry","Pouting","Eyes open","Eyes part closed","Eyes closed","Mouth open","Lips parted","Mouth closed","Brows both raised","Brow left raised","Brow right raised"] },
      { id: "action",       label: "Action / Motion",   type: "text",    placeholder: "e.g. looking over shoulder, reading" },
      { id: "camera_angle", label: "Camera Angle",      type: "select",  options: ["","Eye level","Low angle","High angle","Dutch angle","Close-up / portrait","Medium shot","Full body","Cowboy shot","Over the shoulder"] },
    ],
  },
  {
    id: "outfit", label: "Outfit", icon: "◈", description: "What is she wearing in this scene?",
    fields: [
      { id: "clothing",     label: "Clothing",              type: "text", placeholder: "e.g. white silk blouse, leather jacket" },
      { id: "accessories",  label: "Accessories / Props",   type: "text", placeholder: "e.g. gold earrings, holding roses" },
    ],
  },
  {
    id: "environment", label: "Environment", icon: "◻", description: "Where does this scene take place?",
    fields: [
      { id: "location",    label: "Location",        type: "text",   placeholder: "e.g. neon-lit Tokyo alley, cosy library" },
      { id: "time_of_day", label: "Time of Day",     type: "select", options: ["","Dawn / golden hour","Morning","Midday","Afternoon","Dusk / magic hour","Night","Midnight"] },
      { id: "weather",     label: "Weather / Conditions", type: "text", placeholder: "e.g. light rain, snow, mist" },
      { id: "season",      label: "Season",          type: "select", options: ["","Spring","Summer","Autumn / Fall","Winter"] },
    ],
  },
  { id: "lighting_quality", label: "Lighting Quality", icon: "◑", description: "Refine the light — quality, source, colour, tonal range." },
  {
    id: "atmosphere", label: "Atmosphere", icon: "◓", description: "Mood and atmospheric detail.",
    fields: [
      { id: "mood",        label: "Overall Mood",                  type: "text", placeholder: "e.g. melancholic, tense, romantic" },
      { id: "atmosphere",  label: "Atmospheric Details",           type: "text", placeholder: "e.g. falling petals, lens flare, shallow DoF" },
      { id: "narrative",   label: "Narrative Hint (optional)",     type: "text", placeholder: "e.g. she's waiting, lost in thought" },
      { id: "artist_ref",  label: "Artist / Director Reference (optional)", type: "text", placeholder: "e.g. Roger Deakins, Annie Leibovitz" },
    ],
  },
  {
    id: "output", label: "Output Specs", icon: "◉", description: "Aspect ratio, quality tags, negative prompt.",
    fields: [
      { id: "aspect_ratio",  label: "Aspect Ratio",    type: "select",      options: ["","1:1 square","2:3 portrait","3:2 landscape","9:16 vertical","16:9 widescreen","3:4 portrait"] },
      { id: "quality_tags",  label: "Quality Boosters",type: "multiselect", options: ["masterpiece","best quality","ultra detailed","8k uhd","RAW photo","photorealistic","cinematic","sharp focus","professional","award winning","film grain","bokeh","subsurface scattering"] },
      { id: "negative",      label: "Negative Prompt", type: "textarea",    placeholder: "e.g. blurry, watermark, extra limbs" },
    ],
  },
];

const SCENE_STEPS_NOCHAR = SCENE_STEPS_CHARACTER.filter(s => !["pose","outfit"].includes(s.id));
const DEFAULT_QUALITY  = ["masterpiece","best quality","ultra detailed","RAW photo","sharp focus"];
const DEFAULT_NEGATIVE = "deformed, extra limbs, bad anatomy, blurry, watermark, lowres, bad proportions, ugly, duplicate, mutilated, out of frame";

// ── SUB-COMPONENTS ─────────────────────────────────────────────────────────

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ padding: "12px 14px", borderRadius: 8, border: `1px solid ${T.red}`, background: T.redDim, color: T.red, fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
      ⚠ {msg}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, marginTop: 20 }}>
      {children}
    </div>
  );
}

function OptionTile({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "9px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
      border: `1px solid ${active ? T.accent : T.border}`,
      background: active ? T.accentGlow : "transparent",
      color: active ? T.accent : T.textMuted,
      cursor: "pointer", transition: "all 0.18s", textAlign: "left", minHeight: 40,
    }}>
      {active && <span style={{ marginRight: 6, fontSize: 10 }}>✓</span>}{label}
    </button>
  );
}

function QualityChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 13px", borderRadius: 20, fontSize: 12, fontWeight: 500,
      border: `1px solid ${active ? T.accent : T.border}`,
      background: active ? T.accentGlow : "transparent",
      color: active ? T.accent : T.textMuted,
      cursor: "pointer", transition: "all 0.18s", minHeight: 36,
    }}>
      {active && <span style={{ marginRight: 4, fontSize: 10 }}>✓</span>}{label}
    </button>
  );
}

function GenDots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block", opacity: 0.7, animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
      ))}
    </span>
  );
}

function ModelSelector({ sdModel, setSdModel }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel>SD Model</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SD_MODELS.map(m => (
          <OptionTile key={m.id} label={m.label} active={sdModel === m.id} onClick={() => setSdModel(m.id)} />
        ))}
      </div>
      {sdModel === "pony" && (
        <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.accentWarm}55`, background: T.accentWarmDim, fontSize: 12, color: T.accentWarm, lineHeight: 1.5 }}>
          Score tags will be injected automatically into both prompts.
        </div>
      )}
    </div>
  );
}

function StyleStep({ style, setStyle, sdModel, setSdModel }) {
  const toggle = (key, val) => setStyle(p => ({ ...p, [key]: p[key] === val ? "" : val }));
  return (
    <div>
      <ModelSelector sdModel={sdModel} setSdModel={setSdModel} />
      <SectionLabel>Render Mode</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {STYLE_OPTIONS.renderMode.map(o => <OptionTile key={o} label={o} active={style.renderMode === o} onClick={() => toggle("renderMode", o)} />)}
      </div>
      <SectionLabel>Colour Mode</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {STYLE_OPTIONS.colourMode.map(o => <OptionTile key={o} label={o} active={style.colourMode === o} onClick={() => toggle("colourMode", o)} />)}
      </div>
      <SectionLabel>Shoot Type</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {STYLE_OPTIONS.shootType.map(o => <OptionTile key={o} label={o} active={style.shootType === o} onClick={() => toggle("shootType", o)} />)}
      </div>
      <SectionLabel>Finish</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {STYLE_OPTIONS.finish.map(o => <OptionTile key={o} label={o} active={style.finish === o} onClick={() => toggle("finish", o)} />)}
      </div>
    </div>
  );
}

function LightingSetupStep({ value, onChange }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter(v => v !== o) : [...value, o]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {LIGHTING_SETUP_OPTIONS.map(o => (
        <OptionTile key={o} label={o} active={value.includes(o)} onClick={() => toggle(o)} />
      ))}
    </div>
  );
}

function LightingQualityStep({ lq, setLq, isMono }) {
  const toggle = (key, val) => setLq(p => ({ ...p, [key]: p[key] === val ? "" : val }));
  return (
    <div>
      <SectionLabel>Quality</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {LIGHTING_QUALITY_OPTIONS.quality.map(o => <OptionTile key={o} label={o} active={lq.quality === o} onClick={() => toggle("quality", o)} />)}
      </div>
      <SectionLabel>Light Source</SectionLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {LIGHTING_QUALITY_OPTIONS.source.map(o => <OptionTile key={o} label={o} active={lq.source === o} onClick={() => toggle("source", o)} />)}
      </div>
      {isMono ? (
        <>
          <SectionLabel>Tonal Range</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {LIGHTING_QUALITY_OPTIONS.tonal.map(o => <OptionTile key={o} label={o} active={lq.tonal === o} onClick={() => toggle("tonal", o)} />)}
          </div>
        </>
      ) : (
        <>
          <SectionLabel>Colour Temperature</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {LIGHTING_QUALITY_OPTIONS.temperature.map(o => <OptionTile key={o} label={o} active={lq.temperature === o} onClick={() => toggle("temperature", o)} />)}
          </div>
        </>
      )}
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState("home");
  const [characters, setCharacters] = useState(loadCharacters);
  const [activeChar, setActiveChar] = useState(null);
  const [step, setStep] = useState(0);

  // Scene state
  const [answers, setAnswers]               = useState({});
  const [sdModel, setSdModel]               = useState("sdxl");
  const [styleState, setStyleState]         = useState({ renderMode: "", colourMode: "", shootType: "", finish: "" });
  const [lightingSetup, setLightingSetup]   = useState([]);
  const [lightingQuality, setLightingQuality] = useState({ quality: "", source: "", temperature: "", tonal: "" });
  const [selectedQuality, setSelectedQuality] = useState(DEFAULT_QUALITY);

  // Add character
  const [newName, setNewName]           = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [isAnalysing, setIsAnalysing]   = useState(false);
  const [editingBlock, setEditingBlock] = useState("");
  const [addPhase, setAddPhase]         = useState("form");

  // Generation
  const [generatedPrompt, setGeneratedPrompt]   = useState("");
  const [generatedNegative, setGeneratedNegative] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone]             = useState(false);
  const [copied, setCopied]             = useState(false);
  const [copiedNeg, setCopiedNeg]       = useState(false);
  const [error, setError]               = useState("");

  // Character block inline edit
  const [showBlockEdit, setShowBlockEdit] = useState(false);
  const [blockDraft, setBlockDraft]       = useState("");

  // Prompt library
  const [promptLibrary, setPromptLibrary]   = useState(loadLibrary);
  const [libraryCharId, setLibraryCharId]   = useState(null);   // char.id or "none"
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const [copiedEntryId, setCopiedEntryId]   = useState(null);

  // Save panel (output screen)
  const [showSavePanel, setShowSavePanel]   = useState(false);
  const [saveNameInput, setSaveNameInput]   = useState("");
  const [savedConfirm, setSavedConfirm]     = useState(false);

  const fileInputRef = useRef(null);

  const STEPS       = activeChar ? SCENE_STEPS_CHARACTER : SCENE_STEPS_NOCHAR;
  const currentStep = STEPS[step];
  const isLastStep  = step === STEPS.length - 1;
  const isMono      = ["mono","sepia","infrared","desaturated"].some(k => styleState.colourMode.toLowerCase().includes(k));

  // ── LIBRARY HELPERS ───────────────────────────────────────────────────────

  const persistLibrary = (lib) => { setPromptLibrary(lib); saveLibrary(lib); };

  const defaultSaveName = () => {
    const charName = activeChar ? activeChar.name : "No Character";
    const d = new Date();
    return `${charName} · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  };

  const captureWizardState = () => ({
    sdModel, styleState, lightingSetup, lightingQuality, selectedQuality, answers,
    blockDraft: activeChar ? blockDraft : "",
  });

  const doSavePrompt = () => {
    const isPony   = sdModel === "pony";
    const fullPos  = isPony ? `${PONY_POS_PREFIX} ${generatedPrompt}` : generatedPrompt;
    const fullNeg  = isPony ? `${generatedNegative} ${PONY_NEG_SUFFIX}` : generatedNegative;
    const entry = {
      id:              Date.now().toString(),
      name:            saveNameInput.trim() || defaultSaveName(),
      characterId:     activeChar ? activeChar.id : "none",
      wizardState:     captureWizardState(),
      generatedPrompt: fullPos,
      generatedNegative: fullNeg,
      createdAt:       new Date().toISOString(),
    };
    persistLibrary([entry, ...promptLibrary]);
    setShowSavePanel(false);
    setSaveNameInput("");
    setSavedConfirm(true);
    setTimeout(() => setSavedConfirm(false), 2500);
  };

  const deleteLibraryEntry = (id) => {
    if (!window.confirm("Delete this saved prompt?")) return;
    persistLibrary(promptLibrary.filter(e => e.id !== id));
  };

  const loadWizardStateFromEntry = (entry) => {
    const ws   = entry.wizardState;
    const char = entry.characterId === "none"
      ? null
      : characters.find(c => c.id === entry.characterId) || null;
    setActiveChar(char);
    setSdModel(ws.sdModel || "sdxl");
    setStyleState(ws.styleState || { renderMode: "", colourMode: "", shootType: "", finish: "" });
    setLightingSetup(ws.lightingSetup || []);
    setLightingQuality(ws.lightingQuality || { quality: "", source: "", temperature: "", tonal: "" });
    setSelectedQuality(ws.selectedQuality || [...DEFAULT_QUALITY]);
    setAnswers(ws.answers || {});
    setBlockDraft(ws.blockDraft || (char ? char.characterBlock : ""));
    setGeneratedPrompt(""); setGeneratedNegative("");
    setIsDone(false); setError("");
    setShowBlockEdit(false); setShowSavePanel(false); setSavedConfirm(false);
    setStep(0);
    setPhase("scene");
  };

  const openLibrary = (charId, e) => {
    e?.stopPropagation();
    setLibraryCharId(charId);
    setExpandedEntryId(null);
    setPhase("library");
  };

  const libraryEntriesFor = (charId) => promptLibrary.filter(e => e.characterId === charId);

  const copyEntry = (entry) => {
    const text = [entry.generatedPrompt, entry.generatedNegative].filter(Boolean).join("\n\n---NEGATIVE---\n\n");
    navigator.clipboard.writeText(text);
    setCopiedEntryId(entry.id);
    setTimeout(() => setCopiedEntryId(null), 2000);
  };

  // ── EXISTING HELPERS ──────────────────────────────────────────────────────

  const persistChars = (chars) => { setCharacters(chars); saveCharacters(chars); };

  const deleteChar = (id) => {
    if (!window.confirm("Delete this character?")) return;
    persistChars(characters.filter(c => c.id !== id));
  };

  const handleImageFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setUploadedImage({ dataUrl: e.target.result, base64: e.target.result.split(",")[1], mediaType: file.type });
    reader.readAsDataURL(file);
  }, []);

  const analysePortrait = async () => {
    if (!uploadedImage || !newName.trim()) return;
    setIsAnalysing(true);
    setError("");
    const system = `You are an expert Stable Diffusion prompt engineer specialising in character consistency.
Analyse this portrait and produce a dense SD-optimised character appearance descriptor block.
Return ONLY plain comma-separated descriptors — no JSON, no markdown, no headers, no clothing.
Cover: face shape, skin tone, eye colour and shape, nose, lips, hair (colour, length, texture, style), distinctive features.
40–70 words. Write as if briefing an artist who has never seen this person.`;
    try {
      const res = await fetch(API_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 300, system,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: uploadedImage.mediaType, data: uploadedImage.base64 } },
            { type: "text",  text: "Produce the SD character appearance block." },
          ]}],
        }),
      });
      const data = await res.json();
      const block = data.content?.map(b => b.text || "").join("").trim();
      if (!block) throw new Error("Empty response");
      setEditingBlock(block);
      setAddPhase("review");
    } catch {
      setError("Couldn't analyse portrait. Check your connection and try again.");
    } finally {
      setIsAnalysing(false);
    }
  };

  const commitCharacter = () => {
    const char = { id: Date.now().toString(), name: newName.trim(), color: nameColor(newName.trim()), characterBlock: editingBlock.trim(), createdAt: new Date().toISOString() };
    persistChars([...characters, char]);
    setNewName(""); setUploadedImage(null); setEditingBlock(""); setAddPhase("form");
    setPhase("home");
  };

  const startScene = (char) => {
    setActiveChar(char);
    setStep(0);
    setAnswers({});
    setSdModel("sdxl");
    setStyleState({ renderMode: "", colourMode: "", shootType: "", finish: "" });
    setLightingSetup([]);
    setLightingQuality({ quality: "", source: "", temperature: "", tonal: "" });
    setSelectedQuality([...DEFAULT_QUALITY]);
    setGeneratedPrompt(""); setGeneratedNegative("");
    setIsDone(false); setError("");
    setShowBlockEdit(false); setShowSavePanel(false); setSavedConfirm(false);
    if (char) setBlockDraft(char.characterBlock);
    setPhase("scene");
  };

  const buildSummary = () => {
    const lines = [];
    lines.push(`SD Model: ${SD_MODELS.find(m => m.id === sdModel)?.label || sdModel}`);
    const s = styleState;
    if (s.renderMode) lines.push(`Render mode: ${s.renderMode}`);
    if (s.colourMode) lines.push(`Colour mode: ${s.colourMode}`);
    if (s.shootType)  lines.push(`Shoot type: ${s.shootType}`);
    if (s.finish)     lines.push(`Finish: ${s.finish}`);
    if (lightingSetup.length) lines.push(`Lighting setup: ${lightingSetup.join(", ")}`);
    STEPS.forEach(st => {
      if (["style","lighting_setup","lighting_quality","output"].includes(st.id)) return;
      st.fields?.forEach(f => {
        if (f.id === "quality_tags") return;
        if (f.type === "pose-select") {
          const parts = [answers[f.id + "_sel"], answers[f.id + "_free"]].filter(Boolean).map(s => s.trim()).filter(Boolean);
          if (parts.length) lines.push(`${f.label}: ${parts.join(", ")}`);
          return;
        }
        if (f.type === "expression-select") {
          let sel = [];
          try { sel = JSON.parse(answers[f.id + "_sel"] || "[]"); } catch { sel = []; }
          const parts = [...sel, answers[f.id + "_free"]].filter(Boolean).map(s => s.trim()).filter(Boolean);
          if (parts.length) lines.push(`${f.label}: ${parts.join(", ")}`);
          return;
        }
        const v = answers[f.id];
        if (v?.trim()) lines.push(`${f.label}: ${v}`);
      });
    });
    const lq = lightingQuality;
    if (lq.quality)                     lines.push(`Light quality: ${lq.quality}`);
    if (lq.source)                      lines.push(`Light source: ${lq.source}`);
    if (lq.temperature && !isMono)      lines.push(`Colour temperature: ${lq.temperature}`);
    if (lq.tonal && isMono)             lines.push(`Tonal range: ${lq.tonal}`);
    if (selectedQuality.length)         lines.push(`Quality tags: ${selectedQuality.join(", ")}`);
    return lines.join("\n");
  };

  const generatePrompt = async () => {
    setIsGenerating(true);
    setIsDone(false);
    setGeneratedPrompt(""); setGeneratedNegative(""); setError("");
    setShowSavePanel(false); setSavedConfirm(false);
    const summary   = buildSummary();
    const userNeg   = answers.negative?.trim() || "";
    const charBlock = activeChar ? blockDraft : "";

    const ponyNote = sdModel === "pony"
      ? "\nThe target model is Pony Diffusion v6. Use natural pony-compatible tag syntax. Do not include score tags — these will be added automatically."
      : "";

    const system = `You are an expert Stable Diffusion prompt engineer.
Output TWO sections separated by |||NEGATIVE|||

POSITIVE PROMPT:
${charBlock ? "- Open with character appearance block verbatim (anchors identity)\n" : ""}- Style and render mode
- Shoot type and lighting setup
${charBlock ? "- Pose, expression, action\n- Outfit\n" : ""}- Environment and setting
- Lighting quality and tonal detail
- Atmosphere and mood
- Quality tags at end
- Use SD token weighting: (detail:1.3) where it helps
- Comma-separated dense tokens, no sentences
- 80–150 tokens

NEGATIVE PROMPT (after |||NEGATIVE|||):
- Always include: deformed, extra limbs, bad anatomy, blurry, watermark, lowres, bad proportions, ugly, duplicate, mutilated
${charBlock ? "- Include: different person, altered features, changed appearance\n" : ""}- Incorporate any user negative hints
- 30–60 tokens

Output ONLY the two sections. Nothing else.${ponyNote}`;

    const userMsg = charBlock
      ? `CHARACTER (verbatim, do not alter):\n${charBlock}\n\nSCENE:\n${summary}\n\nUSER NEGATIVE HINTS:\n${userNeg || "none"}`
      : `SCENE:\n${summary}\n\nUSER NEGATIVE HINTS:\n${userNeg || "none"}`;

    try {
      const res = await fetch(API_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system, messages: [{ role: "user", content: userMsg }] }),
      });
      const data = await res.json();
      const raw   = data.content?.map(b => b.text || "").join("").trim();
      const parts = raw.split("|||NEGATIVE|||");
      setGeneratedPrompt(parts[0]?.trim() || raw);
      setGeneratedNegative(parts[1]?.trim() || DEFAULT_NEGATIVE);
      setIsDone(true);
    } catch {
      setError("Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copy = (text, setter) => { navigator.clipboard.writeText(text); setter(true); setTimeout(() => setter(false), 2000); };
  const getAnswer   = (id)       => answers[id] || "";
  const setAnswer   = (id, val)  => setAnswers(p => ({ ...p, [id]: val }));
  const toggleQuality = (tag)    => setSelectedQuality(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);
  const resetToHome = ()         => { setPhase("home"); setStep(0); setIsDone(false); setActiveChar(null); setError(""); setShowSavePanel(false); setSavedConfirm(false); };

  // ── RENDER ──────────────────────────────────────────────────────────────

  // Derive page title
  let pageTitle = "Prompt Studio";
  if (phase === "add_character")  pageTitle = "New Character";
  else if (phase === "library") {
    if (libraryCharId === "none") pageTitle = "Saved · No Character";
    else {
      const lc = characters.find(c => c.id === libraryCharId);
      pageTitle = lc ? `Saved · ${lc.name}` : "Saved Prompts";
    }
  }
  else if (phase === "scene")     pageTitle = isDone ? "Your SD Prompt" : activeChar ? `Scene · ${activeChar.name}` : "Scene · No Character";

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, color: T.text, fontFamily: "'Inter',system-ui,sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input, select, textarea { outline: none; font-family: inherit; font-size: 16px; }
        input::placeholder, textarea::placeholder { color: ${T.textDim}; }
        select option { background: ${T.surfaceAlt}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        .fi:focus { border-color: ${T.accent} !important; background: ${T.surfaceAlt} !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .fi-in { animation: fadeIn 0.3s ease forwards; }
        @media (hover: hover) { button:hover { opacity: 0.85; } }
      `}</style>

      {/* Header */}
      <div style={{ padding: "env(safe-area-inset-top, 16px) 16px 0", paddingTop: "max(env(safe-area-inset-top), 16px)", maxWidth: 680, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, paddingTop: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: T.accentGlow, border: `1px solid ${T.accentDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: T.accent, flexShrink: 0 }}>⬡</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Prompt Studio</span>
          {phase !== "home" && (
            <button onClick={resetToHome} style={{ marginLeft: "auto", fontSize: 13, color: T.textDim, background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 6 }}>← Home</button>
          )}
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: "6px 0 16px", letterSpacing: "-0.02em" }}>{pageTitle}</h1>
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "0 16px 48px" }}>
        <ErrorBanner msg={error} />

        {/* ══ HOME ══ */}
        {phase === "home" && (
          <div className="fi-in">
            {/* No Character */}
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Scene only</div>
            <div style={{ marginBottom: 28 }}>
              <button onClick={() => startScene(null)} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", width: "100%",
                borderRadius: 12, border: `1px solid ${T.border}`, background: T.surface,
                cursor: "pointer", textAlign: "left",
              }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: T.surfaceAlt, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>◻</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 2 }}>No Character</div>
                  <div style={{ fontSize: 13, color: T.textMuted }}>Environment, lighting, mood and style only</div>
                </div>
                {libraryEntriesFor("none").length > 0 && (
                  <button
                    onClick={(e) => openLibrary("none", e)}
                    style={{ flexShrink: 0, padding: "5px 10px", borderRadius: 20, border: `1px solid ${T.accentDim}`, background: T.accentGlow, color: T.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    {libraryEntriesFor("none").length} saved
                  </button>
                )}
              </button>
            </div>

            {/* Characters */}
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Characters</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
              {characters.map(char => {
                const savedCount = libraryEntriesFor(char.id).length;
                return (
                  <div key={char.id} style={{ position: "relative" }}>
                    <button onClick={() => startScene(char)} style={{
                      width: "100%", padding: "20px 12px 16px", borderRadius: 12,
                      border: `1px solid ${T.border}`, background: T.surface,
                      cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                    }}>
                      <div style={{ width: 56, height: 56, borderRadius: "50%", background: char.color + "22", border: `2px solid ${char.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: char.color }}>
                        {initials(char.name)}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{char.name}</div>
                      {savedCount > 0 && (
                        <button
                          onClick={(e) => openLibrary(char.id, e)}
                          style={{ padding: "3px 9px", borderRadius: 20, border: `1px solid ${T.accentDim}`, background: T.accentGlow, color: T.accent, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          {savedCount} saved
                        </button>
                      )}
                    </button>
                    <button onClick={() => deleteChar(char.id)} style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.textDim, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                  </div>
                );
              })}
              <button onClick={() => { setAddPhase("form"); setPhase("add_character"); }} style={{
                padding: "20px 12px 16px", borderRadius: 12, border: `2px dashed ${T.border}`,
                background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
              }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: T.textDim }}>+</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.textDim }}>Add character</div>
              </button>
            </div>
          </div>
        )}

        {/* ══ LIBRARY ══ */}
        {phase === "library" && (() => {
          const entries   = libraryEntriesFor(libraryCharId);
          const libChar   = libraryCharId === "none" ? null : characters.find(c => c.id === libraryCharId);
          const charLabel = libChar ? libChar.name : "No Character";
          return (
            <div className="fi-in">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                {libChar && (
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: libChar.color + "22", border: `2px solid ${libChar.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: libChar.color, flexShrink: 0 }}>
                    {initials(libChar.name)}
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{charLabel}</div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>{entries.length} saved prompt{entries.length !== 1 ? "s" : ""}</div>
                </div>
                <button onClick={() => startScene(libChar)} style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 40 }}>
                  New Scene →
                </button>
              </div>

              {entries.length === 0 ? (
                <div style={{ padding: "32px 20px", borderRadius: 12, border: `1px dashed ${T.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>No saved prompts yet for {charLabel}.<br />Generate a prompt and tap Save.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {entries.map(entry => {
                    const isExpanded = expandedEntryId === entry.id;
                    const isCopied   = copiedEntryId === entry.id;
                    return (
                      <div key={entry.id} style={{ borderRadius: 12, border: `1px solid ${T.border}`, background: T.surface, overflow: "hidden" }}>
                        {/* Entry header */}
                        <div style={{ padding: "14px 16px 12px", borderBottom: isExpanded ? `1px solid ${T.border}` : "none" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 2, wordBreak: "break-word" }}>{entry.name}</div>
                              <div style={{ fontSize: 11, color: T.textDim }}>{fmtDate(entry.createdAt)}</div>
                            </div>
                            <button onClick={() => deleteLibraryEntry(entry.id)} style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.textDim, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                          </div>

                          {/* Prompt preview */}
                          <div style={{ marginTop: 10, fontFamily: T.mono, fontSize: 12, color: T.textMuted, lineHeight: 1.7, wordBreak: "break-word" }}>
                            {isExpanded
                              ? entry.generatedPrompt
                              : entry.generatedPrompt.slice(0, 140) + (entry.generatedPrompt.length > 140 ? "…" : "")}
                          </div>
                          {entry.generatedPrompt.length > 140 && (
                            <button onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)} style={{ marginTop: 4, fontSize: 12, color: T.accent, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                              {isExpanded ? "Show less" : "Show full prompt"}
                            </button>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ padding: "10px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button onClick={() => loadWizardStateFromEntry(entry)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 38 }}>
                            ↩ Load Wizard State
                          </button>
                          <button onClick={() => copyEntry(entry)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.accentDim}`, background: isCopied ? T.accentGlow : "transparent", color: isCopied ? T.success : T.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 38 }}>
                            {isCopied ? "✓ Copied!" : "Copy Prompt"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ══ ADD CHARACTER ══ */}
        {phase === "add_character" && (
          <div className="fi-in">
            {addPhase === "form" && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Character Name</label>
                  <input className="fi" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Aria" style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontWeight: 600 }} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Portrait Photo</label>
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => { e.preventDefault(); setIsDragging(false); handleImageFile(e.dataTransfer.files?.[0]); }}
                    onClick={() => !uploadedImage && fileInputRef.current?.click()}
                    style={{ border: `2px dashed ${isDragging ? T.accent : uploadedImage ? T.accentDim : T.border}`, borderRadius: 12, padding: uploadedImage ? 14 : "32px 20px", background: isDragging ? T.accentGlow : uploadedImage ? T.surface : "transparent", cursor: uploadedImage ? "default" : "pointer", transition: "all 0.2s", textAlign: "center" }}
                  >
                    {!uploadedImage ? (
                      <>
                        <div style={{ fontSize: 28, opacity: 0.4, marginBottom: 10 }}>⬆</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>Drop portrait here</div>
                        <div style={{ fontSize: 12, color: T.textMuted }}>or tap to browse · JPG, PNG, WEBP</div>
                        <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>Keep under 1024px for best results</div>
                      </>
                    ) : (
                      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                        <img src={uploadedImage.dataUrl} alt="Portrait" style={{ width: 68, height: 84, objectFit: "cover", objectPosition: "top", borderRadius: 8, border: `1px solid ${T.accentDim}`, flexShrink: 0 }} />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 6 }}>Portrait loaded</div>
                          <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, marginBottom: 8 }}>Claude will extract her appearance as an SD character block.</div>
                          <button onClick={e => { e.stopPropagation(); setUploadedImage(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} style={{ fontSize: 12, color: T.textDim, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Remove</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handleImageFile(e.target.files?.[0])} style={{ display: "none" }} />
                </div>

                <div style={{ fontSize: 11, color: T.textDim, lineHeight: 1.6, padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, marginBottom: 20 }}>
                  <strong style={{ color: T.textMuted }}>Privacy:</strong> Photo sent via Worker only. Not stored. Character text saved to this device's localStorage — no image retained.
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setPhase("home")} style={{ padding: "12px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontSize: 14, cursor: "pointer", minHeight: 48 }}>Cancel</button>
                  {uploadedImage && newName.trim() && (
                    <button onClick={analysePortrait} disabled={isAnalysing} style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "none", background: T.accentWarm, color: "#fff", fontSize: 14, fontWeight: 700, cursor: isAnalysing ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48 }}>
                      {isAnalysing ? <><span style={{ opacity: 0.9 }}>Analysing</span><GenDots /></> : `✦ Analyse & Create ${newName}`}
                    </button>
                  )}
                </div>
              </>
            )}

            {addPhase === "review" && (
              <>
                <div style={{ padding: "12px 14px", borderRadius: 10, border: `1px solid ${T.accentWarm}55`, background: T.accentWarmDim, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.accentWarm, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>✦ Character block extracted</div>
                  <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.5 }}>Review and edit before saving. This anchors {newName}'s appearance in every prompt.</div>
                </div>
                <textarea className="fi" value={editingBlock} onChange={e => setEditingBlock(e.target.value)} rows={6} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${T.accentDim}`, background: T.surface, color: T.text, fontSize: 14, fontFamily: T.mono, lineHeight: 1.7, resize: "vertical", marginBottom: 16 }} />
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => setAddPhase("form")} style={{ padding: "12px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontSize: 14, cursor: "pointer", minHeight: 48 }}>← Re-analyse</button>
                  <button onClick={commitCharacter} disabled={!editingBlock.trim()} style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", minHeight: 48 }}>
                    Save {newName} →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ SCENE ══ */}
        {phase === "scene" && !isDone && (
          <div className="fi-in" key={step}>
            {/* Step dots */}
            <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
              {STEPS.map((s, i) => {
                const isActive = i === step, isPast = i < step;
                return (
                  <button key={s.id} onClick={() => setStep(i)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20, border: `1px solid ${isActive ? T.accent : isPast ? T.accentDim : T.border}`, background: isActive ? T.accentGlow : "transparent", color: isActive ? T.accent : isPast ? T.accent : T.textDim, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, minHeight: 36 }}>
                    <span style={{ fontSize: 10 }}>{isPast && !isActive ? "✓" : s.icon}</span>{s.label}
                  </button>
                );
              })}
            </div>

            {/* Character block preview */}
            {activeChar && step === 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: activeChar.color + "22", border: `1px solid ${activeChar.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: activeChar.color, flexShrink: 0 }}>{initials(activeChar.name)}</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{activeChar.name} — appearance locked</span>
                  <button onClick={() => setShowBlockEdit(v => !v)} style={{ marginLeft: "auto", fontSize: 12, color: T.textDim, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: "4px 0", whiteSpace: "nowrap" }}>
                    {showBlockEdit ? "Hide" : "Edit"}
                  </button>
                </div>
                {showBlockEdit ? (
                  <textarea className="fi" value={blockDraft} onChange={e => setBlockDraft(e.target.value)} rows={4} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.accentDim}`, background: T.surface, color: T.text, fontSize: 13, fontFamily: T.mono, lineHeight: 1.7, resize: "vertical" }} />
                ) : (
                  <div style={{ fontSize: 12, color: T.textMuted, fontFamily: T.mono, lineHeight: 1.6, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface }}>
                    {blockDraft.slice(0, 100)}{blockDraft.length > 100 ? "…" : ""}
                  </div>
                )}
              </div>
            )}

            {/* Step header */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 18, color: T.accent }}>{currentStep.icon}</span>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>{currentStep.label}</h2>
                <span style={{ fontSize: 12, color: T.textDim, marginLeft: "auto" }}>{step + 1}/{STEPS.length}</span>
              </div>
              <p style={{ fontSize: 13, color: T.textMuted, margin: 0, lineHeight: 1.5 }}>{currentStep.description}</p>
            </div>

            {/* Step content */}
            {currentStep.id === "style"           && <StyleStep style={styleState} setStyle={setStyleState} sdModel={sdModel} setSdModel={setSdModel} />}
            {currentStep.id === "lighting_setup"  && <LightingSetupStep value={lightingSetup} onChange={setLightingSetup} />}
            {currentStep.id === "lighting_quality"&& <LightingQualityStep lq={lightingQuality} setLq={setLightingQuality} isMono={isMono} />}

            {currentStep.fields && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {currentStep.fields.map(field => (
                  <div key={field.id}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>{field.label}</label>
                    {field.type === "text" && (
                      <input className="fi" value={getAnswer(field.id)} onChange={e => setAnswer(field.id, e.target.value)} placeholder={field.placeholder} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.text, transition: "all 0.2s" }} />
                    )}
                    {field.type === "textarea" && (
                      <textarea className="fi" value={getAnswer(field.id)} onChange={e => setAnswer(field.id, e.target.value)} placeholder={field.placeholder} rows={3} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.text, lineHeight: 1.6, resize: "vertical", transition: "all 0.2s" }} />
                    )}
                    {field.type === "select" && (
                      <select className="fi" value={getAnswer(field.id)} onChange={e => setAnswer(field.id, e.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: getAnswer(field.id) ? T.text : T.textDim, cursor: "pointer", transition: "all 0.2s" }}>
                        {field.options.map(o => <option key={o} value={o}>{o || "Choose…"}</option>)}
                      </select>
                    )}
                    {field.type === "multiselect" && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {field.options.map(tag => <QualityChip key={tag} label={tag} active={selectedQuality.includes(tag)} onClick={() => toggleQuality(tag)} />)}
                      </div>
                    )}
                    {field.type === "pose-select" && (() => {
                      const sel  = getAnswer(field.id + "_sel") || "";
                      const free = getAnswer(field.id + "_free") || "";
                      return (
                        <div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                            {field.options.map(o => (
                              <OptionTile key={o} label={o} active={sel === o} onClick={() => setAnswer(field.id + "_sel", sel === o ? "" : o)} />
                            ))}
                          </div>
                          <input className="fi" value={free} onChange={e => setAnswer(field.id + "_free", e.target.value)} placeholder="Additional detail (optional)" style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.text, transition: "all 0.2s" }} />
                        </div>
                      );
                    })()}
                    {field.type === "expression-select" && (() => {
                      const selRaw = getAnswer(field.id + "_sel") || "[]";
                      let sel = [];
                      try { sel = JSON.parse(selRaw); } catch { sel = []; }
                      const free = getAnswer(field.id + "_free") || "";
                      const toggleExpr = (o) => {
                        const next = sel.includes(o) ? sel.filter(v => v !== o) : [...sel, o];
                        setAnswer(field.id + "_sel", JSON.stringify(next));
                      };
                      return (
                        <div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                            {field.options.map(o => (
                              <OptionTile key={o} label={o} active={sel.includes(o)} onClick={() => toggleExpr(o)} />
                            ))}
                          </div>
                          <input className="fi" value={free} onChange={e => setAnswer(field.id + "_free", e.target.value)} placeholder="Additional detail (optional)" style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.text, transition: "all 0.2s" }} />
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}

            {/* Nav */}
            <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
              <button onClick={() => step === 0 ? setPhase("home") : setStep(step - 1)} style={{ padding: "12px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontSize: 14, cursor: "pointer", minHeight: 48 }}>
                ← {step === 0 ? "Home" : "Back"}
              </button>
              <button onClick={() => isLastStep ? generatePrompt() : setStep(step + 1)} style={{ flex: 1, padding: "12px 16px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 48 }}>
                {isLastStep ? "Generate →" : `Next: ${STEPS[step + 1]?.label} →`}
              </button>
            </div>
          </div>
        )}

        {/* ══ DONE ══ */}
        {phase === "scene" && isDone && (
          <div className="fi-in">
            <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 20px", lineHeight: 1.5 }}>
              {activeChar ? `Character: ${activeChar.name} · ` : "No character · "}Paste positive and negative into SD / ComfyUI separately.
            </p>

            {isGenerating ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "28px 16px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.surface }}>
                <span style={{ fontSize: 14, color: T.textMuted }}>Crafting your prompt</span><GenDots />
              </div>
            ) : (
              <>
                {(() => {
                  const isPony  = sdModel === "pony";
                  const fullPos = isPony ? `${PONY_POS_PREFIX} ${generatedPrompt}` : generatedPrompt;
                  const fullNeg = isPony ? `${generatedNegative} ${PONY_NEG_SUFFIX}` : generatedNegative;
                  return (
                    <>
                      {/* Positive */}
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.success, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Positive Prompt</div>
                        <div style={{ padding: "14px", borderRadius: 10, border: `1px solid ${T.accentDim}`, background: T.surface, boxShadow: `0 0 20px ${T.accentGlow}`, fontFamily: T.mono, fontSize: 13, lineHeight: 1.8, color: T.text, whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 10 }}>
                          {isPony && (
                            <>
                              <span style={{ color: T.accentWarm }}>{PONY_POS_PREFIX}</span>
                              <span style={{ display: "inline-flex", alignItems: "center", margin: "0 6px", padding: "1px 6px", borderRadius: 4, border: `1px solid ${T.accentWarm}55`, background: T.accentWarmDim, fontSize: 10, fontWeight: 700, color: T.accentWarm, letterSpacing: "0.06em", verticalAlign: "middle" }}>Score tags (auto)</span>
                              {" "}
                            </>
                          )}
                          {generatedPrompt}
                        </div>
                        <button onClick={() => copy(fullPos, setCopied)} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: copied ? T.success : T.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 44 }}>
                          {copied ? "✓ Copied!" : "Copy Positive"}
                        </button>
                      </div>

                      {/* Negative */}
                      {generatedNegative && (
                        <div style={{ marginBottom: 24 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: T.red, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Negative Prompt</div>
                          <div style={{ padding: "14px", borderRadius: 10, border: `1px solid ${T.red}33`, background: T.redDim, fontFamily: T.mono, fontSize: 13, lineHeight: 1.8, color: T.textMuted, whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 10 }}>
                            {generatedNegative}
                            {isPony && (
                              <>
                                {" "}
                                <span style={{ display: "inline-flex", alignItems: "center", margin: "0 6px", padding: "1px 6px", borderRadius: 4, border: `1px solid ${T.accentWarm}55`, background: T.accentWarmDim, fontSize: 10, fontWeight: 700, color: T.accentWarm, letterSpacing: "0.06em", verticalAlign: "middle" }}>Score tags (auto)</span>
                                {" "}<span style={{ color: T.accentWarm }}>{PONY_NEG_SUFFIX}</span>
                              </>
                            )}
                          </div>
                          <button onClick={() => copy(fullNeg, setCopiedNeg)} style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${T.red}55`, background: "transparent", color: T.red, fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 44 }}>
                            {copiedNeg ? "✓ Copied!" : "Copy Negative"}
                          </button>
                        </div>
                      )}

                      {/* Save prompt panel */}
                      <div style={{ marginBottom: 24, padding: "14px 16px", borderRadius: 10, border: `1px solid ${savedConfirm ? T.success + "55" : T.border}`, background: savedConfirm ? T.successDim : T.surface, transition: "all 0.3s" }}>
                        {savedConfirm ? (
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.success }}>✓ Prompt saved to library</div>
                        ) : showSavePanel ? (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: T.textDim, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Save Prompt</div>
                            <input
                              className="fi"
                              value={saveNameInput}
                              onChange={e => setSaveNameInput(e.target.value)}
                              placeholder={defaultSaveName()}
                              onKeyDown={e => { if (e.key === "Enter") doSavePrompt(); if (e.key === "Escape") setShowSavePanel(false); }}
                              autoFocus
                              style={{ width: "100%", padding: "11px 13px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surfaceAlt, color: T.text, marginBottom: 10, transition: "all 0.2s" }}
                            />
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={doSavePrompt} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: T.success, color: T.bg, fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 40 }}>
                                Save
                              </button>
                              <button onClick={() => { setShowSavePanel(false); setSaveNameInput(""); }} style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontSize: 13, cursor: "pointer", minHeight: 40 }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setSaveNameInput(""); setShowSavePanel(true); }} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "none", background: "transparent", color: T.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16, color: T.success }}>⊕</span> Save to Library
                          </button>
                        )}
                      </div>
                    </>
                  );
                })()}

                {/* Bottom actions */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button onClick={generatePrompt} style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${T.accentDim}`, background: "transparent", color: T.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 44 }}>Regenerate</button>
                  <button onClick={() => { setIsDone(false); setStep(STEPS.length - 1); }} style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.textMuted, fontSize: 13, cursor: "pointer", minHeight: 44 }}>← Edit</button>
                  <button onClick={resetToHome} style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.textDim, fontSize: 13, cursor: "pointer", marginLeft: "auto", minHeight: 44 }}>Home</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
