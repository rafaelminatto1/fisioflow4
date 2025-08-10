'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  Calendar, 
  Clock,
  FileText,
  Activity,
  Target,
  CheckCircle,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { BodyMap, BodyMapPoint } from './BodyMap';
import { patientService, Evolution } from '@/services/patients';

export interface SOAPFormData {
  // SOAP Notes
  subjetivo: string;
  objetivo: string;
  avaliacao: string;
  plano: string;
  
  // Session details
  data_atendimento: string;
  duracao_minutos: number;
  escala_dor: number;
  
  // Technical details
  tecnicas_utilizadas: string[];
  exercicios_realizados: string[];
  observacoes_clinicas: string;
  
  // Body map
  body_map_points: BodyMapPoint[];
}

interface SOAPFormProps {
  medicalRecordId: string;
  evolutionId?: string;
  onSave?: (evolution: Evolution) => void;
  onCancel?: () => void;
  readonly?: boolean;
}

const COMMON_TECHNIQUES = [
  'Mobilização articular',
  'Massagem terapêutica',
  'Alongamento',
  'Fortalecimento',
  'Eletroterapia',
  'Termoterapia',
  'Crioterapia',
  'Drenagem linfática',
  'RPG',
  'Pilates terapêutico',
  'Hidroterapia',
  'Acupuntura',
];

const COMMON_EXERCISES = [
  'Exercícios de amplitude de movimento',
  'Fortalecimento isométrico',
  'Fortalecimento isotônico',
  'Exercícios proprioceptivos',
  'Treino de equilíbrio',
  'Exercícios respiratórios',
  'Marcha assistida',
  'Transferências',
  'Exercícios funcionais',
  'Core training',
  'Exercícios de coordenação',
  'Relaxamento muscular',
];

export const SOAPForm: React.FC<SOAPFormProps> = ({
  medicalRecordId,
  evolutionId,
  onSave,
  onCancel,
  readonly = false
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<SOAPFormData>({
    subjetivo: '',
    objetivo: '',
    avaliacao: '',
    plano: '',
    data_atendimento: new Date().toISOString().split('T')[0],
    duracao_minutos: 50,
    escala_dor: 0,
    tecnicas_utilizadas: [],
    exercicios_realizados: [],
    observacoes_clinicas: '',
    body_map_points: [],
  });

  // Load evolution data if editing
  useEffect(() => {
    if (evolutionId) {
      // Would load evolution data here
      // For now, we'll use mock data
    }
  }, [evolutionId]);

  const handleInputChange = (field: keyof SOAPFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTechniqueToggle = (technique: string) => {
    const current = formData.tecnicas_utilizadas;
    const updated = current.includes(technique)
      ? current.filter(t => t !== technique)
      : [...current, technique];
    
    handleInputChange('tecnicas_utilizadas', updated);
  };

  const handleExerciseToggle = (exercise: string) => {
    const current = formData.exercicios_realizados;
    const updated = current.includes(exercise)
      ? current.filter(e => e !== exercise)
      : [...current, exercise];
    
    handleInputChange('exercicios_realizados', updated);
  };

  const validateForm = (): string | null => {
    if (!formData.data_atendimento) {
      return 'Data do atendimento é obrigatória';
    }

    if (formData.duracao_minutos <= 0 || formData.duracao_minutos > 300) {
      return 'Duração deve ser entre 1 e 300 minutos';
    }

    if (formData.escala_dor < 0 || formData.escala_dor > 10) {
      return 'Escala de dor deve ser entre 0 e 10';
    }

    if (!formData.subjetivo.trim() && !formData.objetivo.trim() && 
        !formData.avaliacao.trim() && !formData.plano.trim()) {
      return 'Pelo menos um campo SOAP deve ser preenchido';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const submitData = {
        ...formData,
        tecnicas_utilizadas: {
          techniques: formData.tecnicas_utilizadas,
          body_map: formData.body_map_points,
        },
        exercicios_realizados: {
          exercises: formData.exercicios_realizados,
        },
      };

      let result: Evolution;
      
      if (evolutionId) {
        result = (await patientService.updateEvolution(evolutionId, submitData)).evolution;
      } else {
        result = (await patientService.createEvolution(medicalRecordId, submitData)).evolution;
      }

      setSuccess(evolutionId ? 'Evolução atualizada com sucesso!' : 'Evolução criada com sucesso!');
      
      if (onSave) {
        onSave(result);
      }
      
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar evolução');
    } finally {
      setSaving(false);
    }
  };

  const getPainColor = (level: number) => {
    if (level === 0) return 'bg-green-100 text-green-800';
    if (level <= 3) return 'bg-yellow-100 text-yellow-800';
    if (level <= 6) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getPainDescription = (level: number) => {
    if (level === 0) return 'Sem dor';
    if (level <= 3) return 'Dor leve';
    if (level <= 6) return 'Dor moderada';
    return 'Dor intensa';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {readonly ? 'Visualizar Evolução' : evolutionId ? 'Editar Evolução' : 'Nova Evolução SOAP'}
        </h2>
        <p className="text-gray-600 mt-1">
          {readonly ? 'Detalhes da sessão de fisioterapia' : 'Registre os detalhes da sessão de fisioterapia'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Session Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informações da Sessão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="data_atendimento">Data do Atendimento *</Label>
                <Input
                  id="data_atendimento"
                  type="date"
                  value={formData.data_atendimento}
                  onChange={(e) => handleInputChange('data_atendimento', e.target.value)}
                  disabled={readonly}
                  required
                />
              </div>

              <div>
                <Label htmlFor="duracao_minutos">Duração (minutos)</Label>
                <Input
                  id="duracao_minutos"
                  type="number"
                  min="1"
                  max="300"
                  value={formData.duracao_minutos}
                  onChange={(e) => handleInputChange('duracao_minutos', parseInt(e.target.value) || 0)}
                  disabled={readonly}
                />
              </div>

              <div>
                <Label htmlFor="escala_dor">Escala de Dor (0-10)</Label>
                <div className="space-y-2">
                  <Input
                    id="escala_dor"
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={formData.escala_dor}
                    onChange={(e) => handleInputChange('escala_dor', parseInt(e.target.value))}
                    disabled={readonly}
                    className="w-full"
                  />
                  <div className="flex justify-between items-center">
                    <Badge className={getPainColor(formData.escala_dor)}>
                      {formData.escala_dor}/10 - {getPainDescription(formData.escala_dor)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SOAP Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subjetivo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-blue-600" />
                S - Subjetivo
              </CardTitle>
              <CardDescription>
                O que o paciente relata? Sintomas, dor, funcionalidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Paciente relata melhora da dor lombar, diminuindo de 8/10 para 5/10. Refere ainda dificuldade para permanecer em pé por períodos prolongados..."
                value={formData.subjetivo}
                onChange={(e) => handleInputChange('subjetivo', e.target.value)}
                disabled={readonly}
                rows={6}
              />
            </CardContent>
          </Card>

          {/* Objetivo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-green-600" />
                O - Objetivo
              </CardTitle>
              <CardDescription>
                Observações mensuráveis, testes, medidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Flexão lombar: 45° (anterior: 30°). Teste de Lasègue negativo bilateralmente. Força muscular: 4/5 para extensores de quadril..."
                value={formData.objetivo}
                onChange={(e) => handleInputChange('objetivo', e.target.value)}
                disabled={readonly}
                rows={6}
              />
            </CardContent>
          </Card>

          {/* Avaliação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                A - Avaliação
              </CardTitle>
              <CardDescription>
                Interpretação profissional, progresso, problemas identificados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Paciente apresenta evolução satisfatória do quadro álgico lombar. Melhora da ADM e da capacidade funcional. Persiste limitação para atividades que exigem flexão prolongada..."
                value={formData.avaliacao}
                onChange={(e) => handleInputChange('avaliacao', e.target.value)}
                disabled={readonly}
                rows={6}
              />
            </CardContent>
          </Card>

          {/* Plano */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-orange-600" />
                P - Plano
              </CardTitle>
              <CardDescription>
                Próximas intervenções, objetivos, orientações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Continuar com programa de fortalecimento de core e mobilização lombar. Progredir exercícios de estabilização segmentar. Orientações ergonômicas para atividades diárias..."
                value={formData.plano}
                onChange={(e) => handleInputChange('plano', e.target.value)}
                disabled={readonly}
                rows={6}
              />
            </CardContent>
          </Card>
        </div>

        {/* Techniques Used */}
        <Card>
          <CardHeader>
            <CardTitle>Técnicas Utilizadas</CardTitle>
            <CardDescription>
              Selecione as técnicas aplicadas nesta sessão
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {COMMON_TECHNIQUES.map((technique) => (
                <div key={technique} className="flex items-center">
                  <Button
                    type="button"
                    variant={formData.tecnicas_utilizadas.includes(technique) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleTechniqueToggle(technique)}
                    disabled={readonly}
                    className="w-full justify-start text-xs"
                  >
                    {technique}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Exercises */}
        <Card>
          <CardHeader>
            <CardTitle>Exercícios Realizados</CardTitle>
            <CardDescription>
              Selecione os exercícios executados pelo paciente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {COMMON_EXERCISES.map((exercise) => (
                <div key={exercise} className="flex items-center">
                  <Button
                    type="button"
                    variant={formData.exercicios_realizados.includes(exercise) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleExerciseToggle(exercise)}
                    disabled={readonly}
                    className="w-full justify-start text-xs"
                  >
                    {exercise}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Body Map */}
        <Card>
          <CardHeader>
            <CardTitle>Mapa Corporal da Sessão</CardTitle>
            <CardDescription>
              Marque as regiões trabalhadas, pontos de dor ou áreas de interesse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BodyMap
              points={formData.body_map_points}
              onPointsChange={(points) => handleInputChange('body_map_points', points)}
              readonly={readonly}
            />
          </CardContent>
        </Card>

        {/* Clinical Observations */}
        <Card>
          <CardHeader>
            <CardTitle>Observações Clínicas Adicionais</CardTitle>
            <CardDescription>
              Observações gerais, intercorrências, orientações dadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Ex: Paciente demonstrou boa aderência aos exercícios. Orientado sobre postura no trabalho. Agenda próxima sessão para segunda-feira..."
              value={formData.observacoes_clinicas}
              onChange={(e) => handleInputChange('observacoes_clinicas', e.target.value)}
              disabled={readonly}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        {!readonly && (
          <div className="flex justify-end gap-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancelar
              </Button>
            )}
            
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {evolutionId ? 'Atualizar Evolução' : 'Salvar Evolução'}
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};