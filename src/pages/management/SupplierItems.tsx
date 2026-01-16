import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Edit, Search } from 'lucide-react';
import { ALLERGEN_OPTIONS } from '../../constants/allergens';
import { supabase, type SupplierItem } from '../../lib/supabase';

export default function SupplierItems() {
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    supplier: '',
    allergens: [] as string[],
    may_contain: [] as string[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('supplier_items')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching supplier items:', error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const toggleAllergen = (allergenId: string) => {
    setFormData({
      ...formData,
      allergens: formData.allergens.includes(allergenId)
        ? formData.allergens.filter(a => a !== allergenId)
        : [...formData.allergens, allergenId],
    });
  };

  const toggleMayContain = (allergenId: string) => {
    setFormData({
      ...formData,
      may_contain: formData.may_contain.includes(allergenId)
        ? formData.may_contain.filter(a => a !== allergenId)
        : [...formData.may_contain, allergenId],
    });
  };

  const handleStartEdit = (item: SupplierItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      supplier: item.supplier,
      allergens: item.allergens,
      may_contain: item.may_contain || [],
    });
    setShowForm(true);
  };

  const handleAddItem = async () => {
    if (!formData.name.trim() || !formData.supplier.trim()) return;

    if (editingId) {
      const { error } = await supabase
        .from('supplier_items')
        .update({
          name: formData.name.trim(),
          supplier: formData.supplier.trim(),
          allergens: formData.allergens,
          may_contain: formData.may_contain,
        })
        .eq('id', editingId);

      if (error) {
        console.error('Error updating supplier item:', error);
        alert('Error updating supplier item.');
      } else {
        setFormData({ name: '', supplier: '', allergens: [], may_contain: [] });
        setShowForm(false);
        setEditingId(null);
        fetchItems();
      }
    } else {
      const { error } = await supabase
        .from('supplier_items')
        .insert([{
          name: formData.name.trim(),
          supplier: formData.supplier.trim(),
          allergens: formData.allergens,
          may_contain: formData.may_contain,
        }]);

      if (error) {
        console.error('Error adding supplier item:', error);
        alert('Error adding supplier item. It may already exist.');
      } else {
        setFormData({ name: '', supplier: '', allergens: [], may_contain: [] });
        setShowForm(false);
        fetchItems();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier item?')) return;

    const { error } = await supabase
      .from('supplier_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting supplier item:', error);
      alert('Error deleting supplier item. It may be in use by dishes.');
    } else {
      fetchItems();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Supplier Items</h1>
          <p className="text-sm text-slate-600">Pre-made items from suppliers (separate from basic ingredients)</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search items or suppliers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              setShowForm(false);
              setFormData({ name: '', supplier: '', allergens: [], may_contain: [] });
              setEditingId(null);
            }}
          />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {editingId ? 'Edit Supplier Item' : 'New Supplier Item'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ name: '', supplier: '', allergens: [], may_contain: [] });
                      setEditingId(null);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
                <div className="p-6">

          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Item name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Supplier name"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Select Allergens</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ALLERGEN_OPTIONS.map(allergen => {
                const selected = formData.allergens.includes(allergen.id);
                return (
                  <button
                    key={allergen.id}
                    onClick={() => toggleAllergen(allergen.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left font-medium text-sm transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xl">{allergen.emoji}</span>
                    <span>{allergen.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {formData.allergens.length > 0 && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs font-semibold text-slate-600 mb-2">SELECTED ALLERGENS</p>
              <div className="flex flex-wrap gap-2">
                {formData.allergens.map((allergenId) => {
                  const allergen = ALLERGEN_OPTIONS.find(a => a.id === allergenId);
                  if (!allergen) return null;
                  return (
                    <div
                      key={allergenId}
                      className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700"
                    >
                      <span>{allergen.emoji}</span>
                      <span>{allergen.name}</span>
                      <button
                        onClick={() => toggleAllergen(allergenId)}
                        className="hover:opacity-70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">May Contain (Trace Amounts)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ALLERGEN_OPTIONS.map(allergen => {
                const selected = formData.may_contain.includes(allergen.id);
                return (
                  <button
                    key={allergen.id}
                    onClick={() => toggleMayContain(allergen.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left font-medium text-sm transition-all ${
                      selected
                        ? 'border-orange-500 bg-orange-50 text-orange-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xl">{allergen.emoji}</span>
                    <span>{allergen.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {formData.may_contain.length > 0 && (
            <div className="mb-4 p-3 bg-orange-50 rounded-lg">
              <p className="text-xs font-semibold text-orange-600 mb-2">SELECTED MAY CONTAIN</p>
              <div className="flex flex-wrap gap-2">
                {formData.may_contain.map((allergenId) => {
                  const allergen = ALLERGEN_OPTIONS.find(a => a.id === allergenId);
                  if (!allergen) return null;
                  return (
                    <div
                      key={allergenId}
                      className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700"
                    >
                      <span>{allergen.emoji}</span>
                      <span>{allergen.name}</span>
                      <button
                        onClick={() => toggleMayContain(allergenId)}
                        className="hover:opacity-70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddItem}
              disabled={!formData.name.trim() || !formData.supplier.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium"
            >
              {editingId ? 'Update Item' : 'Save Item'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({ name: '', supplier: '', allergens: [], may_contain: [] });
                setEditingId(null);
              }}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full bg-white">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Supplier</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Allergens</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">May Contain</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{item.supplier}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {item.allergens.map((allergenId) => {
                      const allergen = ALLERGEN_OPTIONS.find(a => a.id === allergenId);
                      if (!allergen) return null;
                      return (
                        <span
                          key={allergenId}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-700"
                        >
                          {allergen.emoji} {allergen.name}
                        </span>
                      );
                    })}
                    {item.allergens.length === 0 && (
                      <span className="text-slate-400 text-xs">None</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {(item.may_contain || []).map((allergenId) => {
                      const allergen = ALLERGEN_OPTIONS.find(a => a.id === allergenId);
                      if (!allergen) return null;
                      return (
                        <span
                          key={allergenId}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-700"
                        >
                          {allergen.emoji} {allergen.name}
                        </span>
                      );
                    })}
                    {(!item.may_contain || item.may_contain.length === 0) && (
                      <span className="text-slate-400 text-xs">None</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="p-2 hover:bg-blue-100 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && items.length > 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No supplier items match your search.
                </td>
              </tr>
            )}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No supplier items yet. Click "Add Item" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        Showing {filteredItems.length} of {items.length} supplier item{items.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
