import { ArrowRight, Download, Eye, Redo2, Save, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { TEMPLATE_AUDIENCE_OPTIONS, TEMPLATE_DETAIL_OPTIONS } from '../../utils/templateMetadata';

export default function TopBar({
  templateName,
  onNameChange,
  detailLevel,
  onDetailLevelChange,
  audienceType,
  onAudienceTypeChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  saving,
  onPreview,
  previewing,
  onExportPng,
  zoom,
  onZoom,
  onZoomFit,
  dirty,
  onBack,
  onImportDesign,
  onUploadFont,
  isMobile = false,
}) {
  if (isMobile) {
    return (
      <div
        className="shrink-0 border-b border-slate-200 bg-white px-3 py-3 shadow-sm"
        style={{ direction: 'ltr', userSelect: 'none', zIndex: 40 }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            title="العودة"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <ArrowRight size={18} />
          </button>

          <input
            dir="rtl"
            value={templateName}
            onChange={(e) => onNameChange(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300"
          />

          <button
            onClick={onSave}
            disabled={saving}
            className="flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? '...' : 'حفظ'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={detailLevel}
            onChange={(e) => onDetailLevelChange(e.target.value)}
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-400"
            title="مستوى القالب"
          >
            {TEMPLATE_DETAIL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={audienceType}
            onChange={(e) => onAudienceTypeChange(e.target.value)}
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-400"
            title="فئة القالب"
          >
            {TEMPLATE_AUDIENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            onClick={onPreview}
            disabled={previewing}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <Eye size={14} />
            معاينة
          </button>
          <button
            onClick={onExportPng}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={14} />
            PNG
          </button>
          <label className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            استيراد تصميم
            <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={onImportDesign} />
          </label>
          <label className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            رفع خط
            <input type="file" accept=".ttf,.otf,font/ttf,font/otf" className="hidden" onChange={onUploadFont} />
          </label>
          {dirty && (
            <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              تغييرات غير محفوظة
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 shadow-sm"
      style={{ direction: 'ltr', userSelect: 'none', zIndex: 40 }}
    >
      <div className="flex w-full items-center gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            title="العودة"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <ArrowRight size={16} />
          </button>

          <div className="h-5 w-px bg-slate-200" />

          <input
            dir="rtl"
            value={templateName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-44 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-300"
          />
          {dirty && (
            <span className="text-xs text-amber-500" title="تغييرات غير محفوظة">
              ●
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 flex-wrap items-center gap-2 flex">
          <select
            value={detailLevel}
            onChange={(e) => onDetailLevelChange(e.target.value)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-400"
            title="مستوى القالب"
          >
            {TEMPLATE_DETAIL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={audienceType}
            onChange={(e) => onAudienceTypeChange(e.target.value)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-400"
            title="فئة القالب"
          >
            {TEMPLATE_AUDIENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <div className="h-5 w-px bg-slate-200" />

          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="تراجع (Ctrl+Z)"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="إعادة (Ctrl+Y)"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          >
            <Redo2 size={16} />
          </button>

          <div className="h-5 w-px bg-slate-200" />

          <button
            onClick={() => onZoom(Math.max(0.1, zoom - 0.1))}
            title="تصغير"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <ZoomOut size={16} />
          </button>
          <span className="w-12 text-center text-xs font-semibold tabular-nums text-slate-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => onZoom(Math.min(3, zoom + 0.1))}
            title="تكبير"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => onZoom(1)}
            title="100%"
            className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            1:1
          </button>
          <button
            onClick={onZoomFit}
            title="ملاءمة الشاشة"
            className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
          >
            احتواء
          </button>
          <input
            type="range"
            min="10"
            max="300"
            step="5"
            value={Math.round(zoom * 100)}
            onChange={(e) => onZoom(Number(e.target.value) / 100)}
            className="w-28 accent-emerald-600"
            title="مستوى التكبير"
          />
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={onPreview}
            disabled={previewing}
            className="flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <Eye size={14} />
            {previewing ? 'جاري...' : 'معاينة PDF'}
          </button>
          <button
            onClick={onExportPng}
            className="flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={14} />
            PNG
          </button>
          <label className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            استيراد تصميم
            <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={onImportDesign} />
          </label>
          <label className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            رفع خط
            <input type="file" accept=".ttf,.otf,font/ttf,font/otf" className="hidden" onChange={onUploadFont} />
          </label>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}
