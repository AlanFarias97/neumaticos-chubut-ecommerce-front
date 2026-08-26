import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type CategoryId = 'all' | string;
type PaymentMethod = 'MERCADO_PAGO' | 'BANK_TRANSFER' | 'PAY_AT_STORE';

interface Category {
  id: number | CategoryId;
  name: string;
  slug: string;
  displayOrder?: number;
  description?: string;
}

interface ProductImage {
  imageUrl: string;
  altText?: string;
}

interface Product {
  id: number;
  name: string;
  brand: string;
  category: Category;
  measure: string;
  price: number;
  originalPrice?: number;
  stock: number;
  reservedStock?: number;
  availableStock?: number;
  inStock?: boolean;
  featured: boolean;
  offer: boolean;
  images?: ProductImage[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface CheckoutForm {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: PaymentMethod;
}

interface OrderResponse {
  id: number;
  pickupCode: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);

  readonly search = signal('');
  readonly selectedCategory = signal<CategoryId>('all');
  readonly cartItems = signal<CartItem[]>([]);
  readonly cartOpen = signal(false);
  readonly checkoutOpen = signal(false);
  readonly checkoutLoading = signal(false);
  readonly checkoutError = signal('');
  readonly orderSuccess = signal<OrderResponse | null>(null);

  readonly fallbackImage = 'https://www.mukkamtyres.com/assets/images/info.png';
  readonly categories = signal<Category[]>([
    { id: 'all', name: 'Todo', slug: 'all', description: 'Catalogo completo' },
  ]);
  readonly products = signal<Product[]>([]);

  readonly checkout = signal<CheckoutForm>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    paymentMethod: 'PAY_AT_STORE',
  });

  readonly featuredProducts = computed(() => this.products().filter((product) => product.featured));

  readonly filteredProducts = computed(() => {
    const query = this.search().trim().toLowerCase();
    const category = this.selectedCategory();

    return this.products().filter((product) => {
      const matchesCategory = category === 'all' || product.category.slug === category;
      const matchesSearch = !query
        || product.name.toLowerCase().includes(query)
        || product.brand.toLowerCase().includes(query)
        || product.measure.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  });

  readonly cartCount = computed(() =>
    this.cartItems().reduce((total, item) => total + item.quantity, 0)
  );

  readonly cartSubtotal = computed(() =>
    this.cartItems().reduce((total, item) => total + item.product.price * item.quantity, 0)
  );

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  selectCategory(category: CategoryId): void {
    this.selectedCategory.set(category);
  }

  addToCart(product: Product): void {
    if (!this.hasStock(product)) {
      return;
    }

    this.orderSuccess.set(null);
    this.checkoutError.set('');
    this.cartItems.update((items) => {
      const existing = items.find((item) => item.product.id === product.id);
      if (!existing) {
        return [...items, { product, quantity: 1 }];
      }

      return items.map((item) =>
        item.product.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + 1, this.availableStock(product)) }
          : item
      );
    });
    this.cartOpen.set(true);
  }

  increaseQuantity(productId: number): void {
    this.cartItems.update((items) => items.map((item) =>
      item.product.id === productId
        ? { ...item, quantity: Math.min(item.quantity + 1, this.availableStock(item.product)) }
        : item
    ));
  }

  decreaseQuantity(productId: number): void {
    this.cartItems.update((items) => items
      .map((item) => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item)
      .filter((item) => item.quantity > 0)
    );
  }

  removeFromCart(productId: number): void {
    this.cartItems.update((items) => items.filter((item) => item.product.id !== productId));
  }

  openCheckout(): void {
    if (this.cartItems().length === 0) {
      return;
    }
    this.checkoutOpen.set(true);
    this.checkoutError.set('');
  }

  closeCart(): void {
    this.cartOpen.set(false);
  }

  updateCheckout<K extends keyof CheckoutForm>(field: K, value: CheckoutForm[K]): void {
    this.checkout.update((current) => ({ ...current, [field]: value }));
  }

  submitCheckout(): void {
    if (this.cartItems().length === 0 || this.checkoutLoading()) {
      return;
    }

    this.checkoutLoading.set(true);
    this.checkoutError.set('');

    const form = this.checkout();
    const body = {
      customerName: form.customerName.trim(),
      customerEmail: form.customerEmail.trim(),
      customerPhone: form.customerPhone.trim(),
      paymentMethod: form.paymentMethod,
      items: this.cartItems().map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
    };

    this.http.post<OrderResponse>('/api/orders', body).subscribe({
      next: (order) => {
        this.orderSuccess.set(order);
        this.cartItems.set([]);
        this.checkoutOpen.set(false);
        this.checkoutLoading.set(false);
        this.loadProducts();
      },
      error: (error) => {
        this.checkoutError.set(error?.error?.message ?? 'No pudimos confirmar el pedido.');
        this.checkoutLoading.set(false);
      },
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(price);
  }

  productImage(product: Product): string {
    return product.images?.[0]?.imageUrl || this.fallbackImage;
  }

  availableStock(product: Product): number {
    return product.availableStock ?? product.stock;
  }

  hasStock(product: Product): boolean {
    return product.inStock ?? this.availableStock(product) > 0;
  }

  private loadCategories(): void {
    this.http.get<Category[]>('/api/catalog/categories').subscribe({
      next: (categories) => {
        const mapped = categories.map((category) => ({
          ...category,
          description: this.categoryDescription(category.slug),
        }));
        this.categories.set([
          { id: 'all', name: 'Todo', slug: 'all', description: 'Catalogo completo' },
          ...mapped,
        ]);
      },
    });
  }

  private loadProducts(): void {
    this.http.get<Product[]>('/api/catalog/products').subscribe({
      next: (products) => this.products.set(products),
    });
  }

  private categoryDescription(slug: string): string {
    const descriptions: Record<string, string> = {
      cubiertas: 'Auto, camioneta y utilitarios',
      camaras: 'Medidas reforzadas',
      parches: 'Reparacion y vulcanizado',
      herramientas: 'Llaves, criques y accesorios',
      insumos: 'Valvulas y complementos',
    };
    return descriptions[slug] ?? 'Productos seleccionados';
  }
}
