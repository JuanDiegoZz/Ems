-- Repair only the original seed rows affected by the known UTF-8 mojibake.
-- Prices, categories, active state, ordering and admin-created rows are untouched.

update public.price_catalog
set name = 'Reanimación'
where name = 'ReanimaciÃ³n'
  and category = 'Servicios'
  and price = 1000
  and description = 'Al reanimar completamente al paciente.';

update public.price_catalog
set name = 'Analgésicos'
where name = 'AnalgÃ©sicos'
  and category = 'Productos'
  and price = 500
  and unit = 'c/u'
  and description = 'La ganancia es para ustedes.';

update public.price_catalog
set name = 'Curación'
where name = 'CuraciÃ³n'
  and category = 'Servicios'
  and price = 500
  and description = 'Al curar completamente al paciente.';
