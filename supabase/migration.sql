-- =========================================================================
-- MIGRACIÓN CONSOLIDADA Y UNIFICADA (Idempotente y a prueba de errores 42710)
-- =========================================================================

-- Habilitar extensión pg_cron (requerido para tareas programadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =========================================================================
-- 1. ESTRUCTURA DE LA TABLA PROFILES Y SEGURIDAD
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username text UNIQUE NOT NULL,
  avatar_url text,
  reading_direction text DEFAULT 'horizontal',
  is_premium boolean DEFAULT false,
  premium_type text DEFAULT NULL,
  telegram_id bigint UNIQUE,
  premium_until timestamp with time zone,
  telegram_last_checked timestamp with time zone,
  telegram_grace_started timestamp with time zone,
  is_admin boolean DEFAULT false NOT NULL,
  username_updated_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now()
);

-- Asegurar que todas las columnas existan por si la tabla ya estaba creada previamente
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reading_direction text DEFAULT 'horizontal';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_type text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_id bigint UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_until timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_last_checked timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_grace_started timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_updated_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas viejas para evitar conflictos
DROP POLICY IF EXISTS "Permitir lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir actualización propia" ON public.profiles;

-- Crear políticas
CREATE POLICY "Permitir lectura pública de perfiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Permitir actualización propia" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Asignación del Owner principal como Administrador
UPDATE public.profiles 
SET is_admin = true 
WHERE id = '208d7b80-b7cd-4480-82e6-9582431cc78e';

-- =========================================================================
-- 2. DISPARADOR (TRIGGER) PARA NUEVOS USUARIOS
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_username text;
  v_avatar_url text;
BEGIN
  v_username := COALESCE(
    new.raw_user_meta_data ->> 'username',
    (new.raw_user_meta_data -> 'custom_claims') ->> 'global_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'user_name',
    split_part(new.email, '@', 1),
    'Usuario'
  );

  v_username := substring(trim(v_username) from 1 for 25);
  IF v_username = '' THEN
    v_username := 'Usuario';
  END IF;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_username := substring(v_username from 1 for 20) || floor(random() * 9000 + 1000)::integer;
  END LOOP;

  v_avatar_url := COALESCE(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture'
  );

  INSERT INTO public.profiles (id, username, avatar_url, updated_at)
  VALUES (new.id, v_username, v_avatar_url, now())
  ON CONFLICT (id) DO UPDATE 
  SET 
    username = EXCLUDED.username,
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 3. UNIFICACIÓN DE COMENTARIOS, LIKES Y REPORTES
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chapter_id TEXT NOT NULL DEFAULT 'general',
    manga_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_spoiler BOOLEAN NOT NULL DEFAULT false,
    is_moderated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE
);

ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS chapter_id TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_moderated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, user_id)
);

ALTER TABLE public.comment_likes DROP CONSTRAINT IF EXISTS comment_likes_comment_id_user_id_key;
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_comment_id_user_id_key UNIQUE (comment_id, user_id);

CREATE TABLE IF NOT EXISTS public.comment_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('words', 'spoiler')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, user_id, report_type)
);

ALTER TABLE public.comment_reports DROP CONSTRAINT IF EXISTS comment_reports_comment_id_user_id_report_type_key;
ALTER TABLE public.comment_reports ADD CONSTRAINT comment_reports_comment_id_user_id_report_type_key UNIQUE (comment_id, user_id, report_type);

-- Habilitar RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas viejas
DROP POLICY IF EXISTS "Permitir lectura pública de comentarios" ON public.comments;
DROP POLICY IF EXISTS "Permitir lectura publica de comentarios" ON public.comments;
DROP POLICY IF EXISTS "Permitir inserción de comentarios propios" ON public.comments;
DROP POLICY IF EXISTS "Permitir insercion a usuarios autenticados" ON public.comments;
DROP POLICY IF EXISTS "Permitir borrar propio comentario" ON public.comments;
DROP POLICY IF EXISTS "Permitir actualizar spoilers y moderacion por reportes" ON public.comments;

DROP POLICY IF EXISTS "Permitir lectura pública de likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Permitir lectura publica de likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Permitir gestión de likes propios" ON public.comment_likes;
DROP POLICY IF EXISTS "Permitir dar/quitar like a usuarios autenticados" ON public.comment_likes;
DROP POLICY IF EXISTS "Permitir remover su propio like" ON public.comment_likes;

DROP POLICY IF EXISTS "Permitir lectura pública de reportes" ON public.comment_reports;
DROP POLICY IF EXISTS "Permitir lectura publica de reportes" ON public.comment_reports;
DROP POLICY IF EXISTS "Permitir inserción de reportes propios" ON public.comment_reports;
DROP POLICY IF EXISTS "Permitir reportar a usuarios autenticados" ON public.comment_reports;

-- Crear políticas
CREATE POLICY "Permitir lectura publica de comentarios" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Permitir insercion a usuarios autenticados" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permitir borrar propio comentario" ON public.comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Permitir actualizar spoilers y moderacion por reportes" ON public.comments FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Permitir lectura publica de likes" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Permitir dar/quitar like a usuarios autenticados" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Permitir remover su propio like" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Permitir lectura publica de reportes" ON public.comment_reports FOR SELECT USING (true);
CREATE POLICY "Permitir reportar a usuarios autenticados" ON public.comment_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 4. TABLAS DE LISTAS DE MANGAS (COMUNIDAD)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.manga_lists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.manga_list_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id uuid REFERENCES public.manga_lists ON DELETE CASCADE NOT NULL,
  manga_id text NOT NULL,
  manga_title text NOT NULL,
  cover_image text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(list_id, manga_id)
);

ALTER TABLE public.manga_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manga_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public lists" ON public.manga_lists;
DROP POLICY IF EXISTS "Users can manage their own lists" ON public.manga_lists;
DROP POLICY IF EXISTS "Anyone can view items of public lists" ON public.manga_list_items;
DROP POLICY IF EXISTS "Users can manage items of their own lists" ON public.manga_list_items;

CREATE POLICY "Anyone can view public lists" ON public.manga_lists FOR SELECT USING (is_public = true);
CREATE POLICY "Users can manage their own lists" ON public.manga_lists FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view items of public lists" ON public.manga_list_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.manga_lists WHERE id = list_id AND is_public = true)
);
CREATE POLICY "Users can manage items of their own lists" ON public.manga_list_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.manga_lists WHERE id = list_id AND user_id = auth.uid())
);

-- =========================================================================
-- 5. AUTOMATIZACIÓN Y LIMPIEZA DE CUENTAS (PG_CRON)
-- =========================================================================

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('cleanup-unconfirmed-users-30days');
  EXCEPTION WHEN OTHERS THEN
  END;

  BEGIN
    PERFORM cron.unschedule('cleanup-deleted-accounts-grace-period');
  EXCEPTION WHEN OTHERS THEN
  END;
END $$;

SELECT cron.schedule(
  'cleanup-unconfirmed-users-30days',
  '0 0 * * *',
  $$
  DELETE FROM auth.users
  WHERE confirmed_at IS NULL 
    AND created_at < NOW() - INTERVAL '30 days';
  $$
);

SELECT cron.schedule(
  'cleanup-deleted-accounts-grace-period',
  '0 1 * * *',
  $$
  DELETE FROM auth.users
  WHERE (raw_user_meta_data->>'scheduled_delete_at')::timestamp <= NOW();
  $$
);

-- =========================================================================
-- 6. TABLAS DE FAVORITOS E HISTORIAL DE LECTURA
-- =========================================================================

-- Favoritos
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  manga_id text NOT NULL,
  manga_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, manga_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorites;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'Users can manage their own favorites'
    ) THEN
        CREATE POLICY "Users can manage their own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Historial
CREATE TABLE IF NOT EXISTS public.reading_history (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  manga_id text NOT NULL,
  manga_title text NOT NULL,
  chapter_id text NOT NULL,
  chapter_number text NOT NULL,
  cover_image text,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, manga_id)
);
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own reading history" ON public.reading_history;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'reading_history' AND policyname = 'Users can manage their own reading history'
    ) THEN
        CREATE POLICY "Users can manage their own reading history" ON public.reading_history FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;

-- =========================================================================
-- 7. FUNCIÓN RPC PARA INICIO DE SESIÓN CON USERNAME
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT u.email INTO v_email
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE LOWER(p.username) = LOWER(p_username)
  LIMIT 1;
  
  RETURN v_email;
END;
$$;

-- =========================================================================
-- 8. TABLAS Y POLÍTICAS DEL PANEL - FASE 2 & FASE 3
-- =========================================================================

-- Tabla de Presencia
CREATE TABLE IF NOT EXISTS public.user_presence (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  path text NOT NULL,
  last_active timestamp with time zone DEFAULT now() NOT NULL,
  has_adblock boolean DEFAULT false,
  UNIQUE(session_id)
);

ALTER TABLE public.user_presence ADD COLUMN IF NOT EXISTS has_adblock boolean DEFAULT false;

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can upsert their presence" ON public.user_presence;
DROP POLICY IF EXISTS "Admins can view presence" ON public.user_presence;

CREATE POLICY "Anyone can upsert their presence" ON public.user_presence FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view presence" ON public.user_presence FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- Tabla de Capítulos Rotos
CREATE TABLE IF NOT EXISTS public.broken_chapters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  manga_id text NOT NULL,
  manga_title text NOT NULL,
  chapter_id text NOT NULL,
  chapter_number text NOT NULL,
  detected_at timestamp with time zone DEFAULT now() NOT NULL,
  report_count integer DEFAULT 1 NOT NULL,
  UNIQUE(manga_id, chapter_id)
);

ALTER TABLE public.broken_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert broken chapters" ON public.broken_chapters;
DROP POLICY IF EXISTS "Admins can manage broken chapters" ON public.broken_chapters;

CREATE POLICY "Anyone can insert broken chapters" ON public.broken_chapters FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage broken chapters" ON public.broken_chapters FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- Tabla de Búsquedas Fallidas
CREATE TABLE IF NOT EXISTS public.failed_searches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  count integer DEFAULT 1 NOT NULL,
  last_searched timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(query)
);

ALTER TABLE public.failed_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert failed searches" ON public.failed_searches;
DROP POLICY IF EXISTS "Anyone can update failed searches" ON public.failed_searches;
DROP POLICY IF EXISTS "Admins can manage failed searches" ON public.failed_searches;

CREATE POLICY "Anyone can insert failed searches" ON public.failed_searches FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update failed searches" ON public.failed_searches FOR UPDATE USING (true);
CREATE POLICY "Admins can manage failed searches" ON public.failed_searches FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- Tabla de la Cola del Scraper
CREATE TABLE IF NOT EXISTS public.scraper_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  manga_title text NOT NULL,
  source_url text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  priority integer DEFAULT 0 NOT NULL,
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  error_message text,
  UNIQUE(source_url)
);

ALTER TABLE public.scraper_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage scraper queue" ON public.scraper_queue;

CREATE POLICY "Admins can manage scraper queue" ON public.scraper_queue FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- Tabla para Registrar Errores de Clientes (Fase 3)
CREATE TABLE IF NOT EXISTS public.page_errors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  error_message text NOT NULL,
  user_agent text,
  session_id text,
  detected_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.page_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert page errors" ON public.page_errors;
DROP POLICY IF EXISTS "Admins can manage page errors" ON public.page_errors;

CREATE POLICY "Anyone can insert page errors" ON public.page_errors FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage page errors" ON public.page_errors FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- =========================================================================
-- 9. REGISTRO EN PUBLICACIÓN DE TIEMPO REAL (Idempotente)
-- =========================================================================

DO $$
BEGIN
    -- scraper_queue
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.scraper_queue;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN OTHERS THEN NULL;
    END;

    -- user_presence
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN OTHERS THEN NULL;
    END;

    -- broken_chapters
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.broken_chapters;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN OTHERS THEN NULL;
    END;

    -- failed_searches
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.failed_searches;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN OTHERS THEN NULL;
    END;

    -- page_errors
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.page_errors;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN OTHERS THEN NULL;
    END;
END
$$;
