import { useState, useRef, useCallback } from "react";

const STEPS = [
  {
    id: "character",
    label: "Character",
    icon: "◎",
    description: "Who or what is the subject?",
    fields: [
      { id: "subject", label: "Subject", type: "text", placeholder: "e.g. a young woman, a robot, a wolf" },
      { id: "age", label: "Age / Era", type: "text", placeholder: "e.g. mid-30s, ancient, futuristic" },
      { id: "ethnicity", label: "Ethnicity / Species", type: "text", placeholder: "e.g. East Asian, elven, humanoid" },
      { id: "build", label: "Build / Physique", type: "text", placeholder: "e.g. athletic, slender, stocky" },
    ],
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: "◈",
    description: "How do they look?",
    fields: [
      { id: "hair", label: "Hair", type: "text", placeholder: "e.g. long dark curly hair, platinum bob" },
      { id: "eyes", label: "Eyes", type: "text", placeholder: "e.g. piercing green eyes, heterochromia" },
      { id: "clothing", label: "Clothing / Costume", type: "text", placeholder: "e.g. red leather jacket, ornate armour" },
      { id: "accessories", label: "Accessories / Props", type: "text", placeholder: "e.g. sword, glasses, glowing amulet" },
    ],
  },
  {
    id: "pose",
    label: "Pose & Expression",
    icon: "◐",
    description: "What are they doing?",
    fields: [
      { id: "pose", label: "Body Pose", type: "text", placeholder: "e.g. standing confidently, crouching, mid-leap" },
      { id: "expression", label: "Facial Expression", type: "text", placeholder: "e.g. determined, serene, mid-laugh" },
      { id: "action", label: "Action / Motion", type: "text", placeholder: "e.g. casting a spell, running through rain" },
      { id: "camera_angle", label: "Camera Angle", type: "select", options: ["", "Eye level", "Low angle", "High angle / bird's eye", "Dutch angle", "Close-up / portrait", "Medium shot", "Full body", "Over the shoulder", "Macro / extreme close-up"] },
    ],
  },
  {
    id: "environment",
    label: "Environment",
    icon: "◻",
    description: "Where does the scene take place?",
    fields: [
      { id: "location", label: "Location", type: "text", placeholder: "e.g. ancient forest, neon city street, underwater cave" },
      { id: "time_of_day", label: "Time of Day", type: "select", options: ["", "Dawn / golden hour", "Morning", "Midday", "Afternoon", "Dusk / magic hour", "Night", "Midnight"] },
      { id: "weather", label: "Weather / Conditions", type: "text", placeholder: "e.g. heavy rain, snow, foggy, clear sky" },
      { id: "season", label: "Season / Climate", type: "select", options: ["", "Spring", "Summer", "Autumn / Fall", "Winter", "Tropical", "Arctic", "Desert"] },
    ],
  },
  {
    id: "lighting",
    label: "Lighting",
    icon: "◑",
    description: "How is the scene lit?",
    fields: [
      { id: "light_source", label: "Light Source", type: "text", placeholder: "e.g. candlelight, sunlight, neon glow, moonlight" },
      { id: "light_direction", label: "Light Direction", type: "select", options: ["", "Front lit", "Side lit / Rembrandt", "Back lit / silhouette", "Top lit", "Under lit", "Rim lit", "Dappled"] },
      { id: "light_quality", label: "Light Quality", type: "select", options: ["", "Soft & diffused", "Hard & dramatic", "High contrast", "Low key", "High key", "Volumetric / god rays", "Bioluminescent"] },
      { id: "color_temperature", label: "Colour Temperature", type: "select", options: ["", "Warm (golden / orange)", "Cool (blue / silver)", "Neutral / daylight", "Mixed / split", "Neon / vibrant", "Desaturated / muted"] },
    ],
  },
  {
    id: "mood",
    label: "Mood & Atmosphere",
    icon: "◓",
    description: "What feeling should it evoke?",
    fields: [
      { id: "mood", label: "Overall Mood", type: "text", placeholder: "e.g. melancholic, epic, serene, unsettling" },
      { id: "atmosphere", label: "Atmospheric Details", type: "text", placeholder: "e.g. dust motes, falling petals, smoke, lens flare" },
      { id: "narrative", label: "Narrative Context (optional)", type: "text", placeholder: "e.g. just before battle, a tender reunion, abandoned for decades" },
    ],
  },
  {
    id: "style",
    label: "Art Style",
    icon: "◍",
    description: "What visual style or medium?",
    fields: [
      { id: "art_style", label: "Art Style", type: "text", placeholder: "e.g. hyperrealistic, painterly, anime, art nouveau" },
      { id: "medium", label: "Medium / Technique", type: "text", placeholder: "e.g. oil painting, digital art, watercolour, 3D render" },
      { id: "artist_reference", label: "Artist / Director Reference (optional)", type: "text", placeholder: "e.g. in the style of Sargent, inspired by Roger Deakins" },
      { id: "color_palette", label: "Colour Palette", type: "text", placeholder: "e.g. muted earth tones, vivid cyberpunk palette" },
    ],
  },
  {
    id: "output",
    label: "Output Specs",
    icon: "◉",
    description: "Technical & quality parameters.",
    fields: [
      { id: "aspect_ratio", label: "Aspect Ratio", type: "select", options: ["", "1:1 (square)", "4:3 (landscape)", "3:4 (portrait)", "16:9 (widescreen)", "9:16 (vertical / mobile)", "2:3 (print portrait)", "3:2 (print landscape)", "21:9 (ultrawide / cinematic)"] },
      { id: "quality_tags", label: "Quality Tags", type: "multiselect", options: ["masterpiece", "best quality", "ultra detailed", "8k", "photorealistic", "cinematic", "award winning", "professional", "sharp focus", "RAW photo"] },
      { id: "negative", label: "What to Avoid (negative prompt ideas)", type: "text", placeholder: "e.g. blurry, cartoon, watermark, extra limbs" },
    ],
  },
];

const T = {
  bg: "#0d0f14",
  surface: "#13161f",
  surfaceAlt: "#1a1e2a",
  border: "#252938",
  accent: "#7c6ff7",
  accentDim: "#3d3880",
  accentGlow: "rgba(124,111,247,0.15)",
  accentWarm: "#f7a06f",
  accentWarmDim: "rgba(247,160,111,0.15)",
  text: "#e8e6f0",
  textMuted: "#7a7a96",
  textDim: "#4a4a66",
  success: "#4ade80",
  mono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
};

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PromptBuilder() {
  const [phase, setPhase] = useState("upload"); // "upload" | "steps" | "done"
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedQuality, setSelectedQuality] = useState([]);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null); // { dataUrl, base64, mediaType }
  const [isDragging, setIsDragging] = useState(false);
  const [analysisNote, setAnalysisNote] = useState("");
  const fileInputRef = useRef(null);
  const promptRef = useRef(null);

  const currentStep = STEPS[step];
  const progress = (step / STEPS.length) * 100;
  const isLastStep = step === STEPS.length - 1;

  const getAnswer = (id) => answers[id] || "";
  const setAnswer = (id, val) => setAnswers((p) => ({ ...p, [id]: val }));
  const toggleQuality = (tag) => setSelectedQuality((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);

  // --- Image upload handling ---
  const handleImageFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const base64 = dataUrl.split(",")[1];
      setUploadedImage({ dataUrl, base64, mediaType: file.type });
    };
    reader.readAsDataURL(file);
  }, []);

  const onFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  // --- Analyse the uploaded photo ---
  const analysePhoto = async () => {
    if (!uploadedImage) return;
    setIsAnalysing(true);
    setAnalysisNote("");

    const systemPrompt = `You are an expert at analysing reference photos of people and extracting detailed appearance descriptors for image generation prompts.

Analyse the provided photo and return ONLY a JSON object with these exact keys. Be specific, descriptive, and use language that image generation models understand well. If something is unclear or not visible, use an empty string.

{
  "subject": "brief subject descriptor e.g. 'a woman' or 'a man'",
  "age": "estimated age range e.g. 'late 20s' or 'early 30s'",
  "ethnicity": "ethnicity/appearance descriptor",
  "build": "body build if visible",
  "hair": "detailed hair description — colour, length, style, texture",
  "eyes": "eye colour and shape description",
  "clothing": "clothing visible in the photo",
  "accessories": "any visible accessories, jewellery, props"
}

Return ONLY valid JSON. No markdown, no explanation, no backticks.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: uploadedImage.mediaType, data: uploadedImage.base64 }
              },
              { type: "text", text: "Analyse this reference photo and return the JSON descriptor object." }
            ]
          }]
        }),
      });

      const data = await response.json();
      const raw = data.content?.map((b) => b.text || "").join("").trim();
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      // Pre-fill answers
      const newAnswers = { ...answers };
      if (parsed.subject) newAnswers.subject = parsed.subject;
      if (parsed.age) newAnswers.age = parsed.age;
      if (parsed.ethnicity) newAnswers.ethnicity = parsed.ethnicity;
      if (parsed.build) newAnswers.build = parsed.build;
      if (parsed.hair) newAnswers.hair = parsed.hair;
      if (parsed.eyes) newAnswers.eyes = parsed.eyes;
      if (parsed.clothing) newAnswers.clothing = parsed.clothing;
      if (parsed.accessories) newAnswers.accessories = parsed.accessories;
      setAnswers(newAnswers);
      setAnalysisNote("Photo analysed — Character & Appearance fields pre-filled. Review and adjust before continuing.");
      setPhase("steps");
      setStep(0);
    } catch (err) {
      setAnalysisNote("Couldn't parse the photo response. You can still fill in the fields manually.");
      setPhase("steps");
      setStep(0);
    } finally {
      setIsAnalysing(false);
    }
  };

  const skipUpload = () => {
    setPhase("steps");
    setStep(0);
  };

  // --- Build context for final prompt ---
  const buildContextSummary = () => {
    const lines = [];
    STEPS.forEach((s) => {
      s.fields.forEach((f) => {
        if (f.id === "quality_tags") {
          if (selectedQuality.length) lines.push(`Quality tags: ${selectedQuality.join(", ")}`);
        } else {
          const val = answers[f.id];
          if (val?.trim()) lines.push(`${f.label}: ${val}`);
        }
      });
    });
    return lines.join("\n");
  };

  // --- Generate final prompt ---
  const generatePrompt = async () => {
    setIsGenerating(true);
    setPhase("done");
    setGeneratedPrompt("");

    const context = buildContextSummary();
    const hasPhoto = !!uploadedImage;

    const systemPrompt = `You are an expert image generation prompt engineer. Synthesise user-provided details into a single, highly effective image generation prompt.

Rules:
- Output ONLY the prompt itself — no preamble, no explanation, no quotation marks
- Order elements by prompt weight: subject → appearance → pose/action → environment → lighting → mood → style → quality tags
- Use natural, flowing descriptive language — not a dry list
- Include vivid, specific detail that an image model will latch onto
- Weave in quality tags naturally at the end
- Do NOT include negative prompt content
- Aim for 80–180 words
${hasPhoto ? "- A reference photo was provided for this character. Prioritise and emphasise the physical appearance details above other elements." : ""}`;

    const userContent = hasPhoto
      ? [
          { type: "image", source: { type: "base64", media_type: uploadedImage.mediaType, data: uploadedImage.base64 } },
          { type: "text", text: `Reference photo provided. Additional user details:\n\n${context}\n\nSynthesize into a masterfully crafted image generation prompt that captures the person's appearance from the photo, combined with the scene details above.` }
        ]
      : `Here are the details the user has provided:\n\n${context}\n\nSynthesize into a masterfully crafted image generation prompt.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      const data = await response.json();
      const text = data.content?.map((b) => b.text || "").join("") || "";
      setGeneratedPrompt(text.trim());
    } catch (err) {
      setGeneratedPrompt("Error generating prompt. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const restart = () => {
    setPhase("upload");
    setStep(0);
    setAnswers({});
    setSelectedQuality([]);
    setGeneratedPrompt("");
    setUploadedImage(null);
    setAnalysisNote("");
  };

  const hasAnyAnswer = () => currentStep.fields.some((f) => {
    if (f.id === "quality_tags") return selectedQuality.length > 0;
    return answers[f.id]?.trim();
  });

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        * { box-sizing: border-box; }
        input, select { outline: none; }
        input::placeholder { color: ${T.textDim}; }
        select option { background: ${T.surfaceAlt}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        .field-input:focus { border-color: ${T.accent} !important; background: ${T.surfaceAlt} !important; }
        .next-btn:hover { background: #8f83f9 !important; transform: translateY(-1px); }
        .next-btn:active { transform: translateY(0); }
        .quality-tag:hover { border-color: ${T.accent} !important; }
        .copy-btn:hover { opacity: 0.85; }
        .restart-btn:hover { border-color: ${T.textMuted} !important; color: ${T.text} !important; }
        .upload-zone:hover { border-color: ${T.accent} !important; background: ${T.accentGlow} !important; }
        .analyse-btn:hover { background: #e8904a !important; transform: translateY(-1px); }
        .step-dot:hover { border-color: ${T.accent} !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes shimmer { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .fade-in { animation: fadeIn 0.35s ease forwards; }
        .generating-dot { animation: pulse 1.2s ease-in-out infinite; }
        .generating-dot:nth-child(2) { animation-delay: 0.2s; }
        .generating-dot:nth-child(3) { animation-delay: 0.4s; }
        .shimmer { animation: shimmer 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ padding: "20px 24px 0", maxWidth: 680, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.accentGlow, border: `1px solid ${T.accentDim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.accent }}>⬡</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Prompt Studio</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: T.text, letterSpacing: "-0.02em" }}>Image Prompt Builder</h1>
        <p style={{ fontSize: 13, color: T.textMuted, margin: "0 0 20px" }}>
          {phase === "upload" ? "Upload a reference photo to auto-fill character details — or start from scratch." : "Answer each section — AI assembles your prompt."}
        </p>

        {/* Progress bar */}
        <div style={{ height: 2, background: T.border, borderRadius: 1, marginBottom: 20, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: phase === "upload" ? "0%" : phase === "done" ? "100%" : `${progress}%`,
            background: T.accent, borderRadius: 1, transition: "width 0.4s ease",
            boxShadow: `0 0 8px ${T.accent}`
          }} />
        </div>

        {/* Step dots — only show when in steps phase */}
        {phase === "steps" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap" }}>
            {STEPS.map((s, i) => {
              const isActive = i === step;
              const isPast = i < step;
              return (
                <button key={s.id} className="step-dot" onClick={() => setStep(i)} style={{
                  display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20,
                  border: `1px solid ${isActive ? T.accent : isPast ? T.accentDim : T.border}`,
                  background: isActive ? T.accentGlow : "transparent",
                  color: isActive ? T.accent : isPast ? T.accent : T.textDim,
                  fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.04em",
                }}>
                  <span style={{ fontSize: 10 }}>{isPast && !isActive ? "✓" : s.icon}</span>
                  {s.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, maxWidth: 680, margin: "0 auto", width: "100%", padding: "0 24px 40px" }}>

        {/* ── UPLOAD PHASE ── */}
        {phase === "upload" && (
          <div className="fade-in">
            {/* Drop zone */}
            <div
              className="upload-zone"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => !uploadedImage && fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? T.accent : uploadedImage ? T.accentDim : T.border}`,
                borderRadius: 14, padding: uploadedImage ? 16 : "40px 20px",
                background: isDragging ? T.accentGlow : uploadedImage ? T.surface : "transparent",
                cursor: uploadedImage ? "default" : "pointer",
                transition: "all 0.2s", textAlign: "center", marginBottom: 16,
              }}
            >
              {!uploadedImage ? (
                <>
                  <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>⬆</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>Drop a reference photo here</div>
                  <div style={{ fontSize: 12, color: T.textMuted }}>or click to browse · JPG, PNG, WEBP</div>
                </>
              ) : (
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <img
                    src={uploadedImage.dataUrl}
                    alt="Reference"
                    style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: `1px solid ${T.accentDim}`, flexShrink: 0 }}
                  />
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>Photo ready</div>
                    <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10 }}>AI will analyse facial features, hair, eyes, skin tone, and clothing to pre-fill your fields.</div>
                    <button onClick={(e) => { e.stopPropagation(); setUploadedImage(null); fileInputRef.current.value = ""; }} style={{
                      fontSize: 11, color: T.textDim, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline"
                    }}>Remove photo</button>
                  </div>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileInput} style={{ display: "none" }} />

            {/* Fine print */}
            <div style={{
              fontSize: 11, color: T.textDim, lineHeight: 1.6,
              padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
              background: T.surface, marginBottom: 20,
            }}>
              <strong style={{ color: T.textMuted }}>Privacy note:</strong> Your photo is sent to Claude's API for analysis only. It is not stored or used for training. Analysis extracts appearance descriptors only — no identity or biometric data is retained.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              {uploadedImage && (
                <button
                  className="analyse-btn"
                  onClick={analysePhoto}
                  disabled={isAnalysing}
                  style={{
                    flex: 1, padding: "11px 20px", borderRadius: 8, border: "none",
                    background: T.accentWarm, color: "#fff", fontSize: 13, fontWeight: 700,
                    cursor: isAnalysing ? "wait" : "pointer", transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {isAnalysing ? (
                    <>
                      <span className="shimmer">Analysing photo</span>
                      {[0,1,2].map(i => <span key={i} className="generating-dot" style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", display: "inline-block" }} />)}
                    </>
                  ) : "✦ Analyse & Auto-fill →"}
                </button>
              )}
              <button
                onClick={skipUpload}
                style={{
                  padding: "11px 20px", borderRadius: 8, border: `1px solid ${T.border}`,
                  background: "transparent", color: T.textMuted, fontSize: 13, cursor: "pointer",
                  flex: uploadedImage ? 0 : 1, transition: "all 0.2s",
                }}
              >
                {uploadedImage ? "Skip" : "Start without photo →"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEPS PHASE ── */}
        {phase === "steps" && (
          <div className="fade-in" key={step}>
            {/* Analysis banner */}
            {analysisNote && step <= 1 && (
              <div style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                padding: "10px 14px", borderRadius: 8, marginBottom: 20,
                border: `1px solid ${T.accentWarm}`, background: T.accentWarmDim,
              }}>
                <span style={{ color: T.accentWarm, fontSize: 14, flexShrink: 0 }}>✦</span>
                <div>
                  {uploadedImage && (
                    <img src={uploadedImage.dataUrl} alt="ref" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 6, float: "right", marginLeft: 10, border: `1px solid ${T.accentDim}` }} />
                  )}
                  <p style={{ margin: 0, fontSize: 12, color: T.accentWarm, fontWeight: 600 }}>{analysisNote}</p>
                </div>
              </div>
            )}

            {/* Step header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 22, color: T.accent }}>{currentStep.icon}</span>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>{currentStep.label}</h2>
                <span style={{ fontSize: 12, color: T.textDim, marginLeft: "auto" }}>{step + 1} / {STEPS.length}</span>
              </div>
              <p style={{ fontSize: 14, color: T.textMuted, margin: 0 }}>{currentStep.description}</p>
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
              {currentStep.fields.map((field) => (
                <div key={field.id}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.textMuted, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {field.label}
                    {answers[field.id] && field.type === "text" && uploadedImage && step <= 1 && (
                      <span style={{ marginLeft: 8, color: T.accentWarm, fontSize: 10, fontWeight: 500 }}>✦ from photo</span>
                    )}
                  </label>

                  {field.type === "text" && (
                    <input
                      className="field-input"
                      value={getAnswer(field.id)}
                      onChange={(e) => setAnswer(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8,
                        border: `1px solid ${answers[field.id] && step <= 1 && uploadedImage ? T.accentWarm + "66" : T.border}`,
                        background: T.surface, color: T.text, fontSize: 14, transition: "all 0.2s",
                      }}
                    />
                  )}

                  {field.type === "select" && (
                    <select
                      className="field-input"
                      value={getAnswer(field.id)}
                      onChange={(e) => setAnswer(field.id, e.target.value)}
                      style={{
                        width: "100%", padding: "10px 14px", borderRadius: 8,
                        border: `1px solid ${T.border}`, background: T.surface,
                        color: getAnswer(field.id) ? T.text : T.textDim, fontSize: 14, transition: "all 0.2s", cursor: "pointer",
                      }}
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt || `Choose ${field.label.toLowerCase()}…`}</option>
                      ))}
                    </select>
                  )}

                  {field.type === "multiselect" && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {field.options.map((tag) => {
                        const active = selectedQuality.includes(tag);
                        return (
                          <button key={tag} className="quality-tag" onClick={() => toggleQuality(tag)} style={{
                            padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                            border: `1px solid ${active ? T.accent : T.border}`,
                            background: active ? T.accentGlow : "transparent",
                            color: active ? T.accent : T.textMuted,
                            cursor: "pointer", transition: "all 0.2s",
                          }}>
                            {active && <span style={{ marginRight: 4 }}>✓</span>}{tag}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => step === 0 ? setPhase("upload") : setStep(step - 1)} style={{
                padding: "10px 18px", borderRadius: 8, border: `1px solid ${T.border}`,
                background: "transparent", color: T.textMuted, fontSize: 13, cursor: "pointer",
              }}>
                ← {step === 0 ? "Photo" : "Back"}
              </button>

              <button className="next-btn" onClick={() => isLastStep ? generatePrompt() : setStep(step + 1)} style={{
                padding: "10px 22px", borderRadius: 8, border: "none",
                background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s", marginLeft: "auto",
              }}>
                {isLastStep ? "Generate Prompt →" : `Next: ${STEPS[step + 1]?.label} →`}
              </button>
            </div>
          </div>
        )}

        {/* ── DONE PHASE ── */}
        {phase === "done" && (
          <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18, color: T.success }}>✦</span>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Your Prompt</h2>
                {uploadedImage && (
                  <img src={uploadedImage.dataUrl} alt="ref" style={{ width: 28, height: 28, objectFit: "cover", borderRadius: "50%", border: `1px solid ${T.accentDim}`, marginLeft: "auto" }} />
                )}
              </div>
              <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>
                AI-synthesised{uploadedImage ? " from photo + your answers" : " from your answers"}. Copy and use in any image generator.
              </p>
            </div>

            {isGenerating ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "32px 20px", borderRadius: 12, border: `1px solid ${T.border}`, background: T.surface }}>
                <span style={{ fontSize: 13, color: T.textMuted }}>Crafting your prompt</span>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="generating-dot" style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent, display: "inline-block" }} />
                ))}
              </div>
            ) : (
              <>
                <div ref={promptRef} style={{
                  padding: "20px", borderRadius: 12, border: `1px solid ${T.accentDim}`,
                  background: T.surface, marginBottom: 16,
                  boxShadow: `0 0 24px ${T.accentGlow}`,
                  fontFamily: T.mono, fontSize: 13, lineHeight: 1.7,
                  color: T.text, whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {generatedPrompt}
                </div>

                {answers.negative?.trim() && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Negative Prompt</div>
                    <div style={{
                      padding: "12px 16px", borderRadius: 8, border: `1px solid ${T.border}`,
                      background: T.surface, fontFamily: T.mono, fontSize: 12,
                      color: T.textMuted, lineHeight: 1.6,
                    }}>
                      {answers.negative}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="copy-btn" onClick={copyPrompt} style={{
                    padding: "10px 20px", borderRadius: 8, border: "none",
                    background: copied ? T.success : T.accent,
                    color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                  }}>
                    {copied ? "✓ Copied!" : "Copy Prompt"}
                  </button>
                  <button onClick={generatePrompt} style={{
                    padding: "10px 20px", borderRadius: 8, border: `1px solid ${T.accentDim}`,
                    background: "transparent", color: T.accent, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                    Regenerate
                  </button>
                  <button onClick={() => { setPhase("steps"); setStep(0); }} style={{
                    padding: "10px 20px", borderRadius: 8, border: `1px solid ${T.border}`,
                    background: "transparent", color: T.textMuted, fontSize: 13, cursor: "pointer",
                  }}>
                    ← Edit answers
                  </button>
                  <button className="restart-btn" onClick={restart} style={{
                    padding: "10px 20px", borderRadius: 8, border: `1px solid ${T.border}`,
                    background: "transparent", color: T.textDim, fontSize: 13, cursor: "pointer",
                    marginLeft: "auto", transition: "all 0.2s",
                  }}>
                    Start over
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
