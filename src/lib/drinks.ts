export type DrinkSaleForRevenue = {
  total: number;
};

export function canSell(stockQty: number, quantity: number): boolean {
  return quantity > 0 && quantity <= stockQty;
}

export function nextStockAfterSale(stockQty: number, quantity: number): number {
  if (!canSell(stockQty, quantity)) {
    throw new Error("Insufficient stock");
  }
  return stockQty - quantity;
}

export function nextStockAfterRestock(stockQty: number, quantity: number): number {
  return stockQty + quantity;
}

export function sumDrinkRevenue(sales: DrinkSaleForRevenue[]): number {
  return sales.reduce((sum, sale) => sum + sale.total, 0);
}
