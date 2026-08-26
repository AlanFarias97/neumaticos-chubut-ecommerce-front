import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type CategoryId = 'all' | 'tyres' | 'inner-tubes' | 'patches' | 'tools' | 'accessories';

interface Category {
  id: CategoryId;
  label: string;
  description: string;
}

interface Product {
  id: number;
  name: string;
  brand: string;
  category: Exclude<CategoryId, 'all'>;
  measure: string;
  price: number;
  originalPrice?: number;
  stock: number;
  featured: boolean;
  offer: boolean;
  imageUrl: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly search = signal('');
  readonly selectedCategory = signal<CategoryId>('all');

  readonly categories: Category[] = [
    { id: 'all', label: 'Todo', description: 'Catalogo completo' },
    { id: 'tyres', label: 'Cubiertas', description: 'Auto, camioneta y utilitarios' },
    { id: 'inner-tubes', label: 'Camaras', description: 'Medidas reforzadas' },
    { id: 'patches', label: 'Parches', description: 'Reparacion y vulcanizado' },
    { id: 'tools', label: 'Herramientas', description: 'Llaves, criques y accesorios' },
    { id: 'accessories', label: 'Insumos', description: 'Valvulas y complementos' },
  ];

  readonly products: Product[] = [
    {
      id: 1,
      name: 'Cubierta Fate AR-360',
      brand: 'Fate',
      category: 'tyres',
      measure: '185/65 R15',
      price: 112000,
      originalPrice: 128000,
      stock: 8,
      featured: true,
      offer: true,
      imageUrl: 'https://www.mukkamtyres.com/assets/images/info.png',
    },
    {
      id: 2,
      name: 'Cubierta Pirelli Cinturato',
      brand: 'Pirelli',
      category: 'tyres',
      measure: '205/55 R16',
      price: 168500,
      stock: 5,
      featured: true,
      offer: false,
      imageUrl: 'https://static.summitracing.com/global/images/prod/xlarge/nit-207490_ep_xl.jpg',
    },
    {
      id: 3,
      name: 'Kit de parches radial',
      brand: 'Tip Top',
      category: 'patches',
      measure: 'Universal',
      price: 9200,
      originalPrice: 11500,
      stock: 24,
      featured: true,
      offer: true,
      imageUrl: 'https://www.mukkamtyres.com/assets/images/info.png',
    },
    {
      id: 4,
      name: 'Camara reforzada auto',
      brand: 'Vipal',
      category: 'inner-tubes',
      measure: '13/14',
      price: 18500,
      stock: 18,
      featured: false,
      offer: false,
      imageUrl: 'https://cms.yellowtire.com/upload/tire/picture/gallery745/admin14-74af29e4a58ef5b90a184d5264d47342.jpg',
    },
  ];

  readonly featuredProducts = computed(() => this.products.filter((product) => product.featured));

  readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLowerCase();
    const category = this.selectedCategory();

    return this.products.filter((product) => {
      const matchesCategory = category === 'all' || product.category === category;
      const matchesSearch = !query
        || product.name.toLowerCase().includes(query)
        || product.brand.toLowerCase().includes(query)
        || product.measure.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  });

  selectCategory(category: CategoryId): void {
    this.selectedCategory.set(category);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(price);
  }
}
