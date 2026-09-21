import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckSquare,
  Search,
  Filter,
  AlertTriangle,
  Calendar,
  User,
  Edit,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import EmptyState from '../components/EmptyState';
import ActionItemModal from '../components/ActionItemModal';
import ConfirmModal from '../components/ConfirmModal';

export default function ActionTrackerPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialOverdue = searchParams.get('is_overdue') === 'true';

  const [actions, setActions] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [overdueOnly, setOverdueOnly] = useState(initialOverdue);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Modals
  const [editingAction, setEditingAction] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // New Action Modal from Tracker
  const [newActionOpen, setNewActionOpen] = useState(false);
  const [newActionMeetingId, setNewActionMeetingId] = useState('');
  const [newActionTask, setNewActionTask] = useState('');
  const [newActionOwner, setNewActionOwner] = useState('');
  const [newActionDueDate, setNewActionDueDate] = useState('');
  const [newActionPriority, setNewActionPriority] = useState('medium');
  const [creatingAction, setCreatingAction] = useState(false);

  const loadActions = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (overdueOnly) params.is_overdue = true;

      const [actionsData, meetingsData] = await Promise.all([
        api.getActions(params),
        api.getMeetings()
      ]);
      setActions(actionsData);
      setMeetings(meetingsData);
      if (meetingsData.length > 0 && !newActionMeetingId) {
        setNewActionMeetingId(meetingsData[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load action items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, [statusFilter, priorityFilter, overdueOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadActions();
  };

  const handleQuickStatusChange = async (actionId, newStatus) => {
    try {
      const updated = await api.updateAction(actionId, { status: newStatus });
      setActions(actions.map((a) => (a.id === actionId ? updated : a)));
      setFeedback('Status updated.');
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const handleSaveAction = async (payload) => {
    if (!editingAction) return;
    try {
      const updated = await api.updateAction(editingAction.id, payload);
      setActions(actions.map((a) => (a.id === updated.id ? updated : a)));
      setFeedback('Action item updated.');
      setEditingAction(null);
    } catch (err) {
      setError(err.message || 'Failed to update task.');
    }
  };

  const handleCreateNewAction = async (e) => {
    e.preventDefault();
    if (!newActionMeetingId) {
      setError('Please select a meeting to associate this action item with.');
      return;
    }
    if (!newActionTask.trim()) {
      setError('Task description is required.');
      return;
    }

    setCreatingAction(true);
    try {
      const created = await api.createAction({
        meeting_id: newActionMeetingId,
        task: newActionTask.trim(),
        owner: newActionOwner.trim() || null,
        due_date: newActionDueDate || null,
        priority: newActionPriority,
        status: 'open'
      });
      setActions([created, ...actions]);
      setNewActionOpen(false);
      setNewActionTask('');
      setNewActionOwner('');
      setNewActionDueDate('');
      setFeedback('New action item created.');
    } catch (err) {
      setError(err.message || 'Failed to create action item.');
    } finally {
      setCreatingAction(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.deleteAction(deleteTarget.id);
      setActions(actions.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      setFeedback('Action item deleted.');
    } catch (err) {
      setError(err.message || 'Failed to delete task.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Central Action Tracker
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Consolidated registry of all deliverables across every meeting
          </p>
        </div>

        <button
          onClick={() => {
            if (meetings.length === 0) {
              navigate('/meetings/new');
            } else {
              setNewActionOpen(true);
            }
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm shadow-indigo-600/30 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-sm">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')} className="text-xs font-bold cursor-pointer hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by task description, assignee, or meeting title..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Overdue Toggle */}
          <button
            type="button"
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              overdueOnly
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue Only</span>
          </button>

          {(statusFilter !== 'all' || priorityFilter !== 'all' || overdueOnly || search) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setPriorityFilter('all');
                setOverdueOnly(false);
                setSearch('');
              }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Content Table / Cards */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      ) : actions.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Meeting</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {actions.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white max-w-sm">
                      <span className={item.status === 'completed' ? 'line-through text-slate-400' : ''}>
                        {item.task}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Link
                        to={`/meetings/${item.meeting_id}`}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                      >
                        <span className="truncate max-w-[140px]">{item.meeting_title || 'View Meeting'}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </Link>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {item.owner ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium">
                          {item.owner}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {item.due_date ? (
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
                            {item.due_date}
                          </span>
                          {item.is_overdue && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                              Overdue
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          item.priority === 'high'
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                            : item.priority === 'low'
                            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <select
                        value={item.status}
                        onChange={(e) => handleQuickStatusChange(item.id, e.target.value)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                          item.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                            : item.status === 'in_progress'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800'
                            : item.status === 'blocked'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="blocked">Blocked</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => setEditingAction(item)}
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit action"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title="Delete action"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={CheckSquare}
          title="No action items found"
          description={
            statusFilter !== 'all' || priorityFilter !== 'all' || overdueOnly || search
              ? 'Try adjusting your filters or search query.'
              : 'Action items extracted by AI or created manually will be listed here.'
          }
          actionLabel={meetings.length === 0 ? 'Create Meeting' : 'Add New Task'}
          onAction={() => {
            if (meetings.length === 0) {
              navigate('/meetings/new');
            } else {
              setNewActionOpen(true);
            }
          }}
        />
      )}

      {/* Edit Modal */}
      {editingAction && (
        <ActionItemModal
          isOpen={!!editingAction}
          onClose={() => setEditingAction(null)}
          onSubmit={handleSaveAction}
          initialData={editingAction}
          title="Edit Action Item"
        />
      )}

      {/* Create New Task from Tracker Modal */}
      {newActionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add New Action Item</h2>
              <button
                onClick={() => setNewActionOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewAction} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Associated Meeting <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newActionMeetingId}
                  onChange={(e) => setNewActionMeetingId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.meeting_date})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={newActionTask}
                  onChange={(e) => setNewActionTask(e.target.value)}
                  placeholder="e.g. Complete schema indexing..."
                  rows={3}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assignee / Owner
                  </label>
                  <input
                    type="text"
                    value={newActionOwner}
                    onChange={(e) => setNewActionOwner(e.target.value)}
                    placeholder="e.g. David Miller"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Due Date
                  </label>
                  <input
                    type="date"
                    value={newActionDueDate}
                    onChange={(e) => setNewActionDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={newActionPriority}
                  onChange={(e) => setNewActionPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewActionOpen(false)}
                  disabled={creatingAction}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAction}
                  className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{creatingAction ? 'Creating...' : 'Create Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Action Item"
        message={`Are you sure you want to delete the task: "${deleteTarget?.task}"?`}
        loading={deleteLoading}
      />
    </div>
  );
}
