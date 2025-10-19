import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { questionBank } from '@/lib/questionLoader';

interface AnalyticsData {
  accuracyByType: Record<string, { correct: number; total: number; accuracy: number }>;
  accuracyByLevel: Record<number, { correct: number; total: number; accuracy: number }>;
  accuracyByTypeLevel: Record<string, Record<number, { correct: number; total: number; accuracy: number }>>;
  trend7d: Record<string, number>;
}

interface OpportunityArea {
  type: string;
  level: number;
  impact: number;
  currentAccuracy: number;
  gap: number;
}

const Analytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [opportunities, setOpportunities] = React.useState<OpportunityArea[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Fetch attempts from last 30 days
      const { data: attempts, error } = await supabase
        .from('attempts')
        .select('qtype, level, correct, timestamp_iso')
        .gte('timestamp_iso', thirtyDaysAgo.toISOString())
        .order('timestamp_iso', { ascending: false });

      if (error) throw error;

      // Calculate accuracy by type
      const typeStats: Record<string, { correct: number; total: number }> = {};
      const levelStats: Record<number, { correct: number; total: number }> = {};
      const typeLevelStats: Record<string, Record<number, { correct: number; total: number }>> = {};
      
      // For 7-day trend
      const type7d: Record<string, { correct: number; total: number }> = {};
      const typePrev7d: Record<string, { correct: number; total: number }> = {};

      attempts?.forEach(attempt => {
        const { qtype, level, correct, timestamp_iso } = attempt;
        const timestamp = new Date(timestamp_iso);

        // All 30 days
        if (!typeStats[qtype]) typeStats[qtype] = { correct: 0, total: 0 };
        typeStats[qtype].total++;
        if (correct) typeStats[qtype].correct++;

        if (!levelStats[level]) levelStats[level] = { correct: 0, total: 0 };
        levelStats[level].total++;
        if (correct) levelStats[level].correct++;

        if (!typeLevelStats[qtype]) typeLevelStats[qtype] = {};
        if (!typeLevelStats[qtype][level]) typeLevelStats[qtype][level] = { correct: 0, total: 0 };
        typeLevelStats[qtype][level].total++;
        if (correct) typeLevelStats[qtype][level].correct++;

        // Last 7 days vs previous 7 days
        if (timestamp >= sevenDaysAgo) {
          if (!type7d[qtype]) type7d[qtype] = { correct: 0, total: 0 };
          type7d[qtype].total++;
          if (correct) type7d[qtype].correct++;
        } else if (timestamp >= fourteenDaysAgo) {
          if (!typePrev7d[qtype]) typePrev7d[qtype] = { correct: 0, total: 0 };
          typePrev7d[qtype].total++;
          if (correct) typePrev7d[qtype].correct++;
        }
      });

      // Calculate accuracy percentages
      const accuracyByType: Record<string, { correct: number; total: number; accuracy: number }> = {};
      Object.entries(typeStats).forEach(([type, stats]) => {
        accuracyByType[type] = {
          ...stats,
          accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
        };
      });

      const accuracyByLevel: Record<number, { correct: number; total: number; accuracy: number }> = {};
      Object.entries(levelStats).forEach(([level, stats]) => {
        accuracyByLevel[Number(level)] = {
          ...stats,
          accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
        };
      });

      const accuracyByTypeLevel: Record<string, Record<number, { correct: number; total: number; accuracy: number }>> = {};
      Object.entries(typeLevelStats).forEach(([type, levels]) => {
        accuracyByTypeLevel[type] = {};
        Object.entries(levels).forEach(([level, stats]) => {
          accuracyByTypeLevel[type][Number(level)] = {
            ...stats,
            accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
          };
        });
      });

      // Calculate 7-day trends
      const trend7d: Record<string, number> = {};
      Object.keys(accuracyByType).forEach(type => {
        const current7d = type7d[type] ? (type7d[type].correct / type7d[type].total) * 100 : 0;
        const prev7d = typePrev7d[type] ? (typePrev7d[type].correct / typePrev7d[type].total) * 100 : 0;
        trend7d[type] = current7d - prev7d;
      });

      setData({
        accuracyByType,
        accuracyByLevel,
        accuracyByTypeLevel,
        trend7d,
      });

      // Calculate impact scores and find top 3 opportunities
      const targetAccuracy = 85;
      const totalAttempts = attempts?.length || 1;
      const impactScores: OpportunityArea[] = [];

      Object.entries(accuracyByTypeLevel).forEach(([type, levels]) => {
        Object.entries(levels).forEach(([level, stats]) => {
          const currentAccuracy = stats.accuracy;
          const gap = Math.max(0, targetAccuracy - currentAccuracy);
          const recentShare = stats.total / totalAttempts;
          const impact = Math.round(100 * gap * recentShare);

          if (impact > 0) {
            impactScores.push({
              type,
              level: Number(level),
              impact,
              currentAccuracy,
              gap,
            });
          }
        });
      });

      // Sort by impact and take top 3
      const topOpportunities = impactScores
        .sort((a, b) => b.impact - a.impact)
        .slice(0, 3);

      setOpportunities(topOpportunities);
      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setLoading(false);
    }
  };

  const startDrill = (type?: string, level?: number, count = 6) => {
    const manifest = questionBank.getManifest();
    const pts = Object.keys(manifest.byPT).map(Number);
    
    navigate('/drill', {
      state: {
        mode: 'type-drill',
        config: {
          qtypes: type ? [type] : [],
          difficulties: level ? [level] : [],
          pts,
          count,
        },
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const sortedTypes = Object.keys(data.accuracyByType).sort();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2 text-gray-900"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Opportunity Rings */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Top Opportunities</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {opportunities.map((opp, idx) => (
              <Card
                key={idx}
                className="p-6 bg-gray-50 border-gray-200 hover:border-gray-900 transition-colors cursor-pointer"
                onClick={() => startDrill(opp.type, opp.level)}
              >
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32 mb-4">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#111827"
                        strokeWidth="8"
                        strokeDasharray={`${(opp.currentAccuracy / 100) * 251.2} 251.2`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-2xl font-bold text-gray-900">{opp.impact}</div>
                      <div className="text-xs text-gray-600">Impact</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">{opp.type} · L{opp.level}</div>
                    <div className="text-sm text-gray-600 mt-1">Start focused drill</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Type Bars & Matrix Layout */}
        <div className="grid lg:grid-cols-[1fr_auto] gap-8">
          {/* Type Bars */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance by Type</h2>
            <div className="space-y-4">
              {sortedTypes.map(type => {
                const stats = data.accuracyByType[type];
                const trend = data.trend7d[type] || 0;
                
                return (
                  <div
                    key={type}
                    className="group cursor-pointer"
                    onClick={() => startDrill(type, undefined)}
                  >
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-48 text-sm text-gray-900 font-medium">{type}</div>
                      <div className="flex-1 h-8 bg-gray-50 border border-gray-200 rounded relative overflow-hidden group-hover:border-gray-900 transition-colors">
                        <div
                          className="h-full bg-gray-900 transition-all"
                          style={{ width: `${stats.accuracy}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-2">
                          <span className="text-xs text-gray-600 font-medium">
                            {Math.round(stats.accuracy)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-12 text-xs text-gray-600 text-right">
                        {trend > 0 ? '↑' : trend < 0 ? '↓' : '—'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Matrix */}
          <div className="lg:w-80">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Type × Level Matrix</h2>
            <Card className="p-4 bg-gray-50 border-gray-200">
              <div className="space-y-2">
                <div className="flex gap-2 mb-4">
                  <div className="w-24" />
                  {[1, 2, 3, 4, 5].map(level => (
                    <div key={level} className="w-10 text-center text-xs text-gray-600 font-medium">
                      L{level}
                    </div>
                  ))}
                </div>
                {sortedTypes.map(type => (
                  <div key={type} className="flex gap-2 items-center">
                    <div className="w-24 text-xs text-gray-900 truncate">{type}</div>
                    {[1, 2, 3, 4, 5].map(level => {
                      const stats = data.accuracyByTypeLevel[type]?.[level];
                      const accuracy = stats?.accuracy || 0;
                      const size = Math.max(4, (accuracy / 100) * 24);
                      const opacity = stats ? 1 - (accuracy / 100) * 0.5 : 0.2;
                      
                      return (
                        <div
                          key={level}
                          className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-gray-200 rounded transition-colors"
                          onClick={() => startDrill(type, level)}
                        >
                          <div
                            className="rounded-full bg-gray-900 transition-all"
                            style={{
                              width: `${size}px`,
                              height: `${size}px`,
                              opacity,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Difficulty Circles */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance by Difficulty</h2>
          <div className="grid grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map(level => {
              const stats = data.accuracyByLevel[level] || { accuracy: 0 };
              
              return (
                <Card
                  key={level}
                  className="p-6 bg-gray-50 border-gray-200 hover:border-gray-900 transition-colors cursor-pointer"
                  onClick={() => startDrill(undefined, level)}
                >
                  <div className="flex flex-col items-center">
                    <div className="relative w-24 h-24 mb-4">
                      <svg viewBox="0 0 100 100" className="transform -rotate-90">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="6"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#111827"
                          strokeWidth="6"
                          strokeDasharray={`${(stats.accuracy / 100) * 251.2} 251.2`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-xl font-bold text-gray-900">
                          {Math.round(stats.accuracy)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">Level {level}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
