import React, { useState } from "react";
import { Brain, Trash2, RefreshCw, X, Save } from "lucide-react";

export default function DeckGrid({
  renderedDeck,
  theme,
  settings,
  deleteCard,
  updateCard,
  observerRef,
}) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [editData, setEditData] = useState(null);

  // Get text for current language pair
  const frontLang = settings?.frontLang || "en_US";
  const backLang = settings?.backLang || "es_ES";

  const openCardModal = (card) => {
    setSelectedCard(card);
    setEditData({
      en_US: card.en_US || "",
      es_ES: card.es_ES || "",
      vi_VN: card.vi_VN || "",
      de_DE: card.de_DE || "",
      categories: card.categories || [],
    });
  };

  const closeModal = () => {
    setSelectedCard(null);
    setEditData(null);
  };

  const handleSave = async () => {
    if (updateCard && selectedCard && editData) {
      await updateCard(selectedCard.id, editData);
    }
    closeModal();
  };

  const handleDelete = () => {
    if (deleteCard && selectedCard) {
      deleteCard(selectedCard.id);
    }
    closeModal();
  };

  return (
    <>
      <div className="grid-auto">
        {renderedDeck.map((card) => {
          const frontText = card[frontLang] || card.front || "";
          const backText = card[backLang] || card.back || "";

          return (
            <div
              key={card.id}
              onClick={() => openCardModal(card)}
              className={`flashcard ${theme.panel} ${theme.border}`}
            >
              <div className="flashcard__study-count">
                <Brain size={10} />
                <span>{card.studyCount || 0}</span>
              </div>
              <div
                className={`flashcard__front ${theme.textAccent}`}
                style={{ fontSize: `${settings.fontSize}px` }}
                title={frontText}
              >
                {frontText}
              </div>
              <div
                className="flashcard__back"
                style={{ fontSize: `${settings.fontSize * 0.8}px` }}
                title={backText}
              >
                {backText}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Edit Modal */}
      {selectedCard && editData && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className={`card-modal ${theme.panel} ${theme.border}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="card-modal__header">
              <h3 className="card-modal__title">Edit Word</h3>
              <button onClick={closeModal} className="btn-icon">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="card-modal__body">
              <div className="space-y-4">
                {/* English */}
                <div className="form-group--compact">
                  <label className="form-label">
                    🇺🇸 English
                  </label>
                  <input
                    type="text"
                    value={editData.en_US}
                    onChange={(e) => setEditData({ ...editData, en_US: e.target.value })}
                    className={`input-field ${theme.bg} ${theme.border}`}
                  />
                </div>

                {/* Spanish */}
                <div className="form-group--compact">
                  <label className="form-label">
                    🇪🇸 Spanish
                  </label>
                  <input
                    type="text"
                    value={editData.es_ES}
                    onChange={(e) => setEditData({ ...editData, es_ES: e.target.value })}
                    className={`input-field ${theme.bg} ${theme.border}`}
                  />
                </div>

                {/* Vietnamese */}
                <div className="form-group--compact">
                  <label className="form-label">
                    🇻🇳 Vietnamese
                  </label>
                  <input
                    type="text"
                    value={editData.vi_VN}
                    onChange={(e) => setEditData({ ...editData, vi_VN: e.target.value })}
                    className={`input-field ${theme.bg} ${theme.border}`}
                  />
                </div>

                {/* German */}
                <div className="form-group--compact">
                  <label className="form-label">
                    🇩🇪 German
                  </label>
                  <input
                    type="text"
                    value={editData.de_DE}
                    onChange={(e) => setEditData({ ...editData, de_DE: e.target.value })}
                    className={`input-field ${theme.bg} ${theme.border}`}
                  />
                </div>

                {/* Study Count Info */}
                <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
                  <Brain size={12} />
                  <span>Studied {selectedCard.studyCount || 0} times</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="card-modal__footer">
              <button onClick={handleDelete} className="btn-danger">
                <Trash2 size={16} />
                Delete
              </button>
              <div className="flex items-center gap-2">
                <button onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className={`btn-primary ${theme.accent} ${theme.onAccent}`}
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={observerRef}
        className="h-20 flex items-center justify-center text-slate-600 text-xs gap-2"
      >
        {" "}
        <RefreshCw size={14} className="animate-spin" /> Loading more...
      </div>
    </>
  );
}
