CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  nome TEXT NOT NULL,
  arquivado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens TO authenticated;
GRANT ALL ON public.itens TO service_role;
ALTER TABLE public.itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own itens" ON public.itens FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX itens_user_idx ON public.itens (user_id);

CREATE TABLE public.subitens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.itens ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor NUMERIC,
  arquivado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subitens TO authenticated;
GRANT ALL ON public.subitens TO service_role;
ALTER TABLE public.subitens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subitens" ON public.subitens FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX subitens_user_idx ON public.subitens (user_id);

CREATE TABLE public.producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  data DATE NOT NULL,
  item_id UUID NOT NULL REFERENCES public.itens ON DELETE CASCADE,
  subitem_id UUID NOT NULL REFERENCES public.subitens ON DELETE CASCADE,
  item_nome TEXT NOT NULL DEFAULT '',
  subitem_nome TEXT NOT NULL DEFAULT '',
  quantidade INTEGER NOT NULL DEFAULT 0,
  valor_unit NUMERIC,
  observacao TEXT,
  foto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producao TO authenticated;
GRANT ALL ON public.producao TO service_role;
ALTER TABLE public.producao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own producao" ON public.producao FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX producao_user_data_idx ON public.producao (user_id, data);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nome', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();