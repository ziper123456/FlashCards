const API_BASE = "http://localhost:3001";

/**
 * List all locally available Ollama models
 * @returns {Promise<string[]>}
 */
export async function listModels() {
    try {
        const res = await fetch(`${API_BASE}/api/ollama/models`);
        const data = await res.json();
        return data.models || [];
    } catch (err) {
        console.error("Failed to list Ollama models:", err);
        return [];
    }
}

/**
 * Send a prompt to Ollama and get a full response (non-streaming).
 * @param {string} model  - Ollama model name e.g. "llama3.1:8b"
 * @param {string} prompt - User prompt
 * @param {string} [system] - System prompt
 * @returns {Promise<string>} - The response text
 */
export async function generate(model, prompt, system = "") {
    const res = await fetch(`${API_BASE}/api/ollama/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, system }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Ollama error ${res.status}`);
    }

    const data = await res.json();
    return data.response || "";
}

/**
 * Normalise a string for comparison: lowercase, strip punctuation and extra spaces.
 */
export function normaliseBasic(str) {
    return (str || "")
        .toLowerCase()
        .trim()
        .replace(/[.,!?;:'"¿¡«»""'']/g, "")
        .replace(/\s+/g, " ");
}

/**
 * Normalise AND strip diacritics (accent marks).
 * e.g. "Qué" → "que", "ñ" → "n", "ü" → "u"
 */
export function normaliseNoAccents(str) {
    return normaliseBasic(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // strip combining diacritical marks
}

/**
 * Parse JSON from an LLM response that may have surrounding text.
 * Tries to extract the first {...} or [...] block.
 */
export function parseJsonResponse(text) {
    // Try direct parse first
    try {
        return JSON.parse(text.trim());
    } catch (_) { }

    // Extract first JSON object or array
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
        try { return JSON.parse(objMatch[0]); } catch (_) { }
    }
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
        try { return JSON.parse(arrMatch[0]); } catch (_) { }
    }

    return null;
}

/**
 * Ask Ollama to evaluate a user's answer and return structured feedback.
 *
 * @param {string} model
 * @param {string} skill - "vocabulary" | "listening" | "reading" | "writing"
 * @param {string} question - The question or prompt shown to the user
 * @param {string} userAnswer - What the user typed
 * @param {string} correctAnswer - The expected answer (for vocab/listening)
 * @param {string} level - CEFR level e.g. "B1"
 * @returns {Promise<{score: number, maxScore: number, isCorrect: boolean, correction: string, explanation: string}>}
 */
export async function evaluate(model, skill, question, userAnswer, correctAnswer, level) {
    const maxScore = skill === "writing" ? 20 : skill === "reading" ? 15 : 10;

    const system = `You are a strict but encouraging DELE ${level} Spanish language examiner.
You MUST respond with valid JSON only — no extra text, no markdown code fences.`;

    let prompt = "";

    if (skill === "reading") {
        prompt = `You are grading a DELE ${level} reading comprehension question.

Passage and question shown to the student:
"""
${question}
"""

Student's answer: "${userAnswer}"

Judge whether the student's answer correctly addresses the question based on the passage.
Do NOT compare to any model answer — judge independently whether the response is accurate and complete.

Respond with this exact JSON (no markdown, no extra text):
{"score": <0-${maxScore}>, "maxScore": ${maxScore}, "isCorrect": <boolean>, "correction": "<ideal answer in English, 1-2 sentences>", "explanation": "<brief English feedback, 1-2 sentences>"}`;
    } else if (skill === "writing") {
        prompt = `You are grading a DELE ${level} Spanish writing task.

Writing prompt given to the student:
"${question}"

Student's response:
"${userAnswer}"

Grade independently based on: grammar accuracy, vocabulary range, coherence, and whether the writing fulfils the task.
Do NOT compare to any model answer.

Respond with this exact JSON (no markdown, no extra text):
{"score": <0-${maxScore}>, "maxScore": ${maxScore}, "isCorrect": <boolean>, "correction": "<corrected or improved version of student's text in Spanish>", "explanation": "<English feedback on grammar/vocabulary/structure, 2-3 sentences>"}`;
    }


    try {
        const raw = await generate(model, prompt, system);
        const parsed = parseJsonResponse(raw);

        if (parsed && typeof parsed.score === "number") {
            return {
                score: Math.min(parsed.score, maxScore),
                maxScore,
                isCorrect: parsed.isCorrect ?? parsed.score >= maxScore * 0.6,
                correction: parsed.correction || correctAnswer,
                explanation: parsed.explanation || "",
            };
        }
    } catch (err) {
        console.error("Ollama evaluate error:", err);
    }

    // Fallback: diacritic-aware string match
    const exactMatch = normaliseBasic(userAnswer) === normaliseBasic(correctAnswer);
    const accentStrippedMatch = normaliseNoAccents(userAnswer) === normaliseNoAccents(correctAnswer);
    const isCorrect = exactMatch || accentStrippedMatch;
    // accentReminder = user missed accent marks but answer was otherwise correct
    const accentReminder = !exactMatch && accentStrippedMatch ? correctAnswer : null;

    return {
        score: isCorrect ? maxScore : 0,
        maxScore,
        isCorrect,
        accentReminder,   // non-null means "correct but check your accents"
        correction: correctAnswer,
        explanation: exactMatch
            ? "Correct!"
            : accentStrippedMatch
                ? `Correct! Don't forget the accent marks: "${correctAnswer}"`
                : `The correct answer was: "${correctAnswer}"`,
    };
}
