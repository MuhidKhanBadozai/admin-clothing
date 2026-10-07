import React, { useState } from 'react';
import { 
  X, 
  HardDrive, 
  Check, 
  Copy, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck,
  HelpCircle,
  FolderOpen
} from 'lucide-react';
import { googleDriveService, DEFAULT_APPS_SCRIPT_CODE } from '../services/googleDriveService';

interface GoogleDriveConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const GoogleDriveConfigModal: React.FC<GoogleDriveConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const currentConfig = googleDriveService.getConfig();
  const [scriptUrl, setScriptUrl] = useState(currentConfig.scriptUrl);
  const [folderId, setFolderId] = useState(currentConfig.folderId);
  const [copiedScript, setCopiedScript] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'guide' | 'code'>('settings');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(DEFAULT_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleTestConnection = async () => {
    if (!scriptUrl.trim()) {
      setTestResult({ success: false, message: 'Please enter your Google Apps Script Web App URL first.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await googleDriveService.testConnection(scriptUrl, folderId);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    googleDriveService.saveConfig({
      scriptUrl: scriptUrl.trim(),
      folderId: folderId.trim(),
      autoDirectUrl: true,
    });
    if (onSaved) onSaved();
    onClose();
  };

  const isConfigured = Boolean(currentConfig.scriptUrl && currentConfig.scriptUrl.trim());

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide text-white">
                  Google Drive Cloud Storage Bridge
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  isConfigured 
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' 
                    : 'bg-amber-950 text-amber-300 border border-amber-700'
                }`}>
                  {isConfigured ? 'CONNECTED' : 'SETUP REQUIRED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                100% Free storage on your personal Google Drive for unlimited product pictures
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Settings &amp; URL
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>3-Step Setup Guide (1 Min)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'border-indigo-600 text-indigo-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Apps Script Code
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {activeTab === 'settings' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-emerald-900 text-xs leading-relaxed">
                  <strong>How it works:</strong> Whenever you drag &amp; drop photos on this admin panel, they are uploaded straight to your Google Drive folder and high-speed public CDN URLs (<code className="bg-emerald-100 px-1 py-0.5 rounded text-[11px]">https://lh3.googleusercontent.com/d/FILE_ID</code>) are automatically saved into Firebase Firestore!
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Google Apps Script Web App URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  value={scriptUrl}
                  onChange={(e) => setScriptUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-800"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  From your deployed Google Apps Script (ends with <code>/exec</code>)
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                  <span>Google Drive Folder ID (Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1a2B3c4D5e6F7g8H9i0J (or leave blank to use Root folder)"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-800"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Found in your Drive folder link: <code>drive.google.com/drive/folders/<b>[FOLDER_ID]</b></code>
                </span>
              </div>

              {/* Test Connection Button & Save */}
              <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  disabled={testing || !scriptUrl.trim()}
                  onClick={handleTestConnection}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{testing ? 'Testing Webhook...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    Save Credentials
                  </button>
                </div>
              </div>

              {/* Test Result Message */}
              {testResult && (
                <div className={`p-3 rounded-xl flex items-start gap-2 border ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <strong className="block mb-0.5 font-bold">
                      {testResult.success ? 'Connection Successful!' : 'Connection Failed:'}
                    </strong>
                    <span>{testResult.message}</span>
                  </div>
                </div>
              )}
            </form>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <strong>1-Minute Free Setup:</strong> Google Apps Script allows your admin panel to upload images directly to your personal Google Drive with 15GB free storage forever!
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Create Free Google Apps Script</span>
                  </div>
                  <p className="text-slate-600 text-xs ml-7">
                    Open <a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold inline-flex items-center gap-0.5">script.google.com <ExternalLink className="w-2.5 h-2.5" /></a> and click <strong>"New project"</strong>.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Paste Code &amp; Deploy</span>
                  </div>
                  <p className="text-slate-600 text-xs ml-7 mb-2">
                    Paste the provided script code, then click:
                  </p>
                  <div className="ml-7 bg-slate-900 text-slate-200 p-3 rounded-lg text-xs font-mono space-y-1">
                    <p>1. Click <strong>Deploy</strong> &gt; <strong>New deployment</strong></p>
                    <p>2. Select type: <strong>Web app</strong> (click gear icon)</p>
                    <p>3. Execute as: <strong>Me</strong></p>
                    <p>4. Who has access: <strong className="text-emerald-400">"Anyone"</strong></p>
                    <p>5. Click <strong>Deploy</strong> &amp; Authorize access</p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Paste Web App URL in Admin</span>
                  </div>
                  <p className="text-slate-600 text-xs ml-7">
                    Copy the generated <strong>Web App URL</strong> (ends in <code>/exec</code>) and paste it into the <strong>Settings &amp; URL</strong> tab.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  View &amp; Copy Code &rarr;
                </button>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-xs">
                  Google Apps Script Code (Code.gs):
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Copied Code!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-xl border border-slate-800 overflow-x-auto max-h-72 leading-relaxed">
                  {DEFAULT_APPS_SCRIPT_CODE}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
