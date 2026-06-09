-- =========================================================================
-- MOTOR DE TELEMETRÍA Y ANALÍTICAS WEB NATIVAS (StoonAnalytics)
-- =========================================================================

-- 1. Tabla de Sesiones de Usuarios / Lectores
CREATE TABLE IF NOT EXISTS public.analytics_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id text UNIQUE NOT NULL,
  referrer text,
  source text,
  device text,
  browser text,
  country text DEFAULT 'Desconocido',
  has_adblocker boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Tabla de Vistas de Página (con duración acumulada en segundos)
CREATE TABLE IF NOT EXISTS public.analytics_pageviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text REFERENCES public.analytics_sessions(session_id) ON DELETE CASCADE NOT NULL,
  path text NOT NULL,
  manga_id text,
  chapter_id text,
  duration integer DEFAULT 0 NOT NULL, -- Duración en segundos
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Tabla de Eventos Personalizados (favoritos, clics en anuncios, etc.)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text REFERENCES public.analytics_sessions(session_id) ON DELETE CASCADE NOT NULL,
  event_name text NOT NULL,
  event_data jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Tabla de Rendimiento de Carga (hojas de manga)
CREATE TABLE IF NOT EXISTS public.analytics_performance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text REFERENCES public.analytics_sessions(session_id) ON DELETE CASCADE NOT NULL,
  manga_id text,
  chapter_id text,
  image_url text,
  load_time_ms integer NOT NULL,
  success boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS (Row Level Security) en todas las tablas
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_performance ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas si existiesen
DROP POLICY IF EXISTS "Admins read sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Admins read pageviews" ON public.analytics_pageviews;
DROP POLICY IF EXISTS "Admins read events" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins read performance" ON public.analytics_performance;

DROP POLICY IF EXISTS "Anyone can insert sessions" ON public.analytics_sessions;
DROP POLICY IF EXISTS "Anyone can insert pageviews" ON public.analytics_pageviews;
DROP POLICY IF EXISTS "Anyone can insert events" ON public.analytics_events;
DROP POLICY IF EXISTS "Anyone can insert performance" ON public.analytics_performance;
DROP POLICY IF EXISTS "Anyone can update pageviews" ON public.analytics_pageviews;

-- 1. Permitir a los administradores leer toda la telemetría para las métricas del panel
CREATE POLICY "Admins read sessions" ON public.analytics_sessions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins read pageviews" ON public.analytics_pageviews FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins read events" ON public.analytics_events FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins read performance" ON public.analytics_performance FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 2. Permitir que cualquiera inserte registros (necesario para el rastreador del cliente)
CREATE POLICY "Anyone can insert sessions" ON public.analytics_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert pageviews" ON public.analytics_pageviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert events" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert performance" ON public.analytics_performance FOR INSERT WITH CHECK (true);

-- 3. Permitir actualización de vistas de páginas (para acumular duración del heartbeat)
CREATE POLICY "Anyone can update pageviews" ON public.analytics_pageviews FOR UPDATE USING (true) WITH CHECK (true);
