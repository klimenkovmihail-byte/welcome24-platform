/**
 * api/shares — котировки и мои пакеты в портале.
 */

import { api } from './apiClient';
import type { ShareQuote, SharePacket, SharePacketType } from '../types/api';

type RawQuote = { id: number; date: string; price: number; note: string };
type RawPacket = {
  id: number;
  owner_id: number;
  date: string;
  quantity: number;
  acquired_price: number;
  type: SharePacketType;
  note: string;
};

export function normalizeQuote(r: RawQuote): ShareQuote {
  return { id: r.id, date: r.date, price: r.price, note: r.note || '' };
}

export function normalizePacket(r: RawPacket): SharePacket {
  return {
    id: r.id,
    ownerId: r.owner_id,
    date: r.date,
    quantity: r.quantity,
    acquiredPrice: r.acquired_price,
    type: r.type,
    note: r.note || '',
  };
}

export const sharesApi = {
  quotes:    () => api.get<RawQuote[]>('/api/shares/quotes').then(rows => rows.map(normalizeQuote)),
  myPackets: () => api.get<RawPacket[]>('/api/shares/my-packets').then(rows => rows.map(normalizePacket)),
};
