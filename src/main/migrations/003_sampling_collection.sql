-- Migration 003_sampling_collection
-- WU8: add optional collection timestamp to muestras for sample registration.
-- This is an additive, backward-compatible change.

ALTER TABLE muestras ADD COLUMN recoleccion_en TIMESTAMP;
