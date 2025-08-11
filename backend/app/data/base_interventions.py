"""
Templates de intervenção base para protocolos clínicos
"""

from ..models.clinical_protocols import InterventionType, EvidenceLevel

BASE_INTERVENTIONS = [
    {
        "name": "Fortalecimento do Core - Ativação do Transverso do Abdome",
        "intervention_type": InterventionType.EXERCISE,
        "category": "fortalecimento",
        "description": "Exercício de ativação específica do músculo transverso do abdome para estabilização lombar.",
        "detailed_instructions": """
1. Posição: Decúbito dorsal com joelhos flexionados a 90°
2. Respiração: Inspirar normalmente, na expiração contrair suavemente o abdome
3. Comando: "Puxe o umbigo em direção à coluna, como se fosse apertar um cinto"
4. Manter contração por 10 segundos mantendo respiração normal
5. Relaxar completamente por 10 segundos
6. Progressão: Aumentar tempo de sustentação até 30 segundos
""",
        "equipment_needed": ["colchonete"],
        "default_dosage": {
            "sets": "3",
            "repetitions": "10",
            "hold_time": "10-30 segundos",
            "rest": "10 segundos entre repetições",
            "frequency": "2-3x/dia",
            "intensity": "submáxima"
        },
        "progression_criteria": [
            "Capacidade de manter contração por 30 segundos",
            "Coordenação respiração-contração adequada",
            "Ausência de compensações (Valsalva, contração glúteos)"
        ],
        "progression_modifications": [
            {
                "level": "iniciante",
                "modifications": {
                    "hold_time": "5-10 segundos",
                    "sets": "2",
                    "description": "Foco na qualidade do movimento"
                }
            },
            {
                "level": "intermediario",
                "modifications": {
                    "hold_time": "15-20 segundos",
                    "sets": "3",
                    "description": "Adicionar movimentos dos membros"
                }
            },
            {
                "level": "avancado",
                "modifications": {
                    "hold_time": "30 segundos",
                    "sets": "4",
                    "description": "Exercício em posições desafiadoras"
                }
            }
        ],
        "contraindications": [
            "Diástase de reto abdominal severa",
            "Hérnia abdominal não tratada",
            "Gravidez avançada"
        ],
        "precautions": [
            "Evitar manobra de Valsalva",
            "Não contrair glúteos ou adutores",
            "Respeitar dor lombar"
        ],
        "red_flags": [
            "Aumento da dor lombar durante exercício",
            "Cefaleia durante exercício",
            "Incontinência urinária"
        ],
        "evidence_references": [
            {
                "title": "The effectiveness of transversus abdominis training in reducing low back pain: a systematic review",
                "authors": "Richardson C, Jull G",
                "journal": "Spine",
                "year": 2020,
                "evidence_level": "1a"
            }
        ],
        "evidence_level": EvidenceLevel.NIVEL_1A,
        "images": [],
        "videos": []
    },
    {
        "name": "Mobilização Ativa da Coluna Lombar - Flexão/Extensão",
        "intervention_type": InterventionType.EXERCISE,
        "category": "mobilidade",
        "description": "Exercício de mobilização ativa para manter e melhorar a amplitude de movimento da coluna lombar.",
        "detailed_instructions": """
1. Posição inicial: Em pé com pés afastados na largura dos ombros
2. Flexão: Flexionar lentamente o tronco à frente, deslizando as mãos pelas pernas
3. Parar quando sentir alongamento confortável na região lombar
4. Retornar lentamente à posição vertical
5. Extensão: Colocar as mãos na região lombar e estender suavemente
6. Retornar à posição neutra
7. Movimento deve ser lento e controlado
""",
        "equipment_needed": [],
        "default_dosage": {
            "sets": "2-3",
            "repetitions": "10-15",
            "hold_time": "5-10 segundos",
            "rest": "30 segundos entre séries",
            "frequency": "3x/dia",
            "intensity": "confortável"
        },
        "progression_criteria": [
            "Aumento da ADM sem dor",
            "Movimento fluido e controlado",
            "Ausência de espasmos musculares"
        ],
        "progression_modifications": [
            {
                "level": "iniciante",
                "modifications": {
                    "repetitions": "5-8",
                    "amplitude": "parcial",
                    "description": "Movimento em amplitude livre de dor"
                }
            },
            {
                "level": "intermediario",
                "modifications": {
                    "repetitions": "10-12",
                    "amplitude": "completa",
                    "description": "Movimento em amplitude total disponível"
                }
            }
        ],
        "contraindications": [
            "Fraturas vertebrais",
            "Instabilidade vertebral",
            "Fase aguda de herniação discal"
        ],
        "precautions": [
            "Dor radicular durante movimento",
            "Parestesias nos membros inferiores",
            "Vertigem ou tontura"
        ],
        "red_flags": [
            "Aumento significativo da dor",
            "Sintomas neurológicos progressivos",
            "Perda de força nos membros inferiores"
        ],
        "evidence_references": [
            {
                "title": "Exercise therapy for chronic low back pain",
                "authors": "Hayden JA, et al.",
                "journal": "Cochrane Database Syst Rev",
                "year": 2021,
                "evidence_level": "1a"
            }
        ],
        "evidence_level": EvidenceLevel.NIVEL_1A
    },
    {
        "name": "Fortalecimento Isométrico dos Multífidos",
        "intervention_type": InterventionType.EXERCISE,
        "category": "fortalecimento",
        "description": "Exercício específico para fortalecimento dos músculos multífidos profundos para estabilização segmentar da coluna lombar.",
        "detailed_instructions": """
1. Posição: Decúbito ventral com uma almofada sob o abdome
2. Braços ao lado do corpo, testa apoiada no chão
3. Contrair suavemente os músculos paravertebrais
4. Elevar ligeiramente a cabeça e parte superior do tórax
5. Manter contração isométrica sem compensações
6. Respirar normalmente durante a sustentação
7. Retornar à posição inicial controladamente
""",
        "equipment_needed": ["colchonete", "almofada"],
        "default_dosage": {
            "sets": "3",
            "repetitions": "8-12",
            "hold_time": "10-15 segundos",
            "rest": "30 segundos",
            "frequency": "3x/semana",
            "intensity": "moderada"
        },
        "progression_criteria": [
            "Sustentação por 15 segundos sem fadiga",
            "Ausência de compensações",
            "Coordenação adequada"
        ],
        "contraindications": [
            "Espondilolistese instável",
            "Estenose espinal severa",
            "Patologia discal aguda"
        ],
        "precautions": [
            "Dor cervical durante exercício",
            "Aumento da lordose lombar",
            "Tensão nos ombros"
        ],
        "evidence_level": EvidenceLevel.NIVEL_1B
    },
    {
        "name": "Mobilização Passiva do Ombro - Flexão",
        "intervention_type": InterventionType.MANUAL_THERAPY,
        "category": "mobilidade",
        "description": "Técnica de mobilização passiva para manutenção e ganho de amplitude de movimento de flexão do ombro.",
        "detailed_instructions": """
1. Paciente em decúbito dorsal, ombro na borda da maca
2. Terapeuta ao lado do paciente
3. Uma mão estabiliza a escápula, outra segura o úmero
4. Movimento lento e progressivo de flexão do ombro
5. Respeitar barreira de dor e espasmo muscular
6. Manter amplitude máxima por 30 segundos
7. Retornar lentamente à posição inicial
""",
        "equipment_needed": ["maca"],
        "default_dosage": {
            "sets": "3",
            "repetitions": "10",
            "hold_time": "30 segundos",
            "rest": "30 segundos",
            "frequency": "2x/dia",
            "intensity": "suave"
        },
        "contraindications": [
            "Luxação aguda do ombro",
            "Fraturas do úmero proximal",
            "Ruptura completa do manguito rotador"
        ],
        "precautions": [
            "Instabilidade glenoumeral",
            "Calcificações tendíneas",
            "Dor severa durante movimento"
        ],
        "evidence_level": EvidenceLevel.NIVEL_1B
    },
    {
        "name": "Fortalecimento Excêntrico do Manguito Rotador",
        "intervention_type": InterventionType.EXERCISE,
        "category": "fortalecimento",
        "description": "Exercício de fortalecimento excêntrico específico para os músculos do manguito rotador, especialmente eficaz para tendinopatias.",
        "detailed_instructions": """
1. Paciente em pé, ombro em abdução de 90°
2. Usar theraband ou peso leve (0.5-2kg)
3. Iniciar com rotação externa máxima
4. Realizar rotação interna lentamente (5 segundos)
5. Retornar à posição inicial usando membro contralateral ou ajuda
6. Foco na fase excêntrica (rotação interna)
7. Manter escápula estabilizada
""",
        "equipment_needed": ["theraband", "halter"],
        "default_dosage": {
            "sets": "3",
            "repetitions": "12-15",
            "tempo": "5 segundos fase excêntrica",
            "rest": "2 minutos entre séries",
            "frequency": "3x/semana",
            "intensity": "moderada"
        },
        "progression_criteria": [
            "Ausência de dor durante exercício",
            "Capacidade de controlar movimento",
            "Força adequada para progressão"
        ],
        "contraindications": [
            "Ruptura completa do manguito rotador",
            "Instabilidade glenoumeral severa",
            "Fase aguda da tendinite"
        ],
        "evidence_level": EvidenceLevel.NIVEL_1A
    }
]

def insert_base_interventions(db, user_id):
    """Insere templates de intervenção base no banco de dados"""
    from ..models.clinical_protocols import InterventionTemplate
    
    inserted_interventions = []
    
    for intervention_data in BASE_INTERVENTIONS:
        # Verificar se intervenção já existe
        existing = InterventionTemplate.query.filter_by(
            name=intervention_data['name']
        ).first()
        
        if existing:
            continue
        
        # Criar nova intervenção
        intervention = InterventionTemplate(
            name=intervention_data['name'],
            intervention_type=intervention_data['intervention_type'],
            category=intervention_data['category'],
            description=intervention_data['description'],
            detailed_instructions=intervention_data['detailed_instructions'],
            equipment_needed=intervention_data.get('equipment_needed', []),
            default_dosage=intervention_data['default_dosage'],
            progression_criteria=intervention_data['progression_criteria'],
            progression_modifications=intervention_data.get('progression_modifications', []),
            contraindications=intervention_data.get('contraindications', []),
            precautions=intervention_data.get('precautions', []),
            red_flags=intervention_data.get('red_flags', []),
            evidence_references=intervention_data.get('evidence_references', []),
            evidence_level=intervention_data['evidence_level'],
            images=intervention_data.get('images', []),
            videos=intervention_data.get('videos', []),
            created_by=user_id
        )
        
        db.session.add(intervention)
        inserted_interventions.append(intervention)
    
    db.session.commit()
    return inserted_interventions