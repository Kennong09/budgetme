import React, { useState, useEffect, FC, useTransition } from "react";
import { supabase } from "../../../utils/supabaseClient";
import { useToast } from "../../../utils/ToastContext";
import "../admin.css";

interface BackupSettings {
  autoBackupEnabled: boolean;
  backupFrequency: string;
  backupRetention: number;
  lastBackupDate: string | null;
  storageLocation: string;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  notificationEnabled: boolean;
  maxSizeMB: number;
  cleanupEnabled: boolean;
}

interface BackupLog {
  id: string;
  backup_type: string;
  status: string;
  backup_size_bytes: number | null;
  backup_duration_ms: number | null;
  tables_backed_up: string[];
  error_message: string | null;
  backup_location: string | null;
  checksum: string | null;
  created_by: string | null;
  started_at: string;
  completed_at: string | null;
  metadata: any;
}

interface BackupStatistics {
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  last_backup: string | null;
  average_duration_ms: number | null;
  total_size_bytes: number | null;
  recent_backups: BackupLog[];
}

const AdminSettings: FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const { showSuccessToast, showErrorToast } = useToast();
  const isLoading = loading || isPending || saving;

  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    autoBackupEnabled: true,
    backupFrequency: "daily",
    backupRetention: 30,
    lastBackupDate: null,
    storageLocation: "supabase_storage",
    compressionEnabled: true,
    encryptionEnabled: true,
    notificationEnabled: true,
    maxSizeMB: 1000,
    cleanupEnabled: true,
  });

  const [backupStatistics, setBackupStatistics] = useState<BackupStatistics | null>(null);
  const [recentBackups, setRecentBackups] = useState<BackupLog[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const { data: settingsData, error: settingsError } = await supabase
          .from('admin_settings')
          .select('setting_key, setting_value')
          .like('setting_key', 'backup_%');

        if (settingsError) throw settingsError;

        if (settingsData && isMounted) {
          const settings: Partial<BackupSettings> = {};
          settingsData.forEach(setting => {
            const key = setting.setting_key.replace('backup_', '');
            const value = setting.setting_value;
            switch (key) {
              case 'auto_enabled': settings.autoBackupEnabled = value === true || value === 'true'; break;
              case 'frequency': settings.backupFrequency = value as string; break;
              case 'retention_days': settings.backupRetention = parseInt(value as string) || 30; break;
              case 'last_run': settings.lastBackupDate = value as string; break;
              case 'storage_location': settings.storageLocation = value as string; break;
              case 'compression_enabled': settings.compressionEnabled = value === true || value === 'true'; break;
              case 'encryption_enabled': settings.encryptionEnabled = value === true || value === 'true'; break;
              case 'notification_enabled': settings.notificationEnabled = value === true || value === 'true'; break;
              case 'max_size_mb': settings.maxSizeMB = parseInt(value as string) || 1000; break;
              case 'cleanup_enabled': settings.cleanupEnabled = value === true || value === 'true'; break;
            }
          });
          setBackupSettings(prev => ({ ...prev, ...settings }));
        }

        const { data: statsData } = await supabase.rpc('get_backup_statistics');
        if (statsData && isMounted) {
          setBackupStatistics(statsData);
          setRecentBackups(statsData.recent_backups || []);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        if (isMounted) showErrorToast('Failed to load backup settings');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSettings();
    return () => { isMounted = false; };
  }, [showErrorToast]);

  const handleBackupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    startTransition(() => {
      setBackupSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : (name === 'backupRetention' ? parseInt(value) : value)
      }));
    });
  };

  const saveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const settingsToSave = [
        { key: 'backup_auto_enabled', value: backupSettings.autoBackupEnabled },
        { key: 'backup_frequency', value: backupSettings.backupFrequency },
        { key: 'backup_retention_days', value: backupSettings.backupRetention },
        { key: 'backup_storage_location', value: backupSettings.storageLocation },
        { key: 'backup_compression_enabled', value: backupSettings.compressionEnabled },
        { key: 'backup_encryption_enabled', value: backupSettings.encryptionEnabled },
        { key: 'backup_notification_enabled', value: backupSettings.notificationEnabled },
        { key: 'backup_max_size_mb', value: backupSettings.maxSizeMB },
        { key: 'backup_cleanup_enabled', value: backupSettings.cleanupEnabled },
      ];
      for (const setting of settingsToSave) {
        const { error } = await supabase.from('admin_settings').upsert({
          setting_key: setting.key, setting_value: setting.value,
          setting_type: typeof setting.value === 'boolean' ? 'boolean' : typeof setting.value === 'number' ? 'number' : 'string',
          description: `Backup setting: ${setting.key}`, category: 'general', is_public: false, requires_admin: true, updated_at: new Date().toISOString()
        });
        if (error) throw error;
      }
      showSuccessToast('Backup settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      showErrorToast('Failed to save backup settings');
    } finally { setSaving(false); }
  };

  const triggerBackup = async () => {
    if (saving) return;
    setSaving(true);
    try {
      showSuccessToast('Starting backup process...');
      const { data: backupId, error } = await supabase.rpc('perform_database_backup', {
        p_backup_type: 'manual', p_created_by: (await supabase.auth.getUser()).data.user?.id
      });
      if (error) throw error;
      showSuccessToast(`Backup completed! ID: ${backupId}`);
      const { data: statsData } = await supabase.rpc('get_backup_statistics');
      if (statsData) { setBackupStatistics(statsData); setRecentBackups(statsData.recent_backups || []); }
      setBackupSettings(prev => ({ ...prev, lastBackupDate: new Date().toISOString() }));
    } catch (error) {
      console.error("Backup error:", error);
      showErrorToast("Failed to complete backup");
    } finally { setSaving(false); }
  };

  const exportDatabaseDump = async () => {
    if (saving) return;
    setSaving(true);
    try {
      showSuccessToast('Preparing export...');
      const tables = ['accounts', 'transactions', 'budgets', 'goals', 'profiles'];
      let content = `-- BudgetMe Export - ${new Date().toISOString()}\n`;
      for (const t of tables) {
        const { data } = await supabase.from(t).select('*').limit(100);
        if (data?.length) content += `-- ${t}: ${data.length} rows\n`;
      }
      const blob = new Blob([content], { type: 'text/sql' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `budgetme_dump_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccessToast('Export downloaded!');
    } catch (error) {
      showErrorToast("Export failed");
    } finally { setSaving(false); }
  };

  const successRate = backupStatistics?.total_backups ? ((backupStatistics.successful_backups / backupStatistics.total_backups) * 100).toFixed(1) : '0';
  const failureRate = backupStatistics?.total_backups ? ((backupStatistics.failed_backups / backupStatistics.total_backups) * 100).toFixed(1) : '0';
  const avgDuration = backupStatistics?.average_duration_ms ? Math.round(backupStatistics.average_duration_ms / 1000) : 0;
  const totalSizeMB = backupStatistics?.total_size_bytes ? Math.round(backupStatistics.total_size_bytes / 1024 / 1024) : 0;
  const formatLastBackup = (d: string | null) => {
    if (!d) return 'Never';
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
    return diff < 1 ? 'Just now' : diff < 24 ? `${diff}h ago` : `${Math.floor(diff/24)}d ago`;
  };

  if (isLoading) {
    return (
      <div className="modern-user-management">
        <div className="block md:hidden py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading backup settings...</p>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="user-management-header mb-5">
            <div className="d-flex align-items-center mb-2">
              <div className="skeleton-icon mr-3"></div>
              <div><div className="skeleton-line skeleton-header-title mb-2"></div><div className="skeleton-line skeleton-header-subtitle"></div></div>
            </div>
          </div>
          <div className="row mb-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="col-xl-3 col-md-6 mb-4">
                <div className="card shadow h-100 py-3 admin-card-loading">
                  <div className="card-body"><div className="skeleton-line skeleton-title mb-2"></div><div className="skeleton-line skeleton-value"></div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-user-management">
      {/* MOBILE: Page Heading */}
      <div className="block md:hidden mb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">Backup & Maintenance</h1>
          <div className="flex items-center gap-2">
            <button onClick={exportDatabaseDump} disabled={saving} className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"><i className="fas fa-download text-xs"></i></button>
            <button onClick={triggerBackup} disabled={saving} className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-all active:scale-95 disabled:opacity-50"><i className={`fas fa-database text-xs ${saving ? 'fa-spin' : ''}`}></i></button>
          </div>
        </div>
      </div>

      {/* MOBILE: Status Card */}
      <div className="block md:hidden mb-4">
        <div className={`bg-gradient-to-br ${backupStatistics?.failed_backups === 0 ? 'from-emerald-500 via-teal-500 to-cyan-500' : 'from-amber-500 via-orange-500 to-yellow-500'} rounded-2xl p-4 shadow-lg`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80 text-xs font-medium">Backup Status</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><i className={`fas fa-${backupStatistics?.failed_backups === 0 ? 'check-circle' : 'exclamation-triangle'} text-white text-sm`}></i></div>
          </div>
          <div className="text-white text-lg font-bold mb-1">{backupStatistics?.failed_backups === 0 ? 'All Backups Healthy' : 'Issues Detected'}</div>
          <div className="text-white/70 text-xs"><i className="fas fa-clock text-[10px] mr-1"></i>Last: {formatLastBackup(backupSettings.lastBackupDate)}</div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
            <div><p className="text-white/60 text-[9px] uppercase">Total</p><p className="text-white text-sm font-bold">{backupStatistics?.total_backups || 0}</p></div>
            <div><p className="text-white/60 text-[9px] uppercase">Success</p><p className="text-white text-sm font-bold">{successRate}%</p></div>
            <div><p className="text-white/60 text-[9px] uppercase">Size</p><p className="text-white text-sm font-bold">{totalSizeMB}MB</p></div>
          </div>
        </div>
      </div>

      {/* MOBILE: Stats Cards */}
      <div className="block md:hidden mb-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center mb-2"><i className="fas fa-database text-red-500 text-xs"></i></div>
            <p className="text-[9px] text-gray-500 font-medium uppercase">Total Backups</p>
            <p className="text-sm font-bold text-gray-800">{backupStatistics?.total_backups || 0}</p>
            <div className="flex items-center gap-1 mt-1 text-gray-400"><i className="fas fa-history text-[8px]"></i><span className="text-[9px]">{backupSettings.backupFrequency}</span></div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center mb-2"><i className="fas fa-check-circle text-emerald-500 text-xs"></i></div>
            <p className="text-[9px] text-gray-500 font-medium uppercase">Successful</p>
            <p className="text-sm font-bold text-gray-800">{backupStatistics?.successful_backups || 0}</p>
            <div className="flex items-center gap-1 mt-1 text-emerald-500"><i className="fas fa-arrow-up text-[8px]"></i><span className="text-[9px]">{successRate}%</span></div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center mb-2"><i className="fas fa-exclamation-triangle text-rose-500 text-xs"></i></div>
            <p className="text-[9px] text-gray-500 font-medium uppercase">Failed</p>
            <p className="text-sm font-bold text-gray-800">{backupStatistics?.failed_backups || 0}</p>
            <div className="flex items-center gap-1 mt-1 text-rose-500"><i className="fas fa-times text-[8px]"></i><span className="text-[9px]">{failureRate}%</span></div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center mb-2"><i className="fas fa-clock text-blue-500 text-xs"></i></div>
            <p className="text-[9px] text-gray-500 font-medium uppercase">Avg Duration</p>
            <p className="text-sm font-bold text-gray-800">{avgDuration}s</p>
            <div className="flex items-center gap-1 mt-1 text-blue-500"><i className="fas fa-bolt text-[8px]"></i><span className="text-[9px]">per backup</span></div>
          </div>
        </div>
      </div>

      {/* MOBILE: Settings */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5"><i className="fas fa-cog text-red-500 text-[10px]"></i>Settings</h6>
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${backupSettings.autoBackupEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>{backupSettings.autoBackupEnabled ? 'Auto ON' : 'Auto OFF'}</span>
          </div>
          <div className="px-3 py-3 space-y-3">
            {[
              { name: 'autoBackupEnabled', label: 'Auto Backup', icon: 'sync', color: 'red', type: 'toggle' },
              { name: 'compressionEnabled', label: 'Compression', icon: 'compress', color: 'cyan', type: 'toggle' },
              { name: 'encryptionEnabled', label: 'Encryption', icon: 'lock', color: 'green', type: 'toggle' },
              { name: 'notificationEnabled', label: 'Notifications', icon: 'bell', color: 'pink', type: 'toggle' },
              { name: 'cleanupEnabled', label: 'Auto Cleanup', icon: 'broom', color: 'orange', type: 'toggle' },
            ].map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg bg-${item.color}-100 flex items-center justify-center`}><i className={`fas fa-${item.icon} text-${item.color}-500 text-[10px]`}></i></div>
                  <span className="text-xs font-medium text-gray-700">{item.label}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" name={item.name} checked={backupSettings[item.name as keyof BackupSettings] as boolean} onChange={handleBackupChange} />
                  <div className={`w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-${item.color}-500`}></div>
                </label>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center"><i className="fas fa-calendar text-blue-500 text-[10px]"></i></div><span className="text-xs font-medium text-gray-700">Frequency</span></div>
              <select name="backupFrequency" value={backupSettings.backupFrequency} onChange={handleBackupChange} className="px-2 py-1.5 text-[10px] bg-gray-50 border border-gray-200 rounded-lg"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center"><i className="fas fa-archive text-amber-500 text-[10px]"></i></div><span className="text-xs font-medium text-gray-700">Retention</span></div>
              <div className="flex items-center gap-1"><input type="number" name="backupRetention" value={backupSettings.backupRetention} onChange={handleBackupChange} min="1" max="365" className="w-14 px-2 py-1.5 text-[10px] bg-gray-50 border border-gray-200 rounded-lg text-center" /><span className="text-[10px] text-gray-500">days</span></div>
            </div>
          </div>
          <div className="px-3 py-2.5 border-t border-gray-100 bg-gray-50">
            <button onClick={() => saveSettings()} disabled={saving} className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">{saving ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</> : <><i className="fas fa-save text-[10px]"></i>Save Settings</>}</button>
          </div>
        </div>
      </div>

      {/* MOBILE: Recent Backups */}
      <div className="block md:hidden mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100"><h6 className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5"><i className="fas fa-history text-red-500 text-[10px]"></i>Recent Backups{recentBackups.length > 0 && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[9px]">{recentBackups.length}</span>}</h6></div>
          <div className="divide-y divide-gray-100 max-h-[40vh] overflow-y-auto">
            {recentBackups.length > 0 ? recentBackups.map((b, i) => (
              <div key={b.id || i} className="px-3 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${b.status === 'completed' ? 'bg-emerald-100' : 'bg-red-100'}`}><i className={`fas fa-${b.status === 'completed' ? 'check' : 'times'} ${b.status === 'completed' ? 'text-emerald-500' : 'text-red-500'} text-xs`}></i></div>
                <div className="flex-1"><p className="text-xs font-semibold text-gray-800 capitalize">{b.backup_type} Backup</p><p className="text-[10px] text-gray-500">{new Date(b.started_at).toLocaleString()}</p></div>
              </div>
            )) : <div className="px-3 py-8 text-center"><div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-3"><i className="fas fa-database text-gray-400 text-lg"></i></div><p className="text-xs text-gray-600">No backups yet</p></div>}
          </div>
        </div>
      </div>

      {/* MOBILE: Actions */}
      <div className="block md:hidden mb-4">
        <div className="grid grid-cols-3 gap-2">
          <button onClick={triggerBackup} disabled={saving} className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-95 disabled:opacity-50"><div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center"><i className="fas fa-database text-amber-500 text-sm"></i></div><span className="text-[9px] font-medium text-gray-700">Backup</span></button>
          <button onClick={exportDatabaseDump} disabled={saving} className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-95 disabled:opacity-50"><div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center"><i className="fas fa-download text-emerald-500 text-sm"></i></div><span className="text-[9px] font-medium text-gray-700">Export</span></button>
          <button disabled={saving} className="flex flex-col items-center gap-1 p-3 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-95 disabled:opacity-50"><div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center"><i className="fas fa-broom text-red-500 text-sm"></i></div><span className="text-[9px] font-medium text-gray-700">Clear</span></button>
        </div>
      </div>

      {/* MOBILE: Footer */}
      <div className="block md:hidden mb-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2"><i className="fas fa-exclamation-triangle text-amber-500 text-xs mt-0.5"></i><div><p className="text-[10px] font-semibold text-amber-800">Storage Warning</p><p className="text-[9px] text-amber-700">~250 MB per backup</p></div></div>
      </div>
      <div className="block md:hidden mt-4 mb-4">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center"><i className="fas fa-shield-alt text-red-500 text-[10px]"></i></div><span className="text-[10px] text-gray-500">Admin Settings v2.0</span></div>
          <span className="text-[9px] text-gray-400">Last: {formatLastBackup(backupSettings.lastBackupDate)}</span>
        </div>
      </div>

      {/* DESKTOP: Header */}
      <div className="user-management-header mb-5 d-none d-md-block">
        <div className="d-flex justify-content-between align-items-start flex-wrap">
          <div className="header-content"><div className="d-flex align-items-center mb-2"><div className="header-icon-container mr-3"><i className="fas fa-database"></i></div><div><h1 className="header-title mb-1">Backup & Maintenance</h1><p className="header-subtitle mb-0">Configure backup settings and manage database maintenance</p></div></div></div>
          <div className="header-actions d-flex align-items-center">
            <div className="last-updated-info mr-3"><small className="text-muted"><i className="far fa-clock mr-1"></i>Last: {backupSettings.lastBackupDate ? new Date(backupSettings.lastBackupDate).toLocaleString() : 'Never'}</small></div>
            <button className="btn btn-outline-success btn-sm shadow-sm mr-2" onClick={exportDatabaseDump} disabled={saving}><i className="fas fa-download mr-1"></i>Export</button>
            <button className="btn btn-danger btn-sm shadow-sm" onClick={triggerBackup} disabled={saving}><i className={`fas fa-database mr-1 ${saving ? 'fa-spin' : ''}`}></i>{saving ? 'Running...' : 'Backup'}</button>
          </div>
        </div>
        <div className="dashboard-status-bar mt-3"><div className="d-flex align-items-center"><div className={`status-indicator ${backupStatistics?.failed_backups === 0 ? 'status-online' : 'status-warning'} mr-2`}></div><span className={`small font-weight-medium ${backupStatistics?.failed_backups === 0 ? 'text-success' : 'text-warning'}`}>{backupStatistics?.failed_backups === 0 ? 'Backup system operational' : `${backupStatistics?.failed_backups} backup(s) failed`}</span><div className="ml-auto"><span className="badge badge-success badge-pill"><i className="fas fa-check-circle mr-1"></i>{successRate}% Success</span></div></div></div>
      </div>

      {/* DESKTOP: Stats */}
      <div className="stats-section mb-5 d-none d-md-block">
        <div className="row">
          {[
            { title: 'Total Backups', value: backupStatistics?.total_backups || 0, sub: `${backupSettings.backupFrequency} schedule`, icon: 'database', color: 'danger' },
            { title: 'Successful', value: backupStatistics?.successful_backups || 0, sub: `${successRate}% success`, icon: 'check-circle', color: 'success' },
            { title: 'Failed', value: backupStatistics?.failed_backups || 0, sub: `${failureRate}% failure`, icon: 'exclamation-triangle', color: 'warning' },
            { title: 'Avg Duration', value: `${avgDuration}s`, sub: `${totalSizeMB}MB total`, icon: 'clock', color: 'info' },
          ].map((s, i) => (
            <div key={i} className="col-xl-3 col-md-6 mb-4">
              <div className={`admin-stat-card admin-stat-card-${s.color} h-100 position-relative`}>
                <div className="card-bg-pattern"></div>
                <div className="card-content"><div className="row no-gutters align-items-center"><div className="col mr-2"><div className={`stat-title text-${s.color} text-uppercase mb-2`}>{s.title}</div><div className="stat-value font-weight-bold text-gray-800">{s.value}</div><div className="stat-change mt-2 text-muted"><i className={`fas fa-${s.icon} mr-1`}></i>{s.sub}</div></div><div className="col-auto"><div className={`stat-icon-container stat-icon-${s.color}`}><i className={`fas fa-${s.icon} stat-icon`}></i></div></div></div></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DESKTOP: Main */}
      <div className="row d-none d-md-flex">
        <div className="col-xl-3 col-md-4 mb-4"><div className="card shadow border-0 h-100"><div className="card-body p-0"><div className="list-group list-group-flush"><button className="list-group-item list-group-item-action active"><i className="fas fa-database mr-2"></i>Backup & Maintenance</button></div></div></div></div>
        <div className="col-xl-9 col-md-8">
          <div className="card shadow mb-4">
            <div className="card-header py-3 admin-card-header"><h6 className="m-0 font-weight-bold text-danger">Backup & Maintenance</h6></div>
            <div className="card-body">
              <form onSubmit={saveSettings}>
                <div className="settings-section">
                  {[
                    { id: 'autoBackupEnabled', label: 'Enable Automatic Backups' },
                    { id: 'compressionEnabled', label: 'Enable Compression' },
                    { id: 'encryptionEnabled', label: 'Enable Encryption' },
                    { id: 'notificationEnabled', label: 'Enable Notifications' },
                    { id: 'cleanupEnabled', label: 'Enable Automatic Cleanup' },
                  ].map(item => (
                    <div key={item.id} className="form-group row"><div className="col-sm-9 offset-sm-3"><div className="custom-control custom-switch"><input type="checkbox" className="custom-control-input" id={item.id} name={item.id} checked={backupSettings[item.id as keyof BackupSettings] as boolean} onChange={handleBackupChange} /><label className="custom-control-label" htmlFor={item.id}>{item.label}</label></div></div></div>
                  ))}
                  <div className="form-group row"><label className="col-sm-3 col-form-label">Frequency</label><div className="col-sm-9"><select className="form-control" name="backupFrequency" value={backupSettings.backupFrequency} onChange={handleBackupChange}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div></div>
                  <div className="form-group row"><label className="col-sm-3 col-form-label">Retention (days)</label><div className="col-sm-9"><input type="number" className="form-control" name="backupRetention" value={backupSettings.backupRetention} onChange={handleBackupChange} min="1" max="365" /></div></div>
                  <div className="form-group row"><label className="col-sm-3 col-form-label">Storage</label><div className="col-sm-9"><select className="form-control" name="storageLocation" value={backupSettings.storageLocation} onChange={handleBackupChange}><option value="supabase_storage">Supabase</option><option value="local_storage">Local</option><option value="cloud_storage">Cloud</option></select></div></div>
                  <div className="form-group row"><label className="col-sm-3 col-form-label">Max Size (MB)</label><div className="col-sm-9"><input type="number" className="form-control" name="maxSizeMB" value={backupSettings.maxSizeMB} onChange={handleBackupChange} min="100" max="10000" /></div></div>
                  <div className="form-group row"><label className="col-sm-3 col-form-label">Last Backup</label><div className="col-sm-9"><div className="form-control-static">{backupSettings.lastBackupDate ? new Date(backupSettings.lastBackupDate).toLocaleString() : 'Never'}</div></div></div>
                  <div className="form-group row"><div className="col-sm-9 offset-sm-3"><button type="button" className="btn btn-warning mr-2" onClick={triggerBackup} disabled={saving}><i className="fas fa-database mr-1"></i>Run Manual Backup</button><button type="button" className="btn btn-success mr-2" onClick={exportDatabaseDump} disabled={saving}><i className="fas fa-download mr-1"></i>Export Database</button><button type="button" className="btn btn-danger" disabled={saving}><i className="fas fa-broom mr-1"></i>Clear Cache</button></div></div>
                  <div className="alert alert-warning mt-4"><i className="fas fa-exclamation-triangle mr-1"></i><strong>Warning:</strong> Estimated size: 250 MB per backup.</div>
                </div>
                <div className="border-top pt-3 mt-4"><div className="d-flex justify-content-between"><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><span className="spinner-border spinner-border-sm mr-2"></span>Saving...</> : <><i className="fas fa-save mr-1"></i>Save Changes</>}</button><small className="text-muted">Last updated: {new Date().toLocaleString()}</small></div></div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
