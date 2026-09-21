import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Search,
  Plus,
  Trash2,
  Users,
  CheckSquare,
  ArrowRight,
  Filter,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import EmptyState from '../components/EmptyState';
import ConfirmModal from '../components/ConfirmModal';

const MEETING_TYPES = [
  'All Types',
  'Project Meeting',
  'Client Meeting',
  'Sales Meeting',
  'Internal Meeting',
  'Requirement Discussion',
  'Retrospective',
  'Other'
];

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadMeetings = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedType !== 'All Types') params.meeting_type = selectedType;
      const data = await api.getMeetings(params);
      setMeetings(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch meetings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, [selectedType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadMeetings();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteMeeting(deleteTarget.id);
      setMeetings(meetings.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      alert(err.message || 'Failed to delete meeting.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Meetings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            View, search, and manage your captured sessions
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

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search meetings by title, transcript, or summary..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </form>

        <div className="relative sm:w-56">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none cursor-pointer"
          >
            {MEETING_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Filter className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      ) : meetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400">
                    {meeting.meeting_type}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{meeting.meeting_date}</span>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(meeting);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Delete meeting"
                      aria-label="Delete meeting"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                    className="font-bold text-slate-900 dark:text-white text-base hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    {meeting.title}
                  </h3>
                  {meeting.summary ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {meeting.summary}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-1">
                      No AI summary generated yet. Click to view and analyze.
                    </p>
                  )}
                </div>

                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {meeting.participants.map((p, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {/* Created and Updated timestamps */}
                <div className="flex items-center space-x-2 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>
                    Created: {new Date(meeting.created_at).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span>
                    Updated: {new Date(meeting.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <CheckSquare className="w-4 h-4 text-indigo-500" />
                  <span>
                    {meeting.open_action_count} open / {meeting.action_item_count} tasks
                  </span>
                </div>

                <button
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center space-x-1 cursor-pointer"
                >
                  <span>Open Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="No meetings found"
          description={
            search || selectedType !== 'All Types'
              ? 'No meetings match your filter criteria.'
              : 'You haven’t created any meetings yet. Click below to add one.'
          }
          actionLabel="New Meeting"
          onAction={() => navigate('/meetings/new')}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Meeting"
        message={`Are you sure you want to permanently delete "${deleteTarget?.title}"? All associated action items will also be deleted.`}
        loading={deleting}
      />
    </div>
  );
}
