-- ==============================================================================
-- Horeb SaaS Multi-Tenant Church Platform - Supabase PostgreSQL Schema
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tenants (Igrejas Matrizes e Filiais com Hierarquia)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    primary_color TEXT DEFAULT '#dc2626',
    logo_url TEXT,
    banner_url TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    parent_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users (Liderança Pastoral, Líderes e Membros)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    auth_user_id UUID,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'PASTOR', 'LEADER', 'MEMBER', 'VOLUNTEER')),
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Cell Groups (Células & Pequenos Grupos)
CREATE TABLE IF NOT EXISTS public.cell_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    leader_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    co_leader_name TEXT,
    day_of_week TEXT DEFAULT 'Quarta-feira',
    time TEXT DEFAULT '20:00',
    address TEXT,
    neighborhood TEXT,
    category TEXT DEFAULT 'Famílias',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactions (Dízimos e Ofertas via PIX)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    category TEXT DEFAULT 'DIZIMO' CHECK (category IN ('DIZIMO', 'OFERTA', 'MISSOES', 'CONSTRUCAO')),
    type TEXT DEFAULT 'PIX' CHECK (type IN ('PIX', 'CREDIT')),
    status TEXT DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    pix_code TEXT,
    payer_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Kids Check-ins (Ministério Infantil & Segurança de Retirada)
CREATE TABLE IF NOT EXISTS public.kids_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    child_name TEXT NOT NULL,
    room TEXT NOT NULL,
    guardian_name TEXT NOT NULL,
    guardian_phone TEXT,
    security_code TEXT NOT NULL,
    allergies TEXT,
    status TEXT DEFAULT 'CHECKED_IN' CHECK (status IN ('CHECKED_IN', 'CHECKED_OUT')),
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    checked_out_at TIMESTAMPTZ
);

-- 6. Events (Cultos e Eventos de Celebração)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    location TEXT,
    banner_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Prayer Requests (Pedidos de Oração)
CREATE TABLE IF NOT EXISTS public.prayer_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    author_name TEXT,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) e Políticas de Leitura Pública
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kids_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público anônimo de leitura
CREATE POLICY "Tenants leitura pública" ON public.tenants FOR SELECT USING (true);
CREATE POLICY "Users leitura pública" ON public.users FOR SELECT USING (true);
CREATE POLICY "Cell groups leitura pública" ON public.cell_groups FOR SELECT USING (true);
CREATE POLICY "Events leitura pública" ON public.events FOR SELECT USING (true);
CREATE POLICY "Transactions inserção pública" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Transactions leitura pública" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Kids inserção pública" ON public.kids_checkins FOR INSERT WITH CHECK (true);
CREATE POLICY "Kids leitura pública" ON public.kids_checkins FOR SELECT USING (true);
CREATE POLICY "Prayers inserção pública" ON public.prayer_requests FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- Inserir Dados Iniciais (Seed de Demonstração)
-- ==============================================================================

-- 1. Igreja Matriz Sede
INSERT INTO public.tenants (id, name, slug, primary_color, logo_url, address)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Igreja Matriz Sede',
    'matriz',
    '#dc2626',
    'https://images.unsplash.com/photo-1548625361-16a793441094?auto=format&fit=crop&w=200&q=80',
    'Campus Principal'
) ON CONFLICT (slug) DO NOTHING;

-- 2. Igreja Filial Central (vinculada à Matriz)
INSERT INTO public.tenants (id, name, slug, primary_color, logo_url, address, parent_id)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'Igreja Filial Central',
    'filial',
    '#2563eb',
    'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=200&q=80',
    'Campus Regional',
    'a0000000-0000-0000-0000-000000000001'
) ON CONFLICT (slug) DO NOTHING;

-- 3. Pastores
INSERT INTO public.users (tenant_id, name, email, role)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Pr. Marcos Oliveira', 'marcos@matriz.org', 'PASTOR'),
    ('b0000000-0000-0000-0000-000000000002', 'Pr. André Santos', 'andre@filial.org', 'PASTOR')
ON CONFLICT (email) DO NOTHING;

-- 4. Células Iniciais
INSERT INTO public.cell_groups (tenant_id, name, day_of_week, time, neighborhood, category)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Célula Betel (Jovens)', 'Quarta-feira', '20:00', 'Centro', 'Jovens'),
    ('b0000000-0000-0000-0000-000000000002', 'Célula Esperança (Famílias)', 'Quinta-feira', '19:30', 'Jardim América', 'Famílias');

-- 5. Doações Iniciais para Demonstração
INSERT INTO public.transactions (tenant_id, amount, category, type, status)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 150.00, 'DIZIMO', 'PIX', 'COMPLETED'),
    ('b0000000-0000-0000-0000-000000000002', 80.00, 'OFERTA', 'PIX', 'COMPLETED');
