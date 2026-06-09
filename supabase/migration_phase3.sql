-- MIGRACIÓN FASE 3: DETECCIÓN DE ADBLOCK Y REGISTRO DE ERRORES EN PÁGINAS

-- 1. Agregar columna has_adblock a la tabla user_presence (si no existe)
ALTER TABLE public.user_presence ADD COLUMN IF NOT EXISTS has_adblock boolean DEFAULT false;

-- 2. Crear tabla page_errors para registrar errores reportados por clientes
CREATE TABLE IF NOT EXISTS public.page_errors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  error_message text NOT NULL,
  user_agent text,
  session_id text,
  detected_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.page_errors ENABLE ROW LEVEL SECURITY;

-- Crear políticas de RLS para page_errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'page_errors' AND policyname = 'Anyone can insert page errors'
    ) THEN
        CREATE POLICY "Anyone can insert page errors" ON public.page_errors FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'page_errors' AND policyname = 'Admins can manage page errors'
    ) THEN
        CREATE POLICY "Admins can manage page errors" ON public.page_errors FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.is_admin = true
          )
        );
    END IF;
END
$$;

-- 3. Registrar tabla en la publicación de tiempo real de Supabase
DO $$
BEGIN
    -- Intentar agregar la tabla a la publicación de tiempo real
    -- NOTA: Si ya existe en la publicación, capturamos el error silenciosamente
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.page_errors;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL;
        WHEN OTHERS THEN
            NULL;
    END;
END
$$;
