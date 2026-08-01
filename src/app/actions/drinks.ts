"use server";

import { PaymentMethod, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  canSell,
  nextStockAfterRestock,
  nextStockAfterSale,
} from "@/lib/drinks";
import { prisma } from "@/lib/db";
import { assertFeature } from "@/lib/gym-features";
import { requireSession } from "@/lib/session";
import { paymentMethods } from "@/lib/validations";

const PAYMENT_METHODS = new Set<string>(paymentMethods);

async function requireDrinksAdmin() {
  const session = await requireSession();
  if (session.role !== Role.ADMIN) {
    return { error: "Non autorisé" as const, session: null };
  }
  try {
    await assertFeature(session.gymId, "drinks");
  } catch (error) {
    if (error instanceof Error && error.message === "FEATURE_LOCKED") {
      return { error: "FEATURE_LOCKED" as const, session: null };
    }
    throw error;
  }
  return { error: null, session };
}

function revalidateDrinks() {
  revalidatePath("/drinks");
  revalidatePath("/dashboard");
}

export async function createProductAction(formData: FormData) {
  const gate = await requireDrinksAdmin();
  if (gate.error || !gate.session) return { error: gate.error ?? "Non autorisé" };

  const nameRaw = formData.get("name");
  const sellPriceRaw = formData.get("sellPrice");
  const costPriceRaw = formData.get("costPrice");
  const stockQtyRaw = formData.get("stockQty");

  if (typeof nameRaw !== "string" || !nameRaw.trim()) {
    return { error: "Nom invalide" };
  }

  const sellPrice = Number(sellPriceRaw);
  if (!Number.isFinite(sellPrice) || sellPrice < 0) {
    return { error: "Prix de vente invalide" };
  }

  let costPrice: number | undefined;
  if (costPriceRaw != null && costPriceRaw !== "") {
    costPrice = Number(costPriceRaw);
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      return { error: "Prix de revient invalide" };
    }
  }

  const stockQty = Number(stockQtyRaw);
  if (!Number.isInteger(stockQty) || stockQty < 0) {
    return { error: "Stock invalide" };
  }

  try {
    await prisma.drinkProduct.create({
      data: {
        gymId: gate.session.gymId,
        name: nameRaw.trim(),
        sellPrice,
        costPrice: costPrice ?? null,
        stockQty,
        active: true,
      },
    });
  } catch {
    return { error: "Produit déjà existant" };
  }

  revalidateDrinks();
  return { ok: true };
}

export async function restockProductAction(formData: FormData) {
  const gate = await requireDrinksAdmin();
  if (gate.error || !gate.session) return { error: gate.error ?? "Non autorisé" };

  const productIdRaw = formData.get("productId");
  const quantityRaw = formData.get("quantity");

  if (typeof productIdRaw !== "string" || !productIdRaw) {
    return { error: "Produit introuvable" };
  }

  const quantity = Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "Quantité invalide" };
  }

  const product = await prisma.drinkProduct.findFirst({
    where: { id: productIdRaw, gymId: gate.session.gymId },
    select: { id: true, stockQty: true },
  });

  if (!product) {
    return { error: "Produit introuvable" };
  }

  const stockQty = nextStockAfterRestock(product.stockQty, quantity);

  await prisma.drinkProduct.update({
    where: { id: product.id },
    data: { stockQty },
  });

  revalidateDrinks();
  return { ok: true };
}

export async function sellDrinkAction(formData: FormData) {
  const gate = await requireDrinksAdmin();
  if (gate.error || !gate.session) return { error: gate.error ?? "Non autorisé" };

  const productIdRaw = formData.get("productId");
  const quantityRaw = formData.get("quantity");
  const methodRaw = formData.get("method");
  const noteRaw = formData.get("note");
  const soldAtRaw = formData.get("soldAt");

  if (typeof productIdRaw !== "string" || !productIdRaw) {
    return { error: "Produit introuvable" };
  }

  const quantity = Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { error: "Quantité invalide" };
  }

  if (typeof methodRaw !== "string" || !PAYMENT_METHODS.has(methodRaw)) {
    return { error: "Méthode invalide" };
  }

  let soldAt = new Date();
  if (typeof soldAtRaw === "string" && soldAtRaw.trim()) {
    const parsed = new Date(soldAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "Date invalide" };
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
          gymId: gate.session!.gymId,
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
          gymId: gate.session!.gymId,
          productId: product.id,
          quantity,
          unitPrice,
          total,
          method: methodRaw as PaymentMethod,
          soldAt,
          note,
          recordedById: gate.session!.userId,
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
        return { error: "Stock insuffisant" };
      }
      if (error.message === "PRODUCT_NOT_FOUND") {
        return { error: "Produit introuvable" };
      }
    }
    throw error;
  }

  revalidateDrinks();
  return { ok: true };
}

export async function toggleProductActiveAction(productId: string) {
  const gate = await requireDrinksAdmin();
  if (gate.error || !gate.session) return { error: gate.error ?? "Non autorisé" };
  if (!productId) return { error: "Produit introuvable" };

  const product = await prisma.drinkProduct.findFirst({
    where: { id: productId, gymId: gate.session.gymId },
    select: { id: true, active: true },
  });

  if (!product) {
    return { error: "Produit introuvable" };
  }

  await prisma.drinkProduct.update({
    where: { id: product.id },
    data: { active: !product.active },
  });

  revalidateDrinks();
  return { ok: true };
}
