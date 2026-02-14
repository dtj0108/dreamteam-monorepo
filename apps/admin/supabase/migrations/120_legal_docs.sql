-- 120_legal_docs.sql
-- Store metadata for publicly hosted legal PDF documents.

CREATE TABLE IF NOT EXISTS public.legal_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL CHECK (
    doc_type IN (
      'privacy-policy',
      'terms-of-service',
      'cookie-policy',
      'data-processing-addendum'
    )
  ),
  display_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'legal-docs',
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL UNIQUE,
  file_size_bytes BIGINT,
  content_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_docs_doc_type_created
  ON public.legal_docs (doc_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_docs_active_created
  ON public.legal_docs (created_at DESC)
  WHERE is_active = true;

ALTER TABLE public.legal_docs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'legal_docs'
      AND policyname = 'Superadmins can view legal docs'
  ) THEN
    CREATE POLICY "Superadmins can view legal docs"
      ON public.legal_docs
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND is_superadmin = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'legal_docs'
      AND policyname = 'Superadmins can manage legal docs'
  ) THEN
    CREATE POLICY "Superadmins can manage legal docs"
      ON public.legal_docs
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND is_superadmin = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND is_superadmin = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'update_legal_docs_updated_at'
    ) THEN
      CREATE TRIGGER update_legal_docs_updated_at
      BEFORE UPDATE ON public.legal_docs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;
