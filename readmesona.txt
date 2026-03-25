IWant2Network EMS — How to Run
================================

OPTION A: Docker (Recommended)
--------------------------------
Runs the app, PostgreSQL, and Redis all in containers.

1. Generate secrets and fill in .env.local:

   NEXTAUTH_SECRET=$(openssl rand -base64 32)
   ENCRYPTION_KEY=$(openssl rand -hex 32)

   Edit .env.local and paste in the values for NEXTAUTH_SECRET and ENCRYPTION_KEY.

2. Start all containers:

   docker compose up --build

3. In a second terminal, run database migrations:

   docker compose exec app npx prisma migrate dev

4. Open http://localhost:3000


OPTION B: Local Dev (Faster Iteration)
----------------------------------------
Requires PostgreSQL 16 and Redis 7 running locally.

1. Make sure PostgreSQL is running with:
   - DB name: ems
   - User: ems
   - Password: password
   - Port: 5432

   Or update DATABASE_URL in .env.local to match your local setup.

2. Make sure Redis is running on localhost:6379.
   Or update REDIS_URL in .env.local.

3. Fill in .env.local secrets (same as Option A step 1).

4. Install dependencies:

   npm install

5. Run database migrations:

   npx prisma migrate dev

6. Start the dev server:

   npm run dev

7. Open http://localhost:3000


ENVIRONMENT VARIABLES (.env.local)
------------------------------------
DATABASE_URL      - PostgreSQL connection string
NEXTAUTH_SECRET   - Random secret for NextAuth session signing (required)
NEXTAUTH_URL      - App URL, e.g. http://localhost:3000
GOOGLE_CLIENT_ID  - (Optional) Google SSO client ID
GOOGLE_CLIENT_SECRET - (Optional) Google SSO client secret
ENCRYPTION_KEY    - 32-byte hex string for encrypting integration credentials (required)
REDIS_URL         - Redis connection string
NEXT_PUBLIC_APP_URL - Public app URL
ADMIN_EMAIL       - Email address for system notifications (Lizzy's email)

NOTE: All integration API keys (SMTP2GO, Keap, Eventbrite, Xero, Microsoft Graph,
Claude, OpenAI) are stored encrypted in the database — NOT in .env files.
Configure them through Settings > Integrations in the admin UI after first login.


USEFUL COMMANDS
----------------
npm run dev        - Start development server with hot reload
npm run build      - Build for production
npm run start      - Start production server
npx prisma studio  - Open Prisma database browser (local only)
npx prisma migrate dev   - Apply pending migrations
docker compose up --build  - Start all Docker services
docker compose down        - Stop all Docker services
docker compose down -v     - Stop and delete all data volumes (destructive)
