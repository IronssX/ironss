export const GUEST_AUTHOR_NAME = 'Misafir';
export const MAX_COMMENT_LENGTH = 500;

export interface VideoComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  userId?: string;
  avatarUrl?: string | null;
  parentCommentId?: string | null;
}
