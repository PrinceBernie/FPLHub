/**
 * API Monitor Component
 * Displays real-time API performance metrics
 * Based on the Medium article's monitoring recommendations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { apiOptimizer } from '../../utils/api-optimization';

interface ApiMonitorProps {
  show?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const ApiMonitor: React.FC<ApiMonitorProps> = ({ 
  show = false, 
  position = 'top-right' 
}) => {
  const [metrics, setMetrics] = useState(apiOptimizer.getMetrics());
  const [cacheStats, setCacheStats] = useState(apiOptimizer.getCacheStats());

  useEffect(() => {
    if (!show) return;

    const interval = setInterval(() => {
      setMetrics(apiOptimizer.getMetrics());
      setCacheStats(apiOptimizer.getCacheStats());
    }, 1000);

    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  const getPerformanceColor = (rate: number) => {
    if (rate >= 0.8) return 'bg-green-500';
    if (rate >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getResponseTimeColor = (time: number) => {
    if (time <= 500) return 'text-green-600';
    if (time <= 1000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      <Card className="w-80 bg-background/95 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            📊 API Monitor
            <Badge variant="outline" className="text-xs">
              Live
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Request Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">Requests</div>
              <div className="font-mono font-medium">{metrics.requestCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Errors</div>
              <div className="font-mono font-medium text-red-600">{metrics.errorCount}</div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Avg Response Time</span>
                <span className={`font-mono ${getResponseTimeColor(metrics.averageResponseTime)}`}>
                  {metrics.averageResponseTime.toFixed(0)}ms
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div 
                  className={`h-1 rounded-full ${getPerformanceColor(1 - metrics.averageResponseTime / 2000)}`}
                  style={{ width: `${Math.min(100, (2000 - metrics.averageResponseTime) / 20)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Cache Hit Rate</span>
                <span className="font-mono text-green-600">
                  {(metrics.cacheHitRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div 
                  className={`h-1 rounded-full ${getPerformanceColor(metrics.cacheHitRate)}`}
                  style={{ width: `${metrics.cacheHitRate * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cache Stats */}
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-1">Cache</div>
            <div className="flex justify-between text-xs">
              <span>Entries: {cacheStats.size}</span>
              <span>Keys: {cacheStats.keys.length}</span>
            </div>
          </div>

          {/* Performance Tips */}
          {metrics.cacheHitRate < 0.5 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                💡 Tip: Low cache hit rate. Consider increasing cache TTL.
              </div>
            </div>
          )}

          {metrics.averageResponseTime > 1000 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                ⚠️ Warning: High response times detected.
              </div>
            </div>
          )}

          {metrics.errorCount > 5 && (
            <div className="pt-2 border-t">
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                🔴 Circuit breaker may be active due to repeated failures.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiMonitor;
