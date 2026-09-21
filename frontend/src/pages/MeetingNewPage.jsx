import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  FileText,
  Upload,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Users,
  Check
} from 'lucide-react';
import { api } from '../services/api';

const MEETING_TYPES = [
  'Project Meeting',
  'Client Meeting',
  'Sales Meeting',
  'Internal Meeting',
  'Requirement Discussion',
  'Retrospective',
  'Other'
];

export default function MeetingNewPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().substring(0, 10));
  const [meetingType, setMeetingType] = useState('Project Meeting');
  const [participantsInput, setParticipantsInput] = useState('');
  const [transcriptTab, setTranscriptTab] = useState('paste'); // 'paste' | 'upload'
  const [transcriptText, setTranscriptText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [autoProcessAI, setAutoProcessAI] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (file) => {
    setError('');
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('Only plain text (.txt) files are supported.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File size exceeds the 2MB limit.');
      return;
    }

    setUploadedFile(file);

    // Read and preview file content
    const reader = new FileReader();
    reader.onload = (e) => {
      setTranscriptText(e.target.result);
    };
    reader.onerror = () => {
      setError('Failed to read file content.');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Meeting title is required.');
      return;
    }

    if (!transcriptText.trim()) {
      setError('Please provide a meeting transcript by typing, pasting, or uploading a text file.');
      return;
    }

    setLoading(true);
    setError('');

    const participants = participantsInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    try {
      // 1. Create meeting
      const meeting = await api.createMeeting({
        title: title.trim(),
        meeting_date: meetingDate,
        meeting_type: meetingType,
        participants,
        transcript: transcriptText.trim()
      });

      // 2. Auto-process AI if requested
      if (autoProcessAI) {
        await api.processAI(meeting.id);
      }

      navigate(`/meetings/${meeting.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create meeting.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/meetings')}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Meetings</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Create New Meeting
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Enter meeting metadata and upload or paste the transcript for automated AI intelligence
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center space-x-2.5 text-rose-600 dark:text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Meeting Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q3 Technical Architecture & Roadmap Review"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
          />
        </div>

        {/* Date & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Meeting Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Meeting Type
            </label>
            <select
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              {MEETING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Participants */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Participants <span className="text-slate-400 font-normal">(comma-separated)</span>
          </label>
          <div className="relative">
            <Users className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={participantsInput}
              onChange={(e) => setParticipantsInput(e.target.value)}
              placeholder="Sarah Connor, David Miller, Alex Vance"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Helps the AI anti-hallucination engine strictly map action item owners to known attendees.
          </p>
        </div>

        {/* Transcript Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Meeting Transcript <span className="text-rose-500">*</span>
            </label>

            {/* Tabs */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl space-x-1">
              <button
                type="button"
                onClick={() => setTranscriptTab('paste')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  transcriptTab === 'paste'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Paste Text
              </button>
              <button
                type="button"
                onClick={() => setTranscriptTab('upload')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  transcriptTab === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Upload File
              </button>
            </div>
          </div>

          {transcriptTab === 'paste' ? (
            <textarea
              rows={8}
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Paste conversation or transcript text here...&#10;e.g.&#10;Sarah: We decided to launch on Friday.&#10;David: I will finish testing the APIs by tomorrow."
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            />
          ) : (
            <div className="space-y-3">
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/10 transition-colors"
              >
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Click to select or drag and drop a transcript file
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Plain text (.txt) files only, up to 2MB
                </p>
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
              </label>

              {uploadedFile && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{uploadedFile.name}</span>
                    <span className="text-slate-400">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Loaded</span>
                  </span>
                </div>
              )}

              {transcriptText && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Transcript Preview:</p>
                  <textarea
                    rows={4}
                    value={transcriptText}
                    onChange={(e) => setTranscriptText(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auto AI Toggle */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                Run AI Synthesis automatically
              </p>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                Extracts Summary, Decisions, Actions, Risks, and Questions upon save
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoProcessAI}
              onChange={(e) => setAutoProcessAI(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate('/meetings')}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Processing...' : 'Save & Continue'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
