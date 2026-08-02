import { Hono } from "hono";
import { PaymentMethod } from "@prisma/client";
import { format } from "date-fns";
import {
  canSell,
  nextStockAfterRestock,
  nextStockAfterSale,
  sumDrinkRevenue,
} from "@gym/shared/drinks";
import { paymentMethods } from "@gym/shared/validations";
import { prisma } from "../db";
import { requireGymFeature } from "../lib/features";
import { requireAdmin } from "../middleware/auth";
import { parseMonthQuery } from "./bills";

const PAYMENT_METHODS = new Set<string>(paymentMethods);

function monthRange(monthStart: Date) {
  const start = monthStart;
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  return { start, end };
}

export const drinksRoutes = new Hono();

drinksRoutes.use("*", requireAdmin);
drinksRoutes.use("*", requireGymFeature("drinks"));

drinksRoutes.get("/products", async (c) => {
  const staff = c.get("staff");

  const products = await prisma.drinkProduct.findMany({
    where: { gymId: staff.gymId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sellPrice: true,
      costPrice: true,
      stockQty: true,
      active: true,
    },
  });

  return c.json({
    data: products.map((product) => ({
      id: product.id,
      name: product.name,
      sellPrice: Number(product.sellPrice),
      costPrice: product.costPrice != null ? Number(product.costPrice) : null,
      stockQty: product.stockQty,
      active: product.active,
    })),
  });
});

drinksRoutes.post("/products", async (c) => {
  const staff = c.get("staff");
  const body = await c.req.json();

  const nameRaw = body.name;
  const sellPriceRaw = body.sellPrice;
  const costPriceRaw = body.costPrice;
  const stockQtyRaw = body.stockQty;

  if (typeof nameRaw !== "string" || !nameRaw.trim()) {
    return c.json({ error: { code: "VALIDATION", message: "Nom invalide" } }, 422);
  }

  const sellPrice = Number(sellPriceRaw);
  if (!Number.isFinite(sellPrice) || sellPrice < 0) {
    return c.json({ error: { code: "VALIDATION", message: "Prix de vente invalide" } }, 422);
  }

  let costPrice: number | undefined;
  if (costPriceRaw != null && costPriceRaw !== "") {
    costPrice = Number(costPriceRaw);
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      return c.json({ error: { code: "VALIDATION", message: "Prix de revient invalide" } }, 422);
    }
  }

  const stockQty = Number(stockQtyRaw);
  if (!Number.isInteger(stockQty) || stockQty < 0) {
    return c.json({ error: { code: "VALIDATION", message: "Stock invalide" } }, 422);
  }

  try {
    const created = await prisma.drinkProduct.create({
      data: {
        gymId: staff.gymId,
        name: nameRaw.trim(),
        sellPrice,
        costPrice: costPrice ?? null,
        stockQty,
        active: true,
      },
      select: { id: true },
    });
    return c.json({ data: { id: created.id } }, 201);
  } catch {
    return c.json({ error: { code: "VALIDATION", message: "Produit déjà existant" } }, 422);
  }
});

drinksRoutes.patch("/products/:id", async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: { code: "NOT_FOUND", message: "Produit introuvable" } }, 404);
  }

  const product = await prisma.drinkProduct.findFirst({
    where: { id, gymId: staff.gymId },
    select: { id: true },
  });
  if (!product) {
    return c.json({ error: { code: "NOT_FOUND", message: "Produit introuvable" } }, 404);
  }

  const body = await c.req.json();
  const data: {
    name?: string;
    sellPrice?: number;
    costPrice?: number | null;
    active?: boolean;
  } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return c.json({ error: { code: "VALIDATION", message: "Nom invalide" } }, 422);
    }
    data.name = body.name.trim();
  }

  if (body.sellPrice !== undefined) {
    const sellPrice = Number(body.sellPrice);
    if (!Number.isFinite(sellPrice) || sellPrice < 0) {
      return c.json({ error: { code: "VALIDATION", message: "Prix de vente invalide" } }, 422);
    }
    data.sellPrice = sellPrice;
  }

  if (body.costPrice !== undefined) {
    if (body.costPrice == null || body.costPrice === "") {
      data.costPrice = null;
    } else {
      const costPrice = Number(body.costPrice);
      if (!Number.isFinite(costPrice) || costPrice < 0) {
        return c.json({ error: { code: "VALIDATION", message: "Prix de revient invalide" } }, 422);
      }
      data.costPrice = costPrice;
    }
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return c.json({ error: { code: "VALIDATION", message: "Statut invalide" } }, 422);
    }
    data.active = body.active;
  }

  if (Object.keys(data).length === 0) {
    return c.json({ error: { code: "VALIDATION", message: "Aucune modification" } }, 422);
  }

  try {
    await prisma.drinkProduct.update({
      where: { id: product.id },
      data,
    });
  } catch {
    return c.json({ error: { code: "VALIDATION", message: "Produit déjà existant" } }, 422);
  }

  return c.json({ data: { ok: true } });
});

drinksRoutes.post("/products/:id/restock", async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  if (!id) {
    return c.json({ error: { code: "NOT_FOUND", message: "Produit introuvable" } }, 404);
  }

  const body = await c.req.json();
  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return c.json({ error: { code: "VALIDATION", message: "Quantité invalide" } }, 422);
  }

  const product = await prisma.drinkProduct.findFirst({
    where: { id, gymId: staff.gymId },
    select: { id: true, stockQty: true },
  });
  if (!product) {
    return c.json({ error: { code: "NOT_FOUND", message: "Produit introuvable" } }, 404);
  }

  const stockQty = nextStockAfterRestock(product.stockQty, quantity);
  await prisma.drinkProduct.update({
    where: { id: product.id },
    data: { stockQty },
  });

  return c.json({ data: { ok: true } });
});

drinksRoutes.get("/sales", async (c) => {
  const staff = c.get("staff");
  const monthStart = parseMonthQuery(c.req.query("month"));
  const monthKey = format(monthStart, "yyyy-MM");
  const { start, end } = monthRange(monthStart);

  const sales = await prisma.drinkSale.findMany({
    where: {
      gymId: staff.gymId,
      soldAt: { gte: start, lt: end },
    },
    orderBy: { soldAt: "desc" },
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      total: true,
      method: true,
      soldAt: true,
      note: true,
      product: { select: { name: true } },
    },
  });

  const rows = sales.map((sale) => ({
    id: sale.id,
    productName: sale.product.name,
    quantity: sale.quantity,
    unitPrice: Number(sale.unitPrice),
    total: Number(sale.total),
    method: sale.method,
    soldAt: sale.soldAt.toISOString(),
    note: sale.note,
  }));

  const revenue = sumDrinkRevenue(rows.map((sale) => ({ total: sale.total })));

  return c.json({
    data: {
      month: monthKey,
      sales: rows,
      revenue,
    },
  });
});

drinksRoutes.post("/sales", async (c) => {
  const staff = c.get("staff");
  const body = await c.req.json();

  const productIdRaw = body.productId;
  const quantityRaw = body.quantity;
  const methodRaw = body.method;
  const noteRaw = body.note;
  const soldAtRaw = body.soldAt;

  if (typeof productIdRaw !== "string" || !productIdRaw) {
    return c.json({ error: { code: "NOT_FOUND", message: "Produit introuvable" } }, 404);
  }

  const quantity = Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return c.json({ error: { code: "VALIDATION", message: "Quantité invalide" } }, 422);
  }

  if (typeof methodRaw !== "string" || !PAYMENT_METHODS.has(methodRaw)) {
    return c.json({ error: { code: "VALIDATION", message: "Méthode invalide" } }, 422);
  }

  let soldAt = new Date();
  if (typeof soldAtRaw === "string" && soldAtRaw.trim()) {
    const parsed = new Date(soldAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      return c.json({ error: { code: "VALIDATION", message: "Date invalide" } }, 422);
    }
    soldAt = parsed;
  }

  const note =
    typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : undefined;

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.drinkProduct.findFirst({
        where: {
          id: productIdRaw,
          gymId: staff.gymId,
          active: true,
        },
        select: { id: true, stockQty: true, sellPrice: true },
      });

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      if (!canSell(product.stockQty, quantity)) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const unitPrice = Number(product.sellPrice);
      const total = unitPrice * quantity;
      const stockQty = nextStockAfterSale(product.stockQty, quantity);

      await tx.drinkSale.create({
        data: {
          gymId: staff.gymId,
          productId: product.id,
          quantity,
          unitPrice,
          total,
          method: methodRaw as PaymentMethod,
          soldAt,
          note,
          recordedById: staff.sub,
        },
      });

      await tx.drinkProduct.update({
        where: { id: product.id },
        data: { stockQty },
      });
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INSUFFICIENT_STOCK") {
        return c.json({ error: { code: "VALIDATION", message: "Stock insuffisant" } }, 422);
      }
      if (error.message === "PRODUCT_NOT_FOUND") {
        return c.json({ error: { code: "NOT_FOUND", message: "Produit introuvable" } }, 404);
      }
    }
    throw error;
  }

  return c.json({ data: { ok: true } }, 201);
});
