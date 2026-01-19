/**
 * CommentSection component
 * Displays and manages comments for a work item
 */

import React, { useState, useCallback } from 'react';
import { Button, Textarea, Spinner } from '../common';

export interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface CommentSectionProps {
  workItemId: string;
  comments: Comment[];
  isLoading?: boolean;
  onAddComment?: (content: string) => Promise<void>;
  currentUserId?: string;
}

export function CommentSection({
  comments,
  isLoading = false,
  onAddComment,
  currentUserId,
}: CommentSectionProps): React.ReactElement {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim() || !onAddComment) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, onAddComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (userId: string): string => {
    const colors = [
      '#667eea',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6',
      '#06b6d4',
      '#ec4899',
    ];
    const index = userId.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="comment-section">
      <h3 className="section-title">
        Comments
        <span className="comment-count">{comments.length}</span>
      </h3>

      {onAddComment && (
        <div className="comment-form">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment... (Ctrl+Enter to submit)"
            rows={3}
            disabled={isSubmitting}
          />
          {error && <span className="comment-error">{error}</span>}
          <div className="comment-form-actions">
            <span className="comment-hint">Ctrl+Enter to submit</span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
              isLoading={isSubmitting}
            >
              Add Comment
            </Button>
          </div>
        </div>
      )}

      <div className="comments-list">
        {isLoading ? (
          <div className="comments-loading">
            <Spinner size="md" />
            <span>Loading comments...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="no-comments">
            <span>No comments yet</span>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`comment ${comment.userId === currentUserId ? 'own-comment' : ''}`}
            >
              <div
                className="comment-avatar"
                style={{ backgroundColor: getAvatarColor(comment.userId) }}
              >
                {getInitials(comment.userName)}
              </div>
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-author">{comment.userName}</span>
                  <span
                    className="comment-time"
                    title={formatDate(comment.createdAt)}
                  >
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <p className="comment-text">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .comment-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .comment-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 20px;
          padding: 0 0.375rem;
          font-size: 0.75rem;
          font-weight: 500;
          background: #f3f4f6;
          color: #6b7280;
          border-radius: 10px;
        }

        .comment-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
        }

        .comment-error {
          font-size: 0.75rem;
          color: #dc2626;
        }

        .comment-form-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .comment-hint {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .comments-loading,
        .no-comments {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          gap: 0.5rem;
          color: #6b7280;
        }

        .comment {
          display: flex;
          gap: 0.75rem;
        }

        .comment.own-comment .comment-content {
          background: #eff6ff;
        }

        .comment-avatar {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }

        .comment-content {
          flex: 1;
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border-radius: 8px;
        }

        .comment-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .comment-author {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #111827;
        }

        .comment-time {
          font-size: 0.6875rem;
          color: #9ca3af;
        }

        .comment-text {
          margin: 0;
          font-size: 0.875rem;
          line-height: 1.5;
          color: #4b5563;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}

export default CommentSection;
