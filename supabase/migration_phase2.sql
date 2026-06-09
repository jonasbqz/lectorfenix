-- =========================================================================
-- 1. ESTRUCTURA DE LA TABLA PROFILES Y SEGURIDAD (Mantenido intacto)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username text UNIQUE NOT NULL,
  avatar_url text,
  reading_direction text DEFAULT 'vertical',
  is_premium boolean DEFAULT false,
  username_updated_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now()
);

-- Asegurar que todas las columnas existan (por si la tabla ya estaba creada)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reading_direction text DEFAULT 'vertical';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_type TEXT DEFAULT NULL; -- 'gifted' o 'paid'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username_updated_at timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas viejas para evitar conflictos al recrearlas
DROP POLICY IF EXISTS "Permitir lectura pública de perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Permitir actualización propia" ON public.profiles;

-- Crear políticas de seguridad limpias para perfiles
CREATE POLICY "Permitir lectura pública de perfiles" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Permitir actualización propia" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- =========================================================================
-- 2. DISPARADOR (TRIGGER) PARA NUEVOS USUARIOS (Mantenido intacto)
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
  -- Obtener el username de los metadatos de forma segura (Email o Discord)
  v_username := COALESCE(
    new.raw_user_meta_data ->> 'username',
    (new.raw_user_meta_data -> 'custom_claims') ->> 'global_name',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'user_name',
    split_part(new.email, '@', 1),
    'Usuario'
  );

  -- Limpiar espacios y acortar si es muy largo
  v_username := substring(trim(v_username) from 1 for 25);
  IF v_username = '' THEN
    v_username := 'Usuario';
  END IF;

  -- Evitar colisiones de nombres de usuario agregando un sufijo si ya existe en la DB
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_username := substring(v_username from 1 for 20) || floor(random() * 9000 + 1000)::integer;
  END LOOP;

  -- Obtener el avatar_url de OAuth si existe
  v_avatar_url := COALESCE(
    new.raw_user_meta_data ->> 'avatar_url',
    new.raw_user_meta_data ->> 'picture'
  );

  -- Insertar en profiles de forma segura
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

-- Recrear el disparador sobre auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- 3. UNIFICACIÓN DE COMENTARIOS, LIKES Y REPORTES (Mantenido intacto)
-- =========================================================================

-- 3.1 Tabla de comentarios unificada (Soporta respuestas con parent_id)
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

-- Migraciones seguras en caso de que ya existieran columnas parciales de la tabla anterior
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS chapter_id TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_moderated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- 3.2 Tabla de likes de comentarios unificada (Con Clave Primaria y Restricción UNIQUE)
CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, user_id)
);

-- Asegurar restricción UNIQUE si la tabla ya existía
ALTER TABLE public.comment_likes DROP CONSTRAINT IF EXISTS comment_likes_comment_id_user_id_key;
ALTER TABLE public.comment_likes ADD CONSTRAINT comment_likes_comment_id_user_id_key UNIQUE (comment_id, user_id);

-- 3.3 Tabla de reportes de comentarios unificada (Evita duplicados por tipo de reporte)
CREATE TABLE IF NOT EXISTS public.comment_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL CHECK (report_type IN ('words', 'spoiler')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(comment_id, user_id, report_type)
);

-- Asegurar restricción UNIQUE en reportes
ALTER TABLE public.comment_reports DROP CONSTRAINT IF EXISTS comment_reports_comment_id_user_id_report_type_key;
ALTER TABLE public.comment_reports ADD CONSTRAINT comment_reports_comment_id_user_id_report_type_key UNIQUE (comment_id, user_id, report_type);

-- =========================================================================
-- 4. SEGURIDAD RLS COMPLETA Y UNIFICADA PARA COMENTARIOS (Mantenido intacto)
-- =========================================================================

-- Asegurar la activación de RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

-- Limpieza absoluta de políticas previas de ambos scripts para evitar duplicidad de nombres
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

-- Recreación de las políticas consolidadas del sistema
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
-- 5. TABLAS DE LISTAS DE MANGAS (Mantenido intacto)
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
-- 6. AUTOMATIZACIÓN Y LIMPIEZA DE CUENTAS (Corregido a prueba de fallos)
-- =========================================================================

-- Habilitar extensión para tareas programadas si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Bloque anónimo seguro para desprogramar tareas previas únicamente si existen
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('cleanup-unconfirmed-users-30days');
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar el error si la tarea no existía
  END;

  BEGIN
    PERFORM cron.unschedule('cleanup-deleted-accounts-grace-period');
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar el error si la tarea no existía
  END;
END $$;

-- Programar borrado diario de cuentas no confirmadas de más de 30 días
SELECT cron.schedule(
  'cleanup-unconfirmed-users-30days',
  '0 0 * * *', -- Todos los días a medianoche
  $$
  DELETE FROM auth.users
  WHERE confirmed_at IS NULL 
    AND created_at < NOW() - INTERVAL '30 days';
  $$
);

-- Programar borrado diario de cuentas en periodo de gracia de eliminación
SELECT cron.schedule(
  'cleanup-deleted-accounts-grace-period',
  '0 1 * * *', -- Todos los días a la 1:00 AM
  $$
  DELETE FROM auth.users
  WHERE (raw_user_meta_data->>'scheduled_delete_at')::timestamp <= NOW();
  $$
);
-- 1. Crear tabla de favoritos si no existe
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  manga_id text NOT NULL,
  manga_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, manga_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'favorites' AND policyname = 'Users can manage their own favorites'
    ) THEN
        CREATE POLICY "Users can manage their own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 2. Crear tabla de historial de lectura si no existe
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
-- 7. FUNCIÓN RPC PARA INICIO DE SESIÓN CON USERNAME (MANDATORIA)
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
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_id bigint UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_until timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_last_checked timestamp with time zone;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_grace_started timestamp with time zone;
-- 1. Columna de Administrador en Profiles y designación de tu cuenta como Owner
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false NOT NULL;

-- Seteamos tu cuenta verificada (josebanquez100@gmail.com) como Admin/Owner
UPDATE public.profiles 
SET is_admin = true 
WHERE id = '208d7b80-b7cd-4480-82e6-9582431cc78e';

-- 2. Tabla para monitorear presencia de usuarios en tiempo real
CREATE TABLE IF NOT EXISTS public.user_presence (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id text NOT NULL, -- Identificador único anónimo por pestaña
  path text NOT NULL, -- Página actual en la que navega
  last_active timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(session_id)
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores para evitar conflictos
DROP POLICY IF EXISTS "Anyone can upsert their presence" ON public.user_presence;
DROP POLICY IF EXISTS "Admins can view presence" ON public.user_presence;

-- Permitir que cualquier cliente inserte o actualice su presencia
CREATE POLICY "Anyone can upsert their presence" ON public.user_presence 
  FOR ALL USING (true) WITH CHECK (true);

-- Permitir que los administradores vean la presencia en tiempo real
CREATE POLICY "Admins can view presence" ON public.user_presence 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 3. Tabla para el registro de capítulos rotos (páginas vacías)
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

-- Limpiar políticas anteriores para evitar conflictos
DROP POLICY IF EXISTS "Anyone can insert broken chapters" ON public.broken_chapters;
DROP POLICY IF EXISTS "Admins can manage broken chapters" ON public.broken_chapters;

-- Permitir que el sistema o usuarios reporten capítulos rotos
CREATE POLICY "Anyone can insert broken chapters" ON public.broken_chapters 
  FOR INSERT WITH CHECK (true);

-- Permitir que los administradores tengan control total sobre los reportes
CREATE POLICY "Admins can manage broken chapters" ON public.broken_chapters 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
  -- 1. Tabla para registrar búsquedas fallidas (0 resultados)
CREATE TABLE IF NOT EXISTS public.failed_searches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  count integer DEFAULT 1 NOT NULL,
  last_searched timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(query)
);

ALTER TABLE public.failed_searches ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores para evitar conflictos
DROP POLICY IF EXISTS "Anyone can insert failed searches" ON public.failed_searches;
DROP POLICY IF EXISTS "Anyone can update failed searches" ON public.failed_searches;
DROP POLICY IF EXISTS "Admins can manage failed searches" ON public.failed_searches;

CREATE POLICY "Anyone can insert failed searches" ON public.failed_searches FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update failed searches" ON public.failed_searches FOR UPDATE USING (true);
CREATE POLICY "Admins can manage failed searches" ON public.failed_searches FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- 2. Tabla para la cola de solicitudes al Scraper
CREATE TABLE IF NOT EXISTS public.scraper_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  manga_title text NOT NULL,
  source_url text NOT NULL,
  status text DEFAULT 'pending' NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  priority integer DEFAULT 0 NOT NULL, -- Mayor número = mayor prioridad
  requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  error_message text,
  UNIQUE(source_url)
);

ALTER TABLE public.scraper_queue ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores para evitar conflictos
DROP POLICY IF EXISTS "Admins can manage scraper queue" ON public.scraper_queue;

CREATE POLICY "Admins can manage scraper queue" ON public.scraper_queue FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);
