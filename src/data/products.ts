export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  retailPrice: number;
  box06Price: number;
  box12Price: number;
  images: string[];
  collection: 'bestsellers' | 'novidades' | 'box06' | 'box12';
  colors: string[];
  badge?: 'Mais Vendido' | 'Novo' | 'Oferta';
  rating: number;
  reviews: number;
  idealForResale: boolean;
  suggestedMargin: number;
  unitsPerBox06: number;
  unitsPerBox12: number;
}

export const products: Product[] = [
  {
    id: "1",
    name: "Gloss Velvet Rose",
    slug: "gloss-velvet-rose",
    description: "Gloss labial de alta pigmentação com acabamento aveludado. Fórmula hidratante enriquecida com vitamina E e óleo de jojoba. Longa duração de até 8 horas sem transferência. Perfeito para uso diário e ocasiões especiais.",
    shortDescription: "Gloss aveludado de alta pigmentação",
    retailPrice: 39.90,
    box06Price: 29.90,
    box12Price: 24.90,
    images: [],
    collection: 'bestsellers',
    colors: ['Rosa Nude', 'Rosé', 'Berry', 'Mauve', 'Coral', 'Wine'],
    badge: 'Mais Vendido',
    rating: 4.8,
    reviews: 247,
    idealForResale: true,
    suggestedMargin: 60,
    unitsPerBox06: 6,
    unitsPerBox12: 12,
  },
  {
    id: "2",
    name: "Lip Tint Aquarelle",
    slug: "lip-tint-aquarelle",
    description: "Lip tint de longa duração com efeito aquarelado natural. Textura leve e não resseca os lábios. Cor buildable - aplique mais camadas para intensificar. Fórmula vegana e cruelty-free.",
    shortDescription: "Lip tint aquarelado de longa duração",
    retailPrice: 34.90,
    box06Price: 26.90,
    box12Price: 21.90,
    images: [],
    collection: 'bestsellers',
    colors: ['Cereja', 'Framboesa', 'Pêssego', 'Ameixa'],
    badge: 'Mais Vendido',
    rating: 4.7,
    reviews: 189,
    idealForResale: true,
    suggestedMargin: 55,
    unitsPerBox06: 6,
    unitsPerBox12: 12,
  },
  {
    id: "3",
    name: "Batom Matte Luxe",
    slug: "batom-matte-luxe",
    description: "Batom matte com cobertura total e conforto absoluto. Não craquela, não resseca. Acabamento ultra matte sofisticado. Embalagem premium em rose gold.",
    shortDescription: "Batom matte confortável e duradouro",
    retailPrice: 44.90,
    box06Price: 34.90,
    box12Price: 28.90,
    images: [],
    collection: 'novidades',
    colors: ['Nude Rosé', 'Terracota', 'Vinho', 'Burgundy', 'Caramelo'],
    badge: 'Novo',
    rating: 4.9,
    reviews: 56,
    idealForResale: true,
    suggestedMargin: 65,
    unitsPerBox06: 6,
    unitsPerBox12: 12,
  },
  {
    id: "4",
    name: "Lip Oil Glow",
    slug: "lip-oil-glow",
    description: "Óleo labial nutritivo com brilho intenso e natural. Enriquecido com óleos essenciais de rosa mosqueta e argan. Hidratação profunda com acabamento glossy. Aroma delicado de rosas.",
    shortDescription: "Óleo labial nutritivo com brilho intenso",
    retailPrice: 42.90,
    box06Price: 32.90,
    box12Price: 27.90,
    images: [],
    collection: 'novidades',
    colors: ['Honey', 'Cherry', 'Rosewood', 'Crystal'],
    badge: 'Novo',
    rating: 4.6,
    reviews: 34,
    idealForResale: true,
    suggestedMargin: 58,
    unitsPerBox06: 6,
    unitsPerBox12: 12,
  },
  {
    id: "5",
    name: "Lip Liner Précision",
    slug: "lip-liner-precision",
    description: "Lápis delineador labial de precisão milimétrica. Ponta fina para contorno perfeito. Textura cremosa que não puxa. Longa duração à prova d'água.",
    shortDescription: "Lápis labial de precisão perfeita",
    retailPrice: 29.90,
    box06Price: 22.90,
    box12Price: 18.90,
    images: [],
    collection: 'bestsellers',
    colors: ['Natural', 'Rosado', 'Escuro', 'Universal'],
    rating: 4.5,
    reviews: 123,
    idealForResale: true,
    suggestedMargin: 50,
    unitsPerBox06: 6,
    unitsPerBox12: 12,
  },
  {
    id: "6",
    name: "Gloss Plumper Volume",
    slug: "gloss-plumper-volume",
    description: "Gloss com efeito plumper que aumenta o volume dos lábios instantaneamente. Sensação refrescante de menta. Efeito espelhado ultra brilhante. Ingredientes hidratantes de ácido hialurônico.",
    shortDescription: "Gloss volumizador com efeito espelhado",
    retailPrice: 49.90,
    box06Price: 38.90,
    box12Price: 32.90,
    images: [],
    collection: 'novidades',
    colors: ['Clear', 'Pink Shimmer', 'Peach Glow', 'Rose Quartz'],
    badge: 'Novo',
    rating: 4.8,
    reviews: 78,
    idealForResale: true,
    suggestedMargin: 62,
    unitsPerBox06: 6,
    unitsPerBox12: 12,
  },
];

export const collections = [
  { id: 'bestsellers', name: 'Mais Vendidos', description: 'Os favoritos das nossas clientes' },
  { id: 'novidades', name: 'Novidades', description: 'Acabaram de chegar' },
  { id: 'box06', name: 'Box 06', description: 'Kits com 6 unidades - ideal para começar a revender' },
  { id: 'box12', name: 'Box 12', description: 'Kits com 12 unidades - melhor custo-benefício' },
];

export function getSmartPrice(retailPrice: number, box06Price: number, box12Price: number, quantity: number) {
  if (quantity >= 12) return { price: box12Price, label: 'Preço Box 12', discount: Math.round((1 - box12Price / retailPrice) * 100) };
  if (quantity >= 6) return { price: box06Price, label: 'Preço Box 06', discount: Math.round((1 - box06Price / retailPrice) * 100) };
  return { price: retailPrice, label: 'Preço Varejo', discount: 0 };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
