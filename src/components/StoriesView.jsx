import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollText, Plus, BookOpen, Target, Trash2, Filter, Languages, Loader2 } from "lucide-react";

export default function StoriesView({ theme, settings, updateSetting }) {
    const navigate = useNavigate();
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const API_BASE = "http://localhost:3001";

    const LANGUAGES = [
        { code: "en_US", label: "🇺🇸 English", name: "English" },
        { code: "es_ES", label: "🇪🇸 Spanish", name: "Spanish" },
        { code: "vi_VN", label: "🇻🇳 Vietnamese", name: "Vietnamese" },
        { code: "de_DE", label: "🇩🇪 German", name: "German" },
    ];

    useEffect(() => {
        loadStories();
    }, []);

    const loadStories = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/stories`);
            const data = await res.json();
            setStories(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load stories:", err);
        }
        setLoading(false);
    };

    const deleteStory = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Delete this story?")) return;
        try {
            await fetch(`${API_BASE}/api/stories/${id}`, { method: "DELETE" });
            setStories((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            console.error("Failed to delete story:", err);
        }
    };

    // Get unique categories
    const categories = [...new Set(stories.map((s) => s.category))].sort();
    const filteredStories = selectedCategory
        ? stories.filter((s) => s.category === selectedCategory)
        : stories;

    return (
        <div className="w-full h-full p-6 sm:p-10 overflow-y-auto scroll-smooth">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ScrollText className="text-emerald-400" size={28} />
                        Stories
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        {stories.length} stories • Learn sentences line-by-line
                    </p>
                </div>
                <button
                    onClick={() => navigate("/stories/import")}
                    className="btn-primary bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                    <Plus size={16} />
                    Import Story
                </button>
            </div>

            {/* Language Selection */}
            <div className="mb-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                    <Languages size={14} />
                    Language Pair
                </div>
                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400">Front:</label>
                        <select
                            value={settings?.frontLang || "en_US"}
                            onChange={(e) => updateSetting("frontLang", e.target.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm ${theme.bg} border ${theme.border} text-white font-medium`}
                        >
                            {LANGUAGES.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400">Back:</label>
                        <select
                            value={settings?.backLang || "es_ES"}
                            onChange={(e) => updateSetting("backLang", e.target.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm ${theme.bg} border ${theme.border} text-white font-medium`}
                        >
                            {LANGUAGES.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                    {lang.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
                        <Filter size={14} />
                        Categories
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${!selectedCategory
                                ? "bg-emerald-600 border-transparent text-white"
                                : `${theme.panel} ${theme.border} text-slate-400 hover:border-slate-600`
                                }`}
                        >
                            All
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${selectedCategory === cat
                                    ? "bg-emerald-600 border-transparent text-white shadow-lg"
                                    : `${theme.panel} ${theme.border} text-slate-400 hover:border-slate-600`
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Stories List */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                    <Loader2 size={24} className="animate-spin mr-2" />
                    Loading stories...
                </div>
            ) : filteredStories.length === 0 ? (
                <div className="card-empty">
                    <ScrollText className="card-empty__icon" size={48} />
                    <p className="card-empty__text">No stories yet</p>
                    <button
                        onClick={() => navigate("/stories/import")}
                        className="btn-secondary bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                        Import Your First Story
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredStories.map((story) => (
                        <div
                            key={story.id}
                            className={`card-story ${theme.panel} ${theme.border}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h3 className="card-story__title">
                                        {story.name}
                                    </h3>
                                    <div className="card-story__meta">
                                        <span className="card-story__category">
                                            {story.category}
                                        </span>
                                        <span>{story.line_count} lines</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => navigate(`/stories/learn/${story.id}`)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-xs font-medium"
                                    >
                                        <BookOpen size={14} />
                                        Learn
                                    </button>
                                    <button
                                        onClick={() => navigate(`/stories/challenge/${story.id}`)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-xs font-medium"
                                    >
                                        <Target size={14} />
                                        Challenge
                                    </button>
                                    <button
                                        onClick={(e) => deleteStory(story.id, e)}
                                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
