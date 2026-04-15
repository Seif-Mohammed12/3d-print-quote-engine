# Admin Statistics Feature Documentation

## Overview

The Admin Statistics page provides comprehensive sales and production analytics for the 3D Print Quote Engine. Admins can track revenue, monitor filament usage, and manually log off-site orders.

**Location:** `/admin/stats`

---

## Features

### 1. Dashboard Metrics

**Key Performance Indicators (KPIs):**

| Metric            | Description                                    | Source                    |
| ----------------- | ---------------------------------------------- | ------------------------- |
| **Total Orders**  | Count of completed orders                      | All active stat entries   |
| **Total Revenue** | Cumulative revenue across all time (EGP)       | Sum of all order revenues |
| **Filament Used** | Total kilograms of filament consumed           | Sum of all order weights  |
| **Avg per Order** | Average revenue and weight per completed order | Total / Count             |

### 2. Charts

- **Revenue by Month** - Line chart showing monthly revenue trends
- **Filament Used by Month** - Bar chart showing monthly filament consumption
- Both charts support hover tooltips and legends

### 3. Manual Order Entry

Admins can manually add orders that weren't placed through the website:

| Field          | Required | Type   | Constraints                  | Notes                              |
| -------------- | -------- | ------ | ---------------------------- | ---------------------------------- |
| Order Code     | Yes      | Text   | Max 50 chars, must be unique | e.g., "ORD-001", "MANUAL-2026-001" |
| Order Date     | Yes      | Date   | Must be valid date           | ISO format (YYYY-MM-DD)            |
| Customer Name  | Yes      | Text   | 2-100 chars                  | Full name required                 |
| Email          | No       | Email  | Max 100 chars                | Optional contact info              |
| Phone          | No       | Text   | Max 20 chars                 | Optional contact info              |
| Revenue (EGP)  | Yes      | Number | Min 0.01, step 0.01          | Must be positive decimal           |
| Weight (grams) | Yes      | Number | Min 0, step 0.01             | Can be 0 if unknown                |
| Notes          | No       | Text   | Max 500 chars                | For internal notes                 |

### 4. Order Management

Admins can:

- **View** all active orders with details
- **Edit** weight, revenue, and notes for any order
- **Delete** orders (soft delete - marked as inactive)

---

## Database Schema

### `admin_order_stats` Table

```sql
CREATE TABLE admin_order_stats (
  id uuid PRIMARY KEY,
  order_code text UNIQUE NOT NULL,
  order_date timestamptz NOT NULL,
  order_type text NOT NULL ('site' | 'manual'),
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  revenue numeric(10,2) NOT NULL,
  weight_grams numeric(10,2) NOT NULL,
  item_count integer NOT NULL DEFAULT 1,
  notes text,
  is_active boolean DEFAULT true,
  is_completed boolean DEFAULT true,
  linked_order_id uuid (FOREIGN KEY),
  created_by uuid (FOREIGN KEY),
  created_at timestamptz,
  updated_at timestamptz
);
```

### `products` Table Updates

Added new column:

```sql
grams numeric(8,2) DEFAULT 0
```

Used for tracking filament weight of products in the catalog.

---

## API Endpoints

### GET `/api/admin-stats-list`

Fetch all statistics with monthly breakdown.

**Query Parameters:**

- `startDate` (ISO date, optional)
- `endDate` (ISO date, optional)

**Response:**

```json
{
  "success": true,
  "metrics": {
    "totalSales": 42,
    "totalRevenue": 25500.5,
    "totalWeight": 8750.25
  },
  "monthlyData": [
    {
      "month": "2026-01",
      "sales": 5,
      "revenue": 2500.0,
      "weight": 875.5
    }
  ],
  "orders": [
    {
      "id": "uuid",
      "order_code": "ORD-001",
      "order_date": "2026-01-15T10:30:00Z",
      "customer_name": "John Doe",
      "revenue": 500.0,
      "weight_grams": 250.0,
      "order_type": "manual",
      "is_completed": true
    }
  ]
}
```

### POST `/api/admin-stats-add`

Add a new manual order to statistics.

**Request Body:**

```json
{
  "orderCode": "ORD-001",
  "orderDate": "2026-01-15",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+20 109 928 486",
  "revenue": 500.0,
  "weightGrams": 250.0,
  "notes": "First-time customer"
}
```

**Response:**

```json
{
  "success": true,
  "stat": {
    /* newly created stat object */
  }
}
```

### PUT `/api/admin-stats-update?id=<stat_id>`

Update an existing stat entry.

**Request Body (all optional):**

```json
{
  "weightGrams": 275.5,
  "revenue": 525.0,
  "notes": "Updated weight based on actual measurement",
  "isCompleted": true
}
```

**Response:**

```json
{
  "success": true,
  "stat": {
    /* updated stat object */
  }
}
```

### DELETE `/api/admin-stats-delete?id=<stat_id>`

Mark a stat entry as inactive (soft delete).

**Response:**

```json
{
  "success": true,
  "message": "Statistic deactivated",
  "stat": {
    /* updated stat object */
  }
}
```

---

## Integration with Site Orders

When an order is created on the website and marked as **completed**, a stat entry is automatically created with:

- `order_type`: "site"
- `revenue`: Sum of order totals
- `weight_grams`: Extracted from order metadata
- `linked_order_id`: Reference to the original order

This is handled by the database trigger: `trg_order_stats_on_complete`

### Updating Order Weight

If an uploaded 3D model file's weight is inaccurate, admins can:

1. Find the order in the stats table
2. Click the **Edit** button
3. Update the weight value
4. Save changes

---

## Access Control

Only authenticated admin users can:

- View statistics
- Add manual orders
- Edit entries
- Delete entries

Row-level security (RLS) enforces this via:

- `public.is_admin_user()` function check
- Admin users verified in `admin_users` table

---

## Data Quality

### Best Practices

1. **Order Codes**: Use consistent naming convention
   - Examples: `ORD-001`, `MANUAL-2026-01-15`, `CUSTOM-PRINT-001`
   - Avoid duplicates

2. **Dates**: Enter order date, not processing date
   - For past orders, use actual order date
   - For estimates, use current date

3. **Weight Tracking**:
   - If weight unknown, use `0` and update later
   - For products, add `grams` value to product catalog
   - For custom work, measure actual weight

4. **Revenue**:
   - Always use final price customer paid
   - Include all fees/taxes
   - Use decimal notation (e.g., `250.50` for 250.50 EGP)

### Data Accuracy

- **Manual Entry Risks**: Typos, duplicates, incorrect calculations
- **Site Order Risks**: Inaccurate file weight calculations
- **Mitigation**: Regular audits and updates

---

## Monthly Breakdown

Charts aggregate data by month for trend analysis:

```
January 2026:   5 orders, EGP 2,500, 875g filament
February 2026:  8 orders, EGP 4,200, 1,250g filament
March 2026:     3 orders, EGP 1,800, 625g filament
```

This helps identify:

- Seasonal trends
- Peak production months
- Average monthly output

---

## Reporting

Use monthly data to generate:

1. **Monthly Reports**
   - Total revenue per month
   - Order count
   - Filament efficiency

2. **Quarterly Analysis**
   - Revenue trends
   - Production capacity
   - Customer patterns

3. **Annual Summary**
   - Yearly revenue
   - Growth metrics
   - Inventory planning

---

## Troubleshooting

### Issue: Order not appearing in stats

**Solutions:**

1. Verify order status is "completed" in orders table
2. Check if order was recent (trigger applies to new inserts/updates)
3. Try manual entry if order predates feature

### Issue: Revenue/Weight calculations incorrect

**Solutions:**

1. Edit entry to correct values
2. Check order totals in orders table
3. Recalculate from actual weight measurement

### Issue: Cannot add order code (duplicate error)

**Solutions:**

1. Use unique order code
2. Check if order already exists
3. Append date/sequence: `ORD-001-2`, `ORD-002`

### Issue: Charts not updating

**Solutions:**

1. Refresh page (F5)
2. Clear browser cache
3. Check browser console for API errors

---

## Future Enhancements

- [ ] Export statistics as PDF/CSV
- [ ] Email monthly summaries
- [ ] Profit margin tracking
- [ ] Cost per gram analysis
- [ ] Customer lifetime value
- [ ] Material cost integration
- [ ] 3D forecasting based on trends
- [ ] Bulk import from spreadsheet
- [ ] Advanced filtering & search
- [ ] More chart types (pie, line combos)

---

## Security Considerations

### Access Control

- Admin verification required for all endpoints
- RLS policies enforce access
- No public access to statistics

### Data Validation

- Input constraints on all fields
- Server-side validation enforced
- Type checking on numeric fields

### Audit Trail

- `created_by` tracks who added entries
- `created_at` / `updated_at` timestamps
- Status history via `is_active` flag

---

## Related Documentation

- See [INPUT_VALIDATION_SUMMARY.md](INPUT_VALIDATION_SUMMARY.md) for form field constraints
- See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for overall system architecture
