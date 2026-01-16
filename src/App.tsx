import { useState } from 'react';
import { ChefHat, Grid3x3, Settings, Layers, BookOpen, Download, Upload, MapPin } from 'lucide-react';
import Layout from './components/Layout';
import ServiceAssist from './pages/ServiceAssist';
import MenuGrid from './pages/MenuGrid';
import Ingredients from './pages/management/Ingredients';
import SupplierItems from './pages/management/SupplierItems';
import Components from './pages/management/Components';
import Dishes from './pages/management/Dishes';
import Stations from './pages/management/Stations';
import Matrices from './pages/Matrices';
import ImportExport from './pages/ImportExport';

type Page = 'service' | 'menu' | 'ingredients' | 'suppliers' | 'components' | 'dishes' | 'stations' | 'matrices' | 'import';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('service');

  const renderPage = () => {
    switch (currentPage) {
      case 'service':
        return <ServiceAssist />;
      case 'menu':
        return <MenuGrid />;
      case 'ingredients':
        return <Ingredients />;
      case 'suppliers':
        return <SupplierItems />;
      case 'components':
        return <Components />;
      case 'dishes':
        return <Dishes />;
      case 'stations':
        return <Stations />;
      case 'matrices':
        return <Matrices />;
      case 'import':
        return <ImportExport />;
      default:
        return <ServiceAssist />;
    }
  };

  const navItems = [
    { id: 'service' as Page, label: 'Service Assist', icon: ChefHat, section: 'primary' },
    { id: 'menu' as Page, label: 'Menu Grid', icon: Grid3x3, section: 'primary' },
    { id: 'matrices' as Page, label: 'Matrices', icon: BookOpen, section: 'primary' },
    { id: 'ingredients' as Page, label: 'Ingredients', icon: Settings, section: 'manage' },
    { id: 'suppliers' as Page, label: 'Supplier Items', icon: Layers, section: 'manage' },
    { id: 'components' as Page, label: 'Components', icon: Layers, section: 'manage' },
    { id: 'dishes' as Page, label: 'Dishes', icon: Settings, section: 'manage' },
    { id: 'stations' as Page, label: 'Stations', icon: MapPin, section: 'manage' },
    { id: 'import' as Page, label: 'Import/Export', icon: Download, section: 'tools' },
  ];

  return (
    <Layout currentPage={currentPage} navItems={navItems} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
