-- =========================================================================
-- FASE 4: SEGURIDAD DE ADMINISTRADORES Y GESTIÓN DE PREMIUM
-- =========================================================================

-- Asegurar que la columna is_admin existe y está correctamente configurada
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false NOT NULL;

-- Permitir a los administradores actualizar cualquier perfil (por ejemplo, cambiar premium status)
DROP POLICY IF EXISTS "Admins pueden actualizar cualquier perfil" ON public.profiles;

CREATE POLICY "Admins pueden actualizar cualquier perfil" ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);
