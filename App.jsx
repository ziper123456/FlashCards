import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Check, Brain, Download, Copy, Filter, Undo2 } from "lucide-react";

import THEMES, {
  PAGE_SIZE,
  STORAGE_KEY_DECK,
  STORAGE_KEY_SETTINGS,
} from "./src/themes";
import helpers, { DEFAULT_NUMBERS } from "./src/helpers";
const { generateBaseId, normalizeText } = helpers;

import Header from "./src/components/Header.jsx";
import Footer from "./src/components/Footer.jsx";
import DeckGrid from "./src/components/DeckGrid.jsx";
import LearnView from "./src/components/LearnView.jsx";
import PlayView from "./src/components/PlayView.jsx";
import ImportView from "./src/components/ImportView.jsx";
import OptionsView from "./src/components/OptionsView.jsx";

const App = () => {
  // --- Core Data State ---
  const [masterDeck, setMasterDeck] = useState([]);
  const [deckLoaded, setDeckLoaded] = useState(false);

  // --- Settings State ---
  const defaultSettings = {
    fadeTime: 3000,
    themeKey: "slate",
    cardSpeed: 1.0,
    cardWidth: 128,
    cardHeight: 80,
    fontSize: 14,
    cardOpacity: 1.0,
    maxOrbitSize: 50,
    isReversed: false,
  };
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // --- Session & View State ---
  const [sessionQueue, setSessionQueue] = useState([]);
  const [orbitCards, setOrbitCards] = useState([]);
  const [view, setView] = useState("menu");
  const [prevView, setPrevView] = useState("menu");
  const [activeCard, setActiveCard] = useState(null);
  const [playAutoRandom, setPlayAutoRandom] = useState(false);

  // --- Learn Mode State ---
  const [learnAutoPlay, setLearnAutoPlay] = useState(false);
  const [learnDelay, setLearnDelay] = useState(2); // seconds
  const [isFlipped, setIsFlipped] = useState(false);
  const [learnAnim, setLearnAnim] = useState(null); // 'drop' | 'requeue' | null
  const [ttsEnabled, setTtsEnabled] = useState(false);

  // --- Gameplay State ---
  const [revealedIds, setRevealedIds] = useState([]);
  const [fadingIds, setFadingIds] = useState([]);
  const [inputText, setInputText] = useState("");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [importError, setImportError] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [lastDeleted, setLastDeleted] = useState(null);

  const requestRef = useRef();
  const containerRef = useRef();
  const fileInputRef = useRef(null);
  const observerTarget = useRef(null);
  const undoTimeoutRef = useRef(null);

  const theme = THEMES[settings.themeKey] || THEMES.slate;

  const API_BASE = "http://localhost:3001";

  // --- Load deck from sqlite backend ---
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/deck`);
        const data = await res.json();
        let deck = Array.isArray(data) ? data : [];

        let addedCount = 0;
        const currentMaxId = deck.reduce(
          (max, c) => Math.max(max, typeof c.id === "number" ? c.id : 0),
          generateBaseId()
        );

        DEFAULT_NUMBERS.forEach((item) => {
          const existing = deck.find(
            (c) =>
              normalizeText(c.front) === normalizeText(item.front) &&
              normalizeText(c.back) === normalizeText(item.back)
          );
          if (existing) {
            if (!existing.categories.includes("Numbers"))
              existing.categories.push("Numbers");
          } else {
            deck.push({
              id: currentMaxId + addedCount + 1,
              front: item.front,
              back: item.back,
              categories: ["Numbers"],
              studyCount: 0,
            });
            addedCount++;
          }
        });

        if (mounted) setMasterDeck(deck);
      } catch (err) {
        console.error("Failed to load deck:", err);
      } finally {
        if (mounted) setDeckLoaded(true);
      }
    };
    load();
    return () => (mounted = false);
  }, []);

  // --- Load settings from sqlite backend ---
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings`);
        const parsed = await res.json();
        if (mounted) setSettings((prev) => ({ ...prev, ...parsed }));
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        if (mounted) setSettingsLoaded(true);
      }
    };
    load();
    return () => (mounted = false);
  }, []);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // --- Persistence Logic ---
  // Save settings to backend (debounced)
  useEffect(() => {
    const handler = setTimeout(async () => {
      try {
        await fetch(`${API_BASE}/api/settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1000);
      } catch (err) {
        console.error("Failed to save settings:", err);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 1000);
      }
    }, 500);
    setSaveStatus("saving");
    return () => clearTimeout(handler);
  }, [settings]);

  // Save deck to backend
  useEffect(() => {
    let timer;
    const saveDeck = async () => {
      try {
        await fetch(`${API_BASE}/api/deck`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(masterDeck || []),
        });
        setSaveStatus("saved");
        timer = setTimeout(() => setSaveStatus("idle"), 1000);
      } catch (err) {
        console.error("Failed to save deck:", err);
        setSaveStatus("error");
        timer = setTimeout(() => setSaveStatus("idle"), 1000);
      }
    };
    if (deckLoaded) saveDeck();
    return () => clearTimeout(timer);
  }, [masterDeck, deckLoaded]);

  // --- Derived State ---
  const availableCategories = useMemo(() => {
    const cats = new Set();
    masterDeck.forEach((card) => {
      (card.categories || []).forEach((cat) => cats.add(cat));
    });
    return Array.from(cats).sort();
  }, [masterDeck]);

  const filteredMasterDeck = useMemo(() => {
    let result = [...masterDeck];
    if (selectedCategories.length > 0) {
      result = result.filter((card) =>
        (card.categories || []).some((cat) => selectedCategories.includes(cat))
      );
    }
    return result;
  }, [masterDeck, selectedCategories]);

  const renderedDeck = useMemo(() => {
    return filteredMasterDeck.slice(0, visibleLimit);
  }, [filteredMasterDeck, visibleLimit]);

  const displayCount =
    orbitCards.length +
    sessionQueue.length -
    revealedIds.length -
    (activeCard && (feedback === "correct" || feedback === "revealing")
      ? 1
      : 0);

  // --- Handlers ---
  const incrementStudyCount = useCallback((id) => {
    setMasterDeck((prev) =>
      prev.map((card) =>
        card.id === id
          ? { ...card, studyCount: (card.studyCount || 0) + 1 }
          : card
      )
    );
  }, []);

  const resetAllProgress = () => {
    if (confirm("Reset study counts for ALL cards? This cannot be undone.")) {
      setMasterDeck((prev) => prev.map((c) => ({ ...c, studyCount: 0 })));
    }
  };

  const deleteCard = (id) => {
    const cardToDelete = masterDeck.find((c) => c.id === id);
    if (!cardToDelete) return;
    setLastDeleted(cardToDelete);
    setMasterDeck((prev) => prev.filter((c) => c.id !== id));
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    undoTimeoutRef.current = setTimeout(() => setLastDeleted(null), 5000);
  };

  const undoDelete = () => {
    if (lastDeleted) {
      setMasterDeck((prev) => [...prev, lastDeleted]);
      setLastDeleted(null);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    }
  };

  const toggleCategory = useCallback((cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  // --- Infinite Scroll ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          visibleLimit < filteredMasterDeck.length
        ) {
          setVisibleLimit((prev) => prev + PAGE_SIZE);
        }
      },
      { threshold: 1.0 }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [visibleLimit, filteredMasterDeck.length]);

  useEffect(() => {
    setVisibleLimit(PAGE_SIZE);
  }, [selectedCategories, view]);

  // --- TTS Helper ---
  const speak = useCallback(
    (text, isSpanish) => {
      if (!ttsEnabled || !window.speechSynthesis || !text) return;

      // Cancel any current speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      // Simple language detection logic based on card side
      utterance.lang = isSpanish ? "es-ES" : "en-US";
      utterance.rate = 0.9; // Slightly slower for learning

      window.speechSynthesis.speak(utterance);
    },
    [ttsEnabled]
  );

  // --- Session Management ---
  const getRandomPhysics = useCallback(
    () => ({
      x: Math.random() * (window.innerWidth * 0.6),
      y: Math.random() * (window.innerHeight * 0.6),
      vx:
        (Math.random() - 0.5) * (2.0 + Math.random() * 2) * settings.cardSpeed,
      vy:
        (Math.random() - 0.5) * (2.0 + Math.random() * 2) * settings.cardSpeed,
    }),
    [settings.cardSpeed]
  );

  const startSession = (mode) => {
    const sortedList = [...filteredMasterDeck].sort((a, b) => {
      const diff = (a.studyCount || 0) - (b.studyCount || 0);
      if (diff !== 0) return diff;
      return Math.random() - 0.5;
    });

    // In Learn mode, we only want 1 active card at a time with NO physics
    const maxActive = mode === "learn" ? 1 : settings.maxOrbitSize;

    const initialOrbit = sortedList.slice(0, maxActive).map((card) => ({
      ...card,
      ...(mode === "learn" ? { x: 0, y: 0, vx: 0, vy: 0 } : getRandomPhysics()),
    }));

    const initialQueue = sortedList.slice(maxActive);
    setOrbitCards(initialOrbit);
    setSessionQueue(initialQueue);
    setView(mode);
    setRevealedIds([]);
    setFadingIds([]);
    setActiveCard(null);
    setAttempts(0);

    if (mode === "learn") {
      setIsFlipped(false);
      setLearnAutoPlay(false);
      setLearnAnim(null);
      // ttsEnabled state persists, so we don't reset it here
    }
  };

  const resetOrbit = () => {
    startSession(view);
  };

  const triggerLearnAction = (type) => {
    if (learnAnim) return; // Prevent double trigger

    setLearnAnim(type === "next" ? "drop" : "requeue");

    setTimeout(() => {
      // 1. Determine what happens to the current card
      setOrbitCards((prev) => {
        const currentCard = prev[0];
        if (!currentCard) return [];

        if (type === "next") {
          // Done: Remove from session, update stats
          incrementStudyCount(currentCard.id);
        } else {
          // Requeue: Move to end of queue
          setSessionQueue((sq) => [...sq, currentCard]);
        }
        return []; // Clear temporarily (will be refilled instantly below)
      });

      // 2. Immediate Refill: Move next card in queue to active slot
      // using functional state to ensure we capture the latest queue
      setSessionQueue((currentQueue) => {
        if (currentQueue.length > 0) {
          const next = currentQueue[0];
          let remaining = currentQueue.slice(1);
          // Instant swap: Next card becomes active card
          setOrbitCards([{ ...next, x: 0, y: 0, vx: 0, vy: 0 }]);

          // If this was a 'next' (card completed), preserve the immediate preview
          // (first element of remaining) and randomize the rest to keep session fresh.
          if (type === "next" && remaining.length > 1) {
            const preview = remaining[0];
            const rest = remaining.slice(1);
            // Fisher-Yates shuffle
            for (let i = rest.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [rest[i], rest[j]] = [rest[j], rest[i]];
            }
            remaining = [preview, ...rest];
          }

          return remaining;
        } else {
          // No more cards
          setOrbitCards([]);
          return [];
        }
      });

      setIsFlipped(false);
      setLearnAnim(null);
    }, 600); // Wait for animation
  };

  const handleRequeue = (e, card) => {
    e.preventDefault();
    e.stopPropagation();

    if (view === "learn") {
      // If front is showing, right click acts like left click (Flip to back)
      if (!isFlipped) {
        setIsFlipped(true);
        return;
      }
      // If back is showing, right click triggers Requeue Animation
      triggerLearnAction("requeue");
      return;
    }

    // Default Requeue for other modes (Instant)
    setOrbitCards((prev) => prev.filter((c) => c.id !== card.id));
    setSessionQueue((prev) => [...prev, card]);
  };

  const handleLearnClick = () => {
    if (!isFlipped) {
      setIsFlipped(true);
    } else {
      // Left Click on Back => Next (Drop Animation)
      triggerLearnAction("next");
    }
  };

  // --- TTS Effect Hook for Learn Mode ---
  useEffect(() => {
    if (view === "learn" && orbitCards.length > 0 && !learnAnim) {
      const card = orbitCards[0];
      const isBack = isFlipped;

      let text = "";
      let isSpanish = false;

      // Front: English (Normal) / Spanish (Reversed)
      // Back: Spanish (Normal) / English (Reversed)
      if (!isBack) {
        text = settings.isReversed ? card.back : card.front;
        isSpanish = settings.isReversed;
      } else {
        text = settings.isReversed ? card.front : card.back;
        isSpanish = !settings.isReversed;
      }

      // Speak with a tiny delay to allow visual transition feel natural
      const timer = setTimeout(() => {
        speak(text, isSpanish);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [view, orbitCards, isFlipped, settings.isReversed, speak, learnAnim]);

  // --- Physics Loop ---
  // Only refill if in Play modes (not Learn, learn handles its own refill in triggerLearnAction)
  useEffect(() => {
    if (
      view.startsWith("play") &&
      !view.includes("learn") &&
      orbitCards.length < settings.maxOrbitSize &&
      sessionQueue.length > 0
    ) {
      const activeCount = orbitCards.length - revealedIds.length;
      if (activeCount < settings.maxOrbitSize) {
        const nextCard = sessionQueue[0];
        setSessionQueue((prev) => prev.slice(1));
        setOrbitCards((prev) => [
          ...prev,
          { ...nextCard, ...getRandomPhysics() },
        ]);
      }
    }
  }, [
    orbitCards.length,
    sessionQueue,
    view,
    revealedIds.length,
    settings.maxOrbitSize,
    getRandomPhysics,
  ]);

  // Learn Mode Initial Refill Logic (Only if empty start, handled mostly by startSession now)
  useEffect(() => {
    if (
      view === "learn" &&
      orbitCards.length === 0 &&
      sessionQueue.length > 0 &&
      !learnAnim
    ) {
      const next = sessionQueue[0];
      setSessionQueue((prev) => prev.slice(1));
      setOrbitCards([{ ...next, x: 0, y: 0, vx: 0, vy: 0 }]);
      setIsFlipped(false);
    }
  }, [orbitCards.length, sessionQueue, view, learnAnim]);

  // Learn Mode Auto Play
  useEffect(() => {
    let timer;
    if (
      view === "learn" &&
      learnAutoPlay &&
      orbitCards.length > 0 &&
      !learnAnim
    ) {
      timer = setTimeout(() => {
        if (!isFlipped) {
          setIsFlipped(true);
        } else {
          // Auto Play should Requeue (Keep looping) not Drop (Mark Done)
          triggerLearnAction("requeue");
        }
      }, learnDelay * 1000);
    }
    return () => clearTimeout(timer);
  }, [view, learnAutoPlay, orbitCards, isFlipped, learnDelay, learnAnim]);

  // Physics Animation
  const updatePhysics = useCallback(() => {
    if (!view.startsWith("play") || activeCard || view === "learn") return; // Disable physics for Learn
    setOrbitCards((prevCards) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return prevCards;
      return prevCards.map((card) => {
        if (revealedIds.includes(card.id)) return card;
        let { x, y, vx, vy } = card;

        x += vx;
        y += vy;

        if (x <= 0 || x >= bounds.width - settings.cardWidth) vx *= -1;
        if (y <= 0 || y >= bounds.height - settings.cardHeight) vy *= -1;

        x = Math.max(0, Math.min(x, bounds.width - settings.cardWidth));
        y = Math.max(0, Math.min(y, bounds.height - settings.cardHeight));

        return { ...card, x, y, vx, vy };
      });
    });
    requestRef.current = requestAnimationFrame(updatePhysics);
  }, [view, activeCard, revealedIds, settings.cardWidth, settings.cardHeight]);

  useEffect(() => {
    if (view.startsWith("play") && !activeCard && view !== "learn") {
      requestRef.current = requestAnimationFrame(updatePhysics);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [view, activeCard, updatePhysics]);

  // --- Interaction Handlers ---
  const handleCardClick = (card) => {
    if (view === "learn") {
      handleLearnClick();
    } else if (view === "play-challenge") {
      setActiveCard(card);
      setAttempts(0);
      setAnswer("");
      setFeedback(null);
    } else if (view === "play-quick") {
      if (revealedIds.includes(card.id)) return;
      incrementStudyCount(card.id);
      setRevealedIds((prev) => [...prev, card.id]);
    }
  };

  const handleMouseLeaveCard = (cardId) => {
    if (
      view === "play-quick" &&
      revealedIds.includes(cardId) &&
      !fadingIds.includes(cardId)
    ) {
      setFadingIds((prev) => [...prev, cardId]);
      setTimeout(() => {
        setOrbitCards((prev) => prev.filter((c) => c.id !== cardId));
        setFadingIds((prev) => prev.filter((id) => id !== cardId));
        setRevealedIds((prev) => prev.filter((id) => id !== cardId));
      }, settings.fadeTime);
    }
  };

  const processNewCards = (rawCards) => {
    if (rawCards.length === 0) return;
    setMasterDeck((prev) => {
      const newDeck = [...prev];
      let added = 0;
      let merged = 0;
      const currentMaxId = prev.reduce(
        (max, c) => Math.max(max, typeof c.id === "number" ? c.id : 0),
        generateBaseId()
      );
      rawCards.forEach((rc) => {
        const existingIndex = newDeck.findIndex(
          (c) =>
            normalizeText(c.front) === normalizeText(rc.front) &&
            normalizeText(c.back) === normalizeText(rc.back)
        );
        if (existingIndex !== -1) {
          const existingCats = newDeck[existingIndex].categories || [];
          if (!existingCats.includes(rc.category)) {
            newDeck[existingIndex].categories = [...existingCats, rc.category];
            merged++;
          }
        } else {
          newDeck.push({
            id: currentMaxId + added + 1,
            front: rc.front,
            back: rc.back,
            categories: [rc.category || "General"],
            studyCount: 0,
          });
          added++;
        }
      });
      setImportError(`Processed: ${added} new, ${merged} category updates.`);
      setTimeout(() => {
        setView("menu");
        setImportError(null);
      }, 3000);
      return newDeck;
    });
  };

  const handleImport = () => {
    setImportError(null);
    let newCards = [];
    const trimmedInput = inputText.trim();
    if (!trimmedInput) return;
    try {
      if (trimmedInput.startsWith("[") || trimmedInput.startsWith("{")) {
        const parsed = JSON.parse(trimmedInput);
        if (Array.isArray(parsed)) {
          newCards = parsed.map((item) => ({
            front: (item.front || item.word || Object.keys(item)[0]).trim(),
            back: (item.back || item.meaning || Object.values(item)[0]).trim(),
            category: (item.category || "General").trim(),
          }));
        } else if (typeof parsed === "object") {
          newCards = Object.entries(parsed).map(([key, value]) => ({
            front: key.trim(),
            back: String(value).trim(),
            category: "General",
          }));
        }
      } else {
        const lines = trimmedInput.split("\n").filter((l) => l.includes(":"));
        newCards = lines.map((line) => {
          let category = "General";
          let rest = line;
          if (line.includes(">")) {
            const parts = line.split(">");
            category = parts[0].trim();
            rest = parts[1].trim();
          }
          const [front, back] = rest.split(":").map((s) => s.trim());
          return { front, back, category };
        });
      }
      processNewCards(newCards);
      setInputText("");
    } catch (err) {
      setImportError("Invalid format. Use JSON or 'Category > Front : Back'.");
    }
  };

  const handleFileUploads = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const readFile = (file) => {
      return new Promise((resolve, reject) => {
        const category = file.name.replace(/\.[^/.]+$/, "");
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target.result;
          const lines = content
            .split(/\r?\n/)
            .filter(
              (line) =>
                line.trim() && (line.includes(",") || line.includes(":"))
            );
          const fileCards = lines.map((line) => {
            const commaIndex = line.indexOf(",");
            const colonIndex = line.indexOf(":");
            let separatorIndex = -1;
            if (commaIndex !== -1 && colonIndex !== -1)
              separatorIndex = Math.min(commaIndex, colonIndex);
            else separatorIndex = Math.max(commaIndex, colonIndex);
            const front = line.substring(0, separatorIndex).trim();
            const back = line.substring(separatorIndex + 1).trim();
            return { front, back, category };
          });
          resolve(fileCards);
        };
        reader.onerror = () => reject(`Failed to read ${file.name}`);
        reader.readAsText(file);
      });
    };
    try {
      const results = await Promise.all(files.map((file) => readFile(file)));
      processNewCards(results.flat());
      fileInputRef.current.value = "";
    } catch (err) {
      setImportError(err.toString());
    }
  };

  const checkAnswer = (e) => {
    e.preventDefault();
    if (!activeCard || feedback === "revealing") return;

    const target = settings.isReversed ? activeCard.front : activeCard.back;
    const normalizedAnswer = normalizeText(answer);
    const normalizedTarget = normalizeText(target);

    if (normalizedAnswer === normalizedTarget) {
      setFeedback("correct");
      incrementStudyCount(activeCard.id);
      setTimeout(() => {
        // Remove current card from active orbit
        setOrbitCards((prev) => prev.filter((c) => c.id !== activeCard.id));

        if (playAutoRandom) {
          // Pick a random next card from remaining orbit + queue
          setSessionQueue((currentQueue) => {
            let combined = [];
            // use latest orbitCards state snapshot via functional update
            // We'll build combined by reading from the latest state using a temporary variable captured below
            return currentQueue;
          });

          // Use a short microtask to read latest orbit/session and pick next
          setTimeout(() => {
            const remainingOrbit = orbitCards.filter((c) => c.id !== activeCard.id);
            const combined = [...remainingOrbit, ...sessionQueue];
            if (combined.length > 0) {
              const next = combined[Math.floor(Math.random() * combined.length)];
              // If next is in sessionQueue, remove first occurrence
              setSessionQueue((sq) => {
                const idx = sq.findIndex((s) => s.id === next.id);
                if (idx === -1) return sq;
                const copy = [...sq];
                copy.splice(idx, 1);
                return copy;
              });
              setActiveCard(next);
            } else {
              setActiveCard(null);
            }
          }, 0);
        } else {
          setActiveCard(null);
        }

        setAnswer("");
        setFeedback(null);
        setAttempts(0);
      }, 800);
    } else {
      const newAttemptCount = attempts + 1;
      setAttempts(newAttemptCount);
      if (newAttemptCount >= 3) {
        setFeedback("revealing");
        setAnswer(target);
        setTimeout(() => {
          setOrbitCards((prev) => prev.filter((c) => c.id !== activeCard.id));
          setSessionQueue((prev) => [...prev, activeCard]);
          setActiveCard(null);
          setAnswer("");
          setFeedback(null);
          setAttempts(0);
        }, 2500);
      } else {
        setFeedback("wrong");
        setTimeout(() => setFeedback(null), 1000);
      }
    }
  };

  const skipActiveAndRandomNext = () => {
    if (!activeCard) return;
    // Remove active from orbit and push to end of queue
    setOrbitCards((prev) => prev.filter((c) => c.id !== activeCard.id));
    setSessionQueue((prev) => [...prev, activeCard]);

    // Pick random next from remaining orbit + queue
    setTimeout(() => {
      const remainingOrbit = orbitCards.filter((c) => c.id !== activeCard.id);
      const combined = [...remainingOrbit, ...sessionQueue,].filter((c) => c.id !== activeCard.id);
      if (combined.length > 0) {
        const next = combined[Math.floor(Math.random() * combined.length)];
        // remove from sessionQueue if present
        setSessionQueue((sq) => {
          const idx = sq.findIndex((s) => s.id === next.id);
          if (idx === -1) return sq;
          const copy = [...sq];
          copy.splice(idx, 1);
          return copy;
        });
        setActiveCard(next);
      } else {
        setActiveCard(null);
      }
    }, 0);
  };

  const exportAsJson = () => {
    const data = masterDeck.map(({ front, back, categories, studyCount }) => ({
      front,
      back,
      categories,
      studyCount,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my_flashcards.json";
    a.click();
  };

  const copyToClipboard = () => {
    const data = masterDeck.map(({ front, back, categories, studyCount }) => ({
      front,
      back,
      categories,
      studyCount,
    }));
    const jsonString = JSON.stringify(data, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonString).then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = jsonString;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      } catch (err) {}
      document.body.removeChild(textArea);
    }
  };

  // --- Render logic ---
  return (
    <div
      className={`flex flex-col h-screen w-full ${
        theme.bg
      } ${theme.textAccent.replace(
        "text-",
        "text-opacity-90 text-"
      )} font-sans overflow-hidden transition-colors duration-500`}
    >
      <Header
        theme={theme}
        saveStatus={saveStatus}
        settings={settings}
        setView={(v) => {
          setPrevView(view);
          setView(v);
        }}
        prevView={prevView}
        setPrevView={setPrevView}
        updateSetting={updateSetting}
        filteredMasterDeck={filteredMasterDeck}
        copyToClipboard={copyToClipboard}
        exportAsJson={exportAsJson}
        startSession={startSession}
        selectedCategories={selectedCategories}
      />

      <main className="flex-1 relative overflow-hidden">
        {lastDeleted && (
          <div className="absolute bottom-6 right-6 z-50 animate-bounce">
            <button
              onClick={undoDelete}
              className={`flex items-center gap-2 pl-3 pr-4 py-2 bg-slate-800 text-white rounded-lg shadow-2xl border border-slate-700 hover:bg-slate-700 transition-colors`}
            >
              <Undo2 size={16} className="text-amber-400" />
              <span className="text-xs font-medium">Deleted. Undo?</span>
            </button>
          </div>
        )}

        {view === "menu" && (
          <div className="w-full h-full p-6 sm:p-10 overflow-y-auto scroll-smooth">
            <div
              className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b ${theme.border} pb-6`}
            >
              <div>
                <h2 className="text-3xl font-bold text-white">Master Deck</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {selectedCategories.length > 0
                    ? `${filteredMasterDeck.length} words in selected categories`
                    : `${masterDeck.length} total unique words`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className={`text-xs border px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                    copyFeedback
                      ? "bg-emerald-600/20 border-emerald-500 text-emerald-400"
                      : `${theme.panel} ${theme.border} text-slate-300 hover:text-white`
                  }`}
                >
                  {copyFeedback ? <Check size={14} /> : <Copy size={14} />}{" "}
                  {copyFeedback ? "Copied!" : "Copy JSON"}
                </button>
                <button
                  onClick={exportAsJson}
                  className={`text-xs ${theme.panel} border ${theme.border} px-4 py-2 rounded-lg ${theme.textAccent} hover:text-white flex items-center gap-2 transition-colors`}
                >
                  <Download size={14} /> Export JSON
                </button>
              </div>
            </div>

            {availableCategories.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                  <span className="flex items-center gap-2">
                    <Filter size={14} /> Priority: Least Studied First
                  </span>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => setSelectedCategories([])}
                      className={`${theme.textAccent} hover:underline`}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategories([])}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      selectedCategories.length === 0
                        ? `${theme.accent} border-transparent ${theme.onAccent}`
                        : `${theme.panel} ${theme.border} text-slate-400 hover:border-slate-600`
                    }`}
                  >
                    All Categories
                  </button>
                  {availableCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        selectedCategories.includes(cat)
                          ? `${theme.accent} border-transparent ${theme.onAccent} shadow-lg`
                          : `${theme.panel} ${theme.border} text-slate-400 hover:border-slate-600`
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredMasterDeck.length === 0 ? (
              <div
                className={`text-center py-20 border-2 border-dashed ${theme.border} rounded-2xl ${theme.panel} bg-opacity-30`}
              >
                <Brain className="mx-auto text-slate-700 mb-4" size={48} />
                <p className="text-slate-500">No cards match the filter.</p>
              </div>
            ) : (
              <>
                <DeckGrid
                  renderedDeck={renderedDeck}
                  theme={theme}
                  settings={settings}
                  deleteCard={deleteCard}
                  observerRef={observerTarget}
                />
              </>
            )}
          </div>
        )}

        {view === "options" && (
          <OptionsView
            theme={theme}
            settings={settings}
            updateSetting={updateSetting}
            setView={setView}
            prevView={prevView}
            resetAllProgress={resetAllProgress}
          />
        )}

        {view === "import" && (
          <ImportView
            theme={theme}
            fileInputRef={fileInputRef}
            handleFileUploads={handleFileUploads}
            inputText={inputText}
            setInputText={setInputText}
            handleImport={handleImport}
            importError={importError}
            setView={setView}
          />
        )}

        {view === "learn" && (
          <LearnView
            theme={theme}
            settings={settings}
            displayCount={displayCount}
            selectedCategories={selectedCategories}
            resetOrbit={resetOrbit}
            sessionQueue={sessionQueue}
            orbitCards={orbitCards}
            learnAnim={learnAnim}
            isFlipped={isFlipped}
            handleCardClick={handleCardClick}
            handleRequeue={handleRequeue}
            handleLearnClick={handleLearnClick}
            setView={setView}
            learnAutoPlay={learnAutoPlay}
            setLearnAutoPlay={setLearnAutoPlay}
            ttsEnabled={ttsEnabled}
            setTtsEnabled={setTtsEnabled}
            learnDelay={learnDelay}
            setLearnDelay={setLearnDelay}
          />
        )}

        {view.startsWith("play") && !view.includes("learn") && (
          <PlayView
            theme={theme}
            view={view}
            orbitCards={orbitCards}
            sessionQueue={sessionQueue}
            containerRef={containerRef}
            displayCount={displayCount}
            selectedCategories={selectedCategories}
            resetOrbit={resetOrbit}
            revealedIds={revealedIds}
            fadingIds={fadingIds}
            settings={settings}
            handleCardClick={handleCardClick}
            handleRequeue={handleRequeue}
            handleMouseLeaveCard={handleMouseLeaveCard}
            activeCard={activeCard}
            feedback={feedback}
            answer={answer}
            setAnswer={setAnswer}
            checkAnswer={checkAnswer}
            setActiveCard={setActiveCard}
            attempts={attempts}
            playAutoRandom={playAutoRandom}
            setPlayAutoRandom={setPlayAutoRandom}
            skipActiveAndRandomNext={skipActiveAndRandomNext}
          />
        )}
      </main>
      <Footer masterDeckLength={masterDeck.length} theme={theme} />
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        
        @keyframes drop-down {
          0% { transform: rotate(0deg) translateY(0); opacity: 1; }
          100% { transform: rotate(20deg) translateY(120vh); opacity: 0; }
        }
        @keyframes requeue-jump {
          0% { transform: scale(1) translateY(0); opacity: 1; }
          50% { transform: scale(0.9) translateY(-150px); opacity: 0.8; }
          100% { transform: scale(0.5) translateY(50px); opacity: 0; }
        }
        .animate-drop { animation: drop-down 0.6s ease-in forwards; }
        .animate-requeue { animation: requeue-jump 0.6s ease-in-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
