-- Restringe leitura e atualizacao de agendamentos ao e-mail administrativo
-- confirmado na conta Authentication do projeto Studio de Cilios.
-- O usuario precisa entrar com este e-mail e senha no painel /admin.

DROP POLICY IF EXISTS "Admin can read appointments" ON public.appointments;
CREATE POLICY "Admin can read appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (lower(auth.jwt() ->> 'email') = 'cilios@gmail.com');

DROP POLICY IF EXISTS "Admin can update appointments" ON public.appointments;
CREATE POLICY "Admin can update appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (lower(auth.jwt() ->> 'email') = 'cilios@gmail.com')
WITH CHECK (lower(auth.jwt() ->> 'email') = 'cilios@gmail.com');
