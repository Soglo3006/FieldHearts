let schemaReady = false;
let schemaInitPromise = null;

export async function ensureListingVisibilitySchema(pool) {
  if (schemaReady) return;
  if (!schemaInitPromise) {
    schemaInitPromise = pool
      .query(`
        ALTER TABLE services ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
        CREATE INDEX IF NOT EXISTS idx_services_is_public ON services (is_public) WHERE is_public = true;
      `)
      .then(() => {
        schemaReady = true;
      });
  }
  await schemaInitPromise;
}

/** SQL fragment: only publicly listed services (requires is_public column). */
export function publicListingFilter(alias = "s") {
  return `AND COALESCE(${alias}.is_public, true) = true`;
}

export function parseIsPublic(value) {
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return true;
}

export async function userHasActivePaidBooking(pool, serviceId, userId) {
  if (!userId || !serviceId) return false;
  const result = await pool.query(
    `SELECT 1 FROM bookings b
     WHERE b.service_id = $1
       AND (b.client_id = $2 OR b.worker_id = $2)
       AND b.status = 'active'
       AND b.payment_status IN ('deposit_paid', 'paid')
     LIMIT 1`,
    [serviceId, userId],
  );
  return result.rows.length > 0;
}

export async function canViewService(pool, service, viewerId) {
  if (service.is_public !== false) return true;
  if (viewerId && String(service.user_id) === String(viewerId)) return true;
  if (viewerId && (await userHasActivePaidBooking(pool, service.id, viewerId))) return true;
  return false;
}
