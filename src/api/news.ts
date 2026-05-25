/**
 * api/news — статьи + лайки + комментарии (платформа).
 */

import { api } from './apiClient';

export interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  date: string;
  /** Точный timestamp создания записи в БД (ISO). Для «опубликовано N назад». */
  createdAt: string;
  readTime: string;
  likes: number;
  views: number;
  featured: boolean;
  image: string;
  author: string;
}

export interface NewsComment {
  id: number;
  articleId: number;
  authorId: number | null;
  authorName: string;
  text: string;
  createdAt: string;
}

type RawArticle = {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  cover_url: string;
  author_name: string;
  date: string;
  read_time: string;
  likes_count: number;
  views_count: number;
  is_featured: number | boolean;
  published: number | boolean;
  created_at: string;
};

type RawComment = {
  id: number;
  article_id: number;
  author_id: number | null;
  author_name: string;
  text: string;
  created_at: string;
};

function normalizeArticle(r: RawArticle): NewsArticle {
  return {
    id: r.id,
    title: r.title,
    summary: r.summary || '',
    content: r.content || '',
    category: r.category || '',
    date: r.date,
    createdAt: r.created_at || '',
    readTime: r.read_time || '',
    likes: r.likes_count || 0,
    views: r.views_count || 0,
    featured: !!r.is_featured,
    image: r.cover_url || '',
    author: r.author_name || '',
  };
}

function normalizeComment(r: RawComment): NewsComment {
  return {
    id: r.id,
    articleId: r.article_id,
    authorId: r.author_id,
    authorName: r.author_name,
    text: r.text,
    createdAt: r.created_at,
  };
}

export const newsApi = {
  list:        () => api.get<RawArticle[]>('/api/news').then(rows => rows.map(normalizeArticle)),
  comments:    (articleId: number) =>
    api.get<RawComment[]>(`/api/news/${articleId}/comments`).then(rows => rows.map(normalizeComment)),
  addComment:  (articleId: number, text: string) =>
    api.post<RawComment>(`/api/news/${articleId}/comments`, { text }).then(normalizeComment),
  toggleLike:  (articleId: number) =>
    api.post<{ liked: boolean; likes: number }>(`/api/news/${articleId}/like`),
  trackView:   (articleId: number) =>
    api.post<{ views: number }>(`/api/news/${articleId}/view`),
};
