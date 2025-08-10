'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  RotateCcw, 
  Plus, 
  Minus, 
  MapPin,
  AlertCircle,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';

export interface BodyMapPoint {
  id: string;
  x: number;
  y: number;
  side: 'front' | 'back';
  type: 'pain' | 'injury' | 'surgery' | 'treatment' | 'other';
  severity?: number; // 1-10 scale
  description: string;
  date?: string;
}

interface BodyMapProps {
  points: BodyMapPoint[];
  onPointsChange: (points: BodyMapPoint[]) => void;
  readonly?: boolean;
}

const POINT_COLORS = {
  pain: '#ef4444',      // red
  injury: '#f97316',    // orange  
  surgery: '#8b5cf6',   // purple
  treatment: '#10b981', // green
  other: '#6b7280',     // gray
};

const POINT_TYPES = [
  { value: 'pain', label: 'Dor', color: POINT_COLORS.pain },
  { value: 'injury', label: 'Lesão', color: POINT_COLORS.injury },
  { value: 'surgery', label: 'Cirurgia', color: POINT_COLORS.surgery },
  { value: 'treatment', label: 'Tratamento', color: POINT_COLORS.treatment },
  { value: 'other', label: 'Outro', color: POINT_COLORS.other },
];

export const BodyMap: React.FC<BodyMapProps> = ({ 
  points, 
  onPointsChange, 
  readonly = false 
}) => {
  const [selectedSide, setSelectedSide] = useState<'front' | 'back'>('front');
  const [selectedPointType, setSelectedPointType] = useState<string>('pain');
  const [selectedPoint, setSelectedPoint] = useState<BodyMapPoint | null>(null);
  const [showPoints, setShowPoints] = useState(true);

  // SVG Body Map - Simplified human figure
  const BodySVG = ({ side }: { side: 'front' | 'back' }) => {
    const handleSVGClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
      if (readonly) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const newPoint: BodyMapPoint = {
        id: `point_${Date.now()}`,
        x,
        y,
        side,
        type: selectedPointType as BodyMapPoint['type'],
        severity: selectedPointType === 'pain' ? 5 : undefined,
        description: '',
        date: new Date().toISOString().split('T')[0],
      };

      onPointsChange([...points, newPoint]);
      setSelectedPoint(newPoint);
    }, [readonly, selectedPointType, points, onPointsChange, side]);

    const sidePoints = points.filter(point => point.side === side);

    return (
      <div className="relative">
        <svg
          width="300"
          height="600"
          viewBox="0 0 300 600"
          className="border border-gray-200 rounded-lg bg-gray-50 cursor-crosshair"
          onClick={handleSVGClick}
        >
          {/* Human body outline - front/back */}
          {side === 'front' ? (
            // Front view
            <g fill="none" stroke="#d1d5db" strokeWidth="2">
              {/* Head */}
              <circle cx="150" cy="50" r="30" />
              
              {/* Torso */}
              <path d="M120 80 L120 200 L100 350 L100 380 L200 380 L200 350 L180 200 L180 80 Z" />
              
              {/* Arms */}
              <path d="M120 100 L80 120 L70 200 L75 280 L85 280 L90 200 L120 140" />
              <path d="M180 100 L220 120 L230 200 L225 280 L215 280 L210 200 L180 140" />
              
              {/* Legs */}
              <path d="M110 380 L105 500 L100 580 L110 580 L115 500 L120 380" />
              <path d="M180 380 L185 500 L190 580 L180 580 L175 500 L170 380" />
            </g>
          ) : (
            // Back view
            <g fill="none" stroke="#d1d5db" strokeWidth="2">
              {/* Head */}
              <circle cx="150" cy="50" r="30" />
              
              {/* Torso - back */}
              <path d="M120 80 L120 200 L100 350 L100 380 L200 380 L200 350 L180 200 L180 80 Z" />
              
              {/* Spine indicator */}
              <line x1="150" y1="80" x2="150" y2="350" stroke="#9ca3af" strokeWidth="1" strokeDasharray="3,3" />
              
              {/* Arms - back */}
              <path d="M120 100 L80 120 L70 200 L75 280 L85 280 L90 200 L120 140" />
              <path d="M180 100 L220 120 L230 200 L225 280 L215 280 L210 200 L180 140" />
              
              {/* Legs - back */}
              <path d="M110 380 L105 500 L100 580 L110 580 L115 500 L120 380" />
              <path d="M180 380 L185 500 L190 580 L180 580 L175 500 L170 380" />
            </g>
          )}

          {/* Body region labels */}
          <g fill="#6b7280" fontSize="10" textAnchor="middle" className="pointer-events-none">
            <text x="150" y="25">Cabeça</text>
            <text x="150" y="140">Tórax</text>
            <text x="150" y="220">Abdome</text>
            <text x="150" y="320">Pelve</text>
            <text x="60" y="150">Braço E</text>
            <text x="240" y="150">Braço D</text>
            <text x="115" y="480">Perna E</text>
            <text x="185" y="480">Perna D</text>
          </g>

          {/* Points */}
          {showPoints && sidePoints.map((point) => (
            <g key={point.id}>
              <circle
                cx={`${point.x}%`}
                cy={`${point.y}%`}
                r="8"
                fill={POINT_COLORS[point.type]}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:opacity-80"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPoint(point);
                }}
              />
              {point.severity && (
                <text
                  x={`${point.x}%`}
                  y={`${point.y}%`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {point.severity}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* View toggle */}
        <div className="absolute top-2 right-2 flex gap-1">
          <Button
            size="sm"
            variant={selectedSide === 'front' ? 'default' : 'outline'}
            onClick={() => setSelectedSide('front')}
          >
            Frente
          </Button>
          <Button
            size="sm"
            variant={selectedSide === 'back' ? 'default' : 'outline'}
            onClick={() => setSelectedSide('back')}
          >
            Costas
          </Button>
        </div>

        {/* Toggle points visibility */}
        <div className="absolute top-2 left-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPoints(!showPoints)}
          >
            {showPoints ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  };

  const updatePoint = (updatedPoint: BodyMapPoint) => {
    const updatedPoints = points.map(point => 
      point.id === updatedPoint.id ? updatedPoint : point
    );
    onPointsChange(updatedPoints);
    setSelectedPoint(updatedPoint);
  };

  const removePoint = (pointId: string) => {
    const filteredPoints = points.filter(point => point.id !== pointId);
    onPointsChange(filteredPoints);
    setSelectedPoint(null);
  };

  const clearAllPoints = () => {
    onPointsChange([]);
    setSelectedPoint(null);
  };

  const currentSidePoints = points.filter(point => point.side === selectedSide);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Body Map */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Mapa Corporal - {selectedSide === 'front' ? 'Vista Frontal' : 'Vista Posterior'}
            </CardTitle>
            <CardDescription>
              {readonly ? 
                'Visualização dos pontos marcados no corpo' :
                'Clique no corpo para marcar pontos de interesse'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <BodySVG side={selectedSide} />
            
            {!readonly && (
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Label>Tipo:</Label>
                  <Select value={selectedPointType} onValueChange={setSelectedPointType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POINT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: type.color }}
                            />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {points.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllPoints}
                    className="text-red-600"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Point Details */}
      <div className="space-y-4">
        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Legenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {POINT_TYPES.map(type => (
                <div key={type.value} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: type.color }}
                  />
                  <span className="text-sm">{type.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Points List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Pontos - {selectedSide === 'front' ? 'Frente' : 'Costas'} 
              <Badge variant="outline">
                {currentSidePoints.length} pontos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentSidePoints.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <MapPin className="mx-auto h-8 w-8 mb-2" />
                <p className="text-sm">Nenhum ponto marcado nesta vista</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {currentSidePoints.map((point) => (
                  <div
                    key={point.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPoint?.id === point.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedPoint(point)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: POINT_COLORS[point.type] }}
                        />
                        <span className="text-sm font-medium">
                          {POINT_TYPES.find(t => t.value === point.type)?.label}
                        </span>
                        {point.severity && (
                          <Badge variant="outline" className="text-xs">
                            Dor: {point.severity}/10
                          </Badge>
                        )}
                      </div>
                      {!readonly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePoint(point.id);
                          }}
                          className="text-red-600 hover:text-red-800 p-1 h-auto"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {point.description && (
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {point.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Point Editor */}
        {selectedPoint && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Detalhes do Ponto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tipo</Label>
                <Select 
                  value={selectedPoint.type} 
                  onValueChange={(value) => updatePoint({
                    ...selectedPoint, 
                    type: value as BodyMapPoint['type']
                  })}
                  disabled={readonly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POINT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: type.color }}
                          />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPoint.type === 'pain' && (
                <div>
                  <Label>Intensidade da Dor (1-10)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={selectedPoint.severity || 5}
                    onChange={(e) => updatePoint({
                      ...selectedPoint,
                      severity: parseInt(e.target.value)
                    })}
                    disabled={readonly}
                  />
                </div>
              )}

              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={selectedPoint.date || ''}
                  onChange={(e) => updatePoint({
                    ...selectedPoint,
                    date: e.target.value
                  })}
                  disabled={readonly}
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva os detalhes deste ponto..."
                  value={selectedPoint.description}
                  onChange={(e) => updatePoint({
                    ...selectedPoint,
                    description: e.target.value
                  })}
                  disabled={readonly}
                  rows={3}
                />
              </div>

              {!readonly && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => removePoint(selectedPoint.id)}
                    className="text-red-600"
                  >
                    Remover Ponto
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};