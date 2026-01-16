import { Plus, Trash2, Edit, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase, type Component, type Ingredient, type SupplierItem } from '../../lib/supabase';
import { ALLERGEN_OPTIONS } from '../../constants/allergens';
import AutocompleteInput from '../../components/AutocompleteInput';

interface ComponentWithItems extends Component {
  ingredients?: Array<{ id: string; name: string }>;
  supplier_items?: Array<{ id: string; name: string; supplier: string }>;
  child_components?: Array<{ id: string; name: string }>;
}

export default function Components() {
  const [components, setComponents] = useState<ComponentWithItems[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [supplierItems, setSupplierItems] = useState<SupplierItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    selectedItems: [] as Array<{ id: string; name: string; type: 'ingredient' | 'supplier_item' | 'component' }>,
    cross_contact: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [ingredientsRes, supplierItemsRes, componentsRes, ingredientRelationsRes, supplierRelationsRes, componentRelationsRes] = await Promise.all([
      supabase.from('ingredients').select('*').order('name'),
      supabase.from('supplier_items').select('*').order('name'),
      supabase.from('components').select('*').order('name'),
      supabase.from('component_ingredients').select('component_id, ingredient_id'),
      supabase.from('component_supplier_items').select('component_id, supplier_item_id'),
      supabase.from('component_components').select('parent_component_id, child_component_id'),
    ]);

    if (ingredientsRes.error) console.error('Error fetching ingredients:', ingredientsRes.error);
    if (supplierItemsRes.error) console.error('Error fetching supplier items:', supplierItemsRes.error);
    if (componentsRes.error) console.error('Error fetching components:', componentsRes.error);
    if (ingredientRelationsRes.error) console.error('Error fetching ingredient relations:', ingredientRelationsRes.error);
    if (supplierRelationsRes.error) console.error('Error fetching supplier relations:', supplierRelationsRes.error);
    if (componentRelationsRes.error) console.error('Error fetching component relations:', componentRelationsRes.error);

    const ingredientsData = ingredientsRes.data || [];
    const supplierItemsData = supplierItemsRes.data || [];
    const componentsData = componentsRes.data || [];
    const ingredientRelationsData = ingredientRelationsRes.data || [];
    const supplierRelationsData = supplierRelationsRes.data || [];
    const componentRelationsData = componentRelationsRes.data || [];

    const componentsWithItems = componentsData.map(component => {
      const relatedIngredientIds = ingredientRelationsData
        .filter(r => r.component_id === component.id)
        .map(r => r.ingredient_id);

      const relatedIngredients = ingredientsData
        .filter(ing => relatedIngredientIds.includes(ing.id))
        .map(ing => ({ id: ing.id, name: ing.name }));

      const relatedSupplierItemIds = supplierRelationsData
        .filter(r => r.component_id === component.id)
        .map(r => r.supplier_item_id);

      const relatedSupplierItems = supplierItemsData
        .filter(si => relatedSupplierItemIds.includes(si.id))
        .map(si => ({ id: si.id, name: si.name, supplier: si.supplier }));

      const relatedChildComponentIds = componentRelationsData
        .filter(r => r.parent_component_id === component.id)
        .map(r => r.child_component_id);

      const relatedChildComponents = componentsData
        .filter(c => relatedChildComponentIds.includes(c.id))
        .map(c => ({ id: c.id, name: c.name }));

      return {
        ...component,
        ingredients: relatedIngredients,
        supplier_items: relatedSupplierItems,
        child_components: relatedChildComponents,
      };
    });

    setIngredients(ingredientsData);
    setSupplierItems(supplierItemsData);
    setComponents(componentsWithItems);
    setLoading(false);
  };

  const calculateAllergens = (selectedItems: Array<{ id: string; name: string; type: 'ingredient' | 'supplier_item' | 'component' }>) => {
    const allergenSet = new Set<string>();

    selectedItems.forEach(item => {
      if (item.type === 'ingredient') {
        const ingredient = ingredients.find(ing => ing.id === item.id);
        if (ingredient) ingredient.allergens.forEach(allergen => allergenSet.add(allergen));
      } else if (item.type === 'supplier_item') {
        const supplierItem = supplierItems.find(si => si.id === item.id);
        if (supplierItem) supplierItem.allergens.forEach(allergen => allergenSet.add(allergen));
      } else if (item.type === 'component') {
        const component = components.find(c => c.id === item.id);
        if (component) component.allergens.forEach(allergen => allergenSet.add(allergen));
      }
    });

    return Array.from(allergenSet);
  };

  const handleAddItem = (item: { id: string; name: string; meta?: string }) => {
    let type: 'ingredient' | 'supplier_item' | 'component' = 'ingredient';
    if (item.meta?.startsWith('Supplier:')) type = 'supplier_item';
    if (item.meta?.startsWith('Component')) type = 'component';

    setFormData({
      ...formData,
      selectedItems: [...formData.selectedItems, { id: item.id, name: item.name, type }],
    });
  };

  const handleRemoveItem = (id: string) => {
    setFormData({
      ...formData,
      selectedItems: formData.selectedItems.filter(item => item.id !== id),
    });
  };

  const handleStartEdit = (component: ComponentWithItems) => {
    setEditingId(component.id);
    const selectedItems = [
      ...(component.ingredients || []).map(ing => ({ id: ing.id, name: ing.name, type: 'ingredient' as const })),
      ...(component.supplier_items || []).map(si => ({ id: si.id, name: si.name, type: 'supplier_item' as const })),
      ...(component.child_components || []).map(c => ({ id: c.id, name: c.name, type: 'component' as const })),
    ];
    setFormData({
      name: component.name,
      selectedItems,
      cross_contact: component.cross_contact || false,
    });
    setShowForm(true);
  };

  const handleAddComponent = async () => {
    if (!formData.name.trim() || formData.selectedItems.length === 0) return;

    const allergens = calculateAllergens(formData.selectedItems);

    if (editingId) {
      const { error: componentError } = await supabase
        .from('components')
        .update({
          name: formData.name.trim(),
          allergens,
          cross_contact: formData.cross_contact,
        })
        .eq('id', editingId);

      if (componentError) {
        console.error('Error updating component:', componentError);
        alert('Error updating component.');
        return;
      }

      await supabase.from('component_ingredients').delete().eq('component_id', editingId);
      await supabase.from('component_supplier_items').delete().eq('component_id', editingId);
      await supabase.from('component_components').delete().eq('parent_component_id', editingId);

      const ingredientRelations = formData.selectedItems
        .filter(item => item.type === 'ingredient')
        .map(item => ({
          component_id: editingId,
          ingredient_id: item.id,
        }));

      const supplierRelations = formData.selectedItems
        .filter(item => item.type === 'supplier_item')
        .map(item => ({
          component_id: editingId,
          supplier_item_id: item.id,
        }));

      const componentRelations = formData.selectedItems
        .filter(item => item.type === 'component')
        .map(item => ({
          parent_component_id: editingId,
          child_component_id: item.id,
        }));

      if (ingredientRelations.length > 0) {
        const { error: ingredientError } = await supabase
          .from('component_ingredients')
          .insert(ingredientRelations);

        if (ingredientError) {
          console.error('Error updating ingredient relations:', ingredientError);
          alert('Error linking ingredients to component.');
          return;
        }
      }

      if (supplierRelations.length > 0) {
        const { error: supplierError } = await supabase
          .from('component_supplier_items')
          .insert(supplierRelations);

        if (supplierError) {
          console.error('Error updating supplier item relations:', supplierError);
          alert('Error linking supplier items to component.');
          return;
        }
      }

      if (componentRelations.length > 0) {
        const { error: componentError } = await supabase
          .from('component_components')
          .insert(componentRelations);

        if (componentError) {
          console.error('Error updating component relations:', componentError);
          alert('Error linking components to component.');
          return;
        }
      }

      setFormData({ name: '', selectedItems: [], cross_contact: false });
      setShowForm(false);
      setEditingId(null);
      fetchData();
    } else {
      const { data: newComponent, error: componentError } = await supabase
        .from('components')
        .insert([{
          name: formData.name.trim(),
          allergens,
          cross_contact: formData.cross_contact,
        }])
        .select()
        .single();

      if (componentError) {
        console.error('Error adding component:', componentError);
        if (componentError.code === '23505') {
          alert(`A component named "${formData.name.trim()}" already exists. Please use a different name or edit the existing component.`);
        } else {
          alert('Error adding component. Please try again.');
        }
        return;
      }

      const ingredientRelations = formData.selectedItems
        .filter(item => item.type === 'ingredient')
        .map(item => ({
          component_id: newComponent.id,
          ingredient_id: item.id,
        }));

      const supplierRelations = formData.selectedItems
        .filter(item => item.type === 'supplier_item')
        .map(item => ({
          component_id: newComponent.id,
          supplier_item_id: item.id,
        }));

      const componentRelations = formData.selectedItems
        .filter(item => item.type === 'component')
        .map(item => ({
          parent_component_id: newComponent.id,
          child_component_id: item.id,
        }));

      if (ingredientRelations.length > 0) {
        const { error: ingredientError } = await supabase
          .from('component_ingredients')
          .insert(ingredientRelations);

        if (ingredientError) {
          console.error('Error adding ingredient relations:', ingredientError);
          alert('Error linking ingredients to component.');
          return;
        }
      }

      if (supplierRelations.length > 0) {
        const { error: supplierError } = await supabase
          .from('component_supplier_items')
          .insert(supplierRelations);

        if (supplierError) {
          console.error('Error adding supplier item relations:', supplierError);
          alert('Error linking supplier items to component.');
          return;
        }
      }

      if (componentRelations.length > 0) {
        const { error: componentError } = await supabase
          .from('component_components')
          .insert(componentRelations);

        if (componentError) {
          console.error('Error adding component relations:', componentError);
          alert('Error linking components to component.');
          return;
        }
      }

      setFormData({ name: '', selectedItems: [], cross_contact: false });
      setShowForm(false);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this component?')) return;

    const { error } = await supabase
      .from('components')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting component:', error);
      alert('Error deleting component. It may be in use by dishes.');
    } else {
      fetchData();
    }
  };

  const allOptions = [
    ...ingredients.map(ing => ({
      id: ing.id,
      name: ing.name,
      meta: 'Ingredient',
    })),
    ...supplierItems.map(si => ({
      id: si.id,
      name: si.name,
      meta: `Supplier: ${si.supplier}`,
    })),
    ...components
      .filter(c => c.id !== editingId)
      .map(c => ({
        id: c.id,
        name: c.name,
        meta: 'Component',
      })),
  ];

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const filteredComponents = components.filter(component =>
    component.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const computedAllergens = calculateAllergens(formData.selectedItems);

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">In-House Components</h1>
          <p className="text-sm text-slate-600">Reusable prep items with auto-calculated allergens</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Component
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search components..."
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
              setFormData({ name: '', selectedItems: [], cross_contact: false });
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
                    {editingId ? 'Edit Component' : 'New Component'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ name: '', selectedItems: [], cross_contact: false });
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
            placeholder="Component name (e.g., House Sauce, Garlic Butter)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <AutocompleteInput
            label="Add Ingredients, Supplier Items & Components"
            placeholder="Start typing to search..."
            options={allOptions}
            selectedItems={formData.selectedItems}
            onAdd={handleAddItem}
            onRemove={handleRemoveItem}
          />

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

          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
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

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleAddComponent}
              disabled={!formData.name.trim() || formData.selectedItems.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium"
            >
              {editingId ? 'Update Component' : 'Save Component'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData({ name: '', selectedItems: [], cross_contact: false });
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
        {filteredComponents.map(component => (
          <div key={component.id} className="bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900">{component.name}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleStartEdit(component)}
                  className="p-2 hover:bg-blue-100 rounded transition-colors"
                >
                  <Edit className="w-4 h-4 text-blue-600" />
                </button>
                <button
                  onClick={() => handleDelete(component.id)}
                  className="p-2 hover:bg-red-100 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    Items ({(component.ingredients?.length || 0) + (component.supplier_items?.length || 0) + (component.child_components?.length || 0)})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {component.ingredients?.map((item) => (
                      <span
                        key={item.id}
                        className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700"
                      >
                        {item.name}
                      </span>
                    ))}
                    {component.supplier_items?.map((item) => (
                      <span
                        key={item.id}
                        className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700"
                      >
                        {item.name}
                      </span>
                    ))}
                    {component.child_components?.map((item) => (
                      <span
                        key={item.id}
                        className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Allergens</p>
                  <div className="flex flex-wrap gap-2">
                    {component.allergens.length > 0 ? (
                      component.allergens.map((allergenId) => {
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
              {component.cross_contact && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">
                    ⚠️ Cross-contact risk
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
        {filteredComponents.length === 0 && components.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
            No components match your search.
          </div>
        )}
        {components.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
            No components yet. Click "Add Component" to get started.
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-slate-600">
        Showing {filteredComponents.length} of {components.length} component{components.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
