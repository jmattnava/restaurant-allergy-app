import { Plus, Trash2, Edit, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase, type Dish, type Ingredient, type SupplierItem, type Component } from '../../lib/supabase';
import { ALLERGEN_OPTIONS } from '../../constants/allergens';
import AutocompleteInput from '../../components/AutocompleteInput';

const STATIONS = ['Fryer', 'Middle', 'Sauté', 'Sushi (Hut)', 'Desserts (Hut)'];

interface DishWithItems extends Dish {
  items?: Array<{ id: string; name: string; type: 'ingredient' | 'supplier_item' | 'component'; removable: boolean }>;
}

export default function Dishes() {
  const [dishes, setDishes] = useState<DishWithItems[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [supplierItems, setSupplierItems] = useState<SupplierItem[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    station: '',
    selectedItems: [] as Array<{ id: string; name: string; type: 'ingredient' | 'supplier_item' | 'component'; removable: boolean }>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [ingredientsRes, supplierItemsRes, componentsRes, dishesRes, dishIngredientsRes, dishSupplierItemsRes, dishComponentsRes] = await Promise.all([
      supabase.from('ingredients').select('*').order('name'),
      supabase.from('supplier_items').select('*').order('name'),
      supabase.from('components').select('*').order('name'),
      supabase.from('dishes').select('*').order('name'),
      supabase.from('dish_ingredients').select('dish_id, ingredient_id, removable'),
      supabase.from('dish_supplier_items').select('dish_id, supplier_item_id, removable'),
      supabase.from('dish_components').select('dish_id, component_id, removable'),
    ]);

    if (ingredientsRes.error) console.error('Error fetching ingredients:', ingredientsRes.error);
    if (supplierItemsRes.error) console.error('Error fetching supplier items:', supplierItemsRes.error);
    if (componentsRes.error) console.error('Error fetching components:', componentsRes.error);
    if (dishesRes.error) console.error('Error fetching dishes:', dishesRes.error);

    const ingredientsData = ingredientsRes.data || [];
    const supplierItemsData = supplierItemsRes.data || [];
    const componentsData = componentsRes.data || [];
    const dishesData = dishesRes.data || [];
    const dishIngredientsData = dishIngredientsRes.data || [];
    const dishSupplierItemsData = dishSupplierItemsRes.data || [];
    const dishComponentsData = dishComponentsRes.data || [];

    const dishesWithItems = dishesData.map(dish => {
      const items: Array<{ id: string; name: string; type: 'ingredient' | 'supplier_item' | 'component'; removable: boolean }> = [];

      dishIngredientsData.filter(di => di.dish_id === dish.id).forEach(di => {
        const ingredient = ingredientsData.find(i => i.id === di.ingredient_id);
        if (ingredient) items.push({ id: ingredient.id, name: ingredient.name, type: 'ingredient', removable: di.removable });
      });

      dishSupplierItemsData.filter(dsi => dsi.dish_id === dish.id).forEach(dsi => {
        const supplierItem = supplierItemsData.find(si => si.id === dsi.supplier_item_id);
        if (supplierItem) items.push({ id: supplierItem.id, name: supplierItem.name, type: 'supplier_item', removable: dsi.removable });
      });

      dishComponentsData.filter(dc => dc.dish_id === dish.id).forEach(dc => {
        const component = componentsData.find(c => c.id === dc.component_id);
        if (component) items.push({ id: component.id, name: component.name, type: 'component', removable: dc.removable });
      });

      return { ...dish, items };
    });

    setIngredients(ingredientsData);
    setSupplierItems(supplierItemsData);
    setComponents(componentsData);
    setDishes(dishesWithItems);
    setLoading(false);
  };

  const calculateAllergens = (selectedItems: Array<{ id: string; name: string; type: 'ingredient' | 'supplier_item' | 'component' }>) => {
    const allergenSet = new Set<string>();

    selectedItems.forEach(item => {
      if (item.type === 'ingredient') {
        const ingredient = ingredients.find(i => i.id === item.id);
        if (ingredient) ingredient.allergens.forEach(a => allergenSet.add(a));
      } else if (item.type === 'supplier_item') {
        const supplierItem = supplierItems.find(si => si.id === item.id);
        if (supplierItem) supplierItem.allergens.forEach(a => allergenSet.add(a));
      } else if (item.type === 'component') {
        const component = components.find(c => c.id === item.id);
        if (component) component.allergens.forEach(a => allergenSet.add(a));
      }
    });

    return Array.from(allergenSet);
  };

  const handleAddItem = (item: { id: string; name: string; meta?: string }) => {
    let type: 'ingredient' | 'supplier_item' | 'component' = 'ingredient';
    if (item.meta?.startsWith('Supplier:')) type = 'supplier_item';
    else if (item.meta === 'Component') type = 'component';

    setFormData({
      ...formData,
      selectedItems: [...formData.selectedItems, { id: item.id, name: item.name, type, removable: false }],
    });
  };

  const handleRemoveItem = (id: string) => {
    setFormData({
      ...formData,
      selectedItems: formData.selectedItems.filter(item => item.id !== id),
    });
  };

  const handleToggleRemovable = (id: string) => {
    setFormData({
      ...formData,
      selectedItems: formData.selectedItems.map(item =>
        item.id === id ? { ...item, removable: !item.removable } : item
      ),
    });
  };

  const handleStartEdit = (dish: DishWithItems) => {
    setEditingId(dish.id);
    setFormData({
      name: dish.name,
      station: dish.station,
      selectedItems: dish.items || [],
    });
    setShowForm(true);
  };

  const handleAddDish = async () => {
    if (!formData.name.trim() || !formData.station || formData.selectedItems.length === 0) return;

    const allergens = calculateAllergens(formData.selectedItems);

    if (editingId) {
      const { error: dishError } = await supabase
        .from('dishes')
        .update({
          name: formData.name.trim(),
          station: formData.station,
          allergens,
        })
        .eq('id', editingId);

      if (dishError) {
        console.error('Error updating dish:', dishError);
        alert('Error updating dish.');
        return;
      }

      await supabase.from('dish_ingredients').delete().eq('dish_id', editingId);
      await supabase.from('dish_supplier_items').delete().eq('dish_id', editingId);
      await supabase.from('dish_components').delete().eq('dish_id', editingId);

      const ingredientRelations = formData.selectedItems
        .filter(item => item.type === 'ingredient')
        .map(item => ({ dish_id: editingId, ingredient_id: item.id, removable: item.removable }));

      const supplierItemRelations = formData.selectedItems
        .filter(item => item.type === 'supplier_item')
        .map(item => ({ dish_id: editingId, supplier_item_id: item.id, removable: item.removable }));

      const componentRelations = formData.selectedItems
        .filter(item => item.type === 'component')
        .map(item => ({ dish_id: editingId, component_id: item.id, removable: item.removable }));

      if (ingredientRelations.length > 0) {
        const { error } = await supabase.from('dish_ingredients').insert(ingredientRelations);
        if (error) console.error('Error updating ingredient relations:', error);
      }

      if (supplierItemRelations.length > 0) {
        const { error } = await supabase.from('dish_supplier_items').insert(supplierItemRelations);
        if (error) console.error('Error updating supplier item relations:', error);
      }

      if (componentRelations.length > 0) {
        const { error } = await supabase.from('dish_components').insert(componentRelations);
        if (error) console.error('Error updating component relations:', error);
      }

      setFormData({ name: '', station: '', selectedItems: [] });
      setShowForm(false);
      setEditingId(null);
      fetchData();
    } else {
      const { data: newDish, error: dishError } = await supabase
        .from('dishes')
        .insert([{
          name: formData.name.trim(),
          station: formData.station,
          allergens,
        }])
        .select()
        .single();

      if (dishError) {
        console.error('Error adding dish:', dishError);
        alert('Error adding dish. It may already exist.');
        return;
      }

      const ingredientRelations = formData.selectedItems
        .filter(item => item.type === 'ingredient')
        .map(item => ({ dish_id: newDish.id, ingredient_id: item.id, removable: item.removable }));

      const supplierItemRelations = formData.selectedItems
        .filter(item => item.type === 'supplier_item')
        .map(item => ({ dish_id: newDish.id, supplier_item_id: item.id, removable: item.removable }));

      const componentRelations = formData.selectedItems
        .filter(item => item.type === 'component')
        .map(item => ({ dish_id: newDish.id, component_id: item.id, removable: item.removable }));

      if (ingredientRelations.length > 0) {
        const { error } = await supabase.from('dish_ingredients').insert(ingredientRelations);
        if (error) console.error('Error adding ingredient relations:', error);
      }

      if (supplierItemRelations.length > 0) {
        const { error } = await supabase.from('dish_supplier_items').insert(supplierItemRelations);
        if (error) console.error('Error adding supplier item relations:', error);
      }

      if (componentRelations.length > 0) {
        const { error } = await supabase.from('dish_components').insert(componentRelations);
        if (error) console.error('Error adding component relations:', error);
      }

      setFormData({ name: '', station: '', selectedItems: [] });
      setShowForm(false);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dish?')) return;

    const { error } = await supabase
      .from('dishes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting dish:', error);
      alert('Error deleting dish.');
    } else {
      fetchData();
    }
  };

  const allOptions = [
    ...ingredients.map(i => ({ id: i.id, name: i.name, meta: 'Ingredient' })),
    ...supplierItems.map(si => ({ id: si.id, name: si.name, meta: `Supplier: ${si.supplier}` })),
    ...components.map(c => ({ id: c.id, name: c.name, meta: 'Component' })),
  ];

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const filteredDishes = dishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStation = !stationFilter || dish.station === stationFilter;
    return matchesSearch && matchesStation;
  });

  const computedAllergens = calculateAllergens(formData.selectedItems);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Dishes</h1>
          <p className="text-sm text-slate-600">Complete menu items with auto-calculated allergens</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Dish
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All stations</option>
          {STATIONS.map(station => (
            <option key={station} value={station}>{station}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              setShowForm(false);
              setFormData({ name: '', station: '', selectedItems: [] });
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
                    {editingId ? 'Edit Dish' : 'New Dish'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ name: '', station: '', selectedItems: [] });
                      setEditingId(null);
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                </div>
                <div className="p-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Dish name (e.g., Classic Burger, Grilled Salmon)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={formData.station}
              onChange={(e) => setFormData({ ...formData, station: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select station...</option>
              {STATIONS.map(station => (
                <option key={station} value={station}>{station}</option>
              ))}
            </select>
          </div>

          <AutocompleteInput
            label="Add Ingredients, Supplier Items & Components"
            placeholder="Start typing to search..."
            options={allOptions}
            selectedItems={formData.selectedItems}
            onAdd={handleAddItem}
            onRemove={handleRemoveItem}
          />

          {formData.selectedItems.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-3">SELECTED ITEMS - Mark as removable for guest modifications</p>
              <div className="space-y-2">
                {formData.selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.type === 'ingredient'
                        ? 'bg-blue-100 text-blue-700'
                        : item.type === 'supplier_item'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {item.name}
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.removable}
                        onChange={() => handleToggleRemovable(item.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs text-slate-600">Removable</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {formData.selectedItems.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-semibold text-amber-700 mb-2">AUTO-CALCULATED ALLERGENS</p>
              <div className="flex flex-wrap gap-2">
                {computedAllergens.map((allergenId) => {
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
                {computedAllergens.length === 0 && (
                  <span className="text-xs text-amber-600">No allergens detected</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleAddDish}
              disabled={!formData.name.trim() || !formData.station || formData.selectedItems.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium"
            >
              {editingId ? 'Update Dish' : 'Save Dish'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({ name: '', station: '', selectedItems: [] });
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

      <div className="grid grid-cols-1 gap-4">
        {filteredDishes.map(dish => (
          <div key={dish.id} className="bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900 mb-1">{dish.name}</h3>
                <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                  {dish.station}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStartEdit(dish)}
                  className="p-2 hover:bg-blue-100 rounded transition-colors"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                </button>
                <button
                  onClick={() => handleDelete(dish.id)}
                  className="p-2 hover:bg-red-100 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                  Items ({dish.items?.length || 0})
                </p>
                <div className="flex flex-wrap gap-2">
                  {dish.items?.map((item) => (
                    <span
                      key={item.id}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        item.type === 'ingredient'
                          ? 'bg-blue-100 text-blue-700'
                          : item.type === 'supplier_item'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {item.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Allergens</p>
                <div className="flex flex-wrap gap-2">
                  {dish.allergens.length > 0 ? (
                    dish.allergens.map((allergenId) => {
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
                    })
                  ) : (
                    <span className="text-xs text-slate-500">None detected</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredDishes.length === 0 && dishes.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
            No dishes match your search criteria.
          </div>
        )}
        {dishes.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
            No dishes yet. Click "Add Dish" to get started.
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-slate-600">
        Showing {filteredDishes.length} of {dishes.length} dish{dishes.length !== 1 ? 'es' : ''}
      </div>
    </div>
  );
}
