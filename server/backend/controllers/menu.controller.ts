import type { Context } from 'hono';
import { createSuccessResponse, createErrorResponse, type MenuItem } from '@restaurant-menu/shared';
import { eq, desc, and, like } from 'drizzle-orm';
import { getDb } from '../db';
import { menuItems, categories } from '../db/schema';
import type { AppEnv } from '../types';

// In-memory fallback if D1 database is not yet bound in local development
const mockMenuItems: MenuItem[] = [
  {
    id: 'item_01',
    name: 'Beef Lok Lak (ឡុកឡាក់សាច់គោ)',
    categoryId: 'cat_main',
    categoryName: 'Main Course (ម្ហូបកុម្ម៉ង់)',
    price: 6.5,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    description: 'Tender stir-fried beef served with fresh lettuce, tomatoes, cucumbers, and black pepper lime dipping sauce.',
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'item_02',
    name: 'Fish Amok (អាម៉ុកត្រី)',
    categoryId: 'cat_soup',
    categoryName: 'Soups & Curries (ស៊ុប & សម្ល)',
    price: 5.5,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
    description: 'Traditional Khmer steamed fish curry in banana leaf with coconut milk and kroeung paste.',
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'item_03',
    name: 'Khmer Iced Coffee with Milk (កាហ្វេទឹកដោះគោទឹកកក)',
    categoryId: 'cat_drinks',
    categoryName: 'Beverages (ភេសជ្ជៈ)',
    price: 2.0,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
    description: 'Rich dark drip coffee brewed with sweetened condensed milk and served over crushed ice.',
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'item_04',
    name: 'Mango Sticky Rice (បាយដំណើបស្វាយ)',
    categoryId: 'cat_desserts',
    categoryName: 'Desserts (បង្អែម)',
    price: 3.5,
    currency: 'USD',
    imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80',
    description: 'Sweet sticky coconut rice served with ripe sweet mango slices and toasted sesame seeds.',
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export async function listMenuItemsController(c: Context<AppEnv>) {
  const categoryFilter = c.req.query('category');
  const search = c.req.query('search')?.toLowerCase();

  if (!c.env?.DB) {
    let filtered = [...mockMenuItems];
    if (categoryFilter) {
      filtered = filtered.filter((i) => i.categoryId === categoryFilter);
    }
    if (search) {
      filtered = filtered.filter(
        (i) => i.name.toLowerCase().includes(search) || (i.description && i.description.toLowerCase().includes(search))
      );
    }
    return c.json(createSuccessResponse(filtered), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const query = db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        categoryId: menuItems.categoryId,
        price: menuItems.price,
        currency: menuItems.currency,
        imageUrl: menuItems.imageUrl,
        description: menuItems.description,
        isAvailable: menuItems.isAvailable,
        createdAt: menuItems.createdAt,
        updatedAt: menuItems.updatedAt,
        categoryName: categories.name,
      })
      .from(menuItems)
      .leftJoin(categories, eq(menuItems.categoryId, categories.id))
      .orderBy(desc(menuItems.createdAt));

    const rows = await query.all();
    let result = rows;

    if (categoryFilter) {
      result = result.filter((r) => r.categoryId === categoryFilter);
    }
    if (search) {
      result = result.filter(
        (r) => r.name.toLowerCase().includes(search) || (r.description && r.description.toLowerCase().includes(search))
      );
    }

    return c.json(createSuccessResponse(result), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to list menu items'), 500);
  }
}

export async function createMenuItemController(c: Context<AppEnv>) {
  const body = await c.req.json();
  const name = (body.name || '').trim();

  if (!name) {
    return c.json(createErrorResponse('VALIDATION_ERROR', 'Item name is required'), 400);
  }

  const price = Number(body.price);
  if (isNaN(price) || price < 0) {
    return c.json(createErrorResponse('VALIDATION_ERROR', 'Valid price is required'), 400);
  }

  const newId = `item_${crypto.randomUUID().slice(0, 8)}`;
  const newItem = {
    id: newId,
    name,
    categoryId: body.categoryId || null,
    price,
    currency: body.currency || 'USD',
    imageUrl: body.imageUrl || null,
    description: body.description ?? '',
    isAvailable: body.isAvailable ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (!c.env?.DB) {
    mockMenuItems.unshift(newItem);
    return c.json(createSuccessResponse(newItem), 201);
  }

  try {
    const db = getDb(c.env.DB);
    await db.insert(menuItems).values(newItem);
    return c.json(createSuccessResponse(newItem), 201);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to create menu item'), 500);
  }
}

export async function updateMenuItemController(c: Context<AppEnv>) {
  const id = c.req.param('id');
  if (!id) {
    return c.json(createErrorResponse('VALIDATION_ERROR', 'Item ID is required'), 400);
  }

  const body = await c.req.json();
  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null;
  if (body.price !== undefined) updateData.price = Number(body.price);
  if (body.currency !== undefined) updateData.currency = body.currency;
  if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.isAvailable !== undefined) updateData.isAvailable = Boolean(body.isAvailable);

  if (!c.env?.DB) {
    const idx = mockMenuItems.findIndex((i) => i.id === id);
    if (idx !== -1) {
      mockMenuItems[idx] = { ...mockMenuItems[idx], ...updateData };
      return c.json(createSuccessResponse(mockMenuItems[idx]), 200);
    }
    return c.json(createErrorResponse('NOT_FOUND', 'Item not found'), 404);
  }

  try {
    const db = getDb(c.env.DB);
    await db.update(menuItems).set(updateData).where(eq(menuItems.id, id));
    return c.json(createSuccessResponse({ id, ...updateData }), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to update menu item'), 500);
  }
}

export async function deleteMenuItemController(c: Context<AppEnv>) {
  const id = c.req.param('id');
  if (!id) {
    return c.json(createErrorResponse('VALIDATION_ERROR', 'Item ID is required'), 400);
  }

  if (!c.env?.DB) {
    const idx = mockMenuItems.findIndex((i) => i.id === id);
    if (idx !== -1) mockMenuItems.splice(idx, 1);
    return c.json(createSuccessResponse({ id }), 200);
  }

  try {
    const db = getDb(c.env.DB);
    await db.delete(menuItems).where(eq(menuItems.id, id));
    return c.json(createSuccessResponse({ id }), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to delete menu item'), 500);
  }
}
