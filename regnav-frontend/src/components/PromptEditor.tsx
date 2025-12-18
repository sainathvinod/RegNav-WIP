// Prompt Editor Component - Review and edit LLM prompts before discovery
import React, { useState, useEffect } from 'react';
import {
  SparklesIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';

interface PromptEditorProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
  onApprove: () => void;
  isGenerating: boolean;
  generationStatus?: string;
  configuration: {
    country: string;
    state: string;
    lob: string;
    docType: string;
  };
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  onPromptChange,
  onGenerate,
  onApprove,
  isGenerating,
  generationStatus,
  configuration,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setEditedPrompt(prompt);
    setHasUnsavedChanges(false);
    setIsEditing(false);
  }, [prompt]);

  const handleEdit = () => {
    setIsEditing(true);
    setIsExpanded(true);
  };

  const handleSave = () => {
    onPromptChange(editedPrompt);
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  const handleCancel = () => {
    setEditedPrompt(prompt);
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  const handleChange = (value: string) => {
    setEditedPrompt(value);
    setHasUnsavedChanges(value !== prompt);
  };

  const promptStats = {
    characters: prompt.length,
    words: prompt.split(/\s+/).filter(Boolean).length,
    lines: prompt.split('\n').length,
  };

  const isPromptReady = prompt.length > 0 && !isGenerating && !hasUnsavedChanges;

  return (
    <div className="card border border-purple-500/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <SparklesIcon className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-50">Discovery Prompt</h3>
            <p className="text-xs text-gray-400">
              {configuration.state} • {configuration.lob} • {configuration.docType}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stats */}
          {prompt && (
            <div className="text-xs text-gray-500 mr-2">
              {promptStats.characters} chars • {promptStats.words} words
            </div>
          )}

          {/* Expand/Collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-750 transition-all"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>

          {/* Generate Button */}
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="btn-secondary flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-5 w-5" />
                {prompt ? 'Regenerate' : 'Generate Prompt'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generation Status */}
      {isGenerating && generationStatus && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="h-5 w-5 text-blue-400 animate-spin" />
            <span className="text-sm text-blue-300">{generationStatus}</span>
          </div>
        </div>
      )}

      {/* Prompt Preview/Editor */}
      {prompt && isExpanded && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">
              {isEditing ? 'Edit Prompt' : 'Generated Prompt'}
            </span>
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit Prompt
              </button>
            )}
          </div>

          {isEditing ? (
            <>
              <textarea
                value={editedPrompt}
                onChange={(e) => handleChange(e.target.value)}
                className="w-full h-96 px-4 py-3 bg-gray-900 border border-gray-700 text-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono text-sm resize-none"
                placeholder="Enter discovery prompt..."
              />
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-gray-500">
                  {hasUnsavedChanges && (
                    <span className="text-yellow-400">• Unsaved changes</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="btn-primary text-sm"
                    disabled={!hasUnsavedChanges}
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    Save Changes
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                {prompt}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Collapsed Preview */}
      {prompt && !isExpanded && (
        <div className="mb-4 p-3 bg-gray-900 border border-gray-700 rounded-lg">
          <div className="text-xs text-gray-400 line-clamp-2 font-mono">
            {prompt.substring(0, 200)}...
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-800">
        <div className="text-sm text-gray-400">
          {!prompt && (
            <span className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              Generate a prompt before discovering sources
            </span>
          )}
          {prompt && !isPromptReady && hasUnsavedChanges && (
            <span className="flex items-center gap-2 text-yellow-400">
              <ExclamationTriangleIcon className="h-5 w-5" />
              Save your changes before proceeding
            </span>
          )}
          {isPromptReady && (
            <span className="flex items-center gap-2 text-green-400">
              <CheckCircleIcon className="h-5 w-5" />
              Prompt ready for discovery
            </span>
          )}
        </div>

        <button
          onClick={onApprove}
          disabled={!isPromptReady}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            isPromptReady
              ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/30'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          <CheckCircleIcon className="h-5 w-5" />
          Approve & Discover Sources
        </button>
      </div>

      {/* Info Panel */}
      <div className="mt-4 p-3 bg-blue-900/10 border border-blue-800/30 rounded-lg">
        <div className="text-xs text-blue-300">
          <strong>How it works:</strong> The AI generates a tailored discovery prompt based on your
          configuration. Review it, edit if needed, then approve to start discovery. Your edits will
          be used for the actual source search.
        </div>
      </div>
    </div>
  );
};

