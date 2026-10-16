import { useState, useEffect } from 'react';
import { Track, Comment } from '@/types';
import { soundcloudApi } from '@/services/api';
import { formatTime } from '@/services/utils';
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

  const handleSeekToComment = (timestampMs: number) => {
    const seconds = timestampMs / 1000;
    onSeek(seconds);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl h-[660px] flex flex-col rounded-sc border border-sc-border bg-[#161616] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-sc-border px-5 py-4 bg-[#1a1a1a]">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={track.artwork}
              alt={track.title}
              className="h-10 w-10 rounded-sc object-cover border border-sc-border shrink-0"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">{track.title}</h3>
              <p className="text-xs text-sc-text-secondary truncate">{track.artist}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-sc-text-secondary hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-b border-sc-border bg-[#141414]">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded bg-[#222] border border-sc-border px-2 py-0.5 text-[11px] font-semibold text-sc-accent">
                <Clock size={12} />
                at {formatTime(currentTime)}
              </span>
              <span className="text-xs text-sc-text-secondary">
                Attach comment to playback position
              </span>
            </div>

            {justPosted && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <Check size={14} /> Posted
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 rounded-sc border border-sc-border bg-[#1c1c1c] px-3.5 py-2 text-xs text-white placeholder:text-sc-text-secondary focus:border-sc-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="flex items-center gap-1.5 rounded-sc bg-sc-accent px-4 py-2 text-xs font-bold text-white hover:bg-sc-accent-hover transition-colors disabled:opacity-50 shadow-sm"
            >
              {submitting ? <Loader2 size={14} className="animate-spin-slow" /> : <Send size={14} />}
              Comment
            </button>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-20 text-xs text-sc-text-secondary flex flex-col items-center">
              <Loader2 size={24} className="animate-spin-slow text-sc-accent mb-2" />
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-24 text-sc-text-secondary flex flex-col items-center">
              <MessageSquare size={36} className="text-sc-border mb-2" />
              <p className="text-sm font-medium text-white">No comments yet</p>
              <p className="text-xs text-sc-text-secondary mt-1">Be the first to share your thoughts on this track.</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-3 rounded-sc border border-sc-border bg-[#1a1a1a] p-3 transition-colors hover:border-sc-hover"
              >
                <img
                  src={comment.user.avatar_url}
                  alt={comment.user.username}
                  className="h-8 w-8 rounded-full object-cover border border-sc-border shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-white truncate">
                      {comment.user.username}
                    </span>
                    <button
                      onClick={() => handleSeekToComment(comment.timestamp)}
                      className="text-[10px] tabular-nums font-semibold text-sc-accent bg-sc-surface border border-sc-border px-1.5 py-0.5 rounded hover:bg-sc-hover transition-colors"
                      title="Seek to comment"
                    >
                      {formatTime(comment.timestamp / 1000)}
                    </button>
                  </div>

                  <p className="text-xs text-[#ddd] break-words leading-relaxed">{comment.body}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
