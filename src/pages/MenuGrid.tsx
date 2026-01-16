import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { ALLERGEN_OPTIONS } from '../constants/allergens';
import { supabase } from '../lib/supabase';

interface DishCard {
  id: string;
  name: string;
  station: string;
  allergens: string[];
  may_contain: string[];
  cross_contact: boolean;
  ingredients: Array<{
    id: string;
    name: string;
    allergens: string[];
    may_contain: string[];
    cross_contact: boolean;
  }>;
  supplier_items: Array<{
    id: string;
    name: string;
    allergens: string[];
    may_contain: string[];
    cross_contact: boolean;
  }>;
}

export default function MenuGrid() {
  const [dishes, setDishes] = useState<DishCard[]>([]);
  const [stations, setStations] = useState<string[]>([]);
  const [selectedDish, setSelectedDish] = useState<DishCard | null>(null);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [filterByAllergens, setFilterByAllergens] = useState<string[]>([]);
  const [excludeAllergens, setExcludeAllergens] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [dishesRes, ingredientsRes, supplierItemsRes, dishIngredientsRes, dishSupplierItemsRes, stationsRes] = await Promise.all([
      supabase.from('dishes').select('*').order('name'),
      supabase.from('ingredients').select('*'),
      supabase.from('supplier_items').select('*'),
      supabase.from('dish_ingredients').select('*'),
      supabase.from('dish_supplier_items').select('*'),
      supabase.from('stations').select('name').order('display_order'),
    ]);

    if (dishesRes.error || ingredientsRes.error || supplierItemsRes.error || dishIngredientsRes.error || dishSupplierItemsRes.error || stationsRes.error) {
      console.error('Error fetching data');
      setLoading(false);
      return;
    }

    const ingredientsMap = new Map(
      ingredientsRes.data.map(i => [
        i.id,
        {
          ...i,
          allergens: i.allergens || [],
          may_contain: i.may_contain || [],
          cross_contact: i.cross_contact || false,
        }
      ])
    );
    const supplierItemsMap = new Map(
      supplierItemsRes.data.map(s => [
        s.id,
        {
          ...s,
          allergens: s.allergens || [],
          may_contain: s.may_contain || [],
          cross_contact: s.cross_contact || false,
        }
      ])
    );

    const dishesWithDetails = dishesRes.data.map(dish => {
      const dishIngredients = dishIngredientsRes.data
        .filter(di => di.dish_id === dish.id)
        .map(di => ingredientsMap.get(di.ingredient_id))
        .filter(Boolean);

      const dishSupplierItems = dishSupplierItemsRes.data
        .filter(ds => ds.dish_id === dish.id)
        .map(ds => supplierItemsMap.get(ds.supplier_item_id))
        .filter(Boolean);

      return {
        ...dish,
        allergens: dish.allergens || [],
        may_contain: dish.may_contain || [],
        cross_contact: dish.cross_contact || false,
        ingredients: dishIngredients,
        supplier_items: dishSupplierItems,
      };
    });

    setDishes(dishesWithDetails);
    setStations(stationsRes.data.map(s => s.name));
    setLoading(false);
  };

  const selectDish = (dish: DishCard) => {
    setSelectedDish(selectedDish?.id === dish.id ? null : dish);
  };

  const toggleStation = (station: string) => {
    setSelectedStations(prev =>
      prev.includes(station) ? prev.filter(s => s !== station) : [...prev, station]
    );
  };

  const toggleFilterByAllergen = (emoji: string) => {
    setFilterByAllergens(prev =>
      prev.includes(emoji) ? prev.filter(a => a !== emoji) : [...prev, emoji]
    );
  };

  const toggleExcludeAllergen = (emoji: string) => {
    setExcludeAllergens(prev =>
      prev.includes(emoji) ? prev.filter(a => a !== emoji) : [...prev, emoji]
    );
  };

  const getAllergenEmoji = (allergenId: string) => {
    return ALLERGEN_OPTIONS.find(a => a.id === allergenId)?.emoji || allergenId;
  };

  const filteredDishes = dishes.filter(dish => {
    const matchesStation = selectedStations.length === 0 || selectedStations.includes(dish.station);
    const matchesSearch = !searchQuery ||
      dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dish.station.toLowerCase().includes(searchQuery.toLowerCase());

    const dishAllergenEmojis = dish.allergens.map(getAllergenEmoji);
    const matchesFilterBy = filterByAllergens.length === 0 ||
      filterByAllergens.every(allergen => dishAllergenEmojis.includes(allergen));

    const matchesExclude = excludeAllergens.length === 0 ||
      !excludeAllergens.some(allergen => dishAllergenEmojis.includes(allergen));

    return matchesStation && matchesSearch && matchesFilterBy && matchesExclude;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading menu...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-2">Menu Grid</h1>
        <p className="text-sm sm:text-base text-slate-600">Quick menu reference for service</p>
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 sm:pl-12 pr-10 sm:pr-4 py-2 sm:py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Filter by Station</h2>
          <div className="flex flex-wrap gap-2">
            {stations.map(station => (
              <button
                key={station}
                onClick={() => toggleStation(station)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedStations.includes(station)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {station}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Has Allergen</h2>
          <div className="flex flex-wrap gap-2">
            {ALLERGEN_OPTIONS.map(allergen => (
              <button
                key={allergen.id}
                onClick={() => toggleFilterByAllergen(allergen.emoji)}
                className={`px-2 py-1 rounded text-lg transition-all ${
                  filterByAllergens.includes(allergen.emoji)
                    ? 'bg-red-100 ring-2 ring-red-400'
                    : 'hover:bg-slate-100'
                }`}
                title={`Show only dishes with ${allergen.name}`}
              >
                {allergen.emoji}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">Show only dishes containing these allergens</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Exclude Allergen</h2>
          <div className="flex flex-wrap gap-2">
            {ALLERGEN_OPTIONS.map(allergen => (
              <button
                key={allergen.id}
                onClick={() => toggleExcludeAllergen(allergen.emoji)}
                className={`px-2 py-1 rounded text-lg transition-all ${
                  excludeAllergens.includes(allergen.emoji)
                    ? 'bg-green-100 ring-2 ring-green-400'
                    : 'hover:bg-slate-100'
                }`}
                title={`Exclude dishes with ${allergen.name}`}
              >
                {allergen.emoji}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">Suggest dishes without these allergens</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{filteredDishes.length}</span> dishes shown
            {selectedDish && <span className="ml-2">• <span className="font-semibold text-blue-600">{selectedDish.name}</span> selected</span>}
          </p>
          {(selectedStations.length > 0 || filterByAllergens.length > 0 || excludeAllergens.length > 0 || searchQuery) && (
            <button
              onClick={() => {
                setSelectedStations([]);
                setFilterByAllergens([]);
                setExcludeAllergens([]);
                setSearchQuery('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {selectedDish && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{selectedDish.name}</h3>
              <p className="text-slate-600 mt-1">
                <span className="font-medium">Station:</span> {selectedDish.station}
              </p>
            </div>
            <button
              onClick={() => setSelectedDish(null)}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Allergens</h4>
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedDish.allergens.length > 0 ? (
                  selectedDish.allergens.map((allergenId, idx) => {
                    const allergen = ALLERGEN_OPTIONS.find(a => a.id === allergenId);
                    return (
                      <span key={idx} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                        <span className="text-xl">{allergen?.emoji}</span>
                        <span className="text-sm font-medium text-red-900">{allergen?.name}</span>
                      </span>
                    );
                  })
                ) : (
                  <p className="text-sm text-slate-500">No allergens</p>
                )}
              </div>

              {selectedDish.may_contain.length > 0 && (
                <>
                  <h5 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">May Contain</h5>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedDish.may_contain.map((allergenId, idx) => {
                      const allergen = ALLERGEN_OPTIONS.find(a => a.id === allergenId);
                      return (
                        <span key={idx} className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs">
                          <span>{allergen?.emoji}</span>
                          <span className="text-amber-900">{allergen?.name}</span>
                        </span>
                      );
                    })}
                  </div>
                </>
              )}

              {selectedDish.cross_contact && (
                <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-900">
                  ⚠️ Cross-contact possible
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Ingredients & Components</h4>
              {selectedDish.ingredients.length > 0 || selectedDish.supplier_items.length > 0 ? (
                <div className="space-y-2">
                  {selectedDish.ingredients.map(ingredient => (
                    <div key={ingredient.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{ingredient.name}</p>
                        {ingredient.allergens.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {ingredient.allergens.map((aid, idx) => (
                              <span key={idx} className="text-xs">{getAllergenEmoji(aid)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {selectedDish.supplier_items.map(item => (
                    <div key={item.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        {item.allergens.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {item.allergens.map((aid, idx) => (
                              <span key={idx} className="text-xs">{getAllergenEmoji(aid)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No ingredients or components listed</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {filteredDishes.map(dish => (
          <button
            key={dish.id}
            onClick={() => selectDish(dish)}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              selectedDish?.id === dish.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-slate-900 text-sm">{dish.name}</h3>
              {selectedDish?.id === dish.id && (
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>

            <div className="mb-3">
              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                {dish.station}
              </span>
            </div>

            <div className="mb-3">
              <div className="flex gap-1 flex-wrap">
                {dish.allergens.map((allergenId, idx) => (
                  <span key={idx} className="text-lg">{getAllergenEmoji(allergenId)}</span>
                ))}
                {dish.allergens.length === 0 && (
                  <span className="text-xs text-slate-400">No allergens</span>
                )}
              </div>
            </div>

            {dish.may_contain.length > 0 && (
              <p className="text-xs text-amber-600">May contain allergens</p>
            )}
            {dish.cross_contact && (
              <p className="text-xs text-orange-600">Cross-contact possible</p>
            )}
          </button>
        ))}
      </div>

      {filteredDishes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-500">No dishes match your filters</p>
        </div>
      )}
    </div>
  );
}
