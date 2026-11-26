import type { Context } from 'hono';
import {
  createSuccessResponse,
  createErrorResponse,
  CreateOrderInputSchema,
  UpdateOrderInputSchema,
  type Order,
  type DailyReport,
  type TopSellingItem,
} from '@restaurant-menu/shared';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db';
import { orders } from '../db/schema/orders';
import type { AppEnv } from '../types';

// Mock storage for local development fallback
const mockOrders: Order[] = [
  {
    id: 'ord_101',
    orderNumber: 1,
    tableNumber: 'តុ 1',
    items: [
      {
        menuItemId: 'item_01',
        name: 'Beef Lok Lak (ឡុកឡាក់សាច់គោ)',
        variantLabel: 'ចានកណ្តាល (Medium)',
        price: 6.5,
        quantity: 2,
        subtotal: 13.0,
        note: 'មិនដាក់ប៊ីចេង',
      },
      {
        menuItemId: 'item_05',
        name: 'Angkor Beer / Cambodia Beer',
        variantLabel: '1 កំប៉ុង (Can)',
        price: 0.75,
        quantity: 4,
        subtotal: 3.0,
        note: '',
      },
    ],
    subtotal: 16.0,
    discount: 0,
    totalAmount: 16.0,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    cashierName: 'Cashier 01',
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'ord_102',
    orderNumber: 2,
    tableNumber: 'តុ 3',
    items: [
      {
        menuItemId: 'item_02',
        name: 'Fish Amok (អាម៉ុកត្រី)',
        variantLabel: '',
        price: 5.5,
        quantity: 1,
        subtotal: 5.5,
        note: '',
      },
      {
        menuItemId: 'item_03',
        name: 'Khmer Coffee with Milk',
        variantLabel: 'Iced (ត្រជាក់)',
        price: 2.0,
        quantity: 2,
        subtotal: 4.0,
        note: 'ផ្អែមតិច',
      },
    ],
    subtotal: 9.5,
    discount: 0,
    totalAmount: 9.5,
    paymentMethod: 'khqr',
    paymentStatus: 'paid',
    cashierName: 'Cashier 01',
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

let nextOrderSeq = 3;

export async function listOrdersController(c: Context<AppEnv>) {
  const dateParam = c.req.query('date'); // YYYY-MM-DD
  const tableParam = c.req.query('table');

  if (!c.env?.DB) {
    let result = [...mockOrders];
    if (tableParam) {
      result = result.filter((o) => o.tableNumber === tableParam);
    }
    if (dateParam) {
      result = result.filter((o) => {
        const d = new Date(o.createdAt || Date.now()).toISOString().slice(0, 10);
        return d === dateParam;
      });
    }
    return c.json(createSuccessResponse(result), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).all();

    let result = rows as Order[];
    if (tableParam) {
      result = result.filter((r) => r.tableNumber === tableParam);
    }
    if (dateParam) {
      result = result.filter((r) => {
        const d = new Date(r.createdAt || Date.now()).toISOString().slice(0, 10);
        return d === dateParam;
      });
    }

    return c.json(createSuccessResponse(result), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to list orders'), 500);
  }
}

export async function createOrderController(c: Context<AppEnv>) {
  const body = await c.req.json();
  const parsed = CreateOrderInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid order data'),
      400
    );
  }

  const {
    tableNumber,
    items,
    discount = 0,
    paymentMethod = 'cash',
    paymentStatus = 'paid',
    cashierName = 'Cashier',
    note = '',
  } = parsed.data;

  // Calculate subtotal and total
  const calculatedItems = items.map((it) => ({
    ...it,
    subtotal: Number((it.price * it.quantity).toFixed(2)),
  }));

  const subtotal = Number(calculatedItems.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2));
  const totalAmount = Math.max(0, Number((subtotal - discount).toFixed(2)));

  const newOrder: Order = {
    id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    orderNumber: nextOrderSeq++,
    tableNumber,
    items: calculatedItems,
    subtotal,
    discount,
    totalAmount,
    paymentMethod,
    paymentStatus,
    cashierName,
    note: note || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (!c.env?.DB) {
    mockOrders.unshift(newOrder);
    return c.json(createSuccessResponse(newOrder), 201);
  }

  try {
    const db = getDb(c.env.DB);
    await db.insert(orders).values({
      id: newOrder.id,
      orderNumber: newOrder.orderNumber,
      tableNumber: newOrder.tableNumber,
      items: newOrder.items,
      subtotal: newOrder.subtotal,
      discount: newOrder.discount,
      totalAmount: newOrder.totalAmount,
      paymentMethod: newOrder.paymentMethod,
      paymentStatus: newOrder.paymentStatus,
      cashierName: newOrder.cashierName,
      note: newOrder.note,
      createdAt: newOrder.createdAt as Date,
      updatedAt: newOrder.updatedAt as Date,
    });

    return c.json(createSuccessResponse(newOrder), 201);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to create order'), 500);
  }
}

export async function getActiveOrdersController(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    const active = mockOrders.filter((o) => o.paymentStatus === 'pending');
    return c.json(createSuccessResponse(active), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.paymentStatus, 'pending'))
      .orderBy(desc(orders.createdAt))
      .all();
    return c.json(createSuccessResponse(rows as Order[]), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to list active orders'), 500);
  }
}

export async function updateOrderController(c: Context<AppEnv>) {
  const id = c.req.param('id');
  const body = await c.req.json();
  const parsed = UpdateOrderInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      createErrorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message || 'Invalid update data'),
      400
    );
  }

  const updates = parsed.data;

  if (!c.env?.DB) {
    const idx = mockOrders.findIndex((o) => o.id === id);
    if (idx === -1) {
      return c.json(createErrorResponse('NOT_FOUND', 'Order not found'), 404);
    }

    const current = mockOrders[idx]!;
    const newItems = updates.items
      ? updates.items.map((it) => ({
          ...it,
          subtotal: Number((it.price * it.quantity).toFixed(2)),
        }))
      : current.items;

    const subtotal = Number(newItems.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2));
    const discount = updates.discount !== undefined ? Number(updates.discount) : current.discount;
    const totalAmount = Math.max(0, Number((subtotal - discount).toFixed(2)));

    const updated: Order = {
      ...current,
      ...updates,
      items: newItems,
      subtotal,
      discount,
      totalAmount,
      updatedAt: new Date(),
    };

    mockOrders[idx] = updated;
    return c.json(createSuccessResponse(updated), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const existing = await db.select().from(orders).where(eq(orders.id, id)).get();

    if (!existing) {
      return c.json(createErrorResponse('NOT_FOUND', 'Order not found'), 404);
    }

    const currentOrder = existing as unknown as Order;
    const newItems = updates.items
      ? updates.items.map((it) => ({
          ...it,
          subtotal: Number((it.price * it.quantity).toFixed(2)),
        }))
      : currentOrder.items;

    const subtotal = Number(newItems.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2));
    const discount = updates.discount !== undefined ? Number(updates.discount) : currentOrder.discount;
    const totalAmount = Math.max(0, Number((subtotal - discount).toFixed(2)));

    const updatePayload: any = {
      ...updates,
      items: newItems,
      subtotal,
      discount,
      totalAmount,
      updatedAt: new Date(),
    };

    await db.update(orders).set(updatePayload).where(eq(orders.id, id));
    const finalOrder = await db.select().from(orders).where(eq(orders.id, id)).get();

    return c.json(createSuccessResponse(finalOrder as unknown as Order), 200);
  } catch (err: any) {
    return c.json(createErrorResponse('DB_ERROR', err.message || 'Failed to update order'), 500);
  }
}

export async function getDailyReportController(c: Context<AppEnv>) {
  const targetDateStr = c.req.query('date') || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let allOrders: Order[] = [];

  if (!c.env?.DB) {
    allOrders = mockOrders.filter((o) => {
      const d = new Date(o.createdAt || Date.now()).toISOString().slice(0, 10);
      return d === targetDateStr;
    });
  } else {
    try {
      const db = getDb(c.env.DB);
      const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).all();
      allOrders = (rows as Order[]).filter((o) => {
        const d = new Date(o.createdAt || Date.now()).toISOString().slice(0, 10);
        return d === targetDateStr;
      });
    } catch {
      allOrders = [];
    }
  }

  // Aggregate Metrics
  const totalOrders = allOrders.length;
  let totalRevenueUSD = 0;
  let cashUSD = 0;
  let khqrUSD = 0;
  let cardUSD = 0;

  const itemMap = new Map<string, TopSellingItem>();

  for (const ord of allOrders) {
    if (ord.paymentStatus !== 'cancelled') {
      const amt = Number(ord.totalAmount) || 0;
      totalRevenueUSD += amt;

      if (ord.paymentMethod === 'cash') cashUSD += amt;
      else if (ord.paymentMethod === 'khqr') khqrUSD += amt;
      else if (ord.paymentMethod === 'card') cardUSD += amt;

      // Aggregate Items
      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          const key = it.variantLabel ? `${it.name} (${it.variantLabel})` : it.name;
          const existing = itemMap.get(key);
          const q = Number(it.quantity) || 0;
          const rev = Number(it.subtotal) || 0;

          if (existing) {
            existing.totalQuantity += q;
            existing.totalRevenue = Number((existing.totalRevenue + rev).toFixed(2));
          } else {
            itemMap.set(key, {
              name: it.name,
              variantLabel: it.variantLabel || '',
              totalQuantity: q,
              totalRevenue: rev,
            });
          }
        }
      }
    }
  }

  totalRevenueUSD = Number(totalRevenueUSD.toFixed(2));
  cashUSD = Number(cashUSD.toFixed(2));
  khqrUSD = Number(khqrUSD.toFixed(2));
  cardUSD = Number(cardUSD.toFixed(2));
  const totalRevenueKHR = Math.round(totalRevenueUSD * 4100);

  const topSellingItems = Array.from(itemMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10);

  const report: DailyReport = {
    date: targetDateStr,
    totalOrders,
    totalRevenueUSD,
    totalRevenueKHR,
    paymentBreakdown: {
      cashUSD,
      khqrUSD,
      cardUSD,
    },
    topSellingItems,
    orders: allOrders,
  };

  return c.json(createSuccessResponse(report), 200);
}
