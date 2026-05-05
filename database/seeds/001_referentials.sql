-- Seed 001: Reference data (English schema)
-- ============================================================

-- Organizations
INSERT INTO organizations (code, name, type) VALUES
    ('ETNIC', 'Entreprise publique des Technologies Numériques de l''Information et de la Communication', 'etnic'),
    ('WBE',   'Wallonie-Bruxelles Enseignement', 'client'),
    ('MFWB',  'Ministère de la Fédération Wallonie-Bruxelles', 'client'),
    ('NSI',   'NSI (Horizon vendor)', 'vendor')
ON CONFLICT (code) DO NOTHING;

-- HR roles / profiles
INSERT INTO roles (label) VALUES
    ('Sponsor'),
    ('Project Manager'),
    ('Portfolio Manager'),
    ('Portfolio Steward'),
    ('Requester'),
    ('Analyst'),
    ('Analyst-Developer'),
    ('Team Leader'),
    ('Manager'),
    ('Expert'),
    ('Architect'),
    ('Mission Officer'),
    ('Director General'),
    ('Minister')
ON CONFLICT (label) DO NOTHING;

-- Recurring contacts seen across the 3 sample documents
WITH org AS (SELECT id, code FROM organizations)
INSERT INTO contacts (last_name, first_name, organization_id, job_title) VALUES
    ('LESNE',          'Philippe',         (SELECT id FROM org WHERE code='WBE'),   'WBE Sponsor'),
    ('STRUGARECK',     'Tony',             (SELECT id FROM org WHERE code='WBE'),   'Business Project Manager'),
    ('DEVOOGHT',       'Jean-Pierre',      (SELECT id FROM org WHERE code='WBE'),   'Business Project Manager'),
    ('FERNANDEZ',      'Hélène',           (SELECT id FROM org WHERE code='WBE'),   'Project Manager'),
    ('DELAUNOIS',      'Céline',           (SELECT id FROM org WHERE code='WBE'),   'Project Manager'),
    ('DOYEN',          'Olivier',          (SELECT id FROM org WHERE code='WBE'),   'Acting Director General'),
    ('VAN DEN DURPEL', 'Laurent',          (SELECT id FROM org WHERE code='ETNIC'), 'ETNIC Project Manager'),
    ('ETEKI',          'Pierre-Giscard',   (SELECT id FROM org WHERE code='ETNIC'), 'Portfolio Manager'),
    ('JEBNOUN',        'Philippe',         (SELECT id FROM org WHERE code='ETNIC'), 'Portfolio Manager'),
    ('PONSELET',       'André',            (SELECT id FROM org WHERE code='ETNIC'), 'ETNIC Sponsor'),
    ('PIRENNE',        'Yvan',             (SELECT id FROM org WHERE code='ETNIC'), 'Director General'),
    ('GALANT',         'Jacqueline',       NULL,                                    'Minister of Sports, Public Service, Administrative Simplification and Media')
ON CONFLICT DO NOTHING;

-- Public procurements
INSERT INTO public_procurements (reference, label, type) VALUES
    ('2023/2216', 'Alfresco GED licenses', 'Licenses')
ON CONFLICT (reference) DO NOTHING;
