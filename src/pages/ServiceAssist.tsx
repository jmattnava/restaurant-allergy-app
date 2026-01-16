import { useState, useRef, useEffect } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, X, Search } from 'lucide-react';
import { ALLERGEN_OPTIONS } from '../constants/allergens';
import { supabase } from '../lib/supabase';

interface DishItem {
  id: string;
  name: string;
  type: 'ingredient' | 'supplier_item' | 'component';
  allergens: string[];
  mayContain: string[];
  crossContact: boolean;
  removable: boolean;
}

interface Dish {
  id: string;
  name: string;
  station: string;
  allergens: string[];
  items: DishItem[];
}

type Severity = 'anaphylactic' | 'moderate' | 'preference';

export default function ServiceAssist() {
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Severity>('moderate');
  const [crossContact, setCrossContact] = useState(false);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDishes();
  }, []);

  const fetchDishes = async () => {
    const [dishesRes, ingredientsRes, supplierItemsRes, componentsRes, dishIngredientsRes, dishSupplierItemsRes, dishComponentsRes, componentIngredientsRes] = await Promise.all([
      supabase.from('dishes').select('*').order('name'),
      supabase.from('ingredients').select('*'),
      supabase.from('supplier_items').select('*'),
      supabase.from('components').select('*'),
      supabase.from('dish_ingredients').select('*'),
      supabase.from('dish_supplier_items').select('*'),
      supabase.from('dish_components').select('*'),
      supabase.from('component_ingredients').select('*'),
    ]);

    if (dishesRes.error) {
      console.error('Error fetching dishes:', dishesRes.error);
      setLoading(false);
      return;
    }

    const ingredientsData = ingredientsRes.data || [];
    const supplierItemsData = supplierItemsRes.data || [];
    const componentsData = componentsRes.data || [];
    const dishIngredientsData = dishIngredientsRes.data || [];
    const dishSupplierItemsData = dishSupplierItemsRes.data || [];
    const dishComponentsData = dishComponentsRes.data || [];
    const componentIngredientsData = componentIngredientsRes.data || [];

    const dishesWithItems = (dishesRes.data || []).map(dish => {
      const items: DishItem[] = [];

      dishIngredientsData.filter(di => di.dish_id === dish.id).forEach(di => {
        const ingredient = ingredientsData.find(i => i.id === di.ingredient_id);
        if (ingredient) {
          items.push({
            id: ingredient.id,
            name: ingredient.name,
            type: 'ingredient',
            allergens: ingredient.allergens,
            mayContain: ingredient.may_contain || [],
            crossContact: ingredient.cross_contact || false,
            removable: di.removable,
          });
        }
      });

      dishSupplierItemsData.filter(dsi => dsi.dish_id === dish.id).forEach(dsi => {
        const supplierItem = supplierItemsData.find(si => si.id === dsi.supplier_item_id);
        if (supplierItem) {
          items.push({
            id: supplierItem.id,
            name: supplierItem.name,
            type: 'supplier_item',
            allergens: supplierItem.allergens,
            mayContain: supplierItem.may_contain || [],
            crossContact: false,
            removable: dsi.removable,
          });
        }
      });

      dishComponentsData.filter(dc => dc.dish_id === dish.id).forEach(dc => {
        const component = componentsData.find(c => c.id === dc.component_id);
        if (component) {
          items.push({
            id: component.id,
            name: component.name,
            type: 'component',
            allergens: component.allergens,
            mayContain: [],
            crossContact: component.cross_contact || false,
            removable: dc.removable,
          });
        }
      });

      return {
        ...dish,
        items,
      };
    });

    setDishes(dishesWithItems);
    setLoading(false);
  };

  const filteredDishes = dishes.filter(dish =>
    dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dish.station.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAllergen = (id: string) => {
    setSelectedAllergens(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSelectDish = (dish: Dish) => {
    setSelectedDish(dish);
    setSearchQuery(dish.name);
    setShowSuggestions(false);
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(true);
    if (!value) {
      setSelectedDish(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAssessment = () => {
    if (!selectedDish || selectedAllergens.length === 0) return null;

    let triggeringItems: typeof selectedDish.items = [];
    let warningItems: typeof selectedDish.items = [];

    if (severity === 'anaphylactic') {
      triggeringItems = selectedDish.items.filter(item =>
        item.allergens.some(allergen => selectedAllergens.includes(allergen)) ||
        item.mayContain.some(allergen => selectedAllergens.includes(allergen)) ||
        (item.crossContact && selectedAllergens.some(a => ALLERGEN_OPTIONS.find(opt => opt.id === a)))
      );
    } else if (severity === 'moderate') {
      triggeringItems = selectedDish.items.filter(item =>
        item.allergens.some(allergen => selectedAllergens.includes(allergen)) ||
        (item.crossContact && selectedAllergens.some(a => ALLERGEN_OPTIONS.find(opt => opt.id === a)))
      );
      warningItems = selectedDish.items.filter(item =>
        !item.allergens.some(allergen => selectedAllergens.includes(allergen)) &&
        !item.crossContact &&
        item.mayContain.some(allergen => selectedAllergens.includes(allergen))
      );
    } else if (severity === 'preference') {
      triggeringItems = selectedDish.items.filter(item =>
        item.allergens.some(allergen => selectedAllergens.includes(allergen))
      );
    }

    const removableTriggeringItems = triggeringItems.filter(item => item.removable);
    const nonRemovableTriggeringItems = triggeringItems.filter(item => !item.removable);

    let decision: 'ok' | 'modify' | 'not_ok' | 'warning';

    if (triggeringItems.length === 0 && warningItems.length === 0) {
      decision = 'ok';
    } else if (triggeringItems.length === 0 && warningItems.length > 0) {
      decision = 'warning';
    } else if (nonRemovableTriggeringItems.length > 0) {
      decision = 'not_ok';
    } else if (removableTriggeringItems.length > 0) {
      decision = 'modify';
    } else {
      decision = 'not_ok';
    }

    const statusConfig = {
      ok: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: CheckCircle,
        title: 'OK As-Is',
        color: 'text-green-700',
        badgeBg: 'bg-green-100',
      },
      warning: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: AlertTriangle,
        title: 'OK With Caution',
        color: 'text-yellow-700',
        badgeBg: 'bg-yellow-100',
      },
      modify: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        icon: AlertTriangle,
        title: 'OK If Modified',
        color: 'text-amber-700',
        badgeBg: 'bg-amber-100',
      },
      not_ok: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: AlertCircle,
        title: 'Not OK',
        color: 'text-red-700',
        badgeBg: 'bg-red-100',
      },
    };

    const config = statusConfig[decision];
    const IconComponent = config.icon;

    return (
      <div className={`${config.bg} border-2 ${config.border} rounded-lg p-4 sm:p-6 mt-4`}>
        <div className="flex items-start gap-3 sm:gap-4">
          <IconComponent className={`w-6 h-6 sm:w-8 sm:h-8 ${config.color} flex-shrink-0 mt-1`} />
          <div className="flex-1">
            <h3 className={`text-base sm:text-lg font-bold ${config.color} mb-1`}>{config.title}</h3>
            <p className={`text-sm ${config.color}`}>Dish: {selectedDish.name}</p>
            {crossContact && (
              <p className={`text-sm ${config.color} mt-2 flex items-center gap-2`}>
                <AlertCircle className="w-4 h-4" />
                Cross-contact risk considered
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`${config.badgeBg} rounded p-3`}>
            <p className={`text-xs font-semibold ${config.color} mb-2`}>SELECTED ALLERGENS</p>
            <div className="flex flex-wrap gap-1">
              {selectedAllergens.map(id => {
                const allergen = ALLERGEN_OPTIONS.find(a => a.id === id);
                return <span key={id} className="text-lg">{allergen?.emoji}</span>;
              })}
            </div>
          </div>
          <div className={`${config.badgeBg} rounded p-3`}>
            <p className={`text-xs font-semibold ${config.color} mb-2`}>SEVERITY</p>
            <p className={`text-sm font-medium ${config.color} capitalize`}>{severity}</p>
          </div>
        </div>

        {triggeringItems.length > 0 && (
          <div className="mt-4 bg-white rounded border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-3">TRIGGERING ITEMS</p>
            <div className="space-y-2">
              {triggeringItems.map(item => {
                const allergenTriggers = item.allergens.filter(a => selectedAllergens.includes(a));
                const mayContainTriggers = item.mayContain.filter(a => selectedAllergens.includes(a));
                const hasCrossContact = item.crossContact && selectedAllergens.length > 0;

                return (
                  <div key={item.id} className="flex items-start justify-between p-2 bg-slate-50 rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">{item.name}</span>
                        {item.removable && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                            REMOVABLE
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {allergenTriggers.map(allergenId => {
                          const allergen = ALLERGEN_OPTIONS.find(a => a.id === allergenId);
                          return (
                            <span
                              key={allergenId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700"
                            >
                              {allergen?.emoji} {allergen?.name} (Contains)
                            </span>
                          );
                        })}
                        {mayContainTriggers.map(allergenId => {
                          const allergen = ALLERGEN_OPTIONS.find(a => a.id === allergenId);
                          return (
                            <span
                              key={`mc-${allergenId}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"
                            >
                              {allergen?.emoji} {allergen?.name} (May Contain)
                            </span>
                          );
                        })}
                        {hasCrossContact && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            ⚠️ Cross-Contact
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {warningItems.length > 0 && decision === 'warning' && (
          <div className="mt-4 bg-white rounded border border-yellow-200 p-3">
            <p className="text-xs font-semibold text-yellow-700 mb-2">WARNING - MAY CONTAIN</p>
            <p className="text-xs text-yellow-600 mb-3">These items may contain trace amounts of the allergen:</p>
            <div className="space-y-2">
              {warningItems.map(item => {
                const mayContainTriggers = item.mayContain.filter(a => selectedAllergens.includes(a));
                return (
                  <div key={item.id} className="flex items-start justify-between p-2 bg-yellow-50 rounded">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-900">{item.name}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mayContainTriggers.map(allergenId => {
                          const allergen = ALLERGEN_OPTIONS.find(a => a.id === allergenId);
                          return (
                            <span
                              key={allergenId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700"
                            >
                              {allergen?.emoji} {allergen?.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {decision === 'modify' && removableTriggeringItems.length > 0 && (
          <div className={`mt-4 bg-white rounded border ${config.border} p-3`}>
            <p className={`text-xs font-semibold ${config.color} mb-2`}>SUGGESTED REMOVALS</p>
            <p className={`text-sm ${config.color} mb-3`}>
              Remove the following items to clear the allergens for this guest:
            </p>
            <ul className={`text-sm ${config.color} space-y-1`}>
              {removableTriggeringItems.map(item => (
                <li key={item.id}>• {item.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Service Assist</h1>
        <p className="text-sm text-slate-600">Quick allergy assessment for guest requests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Select Allergies</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {ALLERGEN_OPTIONS.map(allergen => (
                <button
                  key={allergen.id}
                  onClick={() => toggleAllergen(allergen.id)}
                  className={`px-3 py-2 rounded-lg border-2 text-left font-medium text-sm transition-all ${
                    selectedAllergens.includes(allergen.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xl mr-2">{allergen.emoji}</span>
                  {allergen.name}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h2 className="text-base font-semibold text-slate-900 mb-2">Severity</h2>
              <div className="space-y-1">
                {(['anaphylactic', 'moderate', 'preference'] as const).map(level => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded hover:bg-slate-50">
                    <input
                      type="radio"
                      name="severity"
                      value={level}
                      checked={severity === level}
                      onChange={(e) => setSeverity(e.target.value as Severity)}
                      className="w-4 h-4"
                    />
                    <span className="font-medium text-slate-700 text-sm capitalize">{level}</span>
                    {level === 'anaphylactic' && <span className="text-xs text-red-600 font-semibold">CRITICAL</span>}
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-200 mt-4 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crossContact}
                  onChange={(e) => setCrossContact(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <span className="font-medium text-slate-700 text-sm">Cross-contact concern</span>
                  <p className="text-xs text-slate-500">Apply conservative handling</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Dish</h2>

            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Start typing dish name..."
                  value={searchQuery}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {showSuggestions && searchQuery && filteredDishes.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
                >
                  {filteredDishes.map(dish => (
                    <button
                      key={dish.id}
                      onClick={() => handleSelectDish(dish)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 text-sm">{dish.name}</p>
                          <p className="text-xs text-slate-500 mt-1">{dish.station}</p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          {dish.allergens.slice(0, 3).map((allergenId, idx) => {
                            const allergen = ALLERGEN_OPTIONS.find(a => a.id === allergenId);
                            return <span key={idx} className="text-base">{allergen?.emoji}</span>;
                          })}
                          {dish.allergens.length > 3 && (
                            <span className="text-xs text-slate-500">+{dish.allergens.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showSuggestions && searchQuery && filteredDishes.length === 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4"
                >
                  <p className="text-sm text-slate-500 text-center">No dishes found</p>
                </div>
              )}
            </div>

            {selectedDish && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs font-semibold text-blue-700 mb-2">SELECTED</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">{selectedDish.name}</p>
                    <p className="text-xs text-blue-600">{selectedDish.station}</p>
                  </div>
                  <div className="flex gap-1">
                    {selectedDish.allergens.slice(0, 3).map((allergenId, idx) => {
                      const allergen = ALLERGEN_OPTIONS.find(a => a.id === allergenId);
                      return <span key={idx} className="text-lg">{allergen?.emoji}</span>;
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {getAssessment()}
        </div>
      </div>
    </div>
  );
}
