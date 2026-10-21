-- Allow the extra material kinds the browser extractor now produces.
ALTER TABLE public.study_materials DROP CONSTRAINT study_materials_kind_check;
ALTER TABLE public.study_materials ADD CONSTRAINT study_materials_kind_check
  CHECK (kind IN ('pdf','docx','pptx','text','paste','epub','html','xlsx','odf'));
