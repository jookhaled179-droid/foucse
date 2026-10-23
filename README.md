# FOUCSE Store v4

Data-driven Node/Express store with JSON database (no native SQLite dependency), checkout, stock management and admin dashboard.

## Run on Windows
1. Open this folder in Terminal.
2. Run `npm install`
3. Run `npm start`
4. Store: http://localhost:3000
5. Admin: http://localhost:3000/admin/login.html

Default admin:
- username: admin
- password: ChangeMe123!

Change the password in `data/db.json` before publishing.

The store data is in `data/db.json`. Orders and stock changes are persisted there.
