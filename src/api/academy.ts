/**
 * api/academy — курсы, вебинары, события (платформа).
 */

import { api } from './apiClient';

export interface Lesson {
  id: number;
  title: string;
  duration: string;
  videoUrl: string;
}

export interface AcademyCourse {
  id: number;
  title: string;
  description: string;
  category: string;
  level: string;
  coverUrl: string;
  duration: string;
  authorId: number | null;
  authorName: string;
  tags: string[];
  rating: number;
  ratingCount: number;
  published: boolean;
  lessons: Lesson[];
  // Совместимость со старой страницей — заполняется на фронте после загрузки прогресса.
  progress: number;
  completed: boolean;
  students: number;
  totalLessons: number;
}

export interface WebinarRecording {
  id: number;
  title: string;
  description: string;
  topic: string;
  videoUrl: string;
  coverUrl: string;
  duration: string;
  date: string;
  speakerId: number | null;
  speakerName: string;
  published: boolean;
  views: number;
  likesCount: number;
  isNew: boolean;
}

export interface AcademyEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  speakerId: number | null;
  speakerName: string;
  format: string;
  topic: string;
  location: string;
  link: string;
  capacity: number | null;
  registered: number;
  published: boolean;
}

type RawCourse = {
  id: number; title: string; description: string; category: string; level: string;
  cover_url: string; duration: string; author_id: number | null; author_name: string;
  tags: string[]; rating: number; rating_count: number; published: boolean;
  lessons: Array<{ id: number; title: string; duration: string; video_url: string }>;
};

type RawWebinar = {
  id: number; title: string; description: string; topic: string; video_url: string;
  cover_url: string; duration: string; date: string; speaker_id: number | null;
  speaker_name: string; published: number | boolean; views: number; likes_count: number;
  is_new: number | boolean;
};

type RawEvent = {
  id: number; title: string; description: string; date: string; start_time: string;
  end_time: string; speaker_id: number | null; speaker_name: string; format: string;
  topic: string; location: string; link: string; capacity: number | null;
  registered: number; published: number | boolean;
};

function normalizeCourse(r: RawCourse): AcademyCourse {
  const lessons = (r.lessons || []).map(l => ({ id: l.id, title: l.title, duration: l.duration, videoUrl: l.video_url }));
  return {
    id: r.id, title: r.title, description: r.description || '',
    category: r.category, level: r.level,
    coverUrl: r.cover_url || '', duration: r.duration || '',
    authorId: r.author_id, authorName: r.author_name || '',
    tags: r.tags || [], rating: r.rating || 0, ratingCount: r.rating_count || 0,
    published: !!r.published,
    lessons,
    progress: 0,
    completed: false,
    students: 0,
    totalLessons: lessons.length,
  };
}

function normalizeWebinar(r: RawWebinar): WebinarRecording {
  return {
    id: r.id, title: r.title, description: r.description || '',
    topic: r.topic, videoUrl: r.video_url || '', coverUrl: r.cover_url || '',
    duration: r.duration || '', date: r.date,
    speakerId: r.speaker_id, speakerName: r.speaker_name || '',
    published: !!r.published, views: r.views || 0, likesCount: r.likes_count || 0,
    isNew: !!r.is_new,
  };
}

function normalizeEvent(r: RawEvent): AcademyEvent {
  return {
    id: r.id, title: r.title, description: r.description || '',
    date: r.date, startTime: r.start_time || '', endTime: r.end_time || '',
    speakerId: r.speaker_id, speakerName: r.speaker_name || '',
    format: r.format, topic: r.topic || '', location: r.location || '',
    link: r.link || '', capacity: r.capacity, registered: r.registered || 0,
    published: !!r.published,
  };
}

export const academyApi = {
  courses:  () => api.get<RawCourse[]>('/api/academy/courses').then(rows => rows.map(normalizeCourse)),
  webinars: () => api.get<RawWebinar[]>('/api/academy/webinars').then(rows => rows.map(normalizeWebinar)),
  events:   () => api.get<RawEvent[]>('/api/academy/events').then(rows => rows.map(normalizeEvent)),
  rate:     (courseId: number, rating: number) =>
    api.post<{ ok: true }>(`/api/academy/courses/${courseId}/rate`, { rating }),
  likeWebinar: (id: number) =>
    api.post<{ liked: boolean; likes: number }>(`/api/academy/webinars/${id}/like`),
  registerEvent: (id: number) =>
    api.post<{ ok: true }>(`/api/academy/events/${id}/register`),
};
