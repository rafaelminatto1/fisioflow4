# ⚡ FisioFlow - Performance Optimizations Guide

## 🎯 Performance Targets

- **Response Time**: < 2s (95th percentile)
- **First Contentful Paint**: < 1.5s
- **Lighthouse Score**: > 95
- **Database Queries**: < 100ms average
- **Mobile Performance**: 60 FPS smooth animations

## 🗄️ Database Optimizations

### ✅ Already Implemented

#### Indexes
```sql
-- Core performance indexes already created
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_patients_document ON patients(document);
CREATE INDEX idx_exercises_category ON exercises(category);
-- ... 19 total indexes
```

### 🔄 Additional Optimizations

#### Connection Pooling
```python
# backend/app/config.py
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 20,
    'pool_timeout': 30,
    'pool_recycle': 3600,
    'max_overflow': 30,
    'pool_pre_ping': True
}
```

#### Query Optimization
```python
# backend/app/models/optimized_queries.py
class OptimizedQueries:
    @staticmethod
    def get_patient_appointments_optimized(patient_id):
        """Optimized query with eager loading"""
        return db.session.query(Appointment)\
            .options(
                joinedload(Appointment.professional).joinedload(Professional.user),
                joinedload(Appointment.patient).joinedload(Patient.user)
            )\
            .filter(Appointment.patient_id == patient_id)\
            .order_by(Appointment.appointment_date.desc())\
            .all()
    
    @staticmethod
    def get_dashboard_stats(user_id):
        """Single query for dashboard statistics"""
        return db.session.execute(text("""
            SELECT 
                COUNT(CASE WHEN a.status = 'confirmed' THEN 1 END) as confirmed_appointments,
                COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
                COUNT(DISTINCT p.id) as total_patients,
                AVG(CASE WHEN e.pain_level IS NOT NULL THEN e.pain_level END) as avg_pain_level
            FROM appointments a
            LEFT JOIN patients p ON p.id = a.patient_id
            LEFT JOIN evolutions e ON e.appointment_id = a.id
            WHERE a.professional_id = (
                SELECT id FROM professionals WHERE user_id = :user_id
            )
            AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 days'
        """), {'user_id': user_id}).fetchone()
```

#### Database Partitioning
```sql
-- Partition large tables by date
CREATE TABLE appointments_y2024 PARTITION OF appointments
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE appointments_y2025 PARTITION OF appointments  
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

## 🗃️ Caching Strategy

### Redis Implementation

```python
# backend/app/utils/cache.py
import redis
import json
import pickle
from functools import wraps

redis_client = redis.from_url(os.getenv('REDIS_URL'))

class CacheManager:
    def __init__(self):
        self.redis = redis_client
        self.default_ttl = 3600  # 1 hour
    
    def get(self, key):
        """Get cached value"""
        value = self.redis.get(key)
        if value:
            return pickle.loads(value)
        return None
    
    def set(self, key, value, ttl=None):
        """Set cached value"""
        ttl = ttl or self.default_ttl
        self.redis.setex(key, ttl, pickle.dumps(value))
    
    def delete(self, key):
        """Delete cached value"""
        self.redis.delete(key)
    
    def cache_result(self, key_func, ttl=None):
        """Decorator to cache function results"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                cache_key = key_func(*args, **kwargs)
                
                # Try to get from cache
                cached_result = self.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                # Execute function and cache result
                result = func(*args, **kwargs)
                self.set(cache_key, result, ttl)
                return result
            return wrapper
        return decorator

cache = CacheManager()

# Usage examples
@cache.cache_result(lambda user_id: f"dashboard_stats:{user_id}", ttl=300)
def get_dashboard_stats(user_id):
    return OptimizedQueries.get_dashboard_stats(user_id)

@cache.cache_result(lambda patient_id: f"patient_appointments:{patient_id}", ttl=600)
def get_patient_appointments(patient_id):
    return OptimizedQueries.get_patient_appointments_optimized(patient_id)
```

### Cache Invalidation
```python
# backend/app/utils/cache_invalidation.py
class CacheInvalidator:
    def __init__(self, cache_manager):
        self.cache = cache_manager
    
    def invalidate_patient_cache(self, patient_id):
        """Invalidate all patient-related caches"""
        patterns = [
            f"patient_appointments:{patient_id}",
            f"patient_exercises:{patient_id}",
            f"patient_progress:{patient_id}",
            f"patient_stats:*"
        ]
        
        for pattern in patterns:
            keys = self.cache.redis.keys(pattern)
            if keys:
                self.cache.redis.delete(*keys)
    
    def invalidate_appointment_cache(self, appointment_id):
        """Invalidate appointment-related caches"""
        appointment = Appointment.query.get(appointment_id)
        if appointment:
            self.invalidate_patient_cache(appointment.patient_id)
            self.cache.delete(f"professional_schedule:{appointment.professional_id}")
```

## 🌐 CDN & Asset Optimization

### Cloudflare Configuration

```javascript
// cloudflare-config.js
const CDN_CONFIG = {
  // Cache static assets for 1 year
  "*.js": {
    "cache_control": "public, max-age=31536000, immutable",
    "edge_cache_ttl": 31536000
  },
  "*.css": {
    "cache_control": "public, max-age=31536000, immutable",
    "edge_cache_ttl": 31536000
  },
  "*.png": {
    "cache_control": "public, max-age=31536000",
    "edge_cache_ttl": 31536000
  },
  
  // Cache API responses for 5 minutes
  "/api/exercises": {
    "cache_control": "public, max-age=300",
    "edge_cache_ttl": 300
  },
  "/api/protocols": {
    "cache_control": "public, max-age=1800",
    "edge_cache_ttl": 1800
  }
};
```

### Image Optimization

```javascript
// frontend/next.config.js - Already implemented
images: {
  domains: ['localhost', 'railway.app', 'your-domain.com'],
  formats: ['image/webp', 'image/avif'],
  minimumCacheTTL: 31536000,
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
}
```

## ⚛️ Frontend Optimizations

### Code Splitting & Lazy Loading

```javascript
// frontend/src/components/LazyComponents.js
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load heavy components
export const PatientChart = dynamic(
  () => import('./charts/PatientChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

export const ExercisePlayer = dynamic(
  () => import('./exercises/ExercisePlayer'),
  {
    loading: () => <VideoSkeleton />,
    ssr: false
  }
);

export const AIAssistant = dynamic(
  () => import('./ai/AIAssistant'),
  {
    loading: () => <ChatSkeleton />,
    ssr: false
  }
);

// Route-based code splitting
export const PatientManagement = dynamic(
  () => import('../pages/patients'),
  { ssr: true }
);
```

### React Performance Optimizations

```javascript
// frontend/src/hooks/useOptimizedQuery.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';

export function useOptimizedPatients() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // Memoized search function
  const searchPatients = useCallback((query) => {
    if (!data || !query) return data;
    
    return data.filter(patient =>
      patient.name.toLowerCase().includes(query.toLowerCase()) ||
      patient.email.toLowerCase().includes(query.toLowerCase())
    );
  }, [data]);

  // Optimistic updates
  const updatePatient = useMutation({
    mutationFn: updatePatientAPI,
    onMutate: async (updatedPatient) => {
      await queryClient.cancelQueries(['patients']);
      
      const previousPatients = queryClient.getQueryData(['patients']);
      
      queryClient.setQueryData(['patients'], old =>
        old.map(patient =>
          patient.id === updatedPatient.id
            ? { ...patient, ...updatedPatient }
            : patient
        )
      );
      
      return { previousPatients };
    },
    onError: (err, newPatient, context) => {
      queryClient.setQueryData(['patients'], context.previousPatients);
    },
    onSettled: () => {
      queryClient.invalidateQueries(['patients']);
    },
  });

  return {
    patients: data,
    isLoading,
    error,
    searchPatients,
    updatePatient: updatePatient.mutate
  };
}
```

### Virtual Scrolling for Large Lists

```javascript
// frontend/src/components/VirtualizedList.js
import { FixedSizeList as List } from 'react-window';
import { memo } from 'react';

const VirtualizedPatientsList = memo(({ patients }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <PatientCard patient={patients[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={patients.length}
      itemSize={80}
      overscanCount={5}
    >
      {Row}
    </List>
  );
});

export default VirtualizedPatientsList;
```

## 📱 Mobile Performance

### React Native Optimizations

```javascript
// mobile/src/optimizations/PerformanceOptimizations.js
import { InteractionManager, Platform } from 'react-native';

// Optimize heavy operations
export const runAfterInteractions = (callback) => {
  InteractionManager.runAfterInteractions(callback);
};

// Image optimization
export const optimizeImage = (uri, width, height) => {
  const ratio = Platform.OS === 'ios' ? 2 : 1;
  return `${uri}?w=${width * ratio}&h=${height * ratio}&q=80&f=webp`;
};

// Lazy loading for screens
export const useLazyScreen = (Component) => {
  return React.lazy(() => {
    return new Promise(resolve => {
      runAfterInteractions(() => {
        resolve({ default: Component });
      });
    });
  });
};

// Memory management
export const useMemoryOptimization = () => {
  useEffect(() => {
    const cleanup = () => {
      // Clear image cache
      if (Platform.OS === 'ios') {
        // iOS specific cleanup
      } else {
        // Android specific cleanup
      }
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        cleanup();
      }
    });

    return () => subscription?.remove();
  }, []);
};
```

### Native Module Optimizations

```javascript
// mobile/src/modules/NativeOptimizations.js
import { NativeModules } from 'react-native';

// Use native modules for heavy computations
const { PerformanceModule } = NativeModules;

export const processLargeDataset = async (data) => {
  try {
    // Offload to native thread
    const result = await PerformanceModule.processData(data);
    return result;
  } catch (error) {
    // Fallback to JavaScript
    return processDataJS(data);
  }
};

// Background processing
export const useBackgroundProcessing = (data, processor) => {
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!data) return;

    setIsProcessing(true);
    
    const processInBackground = async () => {
      const processed = await processor(data);
      setResult(processed);
      setIsProcessing(false);
    };

    runAfterInteractions(processInBackground);
  }, [data, processor]);

  return { result, isProcessing };
};
```

## 🚀 Bundle Optimization

### Webpack Optimizations

```javascript
// frontend/webpack.config.js
const path = require('path');

module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
        }
      },
    },
    usedExports: true,
    sideEffects: false,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'lodash': 'lodash-es', // Use ES modules version
    }
  },
  
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { modules: false }],
              '@babel/preset-react',
              '@babel/preset-typescript'
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              'lodash', // Tree shake lodash
            ]
          }
        }
      }
    ]
  }
};
```

### Tree Shaking Configuration

```json
// frontend/package.json
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js"
  ]
}
```

## 📊 Performance Monitoring

### Web Vitals Tracking

```javascript
// frontend/src/utils/webVitals.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const sendToAnalytics = (metric) => {
  // Send to your analytics service
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metric)
  });
};

export const trackWebVitals = () => {
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
};

// Usage in _app.js
export function reportWebVitals(metric) {
  trackWebVitals();
}
```

### Performance Budget

```json
// .performance-budget.json
{
  "budget": {
    "javascript": "300kb",
    "css": "50kb",
    "images": "500kb",
    "fonts": "100kb",
    "total": "1mb"
  },
  "thresholds": {
    "fcp": 2000,
    "lcp": 2500,
    "cls": 0.1,
    "fid": 100,
    "ttfb": 800
  }
}
```

## 🎯 Implementation Priority

### Phase 1 (Week 1)
1. **Database Connection Pooling** ⚡
2. **Redis Caching Setup** ⚡
3. **Image Optimization** ⚡
4. **Basic Code Splitting** ⚡

### Phase 2 (Week 2)
1. **Query Optimization** 🔄
2. **CDN Configuration** 🔄
3. **Virtual Scrolling** 🔄
4. **Mobile Optimizations** 🔄

### Phase 3 (Week 3-4)
1. **Advanced Caching** 🎯
2. **Bundle Optimization** 🎯
3. **Database Partitioning** 🎯
4. **Performance Monitoring** 🎯

## 📈 Expected Results

### Before Optimizations
- Response Time: ~3-5s
- Database Queries: ~200-500ms
- Bundle Size: ~2-3MB
- Lighthouse Score: ~70-80

### After Optimizations
- Response Time: <2s ✅
- Database Queries: <100ms ✅
- Bundle Size: <1MB ✅
- Lighthouse Score: >95 ✅

**Next Step**: Execute performance optimizations after successful deployment