export type StockStatus = "ok" | "low" | "out";
export type Responsibility = "Store Manager" | "Staff" | "Accounts";
export type Shift = "morning" | "afternoon" | "evening";

export interface InventoryItem {
  id: string;
  categoryId: string;
  name: string;
  unit: string;
  currentQty: number;
  minimumQty: number;
  targetQty: number;
  responsible: Responsibility;
  location: string;
  notes?: string;
  lastCheckedAt?: string;
  lastCheckedBy?: string;
  estimatedUnitValue?: number;
}

export interface Category {
  id: string;
  name: string;
  hindiName: string;
  description: string;
  photo: string;
  owner: Responsibility;
}

export interface DailyTask {
  id: string;
  shift: Shift;
  title: string;
  description: string;
  owner: Responsibility;
  categoryId?: string;
  evidenceRequired?: boolean;
}

export interface TaskCompletion {
  taskId: string;
  date: string;
  completedAt: string;
  completedBy: string;
  note?: string;
}

export interface ActivityEntry {
  id: string;
  type: "stock-check" | "reorder" | "invoice" | "cash-token" | "task";
  message: string;
  actor: string;
  timestamp: string;
}


export interface RentalAsset {
  id: string;
  name: string;
  type: "Ladder" | "Jhula";
  status: "available" | "rented";
  customerName?: string;
  phone?: string;
  dailyRate?: number;
  rentedAt?: string;
  dueAt?: string;
  advancePaid?: number;
}

export interface OrderQueueEntry {
  itemId: string;
  itemName: string;
  quantity: number;
  estimatedValue: number;
  addedAt: string;
}

export interface VyaparItem {
  id: string;
  itemCode: string;
  name: string;
  hsn: string;
  mrp: number;
  salePrice: number;
  purchasePrice: number;
  onlinePrice: number;
  currentStock: number;
  minimumStock: number;
  location: string;
  taxRate: string;
  taxInclusive: string;
}

