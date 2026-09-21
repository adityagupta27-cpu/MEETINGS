import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Users,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import EmptyState from '../components/EmptyState';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard metrics.');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400">
        <h3 className="font-bold text-base mb-1">Error loading dashboard</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Total Meetings',
      value: stats?.total_meetings || 0,
      icon: Calendar,
      color: 'from-blue-600 to-indigo-600',
      bgLight: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
    },
    {
      title: 'Total Action Items',
      value: stats?.total_actions || 0,
      icon: CheckSquare,
      color: 'from-violet-600 to-purple-600',
      bgLight: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400',
    },
    {
      title: 'Open Deliverables',
      value: stats?.open_actions || 0,
      icon: Clock,
      color: 'from-amber-600 to-orange-600',
      bgLight: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
    },
    {
      title: 'Completed',
      value: stats?.completed_actions || 0,
      icon: CheckCircle2,
      color: 'from-emerald-600 to-teal-600',
      bgLight: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Operational Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time synthesis across all meetings and deliverables
          </p>
        </div>

        <button
          onClick={() => navigate('/meetings/new')}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm shadow-indigo-600/30 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Meeting</span>
        </button>
      </div>

      {/* Overdue Warning Alert if any */}
      {stats?.overdue_actions > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium">
              You have <strong>{stats.overdue_actions}</strong> action item(s) currently past their due date.
            </span>
          </div>
          <Link
            to="/actions?is_overdue=true"
            className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center space-x-1"
          >
            <span>Review Overdue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {card.title}
                </p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">
                  {card.value}
                </p>
              </div>
              <div className={`p-3 rounded-2xl ${card.bgLight}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Meetings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Recent Meetings
          </h2>
          <Link
            to="/meetings"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
          >
            <span>View all meetings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {stats?.recent_meetings && stats.recent_meetings.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800/60">
            {stats.recent_meetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => navigate(`/meetings/${meeting.id}`)}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {meeting.meeting_type}
                    </span>
                    <span className="text-xs text-slate-400">{meeting.meeting_date}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {meeting.title}
                  </h3>
                  {meeting.summary && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xl">
                      {meeting.summary}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-4 self-end sm:self-auto">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Users className="w-3.5 h-3.5" />
                    <span>{meeting.participants?.length || 0}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{meeting.action_item_count} tasks</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Calendar}
            title="No meetings recorded yet"
            description="Create your first meeting to ingest a transcript and extract automated AI action items."
            actionLabel="Create Meeting"
            onAction={() => navigate('/meetings/new')}
          />
        )}
      </div>
    </div>
  );
}
