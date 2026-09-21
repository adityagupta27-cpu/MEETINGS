import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  Sparkles,
  CheckSquare,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  FileText,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  AlertCircle,
  Save,
  Clock,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import RichTextEditor from '../components/RichTextEditor';
import ActionItemModal from '../components/ActionItemModal';
import ConfirmModal from '../components/ConfirmModal';

export default function MeetingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingAI, setProcessingAI] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'decisions' | 'actions' | 'risks' | 'questions' | 'points'
  const [showTranscript, setShowTranscript] = useState(false);
  const [editedSummary, setEditedSummary] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Modals
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [deleteMeetingOpen, setDeleteMeetingOpen] = useState(false);
  const [deleteActionTarget, setDeleteActionTarget] = useState(null);

  const loadData = async () => {
    setError('');
    try {
      const [m, a] = await Promise.all([
        api.getMeeting(id),
        api.getMeetingActions(id)
      ]);
      setMeeting(m);
      setActions(a);
      setEditedSummary(m.summary || '');
    } catch (err) {
      setError(err.message || 'Failed to load meeting details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleProcessAI = async () => {
    setProcessingAI(true);
    setError('');
    setFeedback('');
    try {
      const updated = await api.processAI(id);
      setMeeting(updated);
      setEditedSummary(updated.summary || '');
      const updatedActions = await api.getMeetingActions(id);
      setActions(updatedActions);
      setFeedback('AI analysis completed and saved successfully.');
    } catch (err) {
      setError(err.message || 'Failed to generate AI synthesis.');
    } finally {
      setProcessingAI(false);
    }
  };

  const handleSaveSummary = async () => {
    setSavingSummary(true);
    setError('');
    try {
      const updated = await api.updateMeeting(id, { summary: editedSummary });
      setMeeting(updated);
      setFeedback('Meeting notes/summary saved.');
    } catch (err) {
      setError(err.message || 'Failed to save notes.');
    } finally {
      setSavingSummary(false);
    }
  };

  const handleDeleteMeeting = async () => {
    try {
      await api.deleteMeeting(id);
      navigate('/meetings');
    } catch (err) {
      alert(err.message || 'Failed to delete meeting.');
    }
  };

  const handleSaveAction = async (payload) => {
    if (editingAction) {
      // Update
      const updated = await api.updateAction(editingAction.id, payload);
      setActions(actions.map((a) => (a.id === updated.id ? updated : a)));
    } else {
      // Create
      const created = await api.createAction({
        ...payload,
        meeting_id: id
      });
      setActions([created, ...actions]);
    }
  };

  const handleQuickStatusChange = async (actionId, newStatus) => {
    try {
      const updated = await api.updateAction(actionId, { status: newStatus });
      setActions(actions.map((a) => (a.id === actionId ? updated : a)));
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleConfirmDeleteAction = async () => {
    if (!deleteActionTarget) return;
    try {
      await api.deleteAction(deleteActionTarget.id);
      setActions(actions.filter((a) => a.id !== deleteActionTarget.id));
      setDeleteActionTarget(null);
    } catch (err) {
      alert(err.message || 'Failed to delete action item.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
        <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (error && !meeting) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400">
        <h3 className="font-bold text-base mb-1">Meeting Error</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => navigate('/meetings')}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm"
        >
          Return to Meetings
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'summary', label: 'Summary & Notes', count: null },
    { id: 'decisions', label: 'Decisions', count: meeting?.decisions?.length || 0 },
    { id: 'actions', label: 'Action Items', count: actions.length },
    { id: 'risks', label: 'Risks & Blockers', count: meeting?.risks?.length || 0 },
    { id: 'questions', label: 'Open Questions', count: meeting?.unanswered_questions?.length || 0 },
    { id: 'points', label: 'Discussion Points', count: meeting?.discussion_points?.length || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/meetings')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Meetings</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleProcessAI}
            disabled={processingAI}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${processingAI ? 'animate-spin' : ''}`} />
            <span>{processingAI ? 'Synthesizing...' : 'Regenerate AI Analysis'}</span>
          </button>

          <button
            onClick={() => setDeleteMeetingOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            title="Delete Meeting"
            aria-label="Delete Meeting"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-sm">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')} className="text-xs font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center space-x-2 text-rose-600 dark:text-rose-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Meeting Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400">
            {meeting.meeting_type}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{meeting.meeting_date}</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {meeting.title}
        </h1>

        {meeting.participants && meeting.participants.length > 0 && (
          <div className="flex items-center space-x-2 flex-wrap gap-y-1.5 pt-1">
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Attendees:</span>
            {meeting.participants.map((p, idx) => (
              <span
                key={idx}
                className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Transcript Accordion */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left font-semibold text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center space-x-2.5">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>Meeting Transcript ({meeting.transcript ? meeting.transcript.length : 0} characters)</span>
          </div>
          {showTranscript ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showTranscript && (
          <div className="p-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40">
            <pre className="text-xs font-mono text-slate-800 dark:text-slate-300 whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
              {meeting.transcript || 'No transcript text stored.'}
            </pre>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 py-3 px-4 font-semibold text-sm border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="min-h-[300px]">
        {/* 1. Summary & Rich Text Editor */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                You can review, format, or edit the AI-synthesized executive summary and meeting notes below.
              </p>
              <button
                onClick={handleSaveSummary}
                disabled={savingSummary}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingSummary ? 'Saving...' : 'Save Notes'}</span>
              </button>
            </div>

            <RichTextEditor
              content={editedSummary}
              onChange={(val) => setEditedSummary(val)}
              placeholder="Meeting summary and notes..."
            />
          </div>
        )}

        {/* 2. Key Decisions */}
        {activeTab === 'decisions' && (
          <div className="space-y-3">
            {meeting.decisions && meeting.decisions.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {meeting.decisions.map((decision, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start space-x-3.5"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                        {decision}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm">
                No explicit decisions were identified in the transcript.
              </div>
            )}
          </div>
        )}

        {/* 3. Action Items */}
        {activeTab === 'actions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Deliverables & Follow-ups ({actions.length})
              </h3>
              <button
                onClick={() => {
                  setEditingAction(null);
                  setActionModalOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </div>

            {actions.length > 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Task</th>
                        <th className="px-4 py-3">Assignee</th>
                        <th className="px-4 py-3">Due Date</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {actions.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white max-w-xs">
                            <span className={item.status === 'completed' ? 'line-through text-slate-400' : ''}>
                              {item.task}
                            </span>
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
                                  <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
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
                              onClick={() => {
                                setEditingAction(item);
                                setActionModalOpen(true);
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit action"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteActionTarget(item)}
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
              <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm">
                No action items for this meeting yet. Click "Add Task" to create one or re-run AI synthesis.
              </div>
            )}
          </div>
        )}

        {/* 4. Risks & Concerns */}
        {activeTab === 'risks' && (
          <div className="space-y-3">
            {meeting.risks && meeting.risks.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {meeting.risks.map((risk, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start space-x-3.5"
                  >
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mt-0.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                        {risk}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm">
                No explicit risks or bottlenecks were identified.
              </div>
            )}
          </div>
        )}

        {/* 5. Unanswered Questions */}
        {activeTab === 'questions' && (
          <div className="space-y-3">
            {meeting.unanswered_questions && meeting.unanswered_questions.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {meeting.unanswered_questions.map((question, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-start space-x-3.5"
                  >
                    <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 mt-0.5">
                      <HelpCircle className="w-4 h-4 shrink-0" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                        {question}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm">
                No unanswered questions were flagged in the transcript.
              </div>
            )}
          </div>
        )}

        {/* 6. Discussion Points */}
        {activeTab === 'points' && (
          <div className="space-y-3">
            {meeting.discussion_points && meeting.discussion_points.length > 0 ? (
              <ul className="space-y-2.5">
                {meeting.discussion_points.map((point, idx) => (
                  <li
                    key={idx}
                    className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 flex items-start space-x-3"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm">
                No discussion points recorded.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Item Modal */}
      <ActionItemModal
        isOpen={actionModalOpen}
        onClose={() => {
          setActionModalOpen(false);
          setEditingAction(null);
        }}
        onSubmit={handleSaveAction}
        initialData={editingAction}
        participants={meeting.participants}
        title={editingAction ? 'Edit Action Item' : 'New Action Item'}
      />

      {/* Delete Meeting Confirmation */}
      <ConfirmModal
        isOpen={deleteMeetingOpen}
        onClose={() => setDeleteMeetingOpen(false)}
        onConfirm={handleDeleteMeeting}
        title="Delete Meeting"
        message={`Are you sure you want to delete "${meeting.title}"? This cannot be undone.`}
      />

      {/* Delete Action Confirmation */}
      <ConfirmModal
        isOpen={!!deleteActionTarget}
        onClose={() => setDeleteActionTarget(null)}
        onConfirm={handleConfirmDeleteAction}
        title="Delete Action Item"
        message={`Are you sure you want to delete the task: "${deleteActionTarget?.task}"?`}
      />
    </div>
  );
}
