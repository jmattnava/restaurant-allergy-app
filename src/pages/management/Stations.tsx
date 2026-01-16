import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Edit, GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Station {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function Stations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('Error fetching stations:', error);
    } else {
      setStations(data || []);
    }
    setLoading(false);
  };

  const handleStartEdit = (station: Station) => {
    setEditingId(station.id);
    setFormData({
      name: station.name,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingId) {
      const { error } = await supabase
        .from('stations')
        .update({
          name: formData.name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);

      if (error) {
        console.error('Error updating station:', error);
        alert('Error updating station.');
      } else {
        setFormData({ name: '' });
        setShowForm(false);
        setEditingId(null);
        fetchStations();
      }
    } else {
      const maxOrder = stations.length > 0 ? Math.max(...stations.map(s => s.display_order)) : -1;
      const { error } = await supabase
        .from('stations')
        .insert([{
          name: formData.name.trim(),
          display_order: maxOrder + 1,
        }]);

      if (error) {
        console.error('Error adding station:', error);
        alert('Error adding station. Station name might already exist.');
      } else {
        setFormData({ name: '' });
        setShowForm(false);
        fetchStations();
      }
    }
  };

  const handleDelete = async (id: string, stationName: string) => {
    if (!confirm(`Are you sure you want to delete "${stationName}"? Dishes using this station will keep the station name but it won't appear in the stations list.`)) return;

    const { error } = await supabase
      .from('stations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting station:', error);
      alert('Error deleting station.');
    } else {
      fetchStations();
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '' });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newStations = [...stations];
    const draggedItem = newStations[draggedIndex];
    if (!draggedItem) return;

    newStations.splice(draggedIndex, 1);
    newStations.splice(index, 0, draggedItem);

    const reorderedStations = newStations.map((station, idx) => ({
      ...station,
      display_order: idx,
    }));

    setStations(reorderedStations);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    const updates = stations.map((station, idx) =>
      supabase
        .from('stations')
        .update({ display_order: idx })
        .eq('id', station.id)
    );

    await Promise.all(updates);
    setDraggedIndex(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading stations...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Stations</h2>
          <p className="text-slate-600 mt-1">Manage your kitchen stations and their display order</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ name: '' });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Station
        </button>
      </div>

      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={handleCancelForm}
          />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {editingId ? 'Edit Station' : 'Add New Station'}
                  </h2>
                  <button
                    onClick={handleCancelForm}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
                <div className="p-6">

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Station Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ name: e.target.value })}
                placeholder="e.g., Grill, Fryer, Cold Line"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? 'Update' : 'Add'} Station
              </button>
            </div>
          </form>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {stations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500">No stations yet. Add your first station above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 w-12">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Station Name
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700 w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stations.map((station, index) => (
                <tr
                  key={station.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`hover:bg-slate-50 transition-colors ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-slate-400">
                    <GripVertical className="w-4 h-4 cursor-move" />
                  </td>
                  <td className="px-4 py-3 text-slate-900 font-medium">
                    {station.name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleStartEdit(station)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit station"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(station.id, station.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete station"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
