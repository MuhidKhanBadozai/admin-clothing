import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Link as LinkIcon, 
  Loader2, 
  Check, 
  Star, 
  ExternalLink,
  HardDrive,
  Settings,
  Plus
} from 'lucide-react';
import { googleDriveService } from '../services/googleDriveService';

interface ImageUploadDropzoneProps {
  images: string[];
  onChange: (newImages: string[]) => void;
  onOpenConfig?: () => void;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  images,
  onChange,
  onOpenConfig,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const driveConfig = googleDriveService.getConfig();
  const isDriveConfigured = Boolean(driveConfig.scriptUrl && driveConfig.scriptUrl.trim());

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUrls: string[] = [];
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      if (!file.type.startsWith('image/')) continue;

      setUploadProgress(`Uploading ${i + 1}/${fileArray.length}: ${file.name}...`);
      try {
        const uploadResult = await googleDriveService.uploadImage(file);
        newUrls.push(uploadResult.url);
      } catch (err: any) {
        alert(`Failed to upload ${file.name}: ${err.message}`);
      }
    }

    if (newUrls.length > 0) {
      onChange([...images, ...newUrls]);
    }

    setIsUploading(false);
    setUploadProgress(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleManualAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    const directUrl = googleDriveService.convertToDirectGoogleDriveUrl(urlInput.trim());
    onChange([...images, directUrl]);
    setUrlInput('');
  };

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    const selected = images[index];
    const rest = images.filter((_, i) => i !== index);
    onChange([selected, ...rest]);
  };

  const handleCopyLink = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Header and Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-indigo-600" />
          <span>Product Photography &amp; Angles</span>
          <span className="text-[11px] text-slate-400 font-normal lowercase">
            ({images.length} {images.length === 1 ? 'photo' : 'photos'})
          </span>
        </label>

        <div className="flex items-center gap-2">
          {/* Google Drive Status Pill */}
          <button
            type="button"
            onClick={onOpenConfig}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-full flex items-center gap-1.5 border transition-colors cursor-pointer ${
              isDriveConfigured
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
            }`}
            title="Configure Google Drive Storage Folder"
          >
            <HardDrive className="w-3 h-3" />
            <span>{isDriveConfigured ? 'Google Drive Active' : 'Setup Google Drive'}</span>
            <Settings className="w-2.5 h-2.5 ml-0.5 opacity-60" />
          </button>

          {/* Mode Switcher */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                mode === 'upload'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Upload / Drop
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                mode === 'url'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Paste Link
            </button>
          </div>
        </div>
      </div>

      {/* Upload Drop Area */}
      {mode === 'upload' ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {isUploading ? (
            <div className="py-3 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
              <p className="text-xs font-bold text-slate-800">
                {uploadProgress || 'Uploading to Google Drive...'}
              </p>
              <p className="text-[11px] text-slate-400">
                Saving directly to your Google Drive and generating direct CDN links
              </p>
            </div>
          ) : (
            <div className="py-2 flex flex-col items-center justify-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center mb-1">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Drag &amp; drop photos here, or <span className="text-indigo-600 underline">browse from your PC</span>
              </p>
              <p className="text-xs text-slate-500 max-w-sm">
                Pick single or multiple pictures from your computer. Uploads seamlessly to your Google Drive without manual links.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Manual URL Paste Form */
        <form onSubmit={handleManualAddUrl} className="flex gap-2">
          <input
            type="url"
            placeholder="Paste Google Drive or image URL (e.g. https://...)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Link</span>
          </button>
        </form>
      )}

      {/* Uploaded Images List / Grid */}
      {images.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center justify-between">
            <span>Uploaded Product Gallery:</span>
            <span>First photo is the default catalog cover</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {images.map((imgUrl, idx) => (
              <div
                key={`${imgUrl}-${idx}`}
                className={`relative group rounded-xl border overflow-hidden bg-slate-100 aspect-[3/4] flex flex-col justify-between p-2 transition-all ${
                  idx === 0
                    ? 'border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Background Image */}
                <img
                  referrerPolicy="no-referrer"
                  src={imgUrl}
                  alt={`Product photo ${idx + 1}`}
                  className="absolute inset-0 w-full h-full object-cover object-top z-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80';
                  }}
                />

                {/* Top Badges */}
                <div className="relative z-10 flex items-center justify-between w-full">
                  {idx === 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-white" /> Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(idx)}
                      className="px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-semibold hover:bg-indigo-600 transition cursor-pointer"
                      title="Set as Main Cover Photo"
                    >
                      Make Cover
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="p-1 rounded-md bg-slate-900/80 hover:bg-rose-600 text-white backdrop-blur-xs transition cursor-pointer"
                    title="Remove Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Bar on Hover */}
                <div className="relative z-10 mt-auto bg-slate-950/80 backdrop-blur-xs p-1 rounded-lg text-white flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
                  <span className="truncate max-w-[60px] text-[10px] font-mono text-slate-300">
                    #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(imgUrl, idx)}
                      className="p-1 hover:text-indigo-400 cursor-pointer"
                      title="Copy Direct Link"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <LinkIcon className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <a
                      href={imgUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 hover:text-indigo-400 cursor-pointer"
                      title="Open full size"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
