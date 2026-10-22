import { Download, FolderOpen, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { DownloadItem } from '@/types';
import { useI18n } from '@/services/i18n';

interface DownloadsViewProps {
  downloads: DownloadItem[];
  onOpenFolder?: () => void;
}

export default function DownloadsView({ downloads, onOpenFolder }: DownloadsViewProps) {
  const { t } = useI18n();

  const handleOpenDownloadsFolder = () => {
    if ((window as any).electronAPI?.openDownloadsFolder) {
      (window as any).electronAPI.openDownloadsFolder();
    } else if (onOpenFolder) {
      onOpenFolder();
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between pb-6 border-b border-sc-border mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Download className="text-sc-accent" size={26} />
            {t('downloadsTitle')}
          </h1>
          <p className="text-sm text-sc-text-secondary mt-1">
            {t('downloadsSubtitle')}
          </p>
        </div>
        <button
          onClick={handleOpenDownloadsFolder}
          className="flex items-center gap-2 rounded-sc border border-sc-border bg-sc-surface px-4 py-2 text-sm font-medium text-white hover:bg-sc-hover transition-colors"
        >
          <FolderOpen size={16} />
          {t('openDownloadsFolder')}
        </button>
      </div>

      {downloads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Download size={48} className="text-sc-border mb-4" />
          <h3 className="text-lg font-medium text-white">{t('noDownloads')}</h3>
          <p className="text-sm text-sc-text-secondary max-w-sm mt-1">
            {t('noDownloadsDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {downloads.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-sc border border-sc-border bg-sc-surface p-3 transition-colors hover:border-sc-hover"
            >
              <img
                src={item.artwork}
                alt={item.title}
                className="h-12 w-12 rounded-sc object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                <p className="text-xs text-sc-text-secondary truncate">{item.artist}</p>
                {item.status === 'downloading' && (
                  <div className="w-full bg-sc-border h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-sc-accent h-full transition-all duration-300"
                      style={{ width: `${Math.round(item.progress * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center gap-3">
                {item.status === 'completed' && (
                  <div className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                    <CheckCircle2 size={16} />
                    <span>{t('downloadComplete')}</span>
                  </div>
                )}
                {item.status === 'downloading' && (
                  <div className="flex items-center gap-1.5 text-xs text-sc-accent font-medium">
                    <Loader2 size={16} className="animate-spin-slow" />
                    <span>{t('downloading')}</span>
                  </div>
                )}
                {item.status === 'error' && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium" title={item.error}>
                    <AlertCircle size={16} />
                    <span>{t('downloadFailed')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
