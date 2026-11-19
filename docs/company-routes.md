# Company/project login routes

Edit `src/config/company-routes.ts` to enable a company and its project paths:

```ts
companyname: {
  enabled: true,
  name: 'Company Name',
  projects: ['project'],
  databaseName: 'compliance_companyname',
  createDatabaseIfMissing: true,
},
```

Start locally on port 3030 with `npm run dev -- --port 3030`, then open
`http://localhost:3030/companyname/project/login`.

- The first visit creates the configured database when missing and registers the company in the central registry.
- If the company is already registered, its existing database mapping takes priority over the config file.
- If the configured database already exists but has no registry entry, it is reused and registered.
- Set `createDatabaseIfMissing: false` to require a database that already contains a collection.
- Disabled/unconfigured company or project routes, inactive companies, and disallowed missing databases return 404.
- Existing users and data are preserved. A newly created database starts with an empty `users` collection; provision its first administrator account before signing in. No default password is created.
- After successful sign-in, the app uses its existing `/:company/dashboard` route and the company's registered database for authenticated API requests. Project paths are login aliases for this maintenance app, not separate project databases.

The existing `/:company/login` routes remain available. Disabling a config entry disables the new project login alias; suspend a company in the registry to disable all company access.

Configure `MONGODB_URI`, `REGISTRY_DB_NAME`, and `JWT_SECRET` in `.env.local` as usual. Restart after config edits; rebuild for production.
