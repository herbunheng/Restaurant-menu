import type { Context } from 'hono';
import { createSuccessResponse, createErrorResponse } from '@restaurant-menu/shared';
import { eq, asc } from 'drizzle-orm';
import { getDb } from '../db';
import { categories, menuItems, type Category } from '../db/schema';
import type { AppEnv } from '../types';

// In-memory fallback if D1 database is not yet bound in local development
const mockCategories: Category[] = [
  { id: 'cat_main', name: 'Main Course (ម្ហូបកុម្ម៉ង់)', description: 'Authentic Khmer and Asian main dishes', sortOrder: 1, createdAt: new Date() },
  { id: 'cat_soup', name: 'Soups & Curries (ស៊ុប & សម្ល)', description: 'Aromatic soups and traditional curries', sortOrder: 2, createdAt: new Date() },
  { id: 'cat_drinks', name: 'Beverages (ភេសជ្ជៈ)', description: 'Fresh juices, smoothies, and Khmer coffees', sortOrder: 3, createdAt: new Date() },
  { id: 'cat_desserts', name: 'Desserts (បង្អែម)', description: 'Traditional Khmer sweet desserts and fruits', sortOrder: 4, createdAt: new Date() },
];

export async function listCategoriesController(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    return c.json(createSuccessResponse(mockCategories), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const result = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name)).all();
    return c.json(createSuccessResponse(result), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to list categories'), 500);
  }
}

export async function createCategoryController(c: Context<AppEnv>) {
  const body = await c.req.json();
  const name = (body.name || '').trim();

  if (!name) {
    return c.json(createErrorResponse('VALIDATION_ERROR', 'Category name is required'), 400);
  }

  const newId = `cat_${crypto.randomUUID().slice(0, 8)}`;
  const newCat: Category = {
    id: newId,
    name,
    description: body.description ?? '',
    sortOrder: Number(body.sortOrder) || 0,
    createdAt: new Date(),
  };

  if (!c.env?.DB) {
    mockCategories.push(newCat);
    return c.json(createSuccessResponse(newCat), 201);
  }

  try {
    const db = getDb(c.env.DB);
    await db.insert(categories).values(newCat);
    return c.json(createSuccessResponse(newCat), 201);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to create category'), 500);
  }
}

export async function deleteCategoryController(c: Context<AppEnv>) {
  const id = c.req.param('id');
  if (!id) {
    return c.json(createErrorResponse('VALIDATION_ERROR', 'Category ID is required'), 400);
  }

  if (!c.env?.DB) {
    const idx = mockCategories.findIndex((c) => c.id === id);
    if (idx !== -1) mockCategories.splice(idx, 1);
    return c.json(createSuccessResponse({ id }), 200);
  }

  try {
    const db = getDb(c.env.DB);
    await db.delete(categories).where(eq(categories.id, id));
    return c.json(createSuccessResponse({ id }), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to delete category'), 500);
  }
}
