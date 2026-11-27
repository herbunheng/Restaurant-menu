import type { Context } from "hono";
import {
  createSuccessResponse,
  createErrorResponse,
  CreateOrderInputSchema,
  UpdateOrderInputSchema,
  SplitPayInputSchema,
  type Order,
  type OrderItem,
  type DailyReport,
  type TopSellingItem,
  type CategorySalesSummary,
  type PaymentMethodSalesSummary,
  type LedgerEntry,
} from "@restaurant-menu/shared";
import { desc, eq, or } from "drizzle-orm";
import { getDb } from "../db";
import { orders } from "../db/schema/orders";
import { menuItems, categories } from "../db/schema/menu";
import { paymentMethods } from "../db/schema/payment_methods";
import { cashLedger } from "../db/schema/ledger";
import { siteSettings } from "../db/schema/site_settings";
import type { AppEnv } from "../types";

// Mock storage for local development fallback
const mockOrders: Order[] = [
  {
    id: "ord_101",
    orderNumber: 1,
    tableNumber: "តុ 1",
    items: [
      {
        menuItemId: "item_01",
        name: "Beef Lok Lak (ឡុកឡាក់សាច់គោ)",
        variantLabel: "ចានកណ្តាល (Medium)",
        price: 6.5,
        quantity: 2,
        subtotal: 13.0,
        note: "មិនដាក់ប៊ីចេង",
      },
      {
        menuItemId: "item_05",
        name: "Angkor Beer / Cambodia Beer",
        variantLabel: "1 កំប៉ុង (Can)",
        price: 0.75,
        quantity: 4,
        subtotal: 3.0,
        note: "",
      },
    ],
    subtotal: 16.0,
    discount: 0,
    totalAmount: 16.0,
    paymentMethod: "cash",
    paymentStatus: "paid",
    cashierName: "Cashier 01",
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "ord_102",
    orderNumber: 2,
    tableNumber: "តុ 3",
    items: [
      {
        menuItemId: "item_02",
        name: "Fish Amok (អាម៉ុកត្រី)",
        variantLabel: "",
        price: 5.5,
        quantity: 1,
        subtotal: 5.5,
        note: "",
      },
      {
        menuItemId: "item_03",
        name: "Khmer Coffee with Milk",
        variantLabel: "Iced (ត្រជាក់)",
        price: 2.0,
        quantity: 2,
        subtotal: 4.0,
        note: "ផ្អែមតិច",
      },
    ],
    subtotal: 9.5,
    discount: 0,
    totalAmount: 9.5,
    paymentMethod: "khqr",
    paymentStatus: "paid",
    cashierName: "Cashier 01",
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

let nextOrderSeq = 3;

export async function listOrdersController(c: Context<AppEnv>) {
  const dateParam = c.req.query("date"); // YYYY-MM-DD
  const tableParam = c.req.query("table");

  if (!c.env?.DB) {
    let result = [...mockOrders];
    if (tableParam) {
      result = result.filter((o) => o.tableNumber === tableParam);
    }
    if (dateParam) {
      result = result.filter((o) => {
        const d = new Date(o.createdAt || Date.now())
          .toISOString()
          .slice(0, 10);
        return d === dateParam;
      });
    }
    return c.json(createSuccessResponse(result), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .all();

    let result = rows as Order[];
    if (tableParam) {
      result = result.filter((r) => r.tableNumber === tableParam);
    }
    if (dateParam) {
      result = result.filter((r) => {
        const d = new Date(r.createdAt || Date.now())
          .toISOString()
          .slice(0, 10);
        return d === dateParam;
      });
    }

    return c.json(createSuccessResponse(result), 200);
  } catch (err: any) {
    return c.json(
      createErrorResponse("DB_ERROR", err.message || "Failed to list orders"),
      500,
    );
  }
}

export async function createOrderController(c: Context<AppEnv>) {
  const body = await c.req.json();
  const parsed = CreateOrderInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid order data",
      ),
      400,
    );
  }

  const {
    tableNumber,
    items,
    discount = 0,
    paymentMethod = "cash",
    paymentStatus = "paid",
    cashierName = "Cashier",
    waiterName = null,
    billedBy = null,
    billedAt = null,
    note = "",
  } = parsed.data;

  // Calculate subtotal and total
  const calculatedItems = items.map((it) => ({
    ...it,
    subtotal: Number((it.price * it.quantity).toFixed(2)),
  }));

  const subtotal = Number(
    calculatedItems.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2),
  );
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
    waiterName: waiterName || null,
    billedBy: billedBy || null,
    billedAt: billedAt ? new Date(billedAt) : null,
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
      waiterName: newOrder.waiterName,
      billedBy: newOrder.billedBy,
      billedAt: newOrder.billedAt as Date | null,
      note: newOrder.note,
      createdAt: newOrder.createdAt as Date,
      updatedAt: newOrder.updatedAt as Date,
    });

    return c.json(createSuccessResponse(newOrder), 201);
  } catch (err: any) {
    return c.json(
      createErrorResponse("DB_ERROR", err.message || "Failed to create order"),
      500,
    );
  }
}

export async function getActiveOrdersController(c: Context<AppEnv>) {
  if (!c.env?.DB) {
    const active = mockOrders.filter(
      (o) => o.paymentStatus === "pending" || o.paymentStatus === "billed",
    );
    return c.json(createSuccessResponse(active), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const rows = await db
      .select()
      .from(orders)
      .where(
        or(
          eq(orders.paymentStatus, "pending"),
          eq(orders.paymentStatus, "billed"),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .all();
    return c.json(createSuccessResponse(rows as Order[]), 200);
  } catch (err: any) {
    return c.json(
      createErrorResponse(
        "DB_ERROR",
        err.message || "Failed to list active orders",
      ),
      500,
    );
  }
}

export async function updateOrderController(c: Context<AppEnv>) {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateOrderInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid update data",
      ),
      400,
    );
  }

  const updates = parsed.data;

  if (!c.env?.DB) {
    const idx = mockOrders.findIndex((o) => o.id === id);
    if (idx === -1) {
      return c.json(createErrorResponse("NOT_FOUND", "Order not found"), 404);
    }

    const current = mockOrders[idx]!;
    const newItems = updates.items
      ? updates.items.map((it) => ({
          ...it,
          subtotal: Number((it.price * it.quantity).toFixed(2)),
        }))
      : current.items;

    const subtotal = Number(
      newItems.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2),
    );
    const discount =
      updates.discount !== undefined
        ? Number(updates.discount)
        : current.discount;
    const totalAmount = Math.max(0, Number((subtotal - discount).toFixed(2)));

    const updated: Order = {
      ...current,
      ...updates,
      items: newItems,
      subtotal,
      discount,
      totalAmount,
      billedAt: updates.billedAt
        ? new Date(updates.billedAt)
        : updates.billedAt === null
          ? null
          : current.billedAt,
      updatedAt: new Date(),
    };

    mockOrders[idx] = updated;
    return c.json(createSuccessResponse(updated), 200);
  }

  try {
    const db = getDb(c.env.DB);
    const existing = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .get();

    if (!existing) {
      return c.json(createErrorResponse("NOT_FOUND", "Order not found"), 404);
    }

    const currentOrder = existing as unknown as Order;
    const newItems = updates.items
      ? updates.items.map((it) => ({
          ...it,
          subtotal: Number((it.price * it.quantity).toFixed(2)),
        }))
      : currentOrder.items;

    const subtotal = Number(
      newItems.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2),
    );
    const discount =
      updates.discount !== undefined
        ? Number(updates.discount)
        : currentOrder.discount;
    const totalAmount = Math.max(0, Number((subtotal - discount).toFixed(2)));

    const updatePayload: any = {
      ...updates,
      items: newItems,
      subtotal,
      discount,
      totalAmount,
      updatedAt: new Date(),
    };
    if (updates.billedAt !== undefined) {
      updatePayload.billedAt = updates.billedAt
        ? new Date(updates.billedAt)
        : null;
    }

    await db.update(orders).set(updatePayload).where(eq(orders.id, id));
    const finalOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .get();

    return c.json(createSuccessResponse(finalOrder as unknown as Order), 200);
  } catch (err: any) {
    return c.json(
      createErrorResponse("DB_ERROR", err.message || "Failed to update order"),
      500,
    );
  }
}

export async function splitPayOrderController(c: Context<AppEnv>) {
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = SplitPayInputSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      createErrorResponse(
        "VALIDATION_ERROR",
        parsed.error.issues[0]?.message || "Invalid split payment data",
      ),
      400,
    );
  }

  const {
    itemsToPay,
    paymentMethod = "cash",
    discount = 0,
    cashierName = "Cashier",
    note = "",
  } = parsed.data;

  // 1. Calculate paid items
  const calculatedPaidItems = itemsToPay.map((it) => ({
    ...it,
    subtotal: Number((it.price * it.quantity).toFixed(2)),
  }));
  const paidSubtotal = Number(
    calculatedPaidItems
      .reduce((acc, curr) => acc + curr.subtotal, 0)
      .toFixed(2),
  );
  const paidTotal = Math.max(0, Number((paidSubtotal - discount).toFixed(2)));

  // If mock in local dev:
  if (!c.env?.DB) {
    const idx = mockOrders.findIndex((o) => o.id === id);
    if (idx === -1) {
      return c.json(
        createErrorResponse("NOT_FOUND", "Original order not found"),
        404,
      );
    }
    const original = mockOrders[idx]!;

    const splitPaidOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderNumber: nextOrderSeq++,
      tableNumber: `${original.tableNumber} (Split)`,
      items: calculatedPaidItems,
      subtotal: paidSubtotal,
      discount,
      totalAmount: paidTotal,
      paymentMethod,
      paymentStatus: "paid",
      cashierName,
      waiterName: original.waiterName ?? null,
      billedBy: original.billedBy ?? null,
      billedAt: original.billedAt ? new Date(original.billedAt) : null,
      note: note || `Split payment from Order #${original.orderNumber}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockOrders.unshift(splitPaidOrder);

    // Calculate remaining items for original order
    const remainingItems: OrderItem[] = [];
    for (const origItem of original.items) {
      const matchPaid = calculatedPaidItems.find(
        (p) =>
          p.menuItemId === origItem.menuItemId &&
          p.variantLabel === origItem.variantLabel,
      );
      if (matchPaid) {
        const remainingQty = origItem.quantity - matchPaid.quantity;
        if (remainingQty > 0) {
          remainingItems.push({
            ...origItem,
            quantity: remainingQty,
            subtotal: Number((origItem.price * remainingQty).toFixed(2)),
          });
        }
      } else {
        remainingItems.push(origItem);
      }
    }

    if (remainingItems.length === 0) {
      original.paymentStatus = "paid";
      original.updatedAt = new Date();
    } else {
      original.items = remainingItems;
      original.subtotal = Number(
        remainingItems.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2),
      );
      original.totalAmount = Math.max(
        0,
        Number((original.subtotal - original.discount).toFixed(2)),
      );
      original.updatedAt = new Date();
    }

    return c.json(
      createSuccessResponse({
        paidOrder: splitPaidOrder,
        remainingOrder: original,
      }),
      200,
    );
  }

  // Database path:
  try {
    const db = getDb(c.env.DB);
    const existing = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .get();

    if (!existing) {
      return c.json(
        createErrorResponse("NOT_FOUND", "Original order not found"),
        404,
      );
    }

    const original = existing as unknown as Order;

    const splitPaidOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      orderNumber: nextOrderSeq++,
      tableNumber: `${original.tableNumber} (Split)`,
      items: calculatedPaidItems,
      subtotal: paidSubtotal,
      discount,
      totalAmount: paidTotal,
      paymentMethod,
      paymentStatus: "paid",
      cashierName,
      waiterName: original.waiterName ?? null,
      billedBy: original.billedBy ?? null,
      billedAt: original.billedAt ? new Date(original.billedAt) : null,
      note: note || `Split payment from Order #${original.orderNumber}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(orders).values({
      id: splitPaidOrder.id,
      orderNumber: splitPaidOrder.orderNumber,
      tableNumber: splitPaidOrder.tableNumber,
      items: splitPaidOrder.items,
      subtotal: splitPaidOrder.subtotal,
      discount: splitPaidOrder.discount,
      totalAmount: splitPaidOrder.totalAmount,
      paymentMethod: splitPaidOrder.paymentMethod,
      paymentStatus: splitPaidOrder.paymentStatus,
      cashierName: splitPaidOrder.cashierName,
      waiterName: splitPaidOrder.waiterName,
      billedBy: splitPaidOrder.billedBy,
      billedAt: splitPaidOrder.billedAt as Date | null,
      note: splitPaidOrder.note,
      createdAt: splitPaidOrder.createdAt as Date,
      updatedAt: splitPaidOrder.updatedAt as Date,
    });

    // Calculate remaining items
    const remainingItems: OrderItem[] = [];
    for (const origItem of original.items) {
      const matchPaid = calculatedPaidItems.find(
        (p) =>
          p.menuItemId === origItem.menuItemId &&
          p.variantLabel === origItem.variantLabel,
      );
      if (matchPaid) {
        const remainingQty = origItem.quantity - matchPaid.quantity;
        if (remainingQty > 0) {
          remainingItems.push({
            ...origItem,
            quantity: remainingQty,
            subtotal: Number((origItem.price * remainingQty).toFixed(2)),
          });
        }
      } else {
        remainingItems.push(origItem);
      }
    }

    if (remainingItems.length === 0) {
      await db
        .update(orders)
        .set({ paymentStatus: "paid", updatedAt: new Date() })
        .where(eq(orders.id, id));
    } else {
      const remSubtotal = Number(
        remainingItems.reduce((acc, curr) => acc + curr.subtotal, 0).toFixed(2),
      );
      const remTotal = Math.max(
        0,
        Number((remSubtotal - original.discount).toFixed(2)),
      );
      await db
        .update(orders)
        .set({
          items: remainingItems,
          subtotal: remSubtotal,
          totalAmount: remTotal,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id));
    }

    const updatedRemaining = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .get();

    return c.json(
      createSuccessResponse({
        paidOrder: splitPaidOrder,
        remainingOrder: updatedRemaining as unknown as Order,
      }),
      200,
    );
  } catch (err: any) {
    return c.json(
      createErrorResponse(
        "DB_ERROR",
        err.message || "Failed to process split payment",
      ),
      500,
    );
  }
}

export async function getDailyReportController(c: Context<AppEnv>) {
  const targetDateStr =
    c.req.query("date") || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let allOrders: Order[] = [];
  let ledgerEntries: LedgerEntry[] = [];
  const menuItemCategoryMap = new Map<
    string,
    { categoryId: string; categoryName: string }
  >();
  const paymentMethodNameMap = new Map<string, string>([
    ["cash", "សាច់ប្រាក់ (Cash)"],
    ["khqr", "KHQR / Bakong"],
    ["card", "កាតធនាគារ (Card)"],
    ["aba", "ABA Bank"],
    ["acleda", "ACLEDA Bank"],
    ["wing", "Wing Bank"],
    ["owner_meal", "មេហូប"],
  ]);
  let activeRate = 4000;

  if (!c.env?.DB) {
    allOrders = mockOrders.filter((o) => {
      const d = new Date(o.createdAt || Date.now()).toISOString().slice(0, 10);
      return d === targetDateStr;
    });
  } else {
    try {
      const db = getDb(c.env.DB);
      const [
        rows,
        allMenuItems,
        allCategories,
        allPaymentMethods,
        allLedgerRows,
        currentSetting,
      ] = await Promise.all([
        db.select().from(orders).orderBy(desc(orders.createdAt)).all(),
        db
          .select({ id: menuItems.id, categoryId: menuItems.categoryId })
          .from(menuItems)
          .all(),
        db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .all(),
        db
          .select({ code: paymentMethods.code, name: paymentMethods.name })
          .from(paymentMethods)
          .all(),
        db.select().from(cashLedger).orderBy(desc(cashLedger.createdAt)).all(),
        db
          .select({ exchangeRate: siteSettings.exchangeRate })
          .from(siteSettings)
          .where(eq(siteSettings.id, "default"))
          .get(),
      ]);

      activeRate = currentSetting?.exchangeRate || 4000;
      for (const pm of allPaymentMethods) {
        if (pm.code && pm.name) {
          paymentMethodNameMap.set(pm.code, pm.name);
        }
      }

      const catNameMap = new Map(
        allCategories.map((cat) => [cat.id, cat.name]),
      );
      for (const m of allMenuItems) {
        const cId = m.categoryId || "other";
        const cName =
          (m.categoryId && catNameMap.get(m.categoryId)) || "ផ្សេងៗ (Other)";
        menuItemCategoryMap.set(m.id, { categoryId: cId, categoryName: cName });
      }

      allOrders = (rows as Order[]).filter((o) => {
        const d = new Date(o.createdAt || Date.now())
          .toISOString()
          .slice(0, 10);
        return d === targetDateStr;
      });

      ledgerEntries = (allLedgerRows as LedgerEntry[]).filter((l) => {
        const d = new Date(l.createdAt || Date.now())
          .toISOString()
          .slice(0, 10);
        return d === targetDateStr;
      });
    } catch {
      allOrders = [];
      ledgerEntries = [];
    }
  }

  // Aggregate Metrics
  const totalOrders = allOrders.length;
  let totalRevenueUSD = 0;
  let unpaidOrdersUSD = 0;
  let cashUSD = 0;
  let khqrUSD = 0;
  let cardUSD = 0;

  let ownerMealCount = 0;
  let ownerMealUSD = 0;
  let ownerMealKHR = 0;

  const itemMap = new Map<string, TopSellingItem>();
  const categoryMap = new Map<string, CategorySalesSummary>();
  const paymentMethodMap = new Map<string, PaymentMethodSalesSummary>();

  function addMethodAmount(code: string, amountUSD: number, countOrder = true) {
    if (amountUSD <= 0 && !countOrder) return;
    const normalizedCode = code || "cash";
    const existing = paymentMethodMap.get(normalizedCode);
    if (existing) {
      if (countOrder) existing.totalOrders += 1;
      existing.totalUSD = Number((existing.totalUSD + amountUSD).toFixed(2));
      existing.totalKHR = Math.round(existing.totalUSD * activeRate);
    } else {
      paymentMethodMap.set(normalizedCode, {
        code: normalizedCode,
        name:
          paymentMethodNameMap.get(normalizedCode) ||
          normalizedCode.toUpperCase(),
        totalOrders: countOrder ? 1 : 0,
        totalUSD: Number(amountUSD.toFixed(2)),
        totalKHR: Math.round(amountUSD * activeRate),
      });
    }
  }

  for (const ord of allOrders) {
    const amt = Number(ord.totalAmount) || 0;
    if (ord.paymentMethod === "owner_meal") {
      ownerMealCount += 1;
      ownerMealUSD += amt;
      ownerMealKHR += Math.round(amt * activeRate);
      continue;
    }

    if (ord.paymentStatus === "paid") {
      totalRevenueUSD += amt;

      const method = ord.paymentMethod || "cash";
      if (method === "cash") {
        cashUSD += amt;
        addMethodAmount("cash", amt);
      } else if (method === "card") {
        cardUSD += amt;
        addMethodAmount("card", amt);
      } else if (method === "mixed") {
        const cashMatch = ord.note?.match(/សាច់ប្រាក់\s*\$([0-9.]+)/i);
        const onlineMatch = ord.note?.match(/\+\s*([^$]+?)\s*\$([0-9.]+)/i);
        const cAmt = cashMatch ? Number(cashMatch[1]) : 0;
        const oAmt = onlineMatch
          ? Number(onlineMatch[2])
          : Math.max(0, amt - cAmt);
        const onlineName = onlineMatch?.[1]?.trim() || "KHQR";
        cashUSD += cAmt;
        khqrUSD += oAmt;
        if (cAmt > 0) addMethodAmount("cash", cAmt, true);
        if (oAmt > 0)
          addMethodAmount(onlineName.toLowerCase(), oAmt, cAmt <= 0);
      } else {
        // Specific bank / KHQR (aba, acleda, wing, khqr, etc.)
        khqrUSD += amt;
        addMethodAmount(method, amt);
      }

      // Aggregate Items & Categories
      if (Array.isArray(ord.items)) {
        for (const it of ord.items) {
          const key = it.variantLabel
            ? `${it.name} (${it.variantLabel})`
            : it.name;
          const existing = itemMap.get(key);
          const q = Number(it.quantity) || 0;
          const rev = Number(it.subtotal) || 0;

          if (existing) {
            existing.totalQuantity += q;
            existing.totalRevenue = Number(
              (existing.totalRevenue + rev).toFixed(2),
            );
          } else {
            itemMap.set(key, {
              name: it.name,
              variantLabel: it.variantLabel || "",
              totalQuantity: q,
              totalRevenue: rev,
            });
          }

          const catInfo = (it.menuItemId &&
            menuItemCategoryMap.get(it.menuItemId)) || {
            categoryId: "other",
            categoryName: "ផ្សេងៗ (Other)",
          };
          const existingCat = categoryMap.get(catInfo.categoryId);
          if (existingCat) {
            existingCat.totalQuantity += q;
            existingCat.totalRevenueUSD = Number(
              (existingCat.totalRevenueUSD + rev).toFixed(2),
            );
            existingCat.totalRevenueKHR = Math.round(
              existingCat.totalRevenueUSD * activeRate,
            );
          } else {
            categoryMap.set(catInfo.categoryId, {
              categoryId: catInfo.categoryId,
              categoryName: catInfo.categoryName,
              totalQuantity: q,
              totalRevenueUSD: Number(rev.toFixed(2)),
              totalRevenueKHR: Math.round(rev * activeRate),
            });
          }
        }
      }
    } else {
      unpaidOrdersUSD += amt;
    }
  }

  totalRevenueUSD = Number(totalRevenueUSD.toFixed(2));
  unpaidOrdersUSD = Number(unpaidOrdersUSD.toFixed(2));
  cashUSD = Number(cashUSD.toFixed(2));
  khqrUSD = Number(khqrUSD.toFixed(2));
  cardUSD = Number(cardUSD.toFixed(2));

  const totalRevenueKHR = Math.round(totalRevenueUSD * activeRate);
  const unpaidOrdersKHR = Math.round(unpaidOrdersUSD * activeRate);

  let ledgerReceivableKHR = 0;
  let ledgerReceivableUSD = 0;
  let payableKHR = 0;
  let payableUSD = 0;
  let repaymentKHR = 0;
  let repaymentUSD = 0;

  for (const l of ledgerEntries) {
    const khr = Number(l.amountKHR) || 0;
    const usd = Number(l.amountUSD) || 0;
    if (l.type === "receivable") {
      ledgerReceivableKHR += khr;
      ledgerReceivableUSD += usd;
    } else if (l.type === "payable") {
      payableKHR += khr;
      payableUSD += usd;
    } else if (l.type === "repayment") {
      repaymentKHR += khr;
      repaymentUSD += usd;
    } else if (l.type === "owner_meal") {
      ownerMealCount += 1;
      ownerMealKHR += khr;
      ownerMealUSD += usd;
    }
  }

  const topSellingItems = Array.from(itemMap.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10);

  const categoryBreakdown = Array.from(categoryMap.values()).sort(
    (a, b) => b.totalRevenueUSD - a.totalRevenueUSD,
  );

  const paymentMethodBreakdown = Array.from(paymentMethodMap.values()).sort(
    (a, b) => b.totalKHR - a.totalKHR,
  );

  const report: DailyReport = {
    date: targetDateStr,
    exchangeRate: activeRate,
    totalOrders,
    totalRevenueUSD,
    totalRevenueKHR,
    unpaidOrdersUSD,
    unpaidOrdersKHR,
    receivableUSD: Number((unpaidOrdersUSD + ledgerReceivableUSD).toFixed(2)),
    receivableKHR: unpaidOrdersKHR + ledgerReceivableKHR,
    payableUSD: Number(payableUSD.toFixed(2)),
    payableKHR,
    repaymentUSD: Number(repaymentUSD.toFixed(2)),
    repaymentKHR,
    ownerMealCount,
    ownerMealUSD: Number(ownerMealUSD.toFixed(2)),
    ownerMealKHR,
    paymentBreakdown: {
      cashUSD,
      khqrUSD,
      cardUSD,
    },
    paymentMethodBreakdown,
    topSellingItems,
    categoryBreakdown,
    ledgerEntries,
    orders: allOrders,
  };

  return c.json(createSuccessResponse(report), 200);
}
