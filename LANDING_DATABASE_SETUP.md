# Landing database setup

Landing pages and templates use `LANDING_DATABASE_URL`. Users, links, offers, authentication, and click analytics continue to use `DATABASE_URL`.

## Environment

Set `LANDING_DATABASE_URL` in the local and production environments. Keep the connection string private and use a pooled connection URL where the provider supports it.

## Initialize and migrate

Initialize or update the landing database schema before deploying:

```powershell
npm run db:landing:generate
npm run db:landing:push
npm run db:landing:migrate
```

The Vercel build generates the landing Prisma client but does not connect to or modify the landing database. Ensure `LANDING_DATABASE_URL` points to a reachable database and run `db:landing:push` separately when initializing or changing its schema.

`db:landing:migrate` copies existing templates and landing pages while preserving IDs, subdomains, publication state, counters, and timestamps. It is safe to run again because it uses upserts.

The migration reads source records from `DATABASE_URL` and writes them to `LANDING_DATABASE_URL`. Run it once against the production source before switching production traffic, then verify a published subdomain and the builder before removing the old landing records.

Landing-page `userId` and `trackingUrl` values remain references to the primary application. Authentication, custom-domain validation, links, and offers continue to use the primary database.
