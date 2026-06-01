import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { FiBarChart2, FiCalendar, FiTrendingUp } from 'react-icons/fi';

/**
 * Stats Tab - Analytics and historical data visualization
 */
export function StatsTab({
  tasks = [],
  moodTrend = [],
  productivityMetrics = [],
  awData = []
}) {
  const today = new Date().toISOString().split('T')[0];

  // 30-day productivity trend
  const productivity30Day = productivityMetrics.slice(-30);

  // App usage distribution (ranked bars for decision-making clarity)
  const usageDistribution = React.useMemo(() => {
    if (!awData || awData.length === 0) return [];
    
    return awData
      .sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0))
      .slice(0, 5)
      .map(site => ({
        name: new URL(`https://${site.url}`).hostname.replace('www.', ''),
        value: Math.round(site.duration_minutes || 0)
      }));
  }, [awData]);

  // Weekly task completion
  const weeklyCompletion = React.useMemo(() => {
    const weeks = {};
    tasks.forEach(task => {
      const date = new Date(task.date);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { week: weekKey, completed: 0, total: 0 };
      }
      weeks[weekKey].total += 1;
      if (task.completed) weeks[weekKey].completed += 1;
    });
    
    return Object.values(weeks)
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-4)
      .map(w => ({
        ...w,
        completionRate: w.total > 0 ? Math.round((w.completed / w.total) * 100) : 0
      }));
  }, [tasks]);

  const COLORS = ['rgb(255, 201, 133)', 'rgb(157, 220, 255)', 'rgba(80, 220, 140)', 'rgba(255, 100, 130)', 'rgba(100, 150, 200)'];

  return (
    <div className="stats-tab">
      <div className="stats-container">
        {/* 30-Day Productivity Trend */}
        <div className="card stats-card">
          <div className="stats-header">
            <FiTrendingUp size={20} />
            <h3>30-Day Productivity Trend</h3>
          </div>
          {productivity30Day.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={productivity30Day}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'var(--text-muted)' }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="var(--text-muted)"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'var(--text-muted)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(255, 201, 133, 0.5)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="rgb(255, 201, 133)"
                  dot={{ fill: 'rgb(255, 201, 133)', r: 4 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-center py-lg">No data yet. Start tracking to see trends.</p>
          )}
        </div>

        {/* Mood Trend */}
        <div className="card stats-card">
          <div className="stats-header">
            <FiCalendar size={20} />
            <h3>Mood Trend (Last 30 days)</h3>
          </div>
          {moodTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={moodTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'var(--text-muted)' }}
                />
                <YAxis
                  domain={[0, 10]}
                  stroke="var(--text-muted)"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'var(--text-muted)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(157, 220, 255, 0.5)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="rgb(157, 220, 255)"
                  dot={{ fill: 'rgb(157, 220, 255)', r: 4 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-center py-lg">No mood data yet. Complete evening routines to log your mood.</p>
          )}
        </div>

        {/* App Usage Distribution */}
        {usageDistribution.length > 0 && (
          <div className="card stats-card">
            <div className="stats-header">
              <FiBarChart2 size={20} />
              <h3>Top App Usage</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usageDistribution} layout="vertical" margin={{ left: 20, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis type="number" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} />
                <YAxis type="category" dataKey="name" stroke="var(--text-muted)" width={120} tick={{ fill: 'var(--text-muted)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(157, 220, 255, 0.22)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                  formatter={(value) => `${value} minutes`}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {usageDistribution.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Weekly Task Completion */}
        {weeklyCompletion.length > 0 && (
          <div className="card stats-card">
            <div className="stats-header">
              <FiTrendingUp size={20} />
              <h3>Weekly Task Completion Rate</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyCompletion}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis
                  dataKey="week"
                  stroke="var(--text-muted)"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'var(--text-muted)' }}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="var(--text-muted)"
                  style={{ fontSize: '12px' }}
                  tick={{ fill: 'var(--text-muted)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid rgba(80, 220, 140, 0.5)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)'
                  }}
                  formatter={(value) => `${value}%`}
                />
                <Bar dataKey="completionRate" fill="rgba(80, 220, 140)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsTab;
