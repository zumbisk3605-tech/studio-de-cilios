# Studio de Cílios — projeto inicial

Site em Next.js + Supabase para agendamento de cílios e sobrancelhas.

## O que está incluído
- Página pública com serviços e preços demonstrativos.
- Cálculo de sinal de 50% e saldo de 50%.
- Exibição da chave Pix informada: `93991262037`.
- Inserção de agendamentos no Supabase quando configurado.
- Painel administrativo em `/admin`, com login Supabase.
- SQL inicial com tabelas, políticas RLS e catálogo demonstrativo.

## Importante antes de publicar
Este é um ponto de partida funcional, não um sistema pronto para receber pagamentos automaticamente.
- A chave Pix é exibida; o site não verifica a liquidação do Pix.
- O painel permite confirmar manualmente o sinal.
- A consulta de horários usa uma função RPC que retorna somente os horários ocupados; a restrição única de data/horário também impede reservas duplicadas.
- A função RPC pública expõe somente horários ocupados, sem dados pessoais. Um gatilho valida o preço contra o catálogo ativo.
- Configure política de privacidade, consentimento e rotina de backup antes de operar com dados reais.

## 1. Criar o banco
1. Crie um projeto em https://supabase.com.
2. Abra SQL Editor.
3. Cole e execute `supabase/schema.sql`.
4. Em Authentication, crie o usuário da proprietária.

## 2. Configurar o projeto
1. Instale Node.js LTS.
2. Na pasta do projeto, execute `npm install`.
3. Copie `.env.example` para `.env.local`.
4. Preencha URL e chave pública (anon/publishable) do Supabase.
5. Execute `npm run dev` e abra http://localhost:3000.

Nunca coloque a `service_role` key no navegador ou em variáveis `NEXT_PUBLIC_`.

## 3. Publicar
1. Envie o projeto para um repositório privado no GitHub.
2. Importe o repositório na Vercel.
3. Configure na Vercel as mesmas variáveis de ambiente.
4. Faça o deploy e teste o site e `/admin`.
5. Só depois registre `studiodecilios.com.br` no Registro.br e conecte o domínio à Vercel.

## Endereços
- Site público: `/`
- Painel administrativo: `/admin`

## Dados demonstrativos
Preços e catálogo são exemplos e devem ser confirmados pela proprietária antes de divulgar.
