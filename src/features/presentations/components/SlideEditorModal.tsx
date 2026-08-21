import React, { useState } from 'react';
import { PresentationDeck, PresentationSlide } from '../../../types/presentation';
import { validatePresentationDeck } from '../utils/validatePresentationDeck';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SlideEditorModalProps {
  deck: PresentationDeck;
  onSave: (updatedDeck: PresentationDeck) => void;
  onClose: () => void;
}

export const SlideEditorModal: React.FC<SlideEditorModalProps> = ({
  deck,
  onSave,
  onClose,
}) => {
  const [slides, setSlides] = useState<PresentationSlide[]>(deck.slides);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const selectedSlide = slides[selectedIndex];

  const handleUpdateSlide = (updated: PresentationSlide) => {
    const next = [...slides];
    next[selectedIndex] = updated;
    setSlides(next);
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...slides];
    const temp = next[idx - 1];
    next[idx - 1] = next[idx];
    next[idx] = temp;
    setSlides(next);
    setSelectedIndex(idx - 1);
  };

  const handleMoveDown = (idx: number) => {
    if (idx === slides.length - 1) return;
    const next = [...slides];
    const temp = next[idx + 1];
    next[idx + 1] = next[idx];
    next[idx] = temp;
    setSlides(next);
    setSelectedIndex(idx + 1);
  };

  const handleDelete = (idx: number) => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, i) => i !== idx);
    setSlides(next);
    setSelectedIndex(Math.max(0, idx - 1));
  };

  const handleToggleHide = (idx: number) => {
    const next = [...slides];
    next[idx] = { ...next[idx], isHidden: !next[idx].isHidden };
    setSlides(next);
  };

  const handleAddSlide = () => {
    const newSlide: PresentationSlide = {
      id: `${deck.campaignId}-slide-${Date.now()}`,
      type: 'stat_grid',
      navLabel: 'New Slide',
      kicker: 'Key Takeaways',
      title: 'New Slide Title',
      stats: [
        { label: 'Metric 1', value: '$100k' },
        { label: 'Metric 2', value: '25%' },
      ],
      speakerNotes: 'Notes for this slide...',
    };
    const next = [...slides, newSlide];
    setSlides(next);
    setSelectedIndex(next.length - 1);
  };

  const currentDeckForValidation: PresentationDeck = {
    ...deck,
    slides,
  };
  const qaReport = validatePresentationDeck(currentDeckForValidation);

  const handleSaveAll = () => {
    onSave(currentDeckForValidation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h2 className="text-lg font-semibold text-white">Presentation Slide Editor</h2>
            <p className="text-xs text-slate-400">
              Customize slide structure, speaker notes, and narrative flow.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              Save Changes
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 overflow-hidden">
          {/* Left: Slide List */}
          <div className="p-4 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Slides ({slides.length})
              </span>
              <button
                onClick={handleAddSlide}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Add Slide
              </button>
            </div>

            {slides.map((s, idx) => {
              const itemTitle = ('title' in s && typeof s.title === 'string') ? s.title : s.type;
              return (
                <div
                  key={s.id || idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    selectedIndex === idx
                      ? 'bg-slate-800 border-emerald-500 text-white'
                      : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[11px] font-mono text-slate-500 w-4 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-medium truncate">
                        {itemTitle}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {s.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleHide(idx);
                      }}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title={s.isHidden ? 'Show Slide' : 'Hide Slide'}
                    >
                      {s.isHidden ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveUp(idx);
                      }}
                      disabled={idx === 0}
                      className="p-1 hover:bg-slate-700 disabled:opacity-20 rounded text-slate-400 hover:text-white"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveDown(idx);
                      }}
                      disabled={idx === slides.length - 1}
                      className="p-1 hover:bg-slate-700 disabled:opacity-20 rounded text-slate-400 hover:text-white"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(idx);
                      }}
                      disabled={slides.length <= 1}
                      className="p-1 hover:bg-red-950/50 disabled:opacity-20 rounded text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Slide Editor Form */}
          <div className="col-span-2 p-6 overflow-y-auto space-y-4">
            {selectedSlide ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono text-emerald-400 uppercase">
                      Slide {selectedIndex + 1} of {slides.length} · {selectedSlide.type.replace(/_/g, ' ')}
                    </span>
                    <h3 className="text-sm font-semibold text-white">
                      {'title' in selectedSlide && typeof selectedSlide.title === 'string' ? selectedSlide.title : 'Slide Settings'}
                    </h3>
                  </div>
                  {selectedSlide.isHidden && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono">
                      HIDDEN
                    </span>
                  )}
                </div>

                {'kicker' in selectedSlide && (
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Kicker / Tagline
                    </label>
                    <input
                      type="text"
                      value={(selectedSlide as { kicker?: string }).kicker || ''}
                      onChange={(e) =>
                        handleUpdateSlide({ ...selectedSlide, kicker: e.target.value } as PresentationSlide)
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {'title' in selectedSlide && (
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Slide Title
                    </label>
                    <input
                      type="text"
                      value={(selectedSlide as { title?: string }).title || ''}
                      onChange={(e) =>
                        handleUpdateSlide({ ...selectedSlide, title: e.target.value } as PresentationSlide)
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {'subtitle' in selectedSlide && (
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={(selectedSlide as { subtitle?: string }).subtitle || ''}
                      onChange={(e) =>
                        handleUpdateSlide({ ...selectedSlide, subtitle: e.target.value } as PresentationSlide)
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                    Speaker Notes (Audience-Hidden)
                  </label>
                  <textarea
                    rows={4}
                    value={selectedSlide.speakerNotes || ''}
                    onChange={(e) =>
                      handleUpdateSlide({ ...selectedSlide, speakerNotes: e.target.value })
                    }
                    placeholder="Enter talking points for presenter mode..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Select a slide to edit
              </div>
            )}
          </div>
        </div>

        {/* QA Preflight Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {qaReport.valid ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Preflight QA Passed ({qaReport.checks.length} checks OK)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <AlertTriangle className="w-4 h-4" />
                <span>{qaReport.errors.length} QA issues found</span>
              </div>
            )}
          </div>

          <span className="text-slate-500 font-mono text-[11px]">
            {slides.filter((s) => !s.isHidden).length} visible / {slides.length} total slides
          </span>
        </div>
      </div>
    </div>
  );
};
