'use strict';
/**
 * costraTemplate.js — SOURCE DE VÉRITÉ unique du mapping Excel ↔ DB Projecter
 *
 * Si le template évolue (cellule déplacée, nouveau champ, nouvelle feuille),
 * modifier UNIQUEMENT ce fichier. Le service et le controller n'en ont pas
 * connaissance — ils consomment uniquement les fonctions exportées.
 *
 * Structure de chaque entrée de cellule :
 *   cell     : référence Excel (ex: 'D9')
 *   source   : 'project' | 'member' | 'attribute' | 'risk' | 'date' | 'static'
 *   field    : chemin dans la source (point-notation pour attributes JSONB)
 *   role     : (members) valeur de project_role à filtrer
 *   multi    : (lists) index 0-based pour les arrays
 *   format   : (dates) 'day' | 'month' | 'year' | 'full'
 *
 * @module costraTemplate
 * @version 1.0.0
 */

// ── Fichier template ──────────────────────────────────────────────────────────
const TEMPLATE_FILENAME = 'NomDuProjet - Fiches Costra - v00.xlsm';
const OUTPUT_DIR_KEY    = 'costra_fiches';
const OUTPUT_EXTENSION  = '.xlsm'; // template copié et injecté — macros + mise en forme préservées

// ── Feuilles ──────────────────────────────────────────────────────────────────
const SHEETS = {
  ID_INTERVENANTS:   '1. ID_et_Intervenants',
  ELEMENTS_CLES:     '2. Elements_cles',
  SCENARIOS:         '3. Scenarios_et_BusCase',
  DATES_IMPACTS:     '4. Dates & Impacts',
};

// ── Mapping cellules ──────────────────────────────────────────────────────────
//
// Les placeholders ("Txt", "#", descriptions explicatives) présents dans le
// template sont écrasés. La cellule de saisie est toujours la première cellule
// non-label de la ligne (généralement col C ou D d'après analyse du template).
//
const CELL_MAPPING = {

  // ═══════════════════════════════════════════════════════════════════════════
  // Feuille 1 — Identification & Intervenants
  // ═══════════════════════════════════════════════════════════════════════════
  [SHEETS.ID_INTERVENANTS]: [
    // Identification
    { cell: 'D8',  source: 'project',   field: 'code'                     },  // Numéro projet
    { cell: 'D9',  source: 'project',   field: 'title'                    },  // Nom projet
    { cell: 'D12', source: 'attribute', field: 'sub_project_number'        },  // N° sous-projet
    { cell: 'D13', source: 'attribute', field: 'sub_project_name'          },  // Nom sous-projet
    // Bénéficiaire métier
    { cell: 'D16', source: 'project',   field: 'portfolio'                 },  // Portefeuille
    // Intervenants ETNIC (B=label, C=type-indicateur, D=valeur)
    { cell: 'D20', source: 'member',    role: 'etnic_portfolio_manager'    },  // Portfolio Manager
    // D21 = Product Manager (pas de rôle exact en DB — non mappé)
    { cell: 'D22', source: 'member',    role: 'etnic_project_manager'      },  // Chef de Projet ETNIC
    // Intervenants Métier
    { cell: 'D25', source: 'member',    role: 'sponsor_wbe'                },  // Sponsor métier
    { cell: 'D26', source: 'member',    role: 'wbe_portfolio_manager'      },  // Product Owner métier
    { cell: 'D27', source: 'member',    role: 'business_project_manager'   },  // Chef de Projet métier
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // Feuille 2 — Éléments clés
  // ═══════════════════════════════════════════════════════════════════════════
  [SHEETS.ELEMENTS_CLES]: [
    // 1. Pourquoi
    { cell: 'C9',  source: 'attribute', field: 'context'               },  // 1.1 Contexte / burning platform
    { cell: 'C16', source: 'attribute', field: 'expected_results'      },  // 1.2 Résultats / changements attendus
    { cell: 'C31', source: 'attribute', field: 'benefits'              },  // 1.3 Bénéfices SMART

    // 2. Quoi (scope fonctionnel)
    { cell: 'C43', source: 'attribute', field: 'scope_description'     },  // Description domaines fonctionnels

    // 3. Qui — bénéficiaires
    { cell: 'C59', source: 'attribute', field: 'direct_beneficiaries'  },  // 3.1 Bénéficiaires directs
    { cell: 'C64', source: 'attribute', field: 'indirect_beneficiaries'},  // 3.2 Bénéficiaires indirects

    // 4. Temporalité
    { cell: 'C70', source: 'attribute', field: 'time_constraints'      },  // 4.1 Contraintes de temps
    { cell: 'C75', source: 'date',      field: 'desired_end_date', format: 'day'   },  // Jour
    { cell: 'E75', source: 'date',      field: 'desired_end_date', format: 'month' },  // Mois
    { cell: 'G75', source: 'date',      field: 'desired_end_date', format: 'year'  },  // Année

    // 5. Risques — dépendances (lignes 79-83, 5 max)
    { cell: 'C79', source: 'risk',      riskType: 'dependency', multi: 0 },
    { cell: 'C80', source: 'risk',      riskType: 'dependency', multi: 1 },
    { cell: 'C81', source: 'risk',      riskType: 'dependency', multi: 2 },
    { cell: 'C82', source: 'risk',      riskType: 'dependency', multi: 3 },
    { cell: 'C83', source: 'risk',      riskType: 'dependency', multi: 4 },
    // mitigation dépendances (C85:M86 fusionné — cellule de saisie C85)
    { cell: 'C85', source: 'attribute', field: 'dependency_mitigation'  },

    // 5.2 Obstacles (lignes 89-93, 5 max)
    { cell: 'C89', source: 'risk',      riskType: 'obstacle',   multi: 0 },
    { cell: 'C90', source: 'risk',      riskType: 'obstacle',   multi: 1 },
    { cell: 'C91', source: 'risk',      riskType: 'obstacle',   multi: 2 },
    { cell: 'C92', source: 'risk',      riskType: 'obstacle',   multi: 3 },
    { cell: 'C93', source: 'risk',      riskType: 'obstacle',   multi: 4 },
    // mitigation obstacles (C94:M95 fusionné — cellule de saisie C94)
    { cell: 'C94', source: 'attribute', field: 'obstacle_mitigation'    },

    // 5.3 Non-exécution (C98:M102 fusionné)
    { cell: 'C98', source: 'attribute', field: 'non_execution_risk'     },
    // mitigation non-exécution (C103:M104 fusionné — cellule de saisie C103)
    { cell: 'C103', source: 'attribute', field: 'non_execution_mitigation' },

    // 6. Budget T-shirt (label "6. Budget (T-shirt Sizing)" en B106 ;
    //    zone de saisie = cellule fusionnée C108:D108 → on écrit dans C108)
    { cell: 'C108', source: 'attribute', field: 'budget_tshirt'         },

    // 7. Scope — In : C112-C115 = labels "Élement X :", D112-D115 = zones de saisie
    { cell: 'D112', source: 'attribute', field: 'scope_in', multi: 0   },
    { cell: 'D113', source: 'attribute', field: 'scope_in', multi: 1   },
    { cell: 'D114', source: 'attribute', field: 'scope_in', multi: 2   },
    { cell: 'D115', source: 'attribute', field: 'scope_in', multi: 3   },

    // 7.2 Scope — Out : C126-C129 = labels, D126-D129 = zones de saisie
    { cell: 'D126', source: 'attribute', field: 'scope_out', multi: 0  },
    { cell: 'D127', source: 'attribute', field: 'scope_out', multi: 1  },
    { cell: 'D128', source: 'attribute', field: 'scope_out', multi: 2  },
    { cell: 'D129', source: 'attribute', field: 'scope_out', multi: 3  },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // Feuille 3 — Scénarios & Business Case
  // Scénario 1 : lignes 7-30  |  Scénario 2 : lignes 32-55
  // ═══════════════════════════════════════════════════════════════════════════
  [SHEETS.SCENARIOS]: [
    // Scénario 1
    { cell: 'D8',  source: 'scenario', scenarioIdx: 0, field: 'type'        },  // Type
    { cell: 'L8',  source: 'scenario', scenarioIdx: 0, field: 'status'      },  // Statut
    { cell: 'C9',  source: 'scenario', scenarioIdx: 0, field: 'description' },  // Description

    // Trajectoire budgétaire Scénario 1 — Projets
    // Colonnes : CE/CL par année : 2026(D/E) 2027(F/G) 2028(H/I) 2029(J/K) 2030(L/M)
    { cell: 'D21', source: 'scenario', scenarioIdx: 0, budgetType: 'project', costType: 'internal',    year: 2026, period: 'CE' },
    { cell: 'E21', source: 'scenario', scenarioIdx: 0, budgetType: 'project', costType: 'internal',    year: 2026, period: 'CL' },
    { cell: 'F21', source: 'scenario', scenarioIdx: 0, budgetType: 'project', costType: 'internal',    year: 2027, period: 'CE' },
    { cell: 'G21', source: 'scenario', scenarioIdx: 0, budgetType: 'project', costType: 'internal',    year: 2027, period: 'CL' },
    { cell: 'D22', source: 'scenario', scenarioIdx: 0, budgetType: 'project', costType: 'external',    year: 2026, period: 'CE' },
    { cell: 'E22', source: 'scenario', scenarioIdx: 0, budgetType: 'project', costType: 'external',    year: 2026, period: 'CL' },
    { cell: 'F22', source: 'scenario', scenarioIdx: 0, budgetType: 'project', costType: 'external',    year: 2027, period: 'CE' },
    { cell: 'G22', source: 'scenario', scenarioIdx: 0, budgetType: 'project', costType: 'external',    year: 2027, period: 'CL' },

    // Scénario 2
    { cell: 'D33', source: 'scenario', scenarioIdx: 1, field: 'type'        },
    { cell: 'L33', source: 'scenario', scenarioIdx: 1, field: 'status'      },
    { cell: 'C34', source: 'scenario', scenarioIdx: 1, field: 'description' },

    // Remarques générales
    { cell: 'C57', source: 'attribute', field: 'scenario_remarks'           },
  ],

  // ═══════════════════════════════════════════════════════════════════════════
  // Feuille 4 — Dates & Impacts
  // ═══════════════════════════════════════════════════════════════════════════
  [SHEETS.DATES_IMPACTS]: [
    { cell: 'C9',  source: 'attribute', field: 'project_impacts'           },  // Impacts sur autres projets
    // Dates scénario 1 (proposed)
    { cell: 'D19', source: 'date',      field: 'proposed_start_date', format: 'full' },
    { cell: 'D22', source: 'date',      field: 'proposed_end_date',   format: 'full' },
    // Dates scénario 2
    { cell: 'D28', source: 'scenario',  scenarioIdx: 1, field: 'start_date' },
    { cell: 'D31', source: 'scenario',  scenarioIdx: 1, field: 'end_date'   },
  ],
};

// ── Champs attributes JSONB gérés par ce module ───────────────────────────────
// Utilisé par le controller pour valider / documenter les champs acceptés en
// entrée (PUT/PATCH /api/projects/:id/costra-attributes).
const ATTRIBUTE_FIELDS = [
  'sub_project_number',     // string
  'sub_project_name',       // string
  'objectives',             // text long — commun aux 3 templates
  'stakes',                 // text long — commun à Exposé et Fiche Projet
  'context',                // text long
  'expected_results',       // text long
  'benefits',               // text long
  'scope_description',      // text long
  'direct_beneficiaries',   // text long
  'indirect_beneficiaries', // text long
  'time_constraints',       // text long
  'dependency_mitigation',  // text long
  'obstacle_mitigation',    // text long
  'non_execution_risk',     // text long
  'non_execution_mitigation', // text long
  'budget_tshirt',          // string : 'XS' | 'S' | 'M' | 'L' | 'XL'
  'scope_in',               // string[] (max 4)
  'scope_out',              // string[] (max 4)
  'scenarios',              // object[] { type, status, description, budget, start_date, end_date }
  'scenario_remarks',       // text long
  'project_impacts',        // text long
];

module.exports = {
  TEMPLATE_FILENAME,
  OUTPUT_DIR_KEY,
  OUTPUT_EXTENSION,
  SHEETS,
  CELL_MAPPING,
  ATTRIBUTE_FIELDS,
};
