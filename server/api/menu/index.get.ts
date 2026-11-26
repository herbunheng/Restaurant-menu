import { defineEventHandler } from 'h3';

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  description: string;
  isAvailable: boolean;
}

export default defineEventHandler(() => {
  const items: MenuItem[] = [
    {
      id: '1',
      name: 'Beef Lok Lak (ឡុកឡាក់សាច់គោ)',
      category: 'Main Course',
      price: 6.5,
      currency: 'USD',
      description: 'Tender stir-fried beef served with fresh lettuce, tomatoes, cucumbers, and black pepper lime dipping sauce.',
      isAvailable: true,
    },
    {
      id: '2',
      name: 'Fish Amok (អាម៉ុកត្រី)',
      category: 'Main Course',
      price: 5.5,
      currency: 'USD',
      description: 'Traditional Khmer steamed fish curry in banana leaf with coconut milk and kroeung paste.',
      isAvailable: true,
    },
    {
      id: '3',
      name: 'Khmer Iced Coffee with Milk (កាហ្វេទឹកដោះគោទឹកកក)',
      category: 'Beverage',
      price: 2.0,
      currency: 'USD',
      description: 'Rich dark drip coffee with sweetened condensed milk and ice.',
      isAvailable: true,
    },
  ];

  return {
    success: true,
    data: items,
    timestamp: new Date().toISOString(),
  };
});
