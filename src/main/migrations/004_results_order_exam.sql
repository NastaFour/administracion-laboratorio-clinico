-- Migration 004_results_order_exam
-- WU9: resolve the schema-contract drift between resultados.orden_id (v1,
-- references ordenes.id) and the v2 contract field orden_examen_id (references
-- orden_examenes.id). Additive: the v1 column is kept, the new column is added,
-- and existing rows are backfilled where the mapping is unambiguous.

ALTER TABLE resultados ADD COLUMN orden_examen_id INTEGER REFERENCES orden_examenes(id);
ALTER TABLE resultados ADD COLUMN motivo_rechazo TEXT;

-- Backfill: a result belongs to the order_exam that owns its parameter within
-- the same order. UNIQUE(orden_id, examen_id) guarantees at most one match, so
-- the subquery is deterministic per (orden_id, parametro_id).
UPDATE resultados
SET orden_examen_id = (
    SELECT oe.id
    FROM orden_examenes oe
    JOIN parametros_examen pe ON pe.examen_id = oe.examen_id
    WHERE oe.orden_id = resultados.orden_id
      AND pe.id = resultados.parametro_id
    LIMIT 1
)
WHERE orden_examen_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_resultados_orden_examen_id ON resultados(orden_examen_id);
