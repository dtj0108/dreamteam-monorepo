-- 121_legal_docs_single_active_per_type.sql
-- Enforce one active legal doc record per doc_type.

WITH ranked AS (
  SELECT
    id,
    doc_type,
    ROW_NUMBER() OVER (
      PARTITION BY doc_type
      ORDER BY created_at DESC, id DESC
    ) AS row_num
  FROM public.legal_docs
  WHERE is_active = true
)
UPDATE public.legal_docs AS docs
SET is_active = false
FROM ranked
WHERE docs.id = ranked.id
  AND ranked.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_docs_single_active_doc_type
  ON public.legal_docs (doc_type)
  WHERE is_active = true;
