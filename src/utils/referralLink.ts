// Клиентская копия логики сборки реферальной ссылки (зеркало бэкового
// welcome24-backend/src/helpers/referralLink.js). Используется как fallback —
// если у агента ещё не пришло поле referral_link из БД, собираем на лету.

const BASE_URL = 'https://w24.agency/';

const RU_MAP: Record<string, string> = {
  а:'a', б:'b', в:'v', г:'g', д:'d', е:'e', ё:'e', ж:'zh', з:'z', и:'i', й:'i',
  к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f',
  х:'h', ц:'c', ч:'ch', ш:'sh', щ:'sch', ъ:'', ы:'y', ь:'', э:'e', ю:'yu', я:'ya',
};

function transliterate(str: string): string {
  let out = '';
  for (const ch of str.toLowerCase()) out += RU_MAP[ch] ?? ch;
  return out;
}

export function slugifyName(name: string): string {
  if (!name) return 'agent';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const slug = transliterate(parts.join(' '))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'agent';
}

export function buildReferralLink(id: number | string, name: string): string {
  const slug = slugifyName(name);
  const params = new URLSearchParams({
    utm_source: 'agent',
    utm_medium: 'referral',
    utm_campaign: `${slug}-${id}`,
  });
  return `${BASE_URL}?${params.toString()}`;
}
