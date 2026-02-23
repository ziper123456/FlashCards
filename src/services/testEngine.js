import { generate, parseJsonResponse } from "./ollamaService.js";

const API_BASE = "http://localhost:3001";

// CEFR levels config
export const DELE_LEVELS = {
    A1: {
        label: "A1 — Beginner",
        color: "from-emerald-600 to-emerald-500",
        badge: "bg-emerald-600",
        description: "Basic words, numbers, greetings, colours",
        studyCountMax: 5,   // prefer less-studied cards
    },
    A2: {
        label: "A2 — Elementary",
        color: "from-teal-600 to-teal-500",
        badge: "bg-teal-600",
        description: "Simple sentences, everyday topics",
        studyCountMax: 15,
    },
    B1: {
        label: "B1 — Intermediate",
        color: "from-sky-600 to-sky-500",
        badge: "bg-sky-600",
        description: "Clear standard language, familiar topics",
        studyCountMax: 30,
    },
    B2: {
        label: "B2 — Upper Intermediate",
        color: "from-violet-600 to-violet-500",
        badge: "bg-violet-600",
        description: "Complex texts, abstract topics",
        studyCountMax: Infinity,
    },
    C1: {
        label: "C1 — Advanced",
        color: "from-rose-600 to-rose-500",
        badge: "bg-rose-600",
        description: "Long demanding texts, implicit meaning",
        studyCountMax: Infinity,
    },
    C2: {
        label: "C2 — Mastery",
        color: "from-amber-600 to-amber-500",
        badge: "bg-amber-600",
        description: "Near-native fluency and precision",
        studyCountMax: Infinity,
    },
};

export const SKILL_LABELS = {
    vocabulary: { label: "Vocabulary", icon: "🃏", desc: "Translate words from your deck" },
    listening: { label: "Listening", icon: "🔊", desc: "Hear Spanish, type what you hear" },
    reading: { label: "Reading", icon: "📖", desc: "Read a passage and answer a question" },
    writing: { label: "Writing", icon: "✍️", desc: "Write a short response in Spanish" },
};

// ─── Vocabulary questions ─────────────────────────────────────────────────────

/**
 * Build vocabulary question objects from the card deck.
 * Each question: show EN word, user types ES answer.
 */
export function buildVocabularyQuestions(cards, level, count) {
    // Filter cards that have both en_US and es_ES
    let pool = cards.filter(c => c.en_US?.trim() && c.es_ES?.trim());

    // Deduplicate by Spanish answer — no identical correct answers in one test
    const seenES = new Set();
    pool = pool.filter(c => {
        const key = c.es_ES.trim().toLowerCase();
        if (seenES.has(key)) return false;
        seenES.add(key);
        return true;
    });

    // For B1+, skip very short function words (1-2 chars like "y", "o", "a")
    // They are too ambiguous and trivial for intermediate+ tests
    if (level !== "A1" && level !== "A2") {
        const filtered = pool.filter(c => c.es_ES.trim().length > 2);
        // Only apply filter if it leaves enough cards
        if (filtered.length >= count) pool = filtered;
    }

    // For lower levels prefer simpler/shorter words; higher levels shuffle
    if (level === "A1" || level === "A2") {
        pool = pool.sort((a, b) => (a.es_ES?.length || 0) - (b.es_ES?.length || 0));
    } else {
        // Fisher-Yates shuffle
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
    }

    return pool.slice(0, count).map(card => ({
        id: `vocab-${card.id}`,
        skill: "vocabulary",
        question: card.en_US,
        prompt: `Translate to Spanish: "${card.en_US}"`,
        correctAnswer: card.es_ES,
        maxScore: 10,
    }));
}

// ─── Listening questions ─────────────────────────────────────────────────────

/**
 * Build listening questions. TTS will read es_ES aloud; user types what they hear.
 */
export function buildListeningQuestions(cards, level, count) {
    let pool = cards.filter(c => c.es_ES?.trim());

    // Deduplicate by Spanish answer
    const seenES = new Set();
    pool = pool.filter(c => {
        const key = c.es_ES.trim().toLowerCase();
        if (seenES.has(key)) return false;
        seenES.add(key);
        return true;
    });

    // For listening, prefer longer words (easier to hear distinctly)
    // Filter out 1-2 char words regardless of level
    const meaningful = pool.filter(c => c.es_ES.trim().length > 2);
    if (meaningful.length >= count) pool = meaningful;

    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, count).map(card => ({
        id: `listen-${card.id}`,
        skill: "listening",
        question: `Listen and write what you hear`,
        prompt: card.es_ES,
        promptDisplay: "🔊 Listen carefully, then type what you heard",
        correctAnswer: card.es_ES,
        hint: card.en_US,
        maxScore: 10,
    }));
}

// ─── Reading questions (Ollama generated) ────────────────────────────────────

/**
 * Generate a reading comprehension question via Ollama.
 */
export async function buildReadingQuestion(model, level) {
    const wordCounts = { A1: 40, A2: 60, B1: 80, B2: 120, C1: 160, C2: 200 };
    const words = wordCounts[level] || 80;

    const system = `You are a DELE ${level} Spanish exam writer. Respond ONLY with valid JSON. No markdown, no extra text.`;
    const prompt = `Write a DELE ${level} level reading comprehension exercise.
The passage should be ${words} words in Spanish.
Write one comprehension question in English.
Provide the correct answer in English.

Return ONLY this JSON format:
{
  "passage": "<Spanish passage>",
  "question": "<comprehension question in English>",
  "correctAnswer": "<ideal answer in English>",
  "translation": "<full English translation of passage>"
}`;

    const raw = await generate(model, prompt, system);
    const parsed = parseJsonResponse(raw);

    if (!parsed?.passage) throw new Error("Ollama did not return a valid reading question");

    return {
        id: `reading-${Date.now()}`,
        skill: "reading",
        passage: parsed.passage,
        question: parsed.question,
        prompt: `${parsed.passage}\n\n${parsed.question}`,
        correctAnswer: parsed.correctAnswer,
        translation: parsed.translation || "",
        maxScore: 15,
    };
}

// ─── Writing prompts (Ollama generated) ──────────────────────────────────────

/**
 * Generate a writing task prompt via Ollama.
 */
export async function buildWritingQuestion(model, level) {
    const lengths = { A1: "2-3 sentences", A2: "3-5 sentences", B1: "5-8 sentences", B2: "8-12 sentences", C1: "a short paragraph (10-15 sentences)", C2: "a detailed essay paragraph" };
    const wordLength = lengths[level] || "5-8 sentences";

    const system = `You are a DELE ${level} Spanish exam writer. Respond ONLY with valid JSON. No markdown, no extra text.`;
    const prompt = `Create a DELE ${level} writing task.
The student should write ${wordLength} in Spanish.
Choose a real-life topic appropriate for ${level} level.

Return ONLY this JSON:
{
  "topic": "<topic name>",
  "prompt": "<clear instruction for the student in English>",
  "exampleAnswer": "<an example good answer in Spanish>",
  "keyVocabulary": ["<word1>", "<word2>", "<word3>"]
}`;

    const raw = await generate(model, prompt, system);
    const parsed = parseJsonResponse(raw);

    if (!parsed?.prompt) throw new Error("Ollama did not return a valid writing prompt");

    return {
        id: `writing-${Date.now()}`,
        skill: "writing",
        topic: parsed.topic,
        question: parsed.prompt,
        prompt: parsed.prompt,
        correctAnswer: parsed.exampleAnswer || "",
        keyVocabulary: parsed.keyVocabulary || [],
        maxScore: 20,
    };
}

// ─── Build full test ─────────────────────────────────────────────────────────

/**
 * Build a complete test, generating Ollama questions where needed.
 * @param {Object} config - { level, skills, count, cards, model }
 * @param {Function} onProgress - callback(message, percent)
 */
export async function buildTest(config, onProgress = () => { }) {
    const { level, skills, count, cards, model } = config;
    const questions = [];

    const perSkill = Math.max(1, Math.floor(count / skills.length));

    let step = 0;
    const totalSteps = skills.length;

    for (const skill of skills) {
        step++;
        onProgress(`Generating ${SKILL_LABELS[skill]?.label} questions…`, Math.round((step / totalSteps) * 100));

        try {
            if (skill === "vocabulary") {
                questions.push(...buildVocabularyQuestions(cards, level, perSkill));
            } else if (skill === "listening") {
                questions.push(...buildListeningQuestions(cards, level, perSkill));
            } else if (skill === "reading") {
                for (let i = 0; i < perSkill; i++) {
                    const q = await buildReadingQuestion(model, level);
                    questions.push(q);
                }
            } else if (skill === "writing") {
                for (let i = 0; i < perSkill; i++) {
                    const q = await buildWritingQuestion(model, level);
                    questions.push(q);
                }
            }
        } catch (err) {
            console.error(`Failed to generate ${skill} question:`, err);
            onProgress(`⚠️ Skipped ${skill} (Ollama error)`, Math.round((step / totalSteps) * 100));
        }
    }

    // Shuffle so skills are interleaved
    return questions.sort(() => Math.random() - 0.5);
}

/**
 * Save a generated test to the backend DB.
 */
export async function saveTestToDb(name, level, skills, questions, model) {
    const res = await fetch(`${API_BASE}/api/saved-tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, level, skills, questions, ollama_model: model }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Failed to save test");
    return data.id;
}

/**
 * Save a completed test attempt.
 */
export async function saveSession(savedTestId, score, maxScore, answers) {
    const res = await fetch(`${API_BASE}/api/test-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_test_id: savedTestId, score, max_score: maxScore, answers }),
    });
    return res.json();
}
