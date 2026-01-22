import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ScrollText, Sparkles } from "lucide-react";

export default function WelcomeScreen({ theme }) {
    const navigate = useNavigate();

    return (
        <div className="welcome-container">
            {/* Hero Section */}
            <div className="welcome-hero">
                <div className="welcome-hero__title-wrapper">
                    <Sparkles className="text-amber-400" size={32} />
                    <h1 className="welcome-hero__title">
                        FlashCards
                    </h1>
                    <Sparkles className="text-amber-400" size={32} />
                </div>
                <p className="welcome-hero__subtitle">
                    Master new languages through vocabulary and immersive stories
                </p>
            </div>

            {/* Mode Selection */}
            <div className="welcome-modes">
                {/* Vocabulary Mode */}
                <button
                    onClick={() => navigate("/vocabulary")}
                    className="welcome-mode-card welcome-mode-card--vocabulary"
                >
                    <div className="welcome-mode-card__glow" />
                    <BookOpen className="welcome-mode-card__icon text-indigo-400" size={40} />
                    <h2 className="welcome-mode-card__title">Vocabulary</h2>
                    <p className="welcome-mode-card__description">
                        Learn words with flashcards. Quick reveal, learn mode, and challenge yourself.
                    </p>
                    <div className="welcome-mode-card__tags">
                        <span className="welcome-mode-card__tag">
                            Flashcards
                        </span>
                        <span className="welcome-mode-card__tag">
                            4 Languages
                        </span>
                        <span className="welcome-mode-card__tag">
                            TTS
                        </span>
                    </div>
                </button>

                {/* Stories Mode */}
                <button
                    onClick={() => navigate("/stories")}
                    className="welcome-mode-card welcome-mode-card--stories"
                >
                    <div className="welcome-mode-card__glow" />
                    <ScrollText className="welcome-mode-card__icon text-emerald-400" size={40} />
                    <h2 className="welcome-mode-card__title">Stories</h2>
                    <p className="welcome-mode-card__description">
                        Learn sentences and lyrics line-by-line with a Spotify-style experience.
                    </p>
                    <div className="welcome-mode-card__tags">
                        <span className="welcome-mode-card__tag">
                            Lyrics Style
                        </span>
                        <span className="welcome-mode-card__tag">
                            Sentences
                        </span>
                        <span className="welcome-mode-card__tag">
                            Immersive
                        </span>
                    </div>
                </button>
            </div>

            {/* Footer hint */}
            <p className="welcome-footer">
                Press <kbd>⌘</kbd> +
                <kbd>K</kbd> for quick navigation
            </p>
        </div>
    );
}
