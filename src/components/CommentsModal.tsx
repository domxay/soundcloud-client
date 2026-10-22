import { useState, useEffect } from 'react';
import { Track, Comment } from '@/types';
import { soundcloudApi } from '@/services/api';
import { formatTime } from '@/services/utils';
import { useI18n } from '@/services/i18n';
import { X, MessageSquare, Send, Clock, Loader2, Check } from 'lucide-react';

interface CommentsModalProps {
  track: Track | null;
  currentTime: number;
  isOpen: boolean;
  onClose: () => void;
  onSeek: (timeSeconds: number) => void;
}

export default function CommentsModal({
  track,
  currentTime,
  isOpen,
  onClose,
  onSeek,
}: CommentsModalProps) {
  const { t } = useI18n();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justPosted, setJustPosted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && track) {
      setLoading(true);
      soundcloudApi.getTrackComments(track.id).then((data) => {
        if (isMounted) {
          setComments(data);
          setLoading(false);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, track]);

  if (!isOpen || !track) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    const timestampMs = Math.round(currentTime * 1000);
    const created = await soundcloudApi.postTrackComment(track.id, newComment, timestampMs);

    if (created) {
      setComments([created, ...comments]);
      setNewComment('');
      setJustPosted(true);
      setTimeout(() => setJustPosted(false), 2500);
    }
    setSubmitting(false);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg h-[80vh] rounded-2xl border border-sc-border bg-[#141414] shadow-2xl flex flex-col overflow-hidden text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sc-border px-6 py-4 bg-[#181818]">
          <div className="flex items-center gap-3 min-w-0">
            <MessageSquare size={20} className="text-sc-accent shrink-0" />
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-white truncate">{t('commentsTitle')}</h3>
              <p className="text-xs text-sc-text-secondary truncate">{track.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-sc-text-secondary hover:bg-sc-surface hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-sc-text-secondary py-16">
              <Loader2 size={28} className="animate-spin text-sc-accent mb-2" />
              <p className="text-xs">{t('connecting')}</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-sc-text-secondary py-16 text-center">
              <MessageSquare size={36} className="text-sc-border mb-3" />
              <p className="text-sm font-semibold text-white">{t('noCommentsYet')}</p>
              <p className="text-xs text-sc-text-secondary mt-1">
                {t('writeComment')}
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-3 rounded-sc border border-sc-border/60 bg-sc-surface/40 p-3 hover:bg-sc-surface transition-colors"
              >
                {comment.user.avatar_url ? (
                  <img
                    src={comment.user.avatar_url}
                    alt={comment.user.username}
                    className="h-8 w-8 rounded-full object-cover shrink-0 border border-sc-border"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-sc-border shrink-0 flex items-center justify-center text-xs font-bold text-white">
                    {comment.user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {comment.user.username}
                    </span>
                    {comment.timestamp !== undefined && (
                      <button
                        onClick={() => onSeek(comment.timestamp / 1000)}
                        className="flex items-center gap-1 text-[11px] font-mono text-sc-accent hover:underline shrink-0"
                        title="Jump to time"
                      >
                        <Clock size={11} />
                        {formatTime(comment.timestamp / 1000)}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[#d1d1d1] mt-1 break-words leading-relaxed font-sans">
                    {comment.body}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-sc-border p-4 bg-[#181818] flex items-center gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('writeComment')}
            className="flex-1 rounded-sc border border-sc-border bg-sc-bg px-3.5 py-2 text-xs text-white placeholder:text-sc-text-secondary focus:border-sc-accent focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="flex items-center gap-1.5 rounded-sc bg-sc-accent px-4 py-2 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors disabled:opacity-40 shrink-0"
          >
            {justPosted ? (
              <Check size={14} />
            ) : submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            <span>{t('sendComment')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
