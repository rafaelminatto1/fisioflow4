"""
Orquestrador de IA - Integração Claude, GPT-4, Gemini
"""

import asyncio
import json
import os
from datetime import datetime
from enum import Enum
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
import openai
import anthropic
import google.generativeai as genai
from flask import current_app

from ..models.patient import Patient
from ..models.medical_record import MedicalRecord
from ..models.exercise import Exercise
from ..models.user import User


class AIProvider(Enum):
    """Provedores de IA disponíveis"""
    CLAUDE = "claude"
    GPT4 = "gpt4" 
    GEMINI = "gemini"


class AITaskType(Enum):
    """Tipos de tarefas de IA"""
    SOAP_COMPLETION = "soap_completion"
    EXERCISE_SUGGESTION = "exercise_suggestion"
    DIAGNOSIS_SUPPORT = "diagnosis_support"
    TREATMENT_PLAN = "treatment_plan"
    CHAT_RESPONSE = "chat_response"
    DOCUMENT_ANALYSIS = "document_analysis"
    CASE_STUDY_GENERATION = "case_study_generation"
    COMPETENCY_EVALUATION = "competency_evaluation"


@dataclass
class AIRequest:
    """Estrutura de requisição para IA"""
    task_type: AITaskType
    prompt: str
    context: Dict[str, Any]
    user_id: str
    patient_id: Optional[str] = None
    preferred_provider: Optional[AIProvider] = None
    max_tokens: int = 1000
    temperature: float = 0.7


@dataclass 
class AIResponse:
    """Estrutura de resposta da IA"""
    provider: AIProvider
    content: str
    confidence: float
    tokens_used: int
    processing_time: float
    metadata: Dict[str, Any]
    success: bool
    error: Optional[str] = None


class AIOrchestrator:
    """Orquestrador principal de IA"""
    
    def __init__(self):
        self.providers = {}
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Inicializa provedores de IA"""
        
        # Claude
        if os.getenv('ANTHROPIC_API_KEY'):
            self.providers[AIProvider.CLAUDE] = anthropic.Anthropic(
                api_key=os.getenv('ANTHROPIC_API_KEY')
            )
        
        # OpenAI GPT-4
        if os.getenv('OPENAI_API_KEY'):
            openai.api_key = os.getenv('OPENAI_API_KEY')
            self.providers[AIProvider.GPT4] = openai
        
        # Google Gemini
        if os.getenv('GOOGLE_API_KEY'):
            genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
            self.providers[AIProvider.GEMINI] = genai.GenerativeModel('gemini-pro')
    
    async def process_request(self, request: AIRequest) -> AIResponse:
        """Processa requisição de IA"""
        
        # Determinar melhor provedor
        provider = self._select_best_provider(request)
        
        # Executar processamento
        start_time = datetime.now()
        
        try:
            if provider == AIProvider.CLAUDE:
                response = await self._process_with_claude(request)
            elif provider == AIProvider.GPT4:
                response = await self._process_with_gpt4(request)
            elif provider == AIProvider.GEMINI:
                response = await self._process_with_gemini(request)
            else:
                raise ValueError(f"Provedor não disponível: {provider}")
                
            processing_time = (datetime.now() - start_time).total_seconds()
            response.processing_time = processing_time
            response.success = True
            
            return response
            
        except Exception as e:
            current_app.logger.error(f"Erro no processamento de IA: {str(e)}")
            return AIResponse(
                provider=provider,
                content="",
                confidence=0.0,
                tokens_used=0,
                processing_time=(datetime.now() - start_time).total_seconds(),
                metadata={},
                success=False,
                error=str(e)
            )
    
    def _select_best_provider(self, request: AIRequest) -> AIProvider:
        """Seleciona melhor provedor baseado no tipo de tarefa"""
        
        if request.preferred_provider and request.preferred_provider in self.providers:
            return request.preferred_provider
        
        # Mapeamento de tarefas para melhores provedores
        provider_mapping = {
            AITaskType.SOAP_COMPLETION: AIProvider.CLAUDE,  # Melhor para texto médico
            AITaskType.EXERCISE_SUGGESTION: AIProvider.GPT4,  # Boa base de conhecimento
            AITaskType.DIAGNOSIS_SUPPORT: AIProvider.CLAUDE,  # Raciocínio clínico
            AITaskType.TREATMENT_PLAN: AIProvider.CLAUDE,  # Análise complexa
            AITaskType.CHAT_RESPONSE: AIProvider.GEMINI,  # Conversação natural
            AITaskType.DOCUMENT_ANALYSIS: AIProvider.CLAUDE,  # Análise de documentos
            AITaskType.CASE_STUDY_GENERATION: AIProvider.GPT4,  # Criatividade
            AITaskType.COMPETENCY_EVALUATION: AIProvider.CLAUDE  # Avaliação detalhada
        }
        
        preferred = provider_mapping.get(request.task_type, AIProvider.CLAUDE)
        
        # Fallback para provedor disponível
        if preferred not in self.providers:
            available_providers = list(self.providers.keys())
            if available_providers:
                return available_providers[0]
        
        return preferred
    
    async def _process_with_claude(self, request: AIRequest) -> AIResponse:
        """Processa requisição com Claude"""
        
        client = self.providers[AIProvider.CLAUDE]
        
        # Preparar prompt
        system_prompt = self._build_system_prompt(request)
        user_prompt = self._build_user_prompt(request)
        
        response = await client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )
        
        return AIResponse(
            provider=AIProvider.CLAUDE,
            content=response.content[0].text,
            confidence=0.9,  # Claude geralmente tem alta confiabilidade
            tokens_used=response.usage.input_tokens + response.usage.output_tokens,
            processing_time=0,  # Será preenchido depois
            metadata={
                "model": "claude-3-sonnet-20240229",
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }
        )
    
    async def _process_with_gpt4(self, request: AIRequest) -> AIResponse:
        """Processa requisição com GPT-4"""
        
        # Preparar mensagens
        system_prompt = self._build_system_prompt(request)
        user_prompt = self._build_user_prompt(request)
        
        response = await openai.ChatCompletion.acreate(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=request.max_tokens,
            temperature=request.temperature
        )
        
        return AIResponse(
            provider=AIProvider.GPT4,
            content=response.choices[0].message.content,
            confidence=0.85,
            tokens_used=response.usage.total_tokens,
            processing_time=0,
            metadata={
                "model": "gpt-4-turbo-preview",
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens
            }
        )
    
    async def _process_with_gemini(self, request: AIRequest) -> AIResponse:
        """Processa requisição com Gemini"""
        
        model = self.providers[AIProvider.GEMINI]
        
        # Preparar prompt
        full_prompt = f"""
{self._build_system_prompt(request)}

{self._build_user_prompt(request)}
"""
        
        response = await model.generate_content_async(
            full_prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=request.max_tokens,
                temperature=request.temperature
            )
        )
        
        return AIResponse(
            provider=AIProvider.GEMINI,
            content=response.text,
            confidence=0.8,
            tokens_used=response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0,
            processing_time=0,
            metadata={
                "model": "gemini-pro",
                "safety_ratings": response.candidates[0].safety_ratings if response.candidates else []
            }
        )
    
    def _build_system_prompt(self, request: AIRequest) -> str:
        """Constrói prompt do sistema baseado no tipo de tarefa"""
        
        base_context = """
Você é FisioFlow AI, um assistente especializado em fisioterapia integrado a um sistema de gestão clínica.
Suas respostas devem ser profissionais, baseadas em evidência científica e adequadas ao contexto clínico brasileiro.
"""
        
        task_contexts = {
            AITaskType.SOAP_COMPLETION: """
Sua especialidade é completar evoluções clínicas no formato SOAP (Subjective, Objective, Assessment, Plan).
Forneça sugestões baseadas nos dados clínicos disponíveis, sempre mantendo rigor profissional.
""",
            AITaskType.EXERCISE_SUGGESTION: """
Sua especialidade é sugerir exercícios terapêuticos personalizados.
Considere a condição clínica, limitações, objetivos e nível funcional do paciente.
""",
            AITaskType.DIAGNOSIS_SUPPORT: """
Sua função é apoiar o raciocínio diagnóstico, não substituí-lo.
Forneça diagnósticos diferenciais e sugestões baseadas nos achados clínicos.
""",
            AITaskType.TREATMENT_PLAN: """
Sua especialidade é auxiliar na elaboração de planos de tratamento fisioterapêutico.
Considere objetivos, prognóstico, recursos disponíveis e evidências científicas.
""",
            AITaskType.CHAT_RESPONSE: """
Responda de forma conversacional mas profissional.
Mantenha o foco em temas relacionados à fisioterapia e saúde.
""",
            AITaskType.DOCUMENT_ANALYSIS: """
Analise documentos médicos e forneça resumos ou insights relevantes.
Extraia informações clínicas importantes e organize de forma clara.
""",
            AITaskType.CASE_STUDY_GENERATION: """
Crie casos clínicos educacionais realistas para ensino.
Inclua história, exame físico, objetivos de aprendizagem e questões pertinentes.
""",
            AITaskType.COMPETENCY_EVALUATION: """
Avalie competências clínicas baseado em critérios profissionais.
Forneça feedback construtivo e sugestões de desenvolvimento.
"""
        }
        
        return base_context + task_contexts.get(request.task_type, "")
    
    def _build_user_prompt(self, request: AIRequest) -> str:
        """Constrói prompt do usuário com contexto"""
        
        # Adicionar contexto do paciente se disponível
        context_info = ""
        if request.patient_id:
            patient_context = self._get_patient_context(request.patient_id)
            context_info += f"\nContexto do Paciente:\n{patient_context}\n"
        
        # Adicionar contexto adicional
        if request.context:
            context_info += f"\nContexto Adicional:\n{json.dumps(request.context, indent=2, ensure_ascii=False)}\n"
        
        return f"{context_info}\nSolicitação:\n{request.prompt}"
    
    def _get_patient_context(self, patient_id: str) -> str:
        """Obtém contexto do paciente"""
        
        try:
            patient = Patient.query.get(patient_id)
            if not patient:
                return "Paciente não encontrado."
            
            # Dados básicos (sem informações sensíveis)
            context = f"""
Nome: {patient.full_name}
Idade: {patient.age} anos
Condições: {', '.join(patient.conditions) if patient.conditions else 'Não especificadas'}
Observações: {patient.notes if patient.notes else 'Nenhuma'}
"""
            
            # Última evolução
            latest_record = MedicalRecord.query.filter_by(
                patient_id=patient_id
            ).order_by(MedicalRecord.created_at.desc()).first()
            
            if latest_record:
                context += f"""
Última Evolução ({latest_record.created_at.strftime('%d/%m/%Y')}):
- Subjetivo: {latest_record.subjective}
- Objetivo: {latest_record.objective}
- Avaliação: {latest_record.assessment}
- Plano: {latest_record.plan}
"""
            
            return context
            
        except Exception as e:
            current_app.logger.error(f"Erro ao obter contexto do paciente: {str(e)}")
            return "Erro ao obter contexto do paciente."


class AIService:
    """Serviço de IA de alto nível"""
    
    def __init__(self):
        self.orchestrator = AIOrchestrator()
    
    async def complete_soap_evolution(self, patient_id: str, partial_data: Dict[str, str], user_id: str) -> AIResponse:
        """Completa evolução SOAP"""
        
        prompt = f"""
Com base nos dados clínicos disponíveis, complete a evolução SOAP:

Dados informados:
{json.dumps(partial_data, indent=2, ensure_ascii=False)}

Por favor, forneça sugestões para completar os campos em branco, mantendo consistência clínica.
"""
        
        request = AIRequest(
            task_type=AITaskType.SOAP_COMPLETION,
            prompt=prompt,
            context=partial_data,
            user_id=user_id,
            patient_id=patient_id,
            temperature=0.3  # Baixa criatividade para precisão clínica
        )
        
        return await self.orchestrator.process_request(request)
    
    async def suggest_exercises(self, patient_id: str, condition: str, goals: List[str], user_id: str) -> AIResponse:
        """Sugere exercícios personalizados"""
        
        prompt = f"""
Sugira exercícios terapêuticos específicos para:

Condição: {condition}
Objetivos: {', '.join(goals)}

Para cada exercício sugerido, inclua:
1. Nome do exercício
2. Descrição da execução
3. Séries e repetições recomendadas
4. Progressão sugerida
5. Precauções importantes
"""
        
        request = AIRequest(
            task_type=AITaskType.EXERCISE_SUGGESTION,
            prompt=prompt,
            context={
                'condition': condition,
                'goals': goals
            },
            user_id=user_id,
            patient_id=patient_id,
            temperature=0.7
        )
        
        return await self.orchestrator.process_request(request)
    
    async def support_diagnosis(self, symptoms: List[str], examination_findings: Dict[str, Any], user_id: str) -> AIResponse:
        """Apoio ao diagnóstico diferencial"""
        
        prompt = f"""
Baseado nos sintomas e achados do exame físico, sugira diagnósticos diferenciais:

Sintomas relatados:
{', '.join(symptoms)}

Achados do exame:
{json.dumps(examination_findings, indent=2, ensure_ascii=False)}

Forneça:
1. Diagnósticos diferenciais mais prováveis
2. Testes complementares sugeridos
3. Sinais de alerta (red flags)
4. Recomendações de encaminhamento se necessário
"""
        
        request = AIRequest(
            task_type=AITaskType.DIAGNOSIS_SUPPORT,
            prompt=prompt,
            context={
                'symptoms': symptoms,
                'examination_findings': examination_findings
            },
            user_id=user_id,
            temperature=0.2  # Muito baixa para precisão diagnóstica
        )
        
        return await self.orchestrator.process_request(request)
    
    async def generate_treatment_plan(self, diagnosis: str, patient_profile: Dict[str, Any], user_id: str) -> AIResponse:
        """Gera plano de tratamento"""
        
        prompt = f"""
Elabore um plano de tratamento fisioterapêutico detalhado:

Diagnóstico: {diagnosis}

Perfil do paciente:
{json.dumps(patient_profile, indent=2, ensure_ascii=False)}

Inclua:
1. Objetivos de tratamento (curto e longo prazo)
2. Modalidades terapêuticas recomendadas
3. Frequência e duração do tratamento
4. Critérios de progressão
5. Orientações para o paciente
6. Prognóstico esperado
"""
        
        request = AIRequest(
            task_type=AITaskType.TREATMENT_PLAN,
            prompt=prompt,
            context={
                'diagnosis': diagnosis,
                'patient_profile': patient_profile
            },
            user_id=user_id,
            temperature=0.5
        )
        
        return await self.orchestrator.process_request(request)
    
    async def chat_response(self, message: str, conversation_history: List[Dict[str, str]], user_id: str) -> AIResponse:
        """Resposta de chat conversacional"""
        
        history_text = "\n".join([
            f"{msg['role']}: {msg['content']}" 
            for msg in conversation_history[-10:]  # Últimas 10 mensagens
        ])
        
        prompt = f"""
Histórico da conversa:
{history_text}

Nova mensagem: {message}

Responda de forma útil e profissional, mantendo o contexto da conversa.
"""
        
        request = AIRequest(
            task_type=AITaskType.CHAT_RESPONSE,
            prompt=prompt,
            context={
                'conversation_history': conversation_history,
                'current_message': message
            },
            user_id=user_id,
            temperature=0.8  # Maior criatividade para conversação
        )
        
        return await self.orchestrator.process_request(request)
    
    async def analyze_document(self, document_content: str, document_type: str, user_id: str) -> AIResponse:
        """Analisa documento médico"""
        
        prompt = f"""
Analise o seguinte documento médico do tipo "{document_type}":

{document_content}

Forneça:
1. Resumo executivo
2. Informações clínicas principais
3. Achados relevantes para fisioterapia
4. Recomendações de conduta
5. Pontos que necessitam esclarecimento
"""
        
        request = AIRequest(
            task_type=AITaskType.DOCUMENT_ANALYSIS,
            prompt=prompt,
            context={
                'document_type': document_type,
                'content_length': len(document_content)
            },
            user_id=user_id,
            temperature=0.3
        )
        
        return await self.orchestrator.process_request(request)


# Instância global do serviço
ai_service = AIService()