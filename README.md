# Store Operations & Accountability System

A React/Next.js application for managing the daily responsibility of a paint-store manager. The workflow is organised around the real store day rather than disconnected stock modules.

## Daily workflow

### Morning — opening and counter readiness
Shade books, desk supplies, change cash and tokens, stationery, polybags, rental register, invoices, rollers, brushes, sandpaper, abrasive rolls and stencils.

### Afternoon — paint display and stock management
Enamel/Luxol, exterior paint, interior paint, waterproofing and wood-finish sections.

### Evening — closing and handover
Device charging, cash matching, bill filing, next-day reorder list, cleaning, electrical checks and final lock-up.

## Implemented MVP

- Daily shift dashboard with Morning, Afternoon and Evening progress
- Mandatory task completion and reopening
- Daily accountability score
- Inventory quantities, minimum stock and target stock
- Automatic low-stock and out-of-stock detection
- Reorder centre with required quantities
- Purchase document / kachha bill entry
- Responsibility and activity log
- Browser persistence for demo use
- Responsive desktop and mobile layout
- All 15 store reference photographs

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Runtime

The project targets Node.js 24 and is structured for GitHub and Vercel deployment.

## Production roadmap

1. Supabase authentication and database persistence
2. Staff accounts, roles and manager verification
3. Photo evidence upload
4. Token adjustment register
5. Rental register migration
6. PDF/WhatsApp order export
7. Multi-store owner dashboard

## Stainer, mini Luxol and colour-bank workflow

The latest afternoon inspection adds three physical zones from the colour-mixing area:

- **Zone A — Stainer cartons:** staff records remaining stock as a percentage of each carton. Any carton below **20%** automatically appears in the reorder centre and must be copied to the physical order book.
- **Zone B — Mini Luxol:** only Luxol packs below **200 ml** are stored here; they are counted and arranged by shade/code.
- **Zone C — Colour bank:** while making colour, staff opens each labelled inlet cap and confirms that colourant is present. The app tracks representative inlet levels as percentages, the condition of caps, and availability of colourant cans on the rack above the machine.

For percentage-based records, minimum stock is set to `20` and target stock to `100`. Therefore a value below 20% is treated as low stock and generates an order requirement to refill to 100%.


## Vyapar and rental controls

The current build also includes:

- Vyapar duplicate-item prevention using canonical item names and local-name mapping.
- Existing-party verification to avoid creating separate family-member accounts and price-history conflicts.
- A held purchase queue that becomes ready when estimated order value reaches ₹50,000.
- Daily separate checks for level plast, chalk powder, putty, white cement, whiting, POP, wax, chowry and texture putty.
- Live rental tracking for three ladders and two jhulas, including customer, phone, daily rate, advance, expected return and return-time balance calculation.

## Vyapar item master import

The project now includes the uploaded Vyapar export (`data/vyapar-items-export-2026-09-30.xls`) and a generated searchable item master in `lib/vyapar-items.ts`.

The Vyapar Controls screen shows all 474 imported records with item code, name, HSN, sale/purchase/MRP values, current stock, minimum stock and tax settings. It also highlights zero/negative stock and creates a review list of likely duplicate names. Similar-name suggestions are advisory only and must be manually verified before changing the Vyapar master.
