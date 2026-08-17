import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Primary recommended model for multimodal & language tasks
const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash";

// Simple in-memory response cache to minimize unnecessary duplicate API requests
const geminiResponseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes cache

function cleanJsonResponse(text: string): string {
  if (!text) return "{}";
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

async function callGeminiWithResilience(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    cacheKey?: string;
  }
): Promise<any> {
  // Check cache first
  if (params.cacheKey) {
    const cached = geminiResponseCache.get(params.cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  let lastError: any = null;

  try {
    const response = await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: params.contents,
      config: params.config,
    });

    if (response && response.text) {
      const rawText = cleanJsonResponse(response.text);
      const parsed = JSON.parse(rawText);
      if (params.cacheKey) {
        geminiResponseCache.set(params.cacheKey, { data: parsed, timestamp: Date.now() });
      }
      return parsed;
    }
  } catch (err: any) {
    lastError = err;
    const errMsg = (err?.message || String(err)).toLowerCase();
    const is429 = errMsg.includes("429") || errMsg.includes("resource_exhausted") || errMsg.includes("quota");

    // If quota exhausted (429), fail immediately so local fallback handles it seamlessly without spamming retries
    if (is429) {
      throw err;
    }

    // If transient 503/500, retry once after short delay
    const isTransient = errMsg.includes("503") || errMsg.includes("500") || errMsg.includes("unavailable");
    if (isTransient) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const retryResponse = await ai.models.generateContent({
          model: FALLBACK_MODEL,
          contents: params.contents,
          config: params.config,
        });
        if (retryResponse && retryResponse.text) {
          const rawText = cleanJsonResponse(retryResponse.text);
          const parsed = JSON.parse(rawText);
          if (params.cacheKey) {
            geminiResponseCache.set(params.cacheKey, { data: parsed, timestamp: Date.now() });
          }
          return parsed;
        }
      } catch (retryErr) {
        lastError = retryErr;
      }
    }
  }

  throw lastError || new Error("Gemini request failed");
}

// Helper: Local fallback language detector
function fallbackDetectLanguage(text: string): {
  detectedLanguage: string;
  languageCode: string;
  nativeName: string;
  isTransliterated?: boolean;
} {
  const trimmed = (text || "").trim();
  if (!trimmed) return { detectedLanguage: "English", languageCode: "en-IN", nativeName: "English (India)" };
  if (/[\u0B80-\u0BFF]/.test(trimmed)) return { detectedLanguage: "Tamil", languageCode: "ta-IN", nativeName: "தமிழ் (Tamil)" };
  if (/[\u0C00-\u0C7F]/.test(trimmed)) return { detectedLanguage: "Telugu", languageCode: "te-IN", nativeName: "తెలుగు (Telugu)" };
  if (/[\u0C80-\u0CFF]/.test(trimmed)) return { detectedLanguage: "Kannada", languageCode: "kn-IN", nativeName: "ಕನ್ನಡ (Kannada)" };
  if (/[\u0D00-\u0D7F]/.test(trimmed)) return { detectedLanguage: "Malayalam", languageCode: "ml-IN", nativeName: "മലയാളം (Malayalam)" };
  if (/[\u0980-\u09FF]/.test(trimmed)) return { detectedLanguage: "Bengali", languageCode: "bn-IN", nativeName: "বাংলা (Bengali)" };
  if (/[\u0A80-\u0AFF]/.test(trimmed)) return { detectedLanguage: "Gujarati", languageCode: "gu-IN", nativeName: "ગુજરાતી (Gujarati)" };
  if (/[\u0A00-\u0A7F]/.test(trimmed)) return { detectedLanguage: "Punjabi", languageCode: "pa-IN", nativeName: "ਪੰਜਾਬੀ (Punjabi)" };
  if (/[\u0900-\u097F]/.test(trimmed)) {
    if (/\b(आहे|नाही|कसे|झाले|पाहिजे|भाऊ|ताई)\b/i.test(trimmed)) {
      return { detectedLanguage: "Marathi", languageCode: "mr-IN", nativeName: "मराठी (Marathi)" };
    }
    return { detectedLanguage: "Hindi", languageCode: "hi-IN", nativeName: "हिन्दी (Hindi)" };
  }
  const lower = trimmed.toLowerCase();
  if (/\b(vanakkam|thayal|thuni|samayal|samaipen|pannurom|seiyya|romba|nalla|veedu|oorugai|rasam|vadai|chennai|madurai|kaithari|koodai|kaivannam)\b/i.test(lower)) {
    return { detectedLanguage: "Tamil", languageCode: "ta-IN", nativeName: "தமிழ் (Tamil)", isTransliterated: true };
  }
  if (/\b(namaste|pranam|silai|khana|ghar|bhaiya|didi|chahiye|shukriya|dhanyawad|madad|roti|sabzi|achar|masala|kapde|kaam)\b/i.test(lower)) {
    return { detectedLanguage: "Hindi", languageCode: "hi-IN", nativeName: "हिन्दी (Hindi)", isTransliterated: true };
  }
  if (/\b(namaskaram|bagunnara|chesi|kavali|kuttu|panulu|meeru|nenu|telugu)\b/i.test(lower)) {
    return { detectedLanguage: "Telugu", languageCode: "te-IN", nativeName: "తెలుగు (Telugu)", isTransliterated: true };
  }
  return { detectedLanguage: "English", languageCode: "en-IN", nativeName: "English (India)" };
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "SilverHands Backend", time: new Date().toISOString() });
});

// Helper: Local fallback intent parser
function fallbackParseIntent(input: string): {
  category: string;
  keywords: string[];
  maxDistanceKm: number;
  isBarter: boolean;
  requiresApprentice: boolean;
  summary: string;
  detectedLanguage: string;
  translatedEnglishQuery: string;
} {
  const lower = input.toLowerCase();
  let category = "all";

  if (
    lower.includes("sari") ||
    lower.includes("saree") ||
    lower.includes("tailor") ||
    lower.includes("stitch") ||
    lower.includes("mend") ||
    lower.includes("repair") ||
    lower.includes("alter") ||
    lower.includes("தையல்") ||
    lower.includes("துணி") ||
    lower.includes("silai")
  ) {
    category = "repairs_mending";
  } else if (
    lower.includes("food") ||
    lower.includes("cook") ||
    lower.includes("pickle") ||
    lower.includes("meal") ||
    lower.includes("sweet") ||
    lower.includes("sambhar") ||
    lower.includes("rasam") ||
    lower.includes("சமையல்") ||
    lower.includes("உணவு") ||
    lower.includes("சாப்பாடு") ||
    lower.includes("ஊறுகாய்") ||
    lower.includes("khana") ||
    lower.includes("achar")
  ) {
    category = "home_cooking";
  } else if (
    lower.includes("clock") ||
    lower.includes("watch") ||
    lower.includes("horology") ||
    lower.includes("vintage") ||
    lower.includes("radio") ||
    lower.includes("gramophone") ||
    lower.includes("traditional")
  ) {
    category = "traditional_skills";
  } else if (
    lower.includes("wood") ||
    lower.includes("pottery") ||
    lower.includes("handwoven") ||
    lower.includes("quilt") ||
    lower.includes("craft") ||
    lower.includes("doll") ||
    lower.includes("kaithari") ||
    lower.includes("bommai")
  ) {
    category = "handmade_goods";
  } else if (
    lower.includes("herb") ||
    lower.includes("balm") ||
    lower.includes("plant") ||
    lower.includes("oil") ||
    lower.includes("organic") ||
    lower.includes("botanical") ||
    lower.includes("mooligai")
  ) {
    category = "gardening_botanicals";
  } else if (
    lower.includes("swap") ||
    lower.includes("trade") ||
    lower.includes("exchange") ||
    lower.includes("barter") ||
    lower.includes("மாற்று")
  ) {
    category = "barter_request";
  }

  // Distance extractor: e.g. "within 10 km" or "3km"
  const distMatch = lower.match(/(\d+)\s*(?:km|k\.m\.|kilometers|kilometer)/);
  const maxDistanceKm = distMatch ? parseFloat(distMatch[1]) : 5.0;

  const isBarter =
    lower.includes("barter") ||
    lower.includes("trade") ||
    lower.includes("swap") ||
    lower.includes("exchange") ||
    lower.includes("மாற்று");

  const requiresApprentice =
    lower.includes("learn") ||
    lower.includes("teach") ||
    lower.includes("apprentice") ||
    lower.includes("katrukkolla") ||
    lower.includes("seekhna");

  const keywords = input
    .toLowerCase()
    .replace(/[^\w\s\u0B80-\u0BFF\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const langInfo = fallbackDetectLanguage(input);

  return {
    category,
    keywords,
    maxDistanceKm,
    isBarter,
    requiresApprentice,
    summary: `Searching neighborhood listings for: ${input}`,
    detectedLanguage: langInfo.detectedLanguage,
    translatedEnglishQuery: input,
  };
}

// AI Multimodal Audio Transcriber
// Transcribes spoken audio chunks (WebM/WAV/MP4) using Gemini multimodal audio model
// Accurately recognizes Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, Marathi, English, etc.
app.post("/api/gemini/transcribe-audio", async (req, res) => {
  const { audioData, mimeType, languageHint } = req.body || {};
  if (!audioData || typeof audioData !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'audioData' (base64 string)." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      transcript: "Voice recording captured.",
      detectedLanguage: languageHint || "English",
      languageCode: "en-IN",
      nativeName: languageHint || "English",
      englishTranslation: "Voice recording captured."
    });
  }

  try {
    const base64Clean = audioData.replace(/^data:audio\/[a-z0-9\-+;=]+;base64,/, "");
    const cleanMimeType = (mimeType || "audio/webm").split(";")[0];

    const prompt = `You are an expert multilingual acoustic speech transcriber for SilverHands, a neighborhood marketplace.
Carefully listen to the attached audio recording to determine the TRUE language spoken.

Language Context / Hint: ${languageHint || "auto-detect"}.

CRITICAL LANGUAGE DETECTION & TRANSCRIPTION RULES:
1. Acoustic Detection: Accurately determine if the speaker is speaking English, Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, etc.
   - If the speaker spoke English (e.g. "Hello hello hello, I cook" or any English phrases even with an Indian accent), detectedLanguage MUST BE "English", languageCode MUST BE "en-IN", nativeName MUST BE "English", and 'transcript' MUST BE in clean English text (e.g. "Hello hello hello I cook delicious home food").
   - If the speaker spoke Tamil, detectedLanguage MUST BE "Tamil", languageCode MUST BE "ta-IN", nativeName MUST BE "தமிழ் (Tamil)", and 'transcript' MUST BE in தமிழ் script.
   - If the speaker spoke Hindi, detectedLanguage MUST BE "Hindi", languageCode MUST BE "hi-IN", nativeName MUST BE "हिन्दी (Hindi)", and 'transcript' MUST BE in हिन्दी Devanagari script.
   - If the speaker spoke Telugu, Kannada, Malayalam, Bengali, Marathi, etc., transcribe in respective native script.
2. 'englishTranslation': MUST ALWAYS BE 100% IN FLUENT ENGLISH (Latin alphabet characters ONLY).
3. If speech is very faint or unclear, transcribe as much as audible. DO NOT return placeholder text like "Voice recording captured".

Return JSON with fields: transcript, detectedLanguage, languageCode, nativeName, englishTranslation.`;

    const parsed = await callGeminiWithResilience(ai, {
      contents: [
        {
          inlineData: {
            mimeType: cleanMimeType,
            data: base64Clean,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING },
            languageCode: { type: Type.STRING },
            nativeName: { type: Type.STRING },
            englishTranslation: { type: Type.STRING },
          },
          required: ["transcript", "detectedLanguage", "languageCode", "nativeName"],
        },
      },
    });

    return res.json(parsed);
  } catch (error: any) {
    const resolvedLang = languageHint && languageHint !== "auto-detect" ? languageHint : "English";
    return res.status(200).json({
      transcript: "",
      detectedLanguage: resolvedLang,
      languageCode: resolvedLang === "Tamil" ? "ta-IN" : resolvedLang === "Hindi" ? "hi-IN" : "en-IN",
      nativeName: resolvedLang === "Tamil" ? "தமிழ் (Tamil)" : resolvedLang === "Hindi" ? "हिन्दी (Hindi)" : resolvedLang,
      englishTranslation: "",
    });
  }
});

// AI Provider Listing Generator
// Takes native language input or speech transcript and creates a formatted business listing
app.post("/api/gemini/generate-listing", async (req, res) => {
  const { input, language } = req.body || {};
  if (!input || typeof input !== "string") {
    return res.status(400).json({ error: "Missing or invalid 'input' in request body." });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Fallback graceful formatting if API key not available yet
    const fallbackTitle = input.slice(0, 40);
    return res.json({
      title: fallbackTitle,
      titleEnglish: "Traditional Handcrafted Artisan Service",
      description: input,
      descriptionEnglish: "Experienced local artisan offering traditional handcrafted services with personalized care and generational skill.",
      category: "handmade_goods",
      tags: ["Artisan", "Handmade", "Local Heritage", "Skill Swap"],
      estimatedPrice: 300,
      isBarter: input.toLowerCase().includes("barter") || input.toLowerCase().includes("exchange"),
      barterDetails: "Open to exchanging for phone tutoring or grocery pickup",
      digitalApprenticeEligible: true,
      heritageNotes: "Traditional handcrafted practice passed down over generations.",
      detectedLanguage: language || "English"
    });
  }

  try {
    const prompt = `You are an expert artisan business curator for SilverHands, a hyperlocal marketplace empowering senior citizens, homemakers, and traditional master crafters.
The senior provider provided the following voice note transcript or description of their skill/product:
"""
${input}
"""
Language hint: ${language || "auto-detect"}. 

STRICT TRANSLATION & LOCALIZATION MANDATES:
1. "title": Output in the NATIVE SCRIPT of the craftsperson.
   - If Tamil/Tanglish: write in proper தமிழ் script.
   - If Hindi/Hinglish: write in हिन्दी Devanagari script.
   - If purely English: write in English.

2. "titleEnglish": MUST BE 100% IN FLUENT ENGLISH (Latin alphabet characters ONLY).
   - NEVER output Tamil (தமிழ்) or Hindi or other Indic script in "titleEnglish"!

3. "description": Output a detailed, warm description in the NATIVE SCRIPT (தமிழ், हिन्दी, etc.) highlighting craftsmanship, generational heritage, and quality.

4. "descriptionEnglish": MUST BE 100% IN FLUENT ENGLISH (Latin alphabet characters ONLY).
   - Translate and enrich the native description into an inviting, professional English paragraph.

5. "category": Choose one of: 'repairs_mending', 'handmade_goods', 'traditional_skills', 'home_cooking', 'gardening_botanicals', 'barter_request'.

6. "tags": Array of 3-6 searchable keywords in English and native terms.
7. "estimatedPrice": Suggested price in Indian Rupees (INR / ₹) as a numeric value (e.g. 250, 350, 500, 800).
8. "isBarter": Boolean (true if they mention bartering, exchange, or mutual assistance).
9. "barterDetails": What they might want in exchange (e.g. "Smartphone tutoring or local grocery pickup").
10. "digitalApprenticeEligible": Boolean (whether local youth can learn from them).
11. "heritageNotes": 1-2 sentences on preserving generational craftsmanship.
12. "detectedLanguage": The detected language name (e.g. "Tamil", "Hindi", "Telugu", "Kannada", "English").
`;

    const parsed = await callGeminiWithResilience(ai, {
      contents: prompt,
      cacheKey: `listing_${(language || "auto")}_${input.trim()}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            titleEnglish: { type: Type.STRING },
            description: { type: Type.STRING },
            descriptionEnglish: { type: Type.STRING },
            category: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            estimatedPrice: { type: Type.NUMBER },
            isBarter: { type: Type.BOOLEAN },
            barterDetails: { type: Type.STRING },
            digitalApprenticeEligible: { type: Type.BOOLEAN },
            heritageNotes: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING },
          },
          required: ["title", "titleEnglish", "description", "descriptionEnglish", "category", "tags"],
        },
      },
    });

    return res.json(parsed);
  } catch (error: any) {
    const lower = (input || "").toLowerCase();
    let fallbackEnglishTitle = "Traditional Master Handcraft & Service";
    let fallbackEnglishDesc = "Experienced local artisan offering customized traditional handcraft services with generational skill and personalized care.";
    let fallbackCategory = "handmade_goods";

    if (lower.includes("தையல்") || lower.includes("தைப்பது") || lower.includes("துணி") || lower.includes("tailor") || lower.includes("stitch") || lower.includes("silai")) {
      fallbackEnglishTitle = "Expert Custom Tailoring & Garment Stitching";
      fallbackEnglishDesc = "Experienced home tailor offering custom garment stitching, dress alterations, blouse fittings, and careful mending.";
      fallbackCategory = "repairs_mending";
    } else if (lower.includes("சமையல்") || lower.includes("உணவு") || lower.includes("சாப்பாடு") || lower.includes("cook") || lower.includes("food") || lower.includes("khana")) {
      fallbackEnglishTitle = "Authentic Traditional Home Cooking";
      fallbackEnglishDesc = "Home-cooked heirloom meals, traditional recipes, and authentic regional delicacies made with pure ingredients.";
      fallbackCategory = "home_cooking";
    } else if (lower.includes("ஊறுகாய்") || lower.includes("pickle") || lower.includes("achar")) {
      fallbackEnglishTitle = "Sun-Dried Traditional Homemade Pickles";
      fallbackEnglishDesc = "Handcrafted artisan pickles made with cold-pressed oils, generational spices, and sun-ripened farm produce.";
      fallbackCategory = "home_cooking";
    }

    return res.status(200).json({
      title: input?.slice(0, 40) || "பாரம்பரிய கைவினை சேவை",
      titleEnglish: fallbackEnglishTitle,
      description: input || "பாரம்பரிய அனுபவம் மற்றும் கைவினை நேர்த்தி.",
      descriptionEnglish: fallbackEnglishDesc,
      category: fallbackCategory,
      tags: ["Heritage", "Artisan", "Handmade", "Skill Swap"],
      estimatedPrice: 300,
      isBarter: true,
      barterDetails: "Open to neighbor skill exchange or grocery run",
      digitalApprenticeEligible: true,
      heritageNotes: "Generational traditional technique crafted with patience.",
      detectedLanguage: language || "Tamil",
    });
  }
});

// Multilingual Real-Time Chat Translation
// Seamlessly bridges senior provider and customer communicating in different languages
app.post("/api/gemini/translate-message", async (req, res) => {
  const { text, targetLanguage, sourceLanguage } = req.body || {};
  if (!text || !targetLanguage) {
    return res.status(400).json({ error: "Missing 'text' or 'targetLanguage'." });
  }

  const trimmed = text.trim();
  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      originalText: trimmed,
      translatedText: trimmed,
      detectedLanguage: sourceLanguage || "English",
      targetLanguage,
      phoneticGuide: "",
    });
  }

  try {
    const prompt = `Translate the following message for the SilverHands marketplace chat between a senior craftsman and a neighbor.
Source Text: """${trimmed}"""
Source Language Hint: ${sourceLanguage || "Auto-detect"}
Target Language: ${targetLanguage}

Ensure the translation is respectful, warm, and natural for senior-friendly conversation.
Output JSON:
{
  "originalText": "${trimmed}",
  "translatedText": "string",
  "detectedLanguage": "string",
  "targetLanguage": "${targetLanguage}",
  "phoneticGuide": "optional pronunciation helper if translating to regional scripts"
}
`;

    const parsed = await callGeminiWithResilience(ai, {
      contents: prompt,
      cacheKey: `trans_${sourceLanguage || "auto"}_${targetLanguage}_${trimmed}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalText: { type: Type.STRING },
            translatedText: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING },
            targetLanguage: { type: Type.STRING },
            phoneticGuide: { type: Type.STRING },
          },
          required: ["originalText", "translatedText", "detectedLanguage"],
        },
      },
    });

    return res.json(parsed);
  } catch (error: any) {
    return res.status(200).json({
      originalText: trimmed,
      translatedText: trimmed,
      detectedLanguage: sourceLanguage || "Original",
      targetLanguage,
      phoneticGuide: "",
    });
  }
});

// Automatic Spoken & Written Language Detection
// Detects language regardless of user selection (e.g., if English was selected but user speaks/types Tamil)
app.post("/api/gemini/detect-language", async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing 'text' parameter." });
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return res.json({
      detectedLanguage: "English",
      languageCode: "en-IN",
      nativeName: "English",
    });
  }

  // Check deterministic local fallback first
  const localDetected = fallbackDetectLanguage(trimmed);

  const ai = getGeminiClient();
  if (!ai) {
    return res.json(localDetected);
  }

  try {
    const prompt = `Analyze this spoken or written text from an artisan or customer:
"""${trimmed}"""

Identify what language this is, even if written in Roman/English alphabet (transliterated phonetic speech) or native script.
Map it to one of the following codes:
- "ta-IN" (Tamil / தமிழ்)
- "hi-IN" (Hindi / हिन्दी)
- "te-IN" (Telugu / తెలుగు)
- "kn-IN" (Kannada / ಕನ್ನಡ)
- "ml-IN" (Malayalam / മലയാളம்)
- "bn-IN" (Bengali / বাংলা)
- "mr-IN" (Marathi / मराठी)
- "gu-IN" (Gujarati / ગુજરાતી)
- "pa-IN" (Punjabi / ਪੰਜਾਬੀ)
- "en-IN" (English / English (India))
- "es-ES" (Spanish / Español)
- "fr-FR" (French / Français)
- "de-DE" (German / Deutsch)
- "ar-SA" (Arabic / العربية)

Output JSON:
{
  "detectedLanguage": "Tamil" | "Hindi" | "Telugu" | "Kannada" | "Malayalam" | "Bengali" | "Marathi" | "Gujarati" | "Punjabi" | "English" | "Spanish" | "French" | "German" | "Arabic",
  "languageCode": "ta-IN" | "hi-IN" | "te-IN" | "kn-IN" | "ml-IN" | "bn-IN" | "mr-IN" | "gu-IN" | "pa-IN" | "en-IN" | "es-ES" | "fr-FR" | "de-DE" | "ar-SA",
  "nativeName": "string",
  "isTransliterated": boolean
}
`;

    const parsed = await callGeminiWithResilience(ai, {
      contents: prompt,
      cacheKey: `detect_${trimmed}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLanguage: { type: Type.STRING },
            languageCode: { type: Type.STRING },
            nativeName: { type: Type.STRING },
            isTransliterated: { type: Type.BOOLEAN },
          },
          required: ["detectedLanguage", "languageCode", "nativeName"],
        },
      },
    });

    return res.json(parsed);
  } catch (error: any) {
    return res.status(200).json(localDetected);
  }
});

// Convert Phonetic / Spoken Romanized Indian text (e.g. "Naan Samay pain in Raja Samiti") directly into native script (தமிழ் / हिन्दी / etc.)
app.post("/api/gemini/transliterate-to-native", async (req, res) => {
  const { text, targetLanguage } = req.body || {};
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing 'text' parameter." });
  }

  const trimmed = text.trim();
  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      nativeText: trimmed,
      language: targetLanguage || "Tamil",
      englishMeaning: trimmed,
    });
  }

  try {
    const prompt = `You are an expert multilingual linguist specialized in Indian languages (Tamil, Hindi, Telugu, Kannada, Malayalam, Bengali, etc.).
The user spoke or typed the following text, which might be in phonetic Romanized script or mixed speech:
"""
${trimmed}
"""
Target Language Preference: ${targetLanguage || "Tamil (தமிழ்)"}.

Convert this into:
1. "nativeText": The accurate, grammatically clean text in proper native script.
2. "language": Name of the language
3. "englishMeaning": Clear English translation of the spoken message.

Output JSON:
{
  "nativeText": "string",
  "language": "string",
  "englishMeaning": "string"
}
`;

    const parsed = await callGeminiWithResilience(ai, {
      contents: prompt,
      cacheKey: `translit_${targetLanguage || "Tamil"}_${trimmed}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nativeText: { type: Type.STRING },
            language: { type: Type.STRING },
            englishMeaning: { type: Type.STRING },
          },
          required: ["nativeText", "language", "englishMeaning"],
        },
      },
    });

    return res.json(parsed);
  } catch (error: any) {
    return res.status(200).json({
      nativeText: trimmed,
      language: targetLanguage || "Tamil",
      englishMeaning: trimmed,
    });
  }
});

// Vite Middleware & Static Serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SilverHands Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
