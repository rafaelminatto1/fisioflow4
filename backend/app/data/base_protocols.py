"""
Protocolos clínicos base com evidência científica
"""

from ..models.clinical_protocols import EvidenceLevel

BASE_PROTOCOLS = [
    {
        "title": "Protocolo de Fisioterapia para Lombalgia Mecânica Aguda",
        "description": "Protocolo baseado em evidência para tratamento de lombalgia mecânica aguda não específica em adultos, seguindo diretrizes internacionais da NICE e American Physical Therapy Association.",
        "pathology": "Lombalgia Mecânica Aguda",
        "icd10_codes": ["M54.5", "M54.9"],
        "body_region": "coluna_lombar",
        "specialization_area": "ortopedia",
        "evidence_level": EvidenceLevel.NIVEL_1A,
        "grade_recommendation": "A",
        "references": [
            {
                "title": "Low back pain and sciatica in over 16s: assessment and management",
                "authors": "NICE Guideline",
                "journal": "NICE",
                "year": 2020,
                "doi": "10.1016/j.spinee.2018.05.012"
            },
            {
                "title": "Clinical Practice Guidelines Linked to the International Classification of Functioning, Disability and Health from the Academy of Orthopaedic Physical Therapy of the American Physical Therapy Association",
                "authors": "Delitto A, et al.",
                "journal": "J Orthop Sports Phys Ther",
                "year": 2012,
                "doi": "10.2519/jospt.2012.42.4.A1"
            }
        ],
        "indications": [
            "Dor lombar mecânica aguda (<6 semanas)",
            "Ausência de bandeiras vermelhas",
            "Idade entre 18-65 anos",
            "Capacidade de deambulação preservada"
        ],
        "contraindications": [
            "Síndrome da cauda equina",
            "Fraturas vertebrais",
            "Infecções vertebrais",
            "Neoplasias vertebrais",
            "Espondiloartropatias inflamatórias agudas"
        ],
        "precautions": [
            "Deficit neurológico progressivo",
            "Dor radicular intensa",
            "Instabilidade vertebral",
            "Histórico de cirurgia lombar recente"
        ],
        "phases": [
            {
                "name": "Fase Aguda",
                "duration": "0-72 horas",
                "objectives": [
                    "Controle da dor",
                    "Redução do espasmo muscular",
                    "Manutenção da função",
                    "Educação sobre autocuidado"
                ],
                "interventions": [
                    {
                        "name": "Educação sobre lombalgia",
                        "dosage": "Sessão única de 20-30 minutos",
                        "description": "Explicação sobre natureza benigna da lombalgia, importância da atividade"
                    },
                    {
                        "name": "Termoterapia",
                        "dosage": "15-20 minutos, 2-3x/dia",
                        "description": "Calor superficial para alívio da dor e relaxamento muscular"
                    },
                    {
                        "name": "Mobilização ativa gentil",
                        "dosage": "10-15 repetições, 3x/dia",
                        "description": "Movimentos suaves de flexão, extensão e inclinações laterais"
                    }
                ],
                "progression_criteria": [
                    "Redução da dor > 30%",
                    "Melhora da mobilidade lombar",
                    "Capacidade de caminhar > 10 minutos"
                ]
            },
            {
                "name": "Fase Subaguda",
                "duration": "3 dias - 6 semanas",
                "objectives": [
                    "Restauração da amplitude de movimento",
                    "Fortalecimento da musculatura estabilizadora",
                    "Retorno às atividades funcionais",
                    "Prevenção de recidivas"
                ],
                "interventions": [
                    {
                        "name": "Exercícios de mobilidade",
                        "dosage": "2-3 séries, 10-15 repetições, 2x/dia",
                        "description": "Flexão/extensão lombar, rotações e inclinações laterais"
                    },
                    {
                        "name": "Fortalecimento do core",
                        "dosage": "3 séries, 10-30 segundos hold, 1x/dia",
                        "description": "Ativação do transverso do abdome, multífidos, diafragma"
                    },
                    {
                        "name": "Exercícios funcionais",
                        "dosage": "2-3 séries, 8-12 repetições, 3x/semana",
                        "description": "Agachamento, ponte, dead lift modificado"
                    },
                    {
                        "name": "Caminhada",
                        "dosage": "20-30 minutos, intensidade moderada, diário",
                        "description": "Exercício aeróbico de baixo impacto"
                    }
                ],
                "progression_criteria": [
                    "ADM lombar > 80% do normal",
                    "Força muscular grau 4/5",
                    "Capacidade funcional > 80%"
                ]
            },
            {
                "name": "Fase de Manutenção",
                "duration": "6+ semanas",
                "objectives": [
                    "Manutenção dos ganhos obtidos",
                    "Prevenção de recidivas",
                    "Retorno completo às atividades",
                    "Autogerenciamento da condição"
                ],
                "interventions": [
                    {
                        "name": "Programa de exercícios domiciliares",
                        "dosage": "30-45 minutos, 3-4x/semana",
                        "description": "Combinação de mobilidade, fortalecimento e condicionamento"
                    },
                    {
                        "name": "Atividade física regular",
                        "dosage": "150 minutos/semana intensidade moderada",
                        "description": "Exercícios aeróbicos e de fortalecimento"
                    },
                    {
                        "name": "Ergonomia e postura",
                        "dosage": "Orientações contínuas",
                        "description": "Modificações no ambiente de trabalho e atividades diárias"
                    }
                ],
                "progression_criteria": [
                    "Ausência de dor",
                    "Retorno ao trabalho/atividades esportivas",
                    "Autogerenciamento eficaz"
                ]
            }
        ],
        "assessment_tools": [
            {
                "name": "Escala Visual Analógica",
                "abbreviation": "EVA",
                "description": "Avaliação da intensidade da dor",
                "frequency": "diária na fase aguda, semanal depois"
            },
            {
                "name": "Oswestry Disability Index",
                "abbreviation": "ODI",
                "description": "Avaliação funcional específica para lombalgia",
                "frequency": "semanal"
            },
            {
                "name": "Fear-Avoidance Beliefs Questionnaire",
                "abbreviation": "FABQ",
                "description": "Avaliação de crenças e medos relacionados ao movimento",
                "frequency": "inicial e final"
            }
        ],
        "outcome_measures": [
            {
                "measure": "Redução da dor",
                "target": "> 50% na EVA",
                "timeframe": "4 semanas"
            },
            {
                "measure": "Melhora funcional",
                "target": "> 30% no ODI",
                "timeframe": "6 semanas"
            },
            {
                "measure": "Retorno ao trabalho",
                "target": "90% dos pacientes",
                "timeframe": "8 semanas"
            }
        ],
        "frequency_recommendations": {
            "sessions_per_week": "2-3",
            "session_duration": "45-60 minutos",
            "total_duration": "4-8 semanas",
            "follow_up": "3 e 6 meses"
        },
        "inclusion_criteria": [
            "Idade entre 18-65 anos",
            "Dor lombar mecânica < 6 semanas",
            "Capacidade de compreender instruções",
            "Disponibilidade para seguir o programa"
        ],
        "exclusion_criteria": [
            "Bandeiras vermelhas presentes",
            "Cirurgia lombar nos últimos 6 meses",
            "Gravidez",
            "Incapacidade física ou cognitiva significativa"
        ],
        "population_modifications": {
            "idosos": {
                "modifications": ["Progressão mais lenta", "Atenção especial ao equilíbrio"],
                "precautions": ["Risco de fraturas", "Comorbidades associadas"]
            },
            "atletas": {
                "modifications": ["Progressão acelerada", "Exercícios esporte-específicos"],
                "considerations": ["Retorno ao esporte gradual", "Prevenção de recidivas"]
            }
        }
    },
    {
        "title": "Protocolo de Reabilitação para Síndrome do Impacto do Ombro",
        "description": "Protocolo baseado em evidência para tratamento conservador da síndrome do impacto subacromial, incluindo bursite e tendinopatia do manguito rotador.",
        "pathology": "Síndrome do Impacto do Ombro",
        "icd10_codes": ["M75.4", "M75.3"],
        "body_region": "ombro",
        "specialization_area": "ortopedia",
        "evidence_level": EvidenceLevel.NIVEL_1A,
        "grade_recommendation": "A",
        "references": [
            {
                "title": "Exercise therapy for chronic low back pain",
                "authors": "Hayden JA, et al.",
                "journal": "Cochrane Database Syst Rev",
                "year": 2021,
                "doi": "10.1002/14651858.CD009790.pub2"
            }
        ],
        "indications": [
            "Dor no ombro com padrão de impacto",
            "Testes de impacto positivos",
            "Sintomas < 6 meses",
            "Falha no tratamento conservador inicial"
        ],
        "contraindications": [
            "Ruptura completa do manguito rotador",
            "Luxação aguda do ombro",
            "Fraturas do úmero proximal",
            "Infecções articulares"
        ],
        "precautions": [
            "Ruptura parcial do manguito rotador",
            "Instabilidade glenoumeral",
            "Calcificações tendíneas extensas"
        ],
        "phases": [
            {
                "name": "Fase de Proteção",
                "duration": "0-2 semanas",
                "objectives": [
                    "Redução da dor e inflamação",
                    "Proteção dos tecidos lesados",
                    "Manutenção da ADM passiva",
                    "Educação do paciente"
                ],
                "interventions": [
                    {
                        "name": "Repouso relativo",
                        "dosage": "Evitar movimentos acima de 90°",
                        "description": "Modificação das atividades para reduzir irritação"
                    },
                    {
                        "name": "Mobilização passiva",
                        "dosage": "2-3 séries, 10 repetições, 2x/dia",
                        "description": "ADM passiva em todos os planos, respeitando dor"
                    },
                    {
                        "name": "Exercícios pendulares",
                        "dosage": "5-10 minutos, 3x/dia",
                        "description": "Movimentos pendulares suaves para relaxamento"
                    }
                ],
                "progression_criteria": [
                    "Redução da dor > 30%",
                    "ADM passiva > 120° flexão",
                    "Ausência de dor noturna"
                ]
            }
        ],
        "assessment_tools": [
            {
                "name": "Disabilities of Arm, Shoulder and Hand",
                "abbreviation": "DASH",
                "description": "Avaliação funcional do membro superior",
                "frequency": "semanal"
            }
        ],
        "outcome_measures": [
            {
                "measure": "Melhora da função",
                "target": "> 15 pontos no DASH",
                "timeframe": "6 semanas"
            }
        ],
        "frequency_recommendations": {
            "sessions_per_week": "2-3",
            "session_duration": "45 minutos",
            "total_duration": "6-12 semanas"
        },
        "inclusion_criteria": [
            "Diagnóstico clínico de impacto subacromial",
            "Sintomas persistentes > 6 semanas"
        ],
        "exclusion_criteria": [
            "Ruptura completa do manguito rotador",
            "Instabilidade glenoumeral severa"
        ]
    }
]

# Função para inserir protocolos base
def insert_base_protocols(db, user_id):
    """Insere protocolos base no banco de dados"""
    from ..models.clinical_protocols import ClinicalProtocol, ProtocolStatus
    
    inserted_protocols = []
    
    for protocol_data in BASE_PROTOCOLS:
        # Verificar se protocolo já existe
        existing = ClinicalProtocol.query.filter_by(
            title=protocol_data['title']
        ).first()
        
        if existing:
            continue
        
        # Criar novo protocolo
        protocol = ClinicalProtocol(
            title=protocol_data['title'],
            description=protocol_data['description'],
            pathology=protocol_data['pathology'],
            icd10_codes=protocol_data['icd10_codes'],
            body_region=protocol_data['body_region'],
            specialization_area=protocol_data['specialization_area'],
            evidence_level=protocol_data['evidence_level'],
            grade_recommendation=protocol_data['grade_recommendation'],
            references=protocol_data['references'],
            indications=protocol_data['indications'],
            contraindications=protocol_data['contraindications'],
            precautions=protocol_data['precautions'],
            phases=protocol_data['phases'],
            assessment_tools=protocol_data['assessment_tools'],
            outcome_measures=protocol_data['outcome_measures'],
            frequency_recommendations=protocol_data['frequency_recommendations'],
            inclusion_criteria=protocol_data['inclusion_criteria'],
            exclusion_criteria=protocol_data['exclusion_criteria'],
            population_modifications=protocol_data.get('population_modifications', {}),
            status=ProtocolStatus.ACTIVE,
            version="1.0",
            created_by=user_id
        )
        
        db.session.add(protocol)
        inserted_protocols.append(protocol)
    
    db.session.commit()
    return inserted_protocols