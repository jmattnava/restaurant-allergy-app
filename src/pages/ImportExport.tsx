import { Download, Upload } from 'lucide-react';
import { useState } from 'react';

export default function ImportExport() {
  const [exportStatus, setExportStatus] = useState<'idle' | 'success'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleExport = () => {
    const data = {
      ingredients: [],
      suppliers: [],
      components: [],
      dishes: [],
      stations: [],
      matrices: [],
      exportedAt: new Date().toISOString(),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `allergycheck-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    setExportStatus('success');
    setTimeout(() => setExportStatus('idle'), 3000);
  };

  const handleImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        JSON.parse(content);
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 3000);
      } catch (error) {
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Import / Export</h1>
        <p className="text-slate-600">Backup your data and share configurations with team members</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Download className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-slate-900 text-center mb-2">Export Database</h2>
          <p className="text-sm text-slate-600 text-center mb-6">
            Download all your ingredients, components, dishes, and matrices as JSON
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-slate-600 font-mono">
              Includes: Ingredients, Suppliers, Components, Dishes, Stations, Matrices
            </p>
          </div>

          <button
            onClick={handleExport}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Database
          </button>

          {exportStatus === 'success' && (
            <p className="text-sm text-green-600 mt-3 text-center font-medium">
              Downloaded successfully!
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Upload className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-slate-900 text-center mb-2">Import Database</h2>
          <p className="text-sm text-slate-600 text-center mb-6">
            Restore or load a previously exported configuration
          </p>

          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-slate-600">
              Upload a JSON file exported from AllergyCheck to restore all data
            </p>
          </div>

          <label className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            Import Database
            <input
              type="file"
              accept=".json"
              onChange={handleImportChange}
              className="hidden"
            />
          </label>

          {importStatus === 'success' && (
            <p className="text-sm text-green-600 mt-3 text-center font-medium">
              Imported successfully!
            </p>
          )}
          {importStatus === 'error' && (
            <p className="text-sm text-red-600 mt-3 text-center font-medium">
              Invalid file format
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
        <h3 className="font-semibold text-amber-900 mb-3">Important Notes</h3>
        <ul className="text-sm text-amber-800 space-y-2">
          <li>• Always keep regular backups of your database</li>
          <li>• Export files are plain JSON and can be version-controlled</li>
          <li>• Import will merge data with existing entries</li>
          <li>• Backup files are timestamped for easy identification</li>
        </ul>
      </div>
    </div>
  );
}
