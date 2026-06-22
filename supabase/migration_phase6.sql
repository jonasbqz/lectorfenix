-- MIGRACIÓN FASE 6: ACCIONES DE ADMINISTRACIÓN Y MODERACIÓN RLS

-- 1. Permitir a los administradores borrar cualquier comentario
DROP POLICY IF EXISTS "Admins pueden borrar cualquier comentario" ON public.comments;
CREATE POLICY "Admins pueden borrar cualquier comentario" ON public.comments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- 2. Permitir a los administradores borrar/desestimar cualquier reporte de comentarios
DROP POLICY IF EXISTS "Admins pueden borrar cualquier reporte" ON public.comment_reports;
CREATE POLICY "Admins pueden borrar cualquier reporte" ON public.comment_reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

-- 3. Asegurar que los administradores puedan actualizar cualquier perfil (promociones, premium, etc.)
DROP POLICY IF EXISTS "Admins pueden actualizar cualquier perfil" ON public.profiles;
CREATE POLICY "Admins pueden actualizar cualquier perfil" ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);
