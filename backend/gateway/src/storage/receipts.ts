import { PaymentReceipt } from '@x402-solintel/types';

/**
 * In-memory receipt storage
 * TODO: Replace with Redis or database for production
 */
class ReceiptStore {
  private receipts: Map<string, PaymentReceipt>;

  constructor() {
    this.receipts = new Map();
  }

  /**
   * Save a receipt
   */
  async save(receipt: PaymentReceipt): Promise<void> {
    this.receipts.set(receipt.id, receipt);
  }

  /**
   * Get receipt by ID
   */
  async getById(id: string): Promise<PaymentReceipt | null> {
    return this.receipts.get(id) || null;
  }

  /**
   * Get receipt by invoice ID
   */
  async getByInvoiceId(invoiceId: string): Promise<PaymentReceipt | null> {
    for (const receipt of this.receipts.values()) {
      if (receipt.invoiceId === invoiceId) {
        return receipt;
      }
    }
    return null;
  }

  /**
   * Get recent receipts
   */
  async getRecent(limit: number = 50): Promise<PaymentReceipt[]> {
    const all = Array.from(this.receipts.values());
    return all
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get receipts by payer
   */
  async getByPayer(payer: string): Promise<PaymentReceipt[]> {
    const receipts = Array.from(this.receipts.values());
    return receipts
      .filter((r) => r.payer === payer)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalReceipts: number;
    totalRevenue: number;
    serviceBreakdown: Record<string, { count: number; revenue: number }>;
  }> {
    const all = Array.from(this.receipts.values());

    const totalReceipts = all.length;
    const totalRevenue = all.reduce((sum, r) => sum + r.amountUSD, 0);

    const serviceBreakdown: Record<string, { count: number; revenue: number }> = {};

    for (const receipt of all) {
      if (!serviceBreakdown[receipt.serviceName]) {
        serviceBreakdown[receipt.serviceName] = { count: 0, revenue: 0 };
      }
      serviceBreakdown[receipt.serviceName].count++;
      serviceBreakdown[receipt.serviceName].revenue += receipt.amountUSD;
    }

    return {
      totalReceipts,
      totalRevenue,
      serviceBreakdown,
    };
  }
}

export const receiptStore = new ReceiptStore();
