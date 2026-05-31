-- Seed initial des données de référence pour Projecter
-- Issu de l'analyse des 3 documents exemples WBE/ETNIC

-- ========================================================================
-- Organisations
-- ========================================================================
INSERT INTO organisations (code, nom, type) VALUES
    ('ETNIC', 'Entreprise publique des Technologies Numériques de l''Information et de la Communication', 'etnic'),
    ('WBE',   'Wallonie-Bruxelles Enseignement', 'beneficiaire'),
    ('MFWB',  'Ministère de la Fédération Wallonie-Bruxelles', 'beneficiaire'),
    ('NSI',   'NSI (prestataire Horizon)', 'prestataire')
ON CONFLICT (code) DO NOTHING;

-- ========================================================================
-- Centres de Compétences ETNIC
-- ========================================================================
INSERT INTO centres_competences (code, libelle, departement) VALUES
    ('CC_SOL_ACQ',     'CC Solutions Acquises',     'DG IT'),
    ('CC_SERVEURS',    'CC Serveurs',               'DG IT'),
    ('CC_SECURITE',    'CC Sécurité',               'DG IT'),
    ('CC_MIDDLEWARE',  'CC Middleware',             'DG IT'),
    ('CC_TELECOM',     'CC Telecom',                'DG IT'),
    ('CC_TEL_SERV',    'CC Telecom & Serveurs',     'DG IT'),
    ('CC_PS_PROJETS',  'CC P&S Projets',            'DG IT'),
    ('CC_POSTES',      'CC Postes de travail',      'DG IT'),
    ('CC_SERVICEDESK', 'CC Service Desk',           'DG IT'),
    ('CC_ITIL',        'CC Itil & Monitoring',      'DG IT'),
    ('CC_FACILITY',    'CC Facility Management',    'DG IT'),
    ('DEP_INFRA',      'Département Infrastructure', 'DG IT'),
    ('DG_IT',          'Direction Générale IT',     'DG IT')
ON CONFLICT (code) DO NOTHING;

-- ========================================================================
-- Profils types
-- ========================================================================
INSERT INTO profils (libelle) VALUES
    ('Sponsor'),
    ('Chef de projet'),
    ('Portfolio Manager'),
    ('Gestionnaire de portefeuille'),
    ('Demandeur'),
    ('Analyste'),
    ('Analyste-développeur'),
    ('Team Leader'),
    ('Manager'),
    ('Expert'),
    ('Architecte'),
    ('Chargé de mission'),
    ('Administrateur Général'),
    ('Ministre')
ON CONFLICT (libelle) DO NOTHING;

-- ========================================================================
-- Contacts récurrents (extraits des 3 docs exemples)
-- ========================================================================
WITH org AS (SELECT id, code FROM organisations)
INSERT INTO contacts (nom, prenom, organisation_id, fonction) VALUES
    ('LESNE',          'Philippe',         (SELECT id FROM org WHERE code='WBE'),   'Sponsor WBE'),
    ('STRUGARECK',     'Tony',             (SELECT id FROM org WHERE code='WBE'),   'Chef de projet métier'),
    ('DEVOOGHT',       'Jean-Pierre',      (SELECT id FROM org WHERE code='WBE'),   'Chef de projet métier'),
    ('FERNANDEZ',      'Hélène',           (SELECT id FROM org WHERE code='WBE'),   'Chef de projet'),
    ('DELAUNOIS',      'Céline',           (SELECT id FROM org WHERE code='WBE'),   'Chef de projet'),
    ('DOYEN',          'Olivier',          (SELECT id FROM org WHERE code='WBE'),   'Administrateur Général a.i.'),
    ('VAN DEN DURPEL', 'Laurent',          (SELECT id FROM org WHERE code='ETNIC'), 'Chef de projet ETNIC'),
    ('ETEKI',          'Pierre-Giscard',   (SELECT id FROM org WHERE code='ETNIC'), 'Portfolio Manager'),
    ('JEBNOUN',        'Philippe',         (SELECT id FROM org WHERE code='ETNIC'), 'Portfolio Manager'),
    ('PONSELET',       'André',            (SELECT id FROM org WHERE code='ETNIC'), 'Sponsor ETNIC'),
    ('PIRENNE',        'Yvan',             (SELECT id FROM org WHERE code='ETNIC'), 'Administrateur Général'),
    ('GALANT',         'Jacqueline',       NULL,                                    'Ministre des Sports, de la Fonction publique, de la Simplification administrative et des Médias')
ON CONFLICT DO NOTHING;

-- ========================================================================
-- Marchés publics référencés
-- ========================================================================
INSERT INTO marches_publics (reference, libelle, type) VALUES
    ('2023/2216', 'Licences Alfresco GED', 'Licences')
ON CONFLICT (reference) DO NOTHING;
