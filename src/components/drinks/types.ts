import type { PaymentMethod } from "@prisma/client";

export type DrinkProductRow = {
  id: string;
  name: string;
  sellPrice: number;
  costPrice: number | null;
  stockQty: number;
  active: boolean;
};

export type DrinkSaleRow = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  method: PaymentMethod;
  soldAt: string;
  note: string | null;
};
