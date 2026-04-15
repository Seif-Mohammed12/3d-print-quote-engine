# Admin Statistics - Quick Start Guide

## 🚀 Getting Started

### Access the Stats Dashboard

1. Login as admin
2. Click your **Profile** → **Admin Dashboard**
3. Click the **Statistics** tab
4. You're now on the stats dashboard!

---

## 📊 Understanding the Dashboard

### Top Metrics (4 Cards)

**1. Total Orders**

- Count of all completed orders
- Includes both site and manual entries

**2. Total Revenue**

- Sum of all revenue in EGP
- Updated when new orders are added

**3. Filament Used**

- Total grams converted to kilograms
- Shows both kg and grams

**4. Avg per Order**

- Revenue and weight averages
- Helps with capacity planning

### Charts (Below Metrics)

**Revenue by Month (Line Chart)**

- Shows revenue trend over time
- Helps identify busy months
- Hover for exact values

**Filament Used by Month (Bar Chart)**

- Shows production volume by month
- Plan inventory based on trends
- Track resource usage

---

## ➕ Adding Manual Orders

### When to Use

- Orders received via WhatsApp/phone
- Walk-in customers
- Wholesale orders
- Offline payments

### How to Add

1. **Click "Add Order"** button at the bottom
2. **Fill in required fields** (marked with \*)
   - Order Code: `ORD-001`, `MANUAL-2026-01-15`, etc.
   - Order Date: When customer ordered
   - Customer Name: Full name
   - Revenue: Final price in EGP
   - Weight: Filament weight in grams

3. **Fill optional fields** (if available)
   - Email: Customer email
   - Phone: Customer phone
   - Notes: Any special details

4. **Click "Add to Statistics"**
5. Order appears in list immediately
6. Charts update automatically

### Example Entry

```
Order Code: MANUAL-2026-01-15-001
Order Date: 2026-01-15
Customer Name: Ahmed Hassan
Email: ahmed@company.eg
Phone: +20 109 928 486
Revenue: 450.00 EGP
Weight: 180.50 grams
Notes: Large batch, custom paint job
```

---

## ✏️ Editing Orders

### Reasons to Edit

- Weight was measured wrong by AI
- Customer paid different amount
- Need to correct typo
- Add missing notes

### How to Edit

1. **Find the order** in the list at the bottom
2. **Click the Edit (pencil) icon**
3. **Update the fields** you need to change
   - Revenue (EGP)
   - Weight (grams)
   - Notes

4. **Click "Save"**
5. Metrics update automatically

### Example

_AI calculated 200g but actual was 220g_

1. Find order in list
2. Click edit
3. Change weight from 200 to 220
4. Click save
5. Total filament used updates

---

## 🗑️ Removing Orders

### When to Delete

- Duplicate entry was added
- Order never actually completed
- Testing/development entry

### How to Delete

1. **Find the order** in the list
2. **Click the Delete (trash) icon**
3. **Confirm deletion** in popup
4. Order is removed from stats
5. Metrics recalculate

⚠️ **Note:** This marks orders as inactive (soft delete). They can be restored if needed.

---

## 📊 Reading the Charts

### Monthly Breakdown Example

```
January 2026:  EGP 2,500 revenue | 875 grams filament | 5 orders
February 2026: EGP 4,200 revenue | 1,250 grams filament | 8 orders
March 2026:    EGP 1,800 revenue | 625 grams filament | 3 orders
```

### What to Look For

- **Highest revenue month**: March (EGP 4,200)
- **Most filament used**: February (1,250g)
- **Most orders**: February (8 orders)
- **Average order value**: Varies by month

### Using for Planning

- Stock extra filament in busy months
- Hire extra help for peaks
- Schedule maintenance during slow periods
- Order materials based on trends

---

## 💡 Tips & Best Practices

### Order Code Naming

✅ **Good Examples**

- `ORD-001` - Simple sequential
- `MANUAL-2026-01-15` - Date-based
- `CUSTOM-PRINT-001` - Type-based
- `WS-2026-001` - WhatsApp orders

❌ **Avoid**

- Using same code twice
- Unclear naming: `test`, `order`, `print`
- Special characters

### Weight Tracking

✅ **Best Practice**

- Measure actual weight when possible
- Round to nearest 0.5g for consistency
- Add note if weight is estimate
- Update if actual differs from AI calculation

❌ **Avoid**

- Leaving as 0 without updating
- Rounding to nearest 5g (lose detail)
- Mixing units (grams vs kg)

### Revenue Accuracy

✅ **Include**

- Final customer price
- All fees and taxes
- Shipping (if customer paid)

❌ **Don't Include**

- Internal costs
- Refunds (delete order instead)
- Discounts not applied

---

## 🔍 Troubleshooting

### "Order Code Already Exists"

- Use a different code
- Check list for duplicates
- Add sequence: `ORD-001`, `ORD-002`

### Charts Show Wrong Data

- Check date format (YYYY-MM-DD)
- Verify values are positive numbers
- Refresh page (Ctrl+R)

### Numbers Don't Match

- Verify decimal places (.01, not .1)
- Check if order is marked completed
- Ensure is_active is true

### Can't Edit/Delete

- Verify you're logged in as admin
- Try refreshing page
- Check browser console (F12) for errors

---

## 📱 Mobile Tips

### Viewing on Phone

- Dashboard works on mobile
- Charts may be small
- Scroll horizontally for order table

### Adding Orders

- Use mobile number input
- Use date picker for dates
- Easier on larger screens

### Best Practice

- Use desktop for detailed work
- Use phone for quick checks
- Tables easier to view on desktop

---

## 🔒 Security Notes

### Access Control

- ✅ Only admins can see stats
- ✅ Each action tracked with timestamp
- ✅ Admin name recorded (created_by)
- ✅ Soft deletes for audit trail

### Data Protection

- ❌ Don't share stats publicly
- ❌ Don't add fake orders
- ❌ Don't change others' entries
- ✅ Use actual business data only

---

## 📈 Reporting

### Creating Reports

**Monthly Revenue Report**

1. Look at Revenue chart
2. Note highest/lowest months
3. Calculate averages
4. Screenshot or export data

**Production Analysis**

1. Check Filament chart
2. Identify trends
3. Plan inventory
4. Forecast future usage

**Customer Summary**

1. Look at order count
2. Review customer names
3. Identify repeat customers
4. Plan marketing

### Sharing Data

- Take screenshots of charts
- Export table data manually
- Share insights with team
- Use for business planning

---

## ⚡ Keyboard Shortcuts

| Action            | Desktop  | Mobile          |
| ----------------- | -------- | --------------- |
| Refresh page      | `Ctrl+R` | Pull to refresh |
| Open DevTools     | `F12`    | N/A             |
| Toggle fullscreen | `F11`    | Rotate phone    |

---

## 📞 Getting Help

### Common Questions

**Q: Order placed on site, why not in stats?**
A: It auto-appears when marked as "completed". Check Admin → Orders.

**Q: Can I undo a deletion?**
A: Contact admin with Supabase access. Soft deletes can be restored.

**Q: How often do charts update?**
A: Charts update instantly when you add/edit entries.

**Q: What's the "Order Type"?**
A: 'site' = auto-created from website | 'manual' = added by admin

---

## 🎓 Example Workflow

### Scenario: Customer orders via WhatsApp

1. **Receive order**
   - Name: Fatima Ahmed
   - Phone: +20 101 234 5678
   - Requirements: 5 parts, transparent resin
   - Price agreed: EGP 600

2. **Calculate weight**
   - Part 1: 45g
   - Part 2: 40g
   - Part 3: 50g
   - Part 4: 35g
   - Part 5: 35g
   - **Total: 205g**

3. **Add to stats**
   - Order Code: `WS-2026-01-15-001`
   - Date: 2026-01-15
   - Customer: Fatima Ahmed
   - Phone: +20 101 234 5678
   - Revenue: 600.00 EGP
   - Weight: 205 grams
   - Notes: 5 transparent resin parts via WhatsApp

4. **Verify**
   - Order appears in list
   - Total revenue increases
   - Filament usage updates
   - Charts refresh

---

## 📋 Monthly Checklist

- [ ] Review monthly revenue in stats
- [ ] Compare with previous months
- [ ] Check filament usage trends
- [ ] Plan inventory for next month
- [ ] Export data for reporting
- [ ] Update filament prices if needed
- [ ] Review average order value
- [ ] Plan hiring/scheduling

---

**Need more help?** Check `ADMIN_STATS_SETUP.md` for detailed documentation.

**Last Updated:** April 15, 2026
