# Durgamma Temple Finance Dashboard

Responsive UI for temple finance management.

## UI requirements implemented
- Temple photo hero
- Income, Expenditure and Total Aggregation cards
- Income-only transaction view
- Expenditure-only transaction view
- Combined day-wise transaction view
- Running balance
- Date filters
- Responsive mobile layout
- Admin-only Add/Edit controls in the UI
- Visitor read-only presentation

## Production architecture
This repository currently contains the **front-end prototype**. The login and transaction changes are intentionally not presented as secure authentication: browser-only JavaScript cannot enforce admin permissions for a shared public website.

For production, connect this UI to Supabase (or another backend):
- Auth: admin email/password or magic link
- Database: transactions table
- Public visitors: SELECT only
- Admin: INSERT/UPDATE/DELETE through database policies
- Row Level Security: enabled
- Never put an admin password or database secret in frontend code

Recommended transaction columns:
id, transaction_date, type, description, category, payment_method, amount, created_at, created_by.
