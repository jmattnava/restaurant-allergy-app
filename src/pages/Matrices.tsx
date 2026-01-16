import { useState, useEffect } from 'react';
import { Plus, Trash2, Download, Printer, GripVertical, ArrowLeft, Eye, Save } from 'lucide-react';
import { ALLERGEN_OPTIONS } from '../constants/allergens';
import { supabase, type Dish } from '../lib/supabase';
import AutocompleteInput from '../components/AutocompleteInput';

interface DishWithAllergenInfo extends Dish {
  contains: string[];
  mayContain: string[];
}

interface Matrix {
  id: string;
  name: string;
  type: 'station' | 'feature';
  station?: string;
  dishes: DishWithAllergenInfo[];
  createdAt: string;
  saved: boolean;
}

export default function Matrices() {
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [dishes, setDishes] = useState<DishWithAllergenInfo[]>([]);
  const [showStationForm, setShowStationForm] = useState(false);
  const [showFeatureForm, setShowFeatureForm] = useState(false);
  const [selectedStation, setSelectedStation] = useState('');
  const [featureName, setFeatureName] = useState('');
  const [viewingMatrix, setViewingMatrix] = useState<Matrix | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showAddDishForm, setShowAddDishForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await fetchDishes();
    };
    loadData();
  }, []);

  useEffect(() => {
    if (dishes.length > 0) {
      loadSavedMatrices();
    }
  }, [dishes.length]);

  const fetchDishes = async () => {
    const [dishesRes, ingredientsRes, supplierItemsRes, dishIngredientsRes, dishSupplierItemsRes] = await Promise.all([
      supabase.from('dishes').select('*').order('name'),
      supabase.from('ingredients').select('*'),
      supabase.from('supplier_items').select('*'),
      supabase.from('dish_ingredients').select('*'),
      supabase.from('dish_supplier_items').select('*'),
    ]);

    if (dishesRes.error) {
      console.error('Error fetching dishes:', dishesRes.error);
      setLoading(false);
      return;
    }

    const ingredientsData = ingredientsRes.data || [];
    const supplierItemsData = supplierItemsRes.data || [];
    const dishIngredientsData = dishIngredientsRes.data || [];
    const dishSupplierItemsData = dishSupplierItemsRes.data || [];

    const dishesWithAllergenInfo = (dishesRes.data || []).map(dish => {
      const contains = new Set<string>(dish.allergens || []);
      const mayContain = new Set<string>();

      dishIngredientsData.filter(di => di.dish_id === dish.id).forEach(di => {
        const ingredient = ingredientsData.find(i => i.id === di.ingredient_id);
        if (ingredient && ingredient.may_contain) {
          (ingredient.may_contain || []).forEach(a => {
            if (!contains.has(a)) {
              mayContain.add(a);
            }
          });
        }
      });

      dishSupplierItemsData.filter(dsi => dsi.dish_id === dish.id).forEach(dsi => {
        const supplierItem = supplierItemsData.find(si => si.id === dsi.supplier_item_id);
        if (supplierItem && supplierItem.may_contain) {
          (supplierItem.may_contain || []).forEach(a => {
            if (!contains.has(a)) {
              mayContain.add(a);
            }
          });
        }
      });

      return {
        ...dish,
        allergens: dish.allergens || [],
        may_contain: dish.may_contain || [],
        cross_contact: dish.cross_contact || false,
        contains: Array.from(contains),
        mayContain: Array.from(mayContain),
      };
    });

    setDishes(dishesWithAllergenInfo);
    setLoading(false);
  };

  const loadSavedMatrices = async () => {
    if (dishes.length === 0) return;

    try {
      const { data: matricesData, error } = await supabase
        .from('allergy_matrices')
        .select('*, matrix_dishes(dish_id, order_index)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading matrices:', error);
        return;
      }

      const matricesWithDishes = (matricesData || []).map((matrixData) => {
        const dishIds = (matrixData.matrix_dishes || [])
          .sort((a, b) => a.order_index - b.order_index)
          .map((md: any) => md.dish_id);

        const dishesForMatrix = dishes.filter(d => dishIds.includes(d.id));
        const sortedDishes = dishIds
          .map(id => dishesForMatrix.find(d => d.id === id))
          .filter(Boolean) as DishWithAllergenInfo[];

        return {
          id: matrixData.id,
          name: matrixData.name,
          type: matrixData.type as 'station' | 'feature',
          station: matrixData.station || undefined,
          dishes: sortedDishes,
          createdAt: new Date(matrixData.created_at).toLocaleDateString(),
          saved: true,
        };
      });

      setMatrices(prevMatrices => [
        ...matricesWithDishes,
        ...prevMatrices.filter(m => !m.saved),
      ]);
    } catch (err) {
      console.error('Error loading matrices:', err);
    }
  };

  const saveMatrix = async (matrix: Matrix) => {
    const { data: savedMatrix, error: matrixError } = await supabase
      .from('allergy_matrices')
      .upsert({
        id: matrix.saved ? matrix.id : undefined,
        name: matrix.name,
        type: matrix.type,
        station: matrix.station || null,
      })
      .select()
      .single();

    if (matrixError) {
      console.error('Error saving matrix:', matrixError);
      alert('Error saving matrix.');
      return;
    }

    await supabase
      .from('matrix_dishes')
      .delete()
      .eq('matrix_id', savedMatrix.id);

    if (matrix.dishes.length > 0) {
      const matrixDishes = matrix.dishes.map((dish, index) => ({
        matrix_id: savedMatrix.id,
        dish_id: dish.id,
        order_index: index,
      }));

      const { error: dishesError } = await supabase
        .from('matrix_dishes')
        .insert(matrixDishes);

      if (dishesError) {
        console.error('Error saving matrix dishes:', dishesError);
        alert('Error saving matrix dishes.');
        return;
      }
    }

    const updatedMatrix = { ...matrix, id: savedMatrix.id, saved: true };
    setMatrices(matrices.map(m => (m.id === matrix.id ? updatedMatrix : m)));
    setViewingMatrix(updatedMatrix);
    alert('Matrix saved successfully!');
  };

  const handleGenerateStation = () => {
    if (!selectedStation) return;
    const stationDishes = dishes.filter(d => d.station === selectedStation);
    const newMatrix: Matrix = {
      id: Date.now().toString(),
      name: `${selectedStation} Station Matrix`,
      type: 'station',
      station: selectedStation,
      dishes: stationDishes,
      createdAt: new Date().toLocaleDateString(),
      saved: false,
    };
    setMatrices([...matrices, newMatrix]);
    setViewingMatrix(newMatrix);
    setSelectedStation('');
    setShowStationForm(false);
  };

  const handleCreateFeature = () => {
    if (!featureName) return;
    const newMatrix: Matrix = {
      id: Date.now().toString(),
      name: featureName,
      type: 'feature',
      dishes: [],
      createdAt: new Date().toLocaleDateString(),
      saved: false,
    };
    setMatrices([...matrices, newMatrix]);
    setViewingMatrix(newMatrix);
    setFeatureName('');
    setShowFeatureForm(false);
  };

  const handleAddDishToMatrix = (dish: { id: string; name: string }) => {
    if (!viewingMatrix) return;
    const dishToAdd = dishes.find(d => d.id === dish.id);
    if (!dishToAdd) return;
    if (viewingMatrix.dishes.some(d => d.id === dish.id)) {
      alert('Dish already in matrix');
      return;
    }
    const updatedMatrix = {
      ...viewingMatrix,
      dishes: [...viewingMatrix.dishes, dishToAdd],
    };
    setViewingMatrix(updatedMatrix);
    setMatrices(matrices.map(m => (m.id === updatedMatrix.id ? updatedMatrix : m)));
    setShowAddDishForm(false);
  };

  const handleRemoveDishFromMatrix = (dishId: string) => {
    if (!viewingMatrix) return;
    const updatedMatrix = {
      ...viewingMatrix,
      dishes: viewingMatrix.dishes.filter(d => d.id !== dishId),
    };
    setViewingMatrix(updatedMatrix);
    setMatrices(matrices.map(m => (m.id === updatedMatrix.id ? updatedMatrix : m)));
  };

  const handleDelete = async (id: string) => {
    const matrix = matrices.find(m => m.id === id);
    if (!matrix) return;

    if (matrix.saved) {
      const { error } = await supabase
        .from('allergy_matrices')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting matrix:', error);
        alert('Error deleting matrix.');
        return;
      }
    }

    setMatrices(matrices.filter(m => m.id !== id));
    if (viewingMatrix?.id === id) {
      setViewingMatrix(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (window.matchMedia('print').matches) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (window.matchMedia('print').matches) return;
    if (draggedIndex === null || draggedIndex === index || !viewingMatrix) return;

    const newDishes = [...viewingMatrix.dishes];
    const draggedItem = newDishes[draggedIndex];
    if (!draggedItem) return;

    newDishes.splice(draggedIndex, 1);
    newDishes.splice(index, 0, draggedItem);

    const updatedMatrix = { ...viewingMatrix, dishes: newDishes };
    setViewingMatrix(updatedMatrix);
    setMatrices(matrices.map(m => (m.id === updatedMatrix.id ? updatedMatrix : m)));
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    if (window.matchMedia('print').matches) return;
    setDraggedIndex(null);
  };

  const stations = [...new Set(dishes.map(d => d.station))].sort();

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (viewingMatrix) {
    return (
      <>
        <style>
          {`
            @media print {
              @page {
                margin: 0.5cm;
                size: landscape;
              }
              body {
                background: white !important;
              }
              .print-table {
                border-collapse: collapse !important;
                width: 100% !important;
                table-layout: fixed !important;
              }
              .print-table th,
              .print-table td {
                border: 1px solid #000 !important;
                background: white !important;
                color: black !important;
                padding: 4px 6px !important;
                font-size: 9px !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                position: static !important;
              }
              .print-table th {
                font-weight: bold !important;
                background: white !important;
              }
              .print-table tbody tr {
                border-bottom: 1px solid #000 !important;
              }
              .print-table th:first-child,
              .print-table td:first-child {
                min-width: 120px !important;
                white-space: normal !important;
              }
              .print-header {
                margin-bottom: 10px;
                text-align: left;
              }
              .print-header h1 {
                font-size: 18px;
                font-weight: bold;
                color: black;
                margin-bottom: 4px;
              }
              .print-note {
                margin-top: 10px;
                padding: 8px;
                border: 1px solid #999;
                font-size: 8px;
                line-height: 1.4;
                color: black;
                page-break-inside: avoid;
              }
            }
          `}
        </style>
        <div className="max-w-full">
          <div className="mb-6 print:hidden">
            <button
              onClick={() => setViewingMatrix(null)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Matrices
            </button>
            <div className="mb-4">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{viewingMatrix.name}</h1>
              <p className="text-sm text-slate-600">{viewingMatrix.dishes.length} dishes</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {viewingMatrix.type === 'feature' && (
                <button
                  onClick={() => setShowAddDishForm(!showAddDishForm)}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Dish</span>
                  <span className="sm:hidden">Add</span>
                </button>
              )}
              <button
                onClick={() => saveMatrix(viewingMatrix)}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <Save className="w-4 h-4" />
                {viewingMatrix.saved ? 'Update' : 'Save'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Save as PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>

          {showAddDishForm && viewingMatrix.type === 'feature' && (
            <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6 print:hidden">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Add Dish to Matrix</h2>
              <AutocompleteInput
                label="Select Dish"
                placeholder="Start typing dish name..."
                options={dishes
                  .filter(d => !viewingMatrix.dishes.some(md => md.id === d.id))
                  .map(d => ({ id: d.id, name: d.name, meta: d.station }))}
                selectedItems={[]}
                onAdd={handleAddDishToMatrix}
                onRemove={() => {}}
              />
              <button
                onClick={() => setShowAddDishForm(false)}
                className="mt-4 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          )}

          <div>
            <div className="hidden print:block print-header">
              <h1>{viewingMatrix.name}</h1>
              {viewingMatrix.station && <p>Station: {viewingMatrix.station}</p>}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-300 print:border-0">
              <table className="w-full text-sm print-table">
                <thead>
                  <tr className="bg-white border-b-2 border-slate-900">
                    <th className="px-4 py-3 text-left text-slate-900 font-semibold border-r border-slate-300 print:border-black print:hidden">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-slate-900 font-semibold border-r border-slate-300 print:border-black sticky left-0 print:static bg-white min-w-[200px]">
                      Dish
                    </th>
                    {viewingMatrix.type === 'feature' && (
                      <th className="px-4 py-3 text-center text-slate-900 font-semibold border-r border-slate-300 print:hidden">
                        Actions
                      </th>
                    )}
                    {ALLERGEN_OPTIONS.map((allergen, idx) => (
                      <th
                        key={allergen.id}
                        className={`px-4 py-3 text-left text-slate-900 font-semibold bg-white min-w-[100px] ${
                          idx < ALLERGEN_OPTIONS.length - 1 ? 'border-r border-slate-300 print:border-black' : ''
                        }`}
                      >
                        {allergen.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {viewingMatrix.dishes.map((dish, index) => (
                    <tr
                      key={dish.id}
                      draggable={!window.matchMedia('print').matches}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`hover:bg-slate-50 print:hover:bg-white transition-colors border-b border-slate-300 print:border-black ${
                        draggedIndex === index ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-400 border-r border-slate-300 print:hidden">
                        <GripVertical className="w-4 h-4 cursor-move" />
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium bg-white sticky left-0 print:static border-r border-slate-300 print:border-black">
                        {dish.name}
                      </td>
                      {viewingMatrix.type === 'feature' && (
                        <td className="px-4 py-3 text-center border-r border-slate-300 print:hidden">
                          <button
                            onClick={() => handleRemoveDishFromMatrix(dish.id)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </td>
                      )}
                      {ALLERGEN_OPTIONS.map((allergen, idx) => {
                        const hasAllergen = dish.contains.includes(allergen.id);
                        const mayContainAllergen = dish.mayContain.includes(allergen.id);
                        return (
                          <td
                            key={allergen.id}
                            className={`px-4 py-3 bg-white ${
                              idx < ALLERGEN_OPTIONS.length - 1 ? 'border-r border-slate-300 print:border-black' : ''
                            }`}
                          >
                            {hasAllergen && (
                              <span className="text-slate-900 font-medium">Contains</span>
                            )}
                            {mayContainAllergen && (
                              <span className="text-orange-600 font-medium text-xs">May Contain</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {viewingMatrix.dishes.length === 0 && (
                    <tr>
                      <td colSpan={ALLERGEN_OPTIONS.length + 2 + (viewingMatrix.type === 'feature' ? 1 : 0)} className="px-4 py-8 text-center text-slate-500">
                        No dishes in this matrix yet. {viewingMatrix.type === 'feature' && 'Click "Add Dish" to add dishes to this matrix.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-slate-50 print:bg-white rounded-lg border border-slate-200 print:border-black print-note">
              <p className="text-xs text-slate-600 print:text-black leading-relaxed">
                <strong>Note:</strong> This matrix is for reference purposes. Always verify ingredients with kitchen staff before serving to guests with allergies.
                Cross-contamination may occur during preparation. When in doubt, consult the manager or chef.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Allergy Matrices</h1>
        <p className="text-sm text-slate-600">Station-based and custom matrices for printing</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setShowStationForm(!showStationForm)}
          className="flex items-center gap-3 p-5 border-2 border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
          <Plus className="w-5 h-5 text-blue-600" />
          <div className="text-left">
            <p className="font-semibold text-slate-900">Generate Station Matrix</p>
            <p className="text-sm text-slate-600">Instant matrix for any kitchen station</p>
          </div>
        </button>

        <button
          onClick={() => setShowFeatureForm(!showFeatureForm)}
          className="flex items-center gap-3 p-5 border-2 border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
        >
          <Plus className="w-5 h-5 text-blue-600" />
          <div className="text-left">
            <p className="font-semibold text-slate-900">Create Custom Matrix</p>
            <p className="text-sm text-slate-600">For feature menus or special events</p>
          </div>
        </button>
      </div>

      {showStationForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Generate Station Matrix</h2>
          <select
            value={selectedStation}
            onChange={(e) => setSelectedStation(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a station...</option>
            {stations.map(station => (
              <option key={station} value={station}>{station}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleGenerateStation}
              disabled={!selectedStation}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium"
            >
              Generate Matrix
            </button>
            <button
              onClick={() => {
                setShowStationForm(false);
                setSelectedStation('');
              }}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showFeatureForm && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Create Custom Matrix</h2>
          <input
            type="text"
            placeholder="Matrix name (e.g., January Features, Valentine's Menu)"
            value={featureName}
            onChange={(e) => setFeatureName(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-sm text-slate-600 mb-4">You can add dishes to this matrix after creation.</p>
          <div className="flex gap-2">
            <button
              onClick={handleCreateFeature}
              disabled={!featureName}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium"
            >
              Create Matrix
            </button>
            <button
              onClick={() => {
                setShowFeatureForm(false);
                setFeatureName('');
              }}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {matrices.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-slate-600 mb-2">No matrices created yet</p>
          <p className="text-sm text-slate-500">Generate a station matrix or create a custom one to get started</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matrices.map(matrix => (
              <div key={matrix.id} className="bg-white rounded-lg border border-slate-200 p-5 hover:border-slate-300 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold text-slate-900">{matrix.name}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          matrix.type === 'station' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {matrix.type === 'station' ? 'Station' : 'Custom'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{matrix.dishes.length} dishes</p>
                    <p className="text-xs text-slate-500 mt-1">Created {matrix.createdAt}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewingMatrix(matrix)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View Matrix
                  </button>
                  <button
                    onClick={() => handleDelete(matrix.id)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-slate-600">{matrices.length} total matri{matrices.length === 1 ? 'x' : 'ces'}</div>
        </>
      )}
    </div>
  );
}
