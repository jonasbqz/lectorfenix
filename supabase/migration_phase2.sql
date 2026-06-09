-- MIGRACIÓN FASE 2: BÚSQUEDAS FALLIDAS Y COLA DEL SCRAPER

-- 1. Tabla para registrar búsquedas fallidas (0 resultados)
CREATE TABLE IF NOT EXISTS public.failed_searches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  query text NOT NULL,
  count integer DEFAULT 1 NOT NULL,
  last_searched timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(query)
);

ALTER TABLE public.failed_searches ENABLE ROW LEVEL SECURITY;

-- Verificar si las políticas ya existen para evitar errores si se vuelve a correr
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'failed_searches' AND policyname = 'Anyone can insert failed searches'
    ) THEN
        CREATE POLICY "Anyone can insert failed searches" ON public.failed_searches FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'failed_searches' AND policyname = 'Anyone can update failed searches'
    ) THEN
        CREATE POLICY "Anyone can update failed searches" ON public.failed_searches FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'failed_searches' AND policyname = 'Admins can manage failed searches'
    ) THEN
        CREATE POLICY "Admins can manage failed searches" ON public.failed_searches FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
          )
        );
    END IF;
END
$$;

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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'scraper_queue' AND policyname = 'Admins can manage scraper queue'
    ) THEN
        CREATE POLICY "Admins can manage scraper queue" ON public.scraper_queue FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
          )
        );
    END IF;
END
$$;
