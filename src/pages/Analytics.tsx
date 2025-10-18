import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { Flame, TrendingUp, Award, Brain, Target, Zap } from "lucide-react";

interface AnalyticsData {
  radarData: Array<{ dimension: string; value: number; max: number }>;
  questionTypeStats: Array<{ type: string; accuracy: number; count: number; avgTime: number }>;
  difficultyStats: Array<{ level: number; accuracy: number; count: number }>;
  recentAttempts: Array<{ date: string; correct: number; total: number }>;
  totalAttempts: number;
  overallAccuracy: number;
  avgTimeMs: number;
  streak: number;
  xp: number;
}

export default function Analytics() {
  const navigate = useNavigate();
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [coachInsight, setCoachInsight] = React.useState(0);
  const classId = 'demo_user'; // TODO: Get from auth context

  const coachInsights = [
    "Your accuracy on 'Flaw' questions has improved 23% this week! 🎯",
    "Try tackling Level 4 questions - you're ready for the challenge! 💪",
    "Speed tip: You're fastest on 'Must be True' - use that confidence! ⚡",
    "Your consistency streak is growing - keep the momentum! 🔥",
    "Weakness identified: 'Parallel Reasoning' - revisit those strategies! 📚",
    "You've mastered Level 3 questions - time to level up! 🚀",
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCoachInsight((prev) => (prev + 1) % coachInsights.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    if (!classId) return;

    try {
      // Fetch attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from("attempts")
        .select("*")
        .eq("class_id", classId)
        .order("timestamp_iso", { ascending: false });

      if (attemptsError) throw attemptsError;

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("class_id", classId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      if (!attempts || attempts.length === 0) {
        setData({
          radarData: [],
          questionTypeStats: [],
          difficultyStats: [],
          recentAttempts: [],
          totalAttempts: 0,
          overallAccuracy: 0,
          avgTimeMs: 0,
          streak: profile?.streak_current || 0,
          xp: profile?.xp_total || 0,
        });
        setIsLoading(false);
        return;
      }

      // Calculate radar data
      const totalAttempts = attempts.length;
      const correctAttempts = attempts.filter((a) => a.correct).length;
      const overallAccuracy = (correctAttempts / totalAttempts) * 100;
      const avgTime = attempts.reduce((sum, a) => sum + a.time_ms, 0) / totalAttempts;

      // Calculate consistency (std dev of accuracy over time)
      const dailyAccuracy = calculateDailyAccuracy(attempts);
      const consistency = 100 - Math.min(calculateStdDev(dailyAccuracy.map(d => d.accuracy)), 30);

      // Question type diversity
      const uniqueTypes = new Set(attempts.map((a) => a.qtype)).size;
      const typeDiversity = Math.min((uniqueTypes / 15) * 100, 100);

      // Difficulty mastery
      const avgDifficulty = attempts.reduce((sum, a) => sum + a.level, 0) / totalAttempts;
      const difficultyMastery = Math.min((avgDifficulty / 5) * 100, 100);

      // Speed score (faster is better, normalized)
      const speedScore = Math.max(0, 100 - ((avgTime - 60000) / 1000));

      // Growth trajectory (last 20 vs first 20)
      const growthScore = calculateGrowthScore(attempts);

      const radarData = [
        { dimension: "Accuracy", value: overallAccuracy, max: 100 },
        { dimension: "Speed", value: Math.max(0, Math.min(speedScore, 100)), max: 100 },
        { dimension: "Consistency", value: consistency, max: 100 },
        { dimension: "Difficulty", value: difficultyMastery, max: 100 },
        { dimension: "Breadth", value: typeDiversity, max: 100 },
        { dimension: "Growth", value: growthScore, max: 100 },
      ];

      // Question type stats
      const typeStats = calculateTypeStats(attempts);

      // Difficulty stats
      const diffStats = calculateDifficultyStats(attempts);

      // Recent attempts for heatmap
      const recentAttempts = dailyAccuracy.slice(0, 90).reverse();

      setData({
        radarData,
        questionTypeStats: typeStats,
        difficultyStats: diffStats,
        recentAttempts,
        totalAttempts,
        overallAccuracy,
        avgTimeMs: avgTime,
        streak: profile?.streak_current || 0,
        xp: profile?.xp_total || 0,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDailyAccuracy = (attempts: any[]) => {
    const dailyMap = new Map<string, { correct: number; total: number }>();
    attempts.forEach((a) => {
      const date = new Date(a.timestamp_iso).toISOString().split("T")[0];
      const existing = dailyMap.get(date) || { correct: 0, total: 0 };
      dailyMap.set(date, {
        correct: existing.correct + (a.correct ? 1 : 0),
        total: existing.total + 1,
      });
    });

    return Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        accuracy: (stats.correct / stats.total) * 100,
        correct: stats.correct,
        total: stats.total,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const calculateStdDev = (values: number[]) => {
    if (values.length === 0) return 0;
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  };

  const calculateGrowthScore = (attempts: any[]) => {
    if (attempts.length < 20) return 50;
    const recent = attempts.slice(0, 20);
    const old = attempts.slice(-20);
    const recentAcc = recent.filter((a) => a.correct).length / recent.length;
    const oldAcc = old.filter((a) => a.correct).length / old.length;
    return Math.min(Math.max(((recentAcc - oldAcc) + 0.5) * 100, 0), 100);
  };

  const calculateTypeStats = (attempts: any[]) => {
    const typeMap = new Map<string, { correct: number; total: number; timeSum: number }>();
    attempts.forEach((a) => {
      const existing = typeMap.get(a.qtype) || { correct: 0, total: 0, timeSum: 0 };
      typeMap.set(a.qtype, {
        correct: existing.correct + (a.correct ? 1 : 0),
        total: existing.total + 1,
        timeSum: existing.timeSum + a.time_ms,
      });
    });

    return Array.from(typeMap.entries())
      .map(([type, stats]) => ({
        type,
        accuracy: (stats.correct / stats.total) * 100,
        count: stats.total,
        avgTime: stats.timeSum / stats.total,
      }))
      .sort((a, b) => b.count - a.count);
  };

  const calculateDifficultyStats = (attempts: any[]) => {
    const diffMap = new Map<number, { correct: number; total: number }>();
    attempts.forEach((a) => {
      const existing = diffMap.get(a.level) || { correct: 0, total: 0 };
      diffMap.set(a.level, {
        correct: existing.correct + (a.correct ? 1 : 0),
        total: existing.total + 1,
      });
    });

    return Array.from(diffMap.entries())
      .map(([level, stats]) => ({
        level,
        accuracy: (stats.correct / stats.total) * 100,
        count: stats.total,
      }))
      .sort((a, b) => a.level - b.level);
  };

  const getHeatmapColor = (accuracy: number, total: number) => {
    if (total === 0) return "hsl(var(--muted))";
    if (accuracy >= 80) return "hsl(142 71% 45%)";
    if (accuracy >= 60) return "hsl(142 71% 65%)";
    if (accuracy >= 40) return "hsl(38 92% 50%)";
    return "hsl(0 72% 51%)";
  };

  const getMasteryLevel = (accuracy: number) => {
    if (accuracy >= 90) return { label: "Mastered", color: "hsl(142 71% 45%)" };
    if (accuracy >= 75) return { label: "Proficient", color: "hsl(142 71% 65%)" };
    if (accuracy >= 60) return { label: "Developing", color: "hsl(38 92% 50%)" };
    return { label: "Needs Work", color: "hsl(0 72% 51%)" };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading analytics...</p>
      </div>
    );
  }

  if (!data || data.totalAttempts === 0) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </div>
          <Card className="p-12 text-center">
            <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No Data Yet</h2>
            <p className="text-muted-foreground mb-6">
              Complete some drills to see your analytics and track your progress!
            </p>
            <Button onClick={() => navigate("/")}>Start Your First Drill</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Track your progress and master logical reasoning</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>

        {/* Top Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-gradient-to-br from-background to-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total XP</p>
                <p className="text-3xl font-bold">{data.xp.toLocaleString()}</p>
              </div>
              <Award className="w-10 h-10 text-primary" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-background to-success/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Accuracy</p>
                <p className="text-3xl font-bold">{data.overallAccuracy.toFixed(1)}%</p>
              </div>
              <Target className="w-10 h-10" style={{ color: "hsl(142 71% 45%)" }} />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-background to-warning/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Streak</p>
                <p className="text-3xl font-bold">{data.streak} days</p>
              </div>
              <Flame className="w-10 h-10" style={{ color: "hsl(38 92% 50%)" }} />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-background to-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Speed</p>
                <p className="text-3xl font-bold">{(data.avgTimeMs / 1000).toFixed(0)}s</p>
              </div>
              <Zap className="w-10 h-10 text-primary" />
            </div>
          </Card>
        </div>

        {/* AI Coach Insight */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary rounded-lg">
              <Brain className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1 flex items-center gap-2">
                AI Coach Insight
                <TrendingUp className="w-4 h-4 text-success" />
              </h3>
              <p className="text-muted-foreground">{coachInsights[coachInsight]}</p>
            </div>
          </div>
        </Card>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Performance Radar */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Performance Radar</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={data.radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Speed vs Accuracy Scatter */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Speed vs Accuracy by Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis
                  type="number"
                  dataKey="avgTime"
                  name="Avg Time (ms)"
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}s`}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  type="number"
                  dataKey="accuracy"
                  name="Accuracy"
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <ZAxis type="number" dataKey="count" range={[50, 400]} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-md p-3 shadow-md">
                        <p className="font-semibold">{data.type}</p>
                        <p className="text-sm">Accuracy: {data.accuracy.toFixed(1)}%</p>
                        <p className="text-sm">Avg Time: {(data.avgTime / 1000).toFixed(1)}s</p>
                        <p className="text-sm">Attempts: {data.count}</p>
                      </div>
                    );
                  }}
                />
                <Scatter data={data.questionTypeStats} fill="hsl(var(--primary))">
                  {data.questionTypeStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.accuracy >= 80
                          ? "hsl(142 71% 45%)"
                          : entry.accuracy >= 60
                          ? "hsl(38 92% 50%)"
                          : "hsl(0 72% 51%)"
                      }
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Question Type Mastery Rings */}
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-bold mb-6">Question Type Mastery</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {data.questionTypeStats.slice(0, 10).map((stat) => {
              const mastery = getMasteryLevel(stat.accuracy);
              return (
                <div key={stat.type} className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-3">
                    <svg className="transform -rotate-90 w-24 h-24">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="hsl(var(--muted))"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke={mastery.color}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(stat.accuracy / 100) * 251.2} 251.2`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">{stat.accuracy.toFixed(0)}%</span>
                    </div>
                  </div>
                  <p className="font-semibold text-sm truncate">{stat.type}</p>
                  <p className="text-xs text-muted-foreground">{mastery.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.count} attempts</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Difficulty Distribution */}
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-bold mb-4">Difficulty Level Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.difficultyStats}>
              <XAxis
                dataKey="level"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `Level ${value}`}
              />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
              <Tooltip
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-md p-3 shadow-md">
                      <p className="font-semibold">Level {data.level}</p>
                      <p className="text-sm">Accuracy: {data.accuracy.toFixed(1)}%</p>
                      <p className="text-sm">Attempts: {data.count}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="accuracy" radius={[8, 8, 0, 0]}>
                {data.difficultyStats.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.accuracy >= 80
                        ? "hsl(142 71% 45%)"
                        : entry.accuracy >= 60
                        ? "hsl(38 92% 50%)"
                        : "hsl(0 72% 51%)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Practice Heatmap */}
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Practice Activity (Last 90 Days)</h3>
          <div className="grid grid-cols-10 gap-2">
            {data.recentAttempts.map((day, index) => {
              const accuracy = (day.correct / day.total) * 100;
              return (
                <div
                  key={index}
                  className="aspect-square rounded transition-all hover:scale-110 cursor-pointer"
                  style={{
                    backgroundColor: getHeatmapColor(accuracy, day.total),
                  }}
                  title={`${day.date}: ${day.correct}/${day.total} (${accuracy.toFixed(0)}%)`}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-4 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(var(--muted))" }} />
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(0 72% 51%)" }} />
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(38 92% 50%)" }} />
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(142 71% 65%)" }} />
              <div className="w-4 h-4 rounded" style={{ backgroundColor: "hsl(142 71% 45%)" }} />
            </div>
            <span>More</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
