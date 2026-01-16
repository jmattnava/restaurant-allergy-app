import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Edit, Search } from 'lucide-react';
import { ALLERGEN_OPTIONS } from '../../constants/allergens';
import { supabase, type Ingredient } from '../../lib/supabase';

export default function Ingredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    allergens: [] as string[],
    may_contain: [] as string[],
    cross_contact: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching ingredients:', error);
    } else {
      setIngredients(data || []);
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

  const handleStartEdit = (ingredient: Ingredient) => {
    setEditingId(ingredient.id);
    setFormData({
      name: ingredient.name,
      allergens: ingredient.allergens,
      may_contain: ingredient.may_contain || [],
      cross_contact: ingredient.cross_contact || false,
    });
    setShowForm(true);
  };

  const handleAddIngredient = async () => {
    if (!formData.name.trim()) return;

    if (editingId) {
      const { error } = await supabase
        .from('ingredients')
        .update({
          name: formData.name.trim(),
          allergens: formData.allergens,
          may_contain: formData.may_contain,
          cross_contact: formData.cross_contact,
        })
        .eq('id', editingId);

      if (error) {
        console.error('Error updating ingredient:', error);
        alert('Error updating ingredient.');
      } else {
        setFormData({ name: '', allergens: [], may_contain: [], cross_contact: false });
        setShowForm(false);
        setEditingId(null);
        fetchIngredients();
      }
    } else {
      const { error } = await supabase
        .from('ingredients')
        .insert([{
          name: formData.name.trim(),
          allergens: formData.allergens,
          may_contain: formData.may_contain,
          cross_contact: formData.cross_contact,
        }]);

      if (error) {
        console.error('Error adding ingredient:', error);
        alert('Error adding ingredient. It may already exist.');
      } else {
        setFormData({ name: '', allergens: [], may_contain: [], cross_contact: false });
        setShowForm(false);
        fetchIngredients();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;

    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ingredient:', error);
      alert('Error deleting ingredient. It may be in use by components or dishes.');
    } else {
      fetchIngredients();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const filteredIngredients = ingredients.filter(ingredient =>
    ingredient.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Ingredients</h1>
          <p className="text-sm text-slate-600">Basic ingredients with allergen tags</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Ingredient
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search ingredients..."
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
              setFormData({ name: '', allergens: [], may_contain: [], cross_contact: false });
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
                    {editingId ? 'Edit Ingredient' : 'New Ingredient'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ name: '', allergens: [], may_contain: [], cross_contact: false });
                      setEditingId(null);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
                <div className="p-6">

          <input
            type="text"
            placeholder="Ingredient name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

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

          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.cross_contact}
                onChange={(e) => setFormData({ ...formData, cross_contact: e.target.checked })}
                className="w-4 h-4"
              />
              <div>
                <span className="font-medium text-slate-700 text-sm">Cross-contact risk</span>
                <p className="text-xs text-slate-500">Shared equipment (e.g., deep fryer)</p>
              </div>
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddIngredient}
              disabled={!formData.name.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium"
            >
              {editingId ? 'Update Ingredient' : 'Save Ingredient'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({ name: '', allergens: [], may_contain: [], cross_contact: false });
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Allergens</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">May Contain</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-slate-900">Cross-Contact</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredIngredients.map(ingredient => (
              <tr key={ingredient.id} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{ingredient.name}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {ingredient.allergens.map((allergenId) => {
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
                    {ingredient.allergens.length === 0 && (
                      <span className="text-slate-400 text-xs">None</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {(ingredient.may_contain || []).map((allergenId) => {
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
                    {(!ingredient.may_contain || ingredient.may_contain.length === 0) && (
                      <span className="text-slate-400 text-xs">None</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  {ingredient.cross_contact && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">
                      ⚠️ Yes
                    </span>
                  )}
                  {!ingredient.cross_contact && (
                    <span className="text-slate-400 text-xs">No</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleStartEdit(ingredient)}
                      className="p-2 hover:bg-blue-100 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(ingredient.id)}
                      className="p-2 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredIngredients.length === 0 && ingredients.length > 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No ingredients match your search.
                </td>
              </tr>
            )}
            {ingredients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No ingredients yet. Click "Add Ingredient" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        Showing {filteredIngredients.length} of {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
