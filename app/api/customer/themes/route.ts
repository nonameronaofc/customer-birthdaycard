import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import {
  GENDERS,
  PACKAGE_CODES,
  PARENTS_CONTENTS,
  type Gender,
  type PackageCode,
  type ParentsContent,
} from '@/lib/constants';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 12;
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=86400',
};

function readPageParam(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function cachedJson(body: unknown) {
  return NextResponse.json(body, { headers: CACHE_HEADERS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const gender = searchParams.get('gender') as Gender | null;
  const parentsContent = searchParams.get('parents_content') as ParentsContent | null;
  const packageCode = searchParams.get('package_code') as PackageCode | null;
  const requestedLimit = readPageParam(searchParams.get('limit'), DEFAULT_LIMIT);
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_LIMIT);
  const offset = readPageParam(searchParams.get('offset'), 0);

  if (!gender || !GENDERS.includes(gender)) {
    return NextResponse.json({ error: 'Gender tidak valid.' }, { status: 400 });
  }
  if (!parentsContent || !PARENTS_CONTENTS.includes(parentsContent)) {
    return NextResponse.json({ error: 'Parents content tidak valid.' }, { status: 400 });
  }
  if (!packageCode || !PACKAGE_CODES.includes(packageCode)) {
    return NextResponse.json({ error: 'Package code tidak valid.' }, { status: 400 });
  }

  const supabase = getServerSupabase();

  const { data: packageRows, error: packageError } = await supabase
    .from('theme_package_codes')
    .select('theme_id')
    .eq('package_code', packageCode);

  if (packageError) {
    return NextResponse.json({ error: 'Gagal memuat relasi paket tema.' }, { status: 500 });
  }

  const eligibleIds = (packageRows || []).map((row) => row.theme_id);
  if (eligibleIds.length === 0) {
    return cachedJson({
      themes: [],
      pagination: {
        total: 0,
        limit,
        offset,
        has_previous: offset > 0,
        has_next: false,
      },
    });
  }

  const { data: themes, error: themesError, count } = await supabase
    .from('themes')
    .select('*', { count: 'exact' })
    .in('id', eligibleIds)
    .eq('gender', gender)
    .eq('parents_content', parentsContent)
    .eq('is_active', true)
    .order('name')
    .range(offset, offset + limit - 1);

  const total = count || 0;
  if (themesError) {
    const rangeError = themesError as { code?: string; message?: string };
    if (
      rangeError.code === 'PGRST103' ||
      rangeError.message?.toLowerCase().includes('range')
    ) {
      return cachedJson({
        themes: [],
        pagination: {
          total,
          limit,
          offset,
          has_previous: offset > 0,
          has_next: false,
        },
      });
    }
    return NextResponse.json({ error: 'Gagal memuat tema.' }, { status: 500 });
  }
  if (!themes || themes.length === 0) {
    return cachedJson({
      themes: [],
      pagination: {
        total,
        limit,
        offset,
        has_previous: offset > 0,
        has_next: offset + limit < total,
      },
    });
  }

  const themeIds = themes.map((theme) => theme.id);
  const { data: images, error: imagesError } = await supabase
    .from('theme_images')
    .select('id, theme_id, image_url, display_order')
    .in('theme_id', themeIds)
    .order('display_order');

  if (imagesError) {
    return NextResponse.json({ error: 'Gagal memuat gambar tema.' }, { status: 500 });
  }

  const imagesByTheme = new Map<string, { id: string; image_url: string; position: number }[]>();
  (images || []).forEach((image) => {
    const row = {
      id: image.id,
      image_url: image.image_url,
      position: image.display_order,
    };
    const existing = imagesByTheme.get(image.theme_id) || [];
    imagesByTheme.set(image.theme_id, [...existing, row]);
  });

  return cachedJson({
    themes: themes.map((theme) => {
      const themeImages = (imagesByTheme.get(theme.id) || []).slice(0, 3);
      return {
        id: theme.id,
        theme_code: theme.theme_code,
        name: theme.name,
        gender: theme.gender,
        parents_content: theme.parents_content,
        requires_parents_nickname: !!theme.requires_parents_nickname,
        requires_parents_nickname_video: typeof theme.requires_parents_nickname_video === 'boolean'
          ? theme.requires_parents_nickname_video
          : !!theme.requires_parents_nickname,
        requires_parents_nickname_print: !!theme.requires_parents_nickname_print,
        requires_parents_sweetname: !!theme.requires_parents_sweetname,
        image_url: theme.image_url,
        is_active: theme.is_active,
        images: themeImages.length > 0
          ? themeImages
          : theme.image_url
            ? [{ id: theme.id, image_url: theme.image_url, position: 0 }]
            : [],
      };
    }),
    pagination: {
      total,
      limit,
      offset,
      has_previous: offset > 0,
      has_next: offset + limit < total,
    },
  });
}
