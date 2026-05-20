import type { Gender, ParentsContent, PackageCode } from './constants';

export type ThemeImage = {
  id: string;
  image_url: string;
  position: number;
};

export type ThemeCharacterVariant = {
  id: string;
  theme_id: string;
  gender: Gender;
  hair_type_label: string;
  hair_type_key: string;
  face_attribute_label: string;
  face_attribute_key: string;
  variant_name: string | null;
  image_url: string;
  is_default: boolean;
  is_recommended: boolean;
  is_active: boolean;
  display_order: number;
};

export type Theme = {
  id: string;
  theme_code: string;
  name: string;
  gender: Gender;
  parents_content: ParentsContent;
  requires_parents_nickname: boolean;
  requires_parents_nickname_video?: boolean;
  requires_parents_nickname_print?: boolean;
  requires_parents_sweetname: boolean;
  image_url: string;
  is_active: boolean;
  style_tags: string[];
  color_tags: string[];
  mood_tags: string[];
  is_recommended: boolean;
  display_priority: number;
  images: ThemeImage[];
  character_variants: ThemeCharacterVariant[];
};

export type ThemePagination = {
  total: number;
  limit: number;
  offset: number;
  has_previous: boolean;
  has_next: boolean;
};

export type ThemePage = {
  themes: Theme[];
  pagination: ThemePagination;
};

// Fetch tema yang lolos 4 filter sesuai sync spec §13:
// - is_active = true
// - gender match
// - parents_content match
// - package code match (lewat tabel theme_package_codes)
export async function fetchEligibleThemes(opts: {
  gender: Gender;
  parents_content: ParentsContent;
  package_code: PackageCode;
  limit?: number;
  offset?: number;
}): Promise<ThemePage> {
  const params = new URLSearchParams({
    gender: opts.gender,
    parents_content: opts.parents_content,
    package_code: opts.package_code,
  });
  if (typeof opts.limit === 'number') params.set('limit', String(opts.limit));
  if (typeof opts.offset === 'number') params.set('offset', String(opts.offset));
  const res = await fetch(`/api/customer/themes?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal memuat tema.');
  return {
    themes: data.themes || [],
    pagination: data.pagination || {
      total: Array.isArray(data.themes) ? data.themes.length : 0,
      limit: opts.limit || 4,
      offset: opts.offset || 0,
      has_previous: (opts.offset || 0) > 0,
      has_next: false,
    },
  };
}

