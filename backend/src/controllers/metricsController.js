import pool from "../config/db.js";

export const getMetrics = async (_req, res) => {
  try {
    const [
      users,
      usersByType,
      listings,
      listingsByType,
      listingsByCategory,
      bookings,
      bookingsByStatus,
      bookingsByListingType,
      completedByListingType,
      cancelledByListingType,
      disputes,
      disputesByStatus,
      transactionVolume,
      listingsByLocation,
      bookingsByLocation,
    ] = await Promise.all([

      // 1. Total users
      pool.query(`SELECT COUNT(*) AS total FROM users`),

      // 2. Users by type
      pool.query(`SELECT account_type, COUNT(*) AS count FROM users GROUP BY account_type`),

      // 3. Listings (all time)
      pool.query(`SELECT COUNT(*) AS total FROM services`),

      // 4. Listings by type (offer / looking)
      pool.query(`SELECT type, COUNT(*) AS count FROM services GROUP BY type`),

      // 5. Listings by category (popularity order)
      pool.query(`
        SELECT category, COUNT(*) AS count
        FROM services
        WHERE category IS NOT NULL AND category != ''
        GROUP BY category
        ORDER BY count DESC
      `),

      // 6. Total bookings/requests
      pool.query(`SELECT COUNT(*) AS total FROM bookings`),

      // 7. Bookings by status
      pool.query(`SELECT status, COUNT(*) AS count FROM bookings GROUP BY status`),

      // 8. Bookings by listing type
      pool.query(`
        SELECT s.type AS listing_type, COUNT(*) AS count
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        GROUP BY s.type
      `),

      // 9. Completed bookings by listing type
      pool.query(`
        SELECT s.type AS listing_type, COUNT(*) AS count
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE b.status = 'completed'
        GROUP BY s.type
      `),

      // 10. Cancelled bookings by listing type
      pool.query(`
        SELECT s.type AS listing_type, COUNT(*) AS count
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE b.status = 'cancelled'
        GROUP BY s.type
      `),

      // 11. Total disputes
      pool.query(`SELECT COUNT(*) AS total FROM disputes`),

      // 12. Disputes by status
      pool.query(`SELECT status, COUNT(*) AS count FROM disputes GROUP BY status`),

      // 13. Transaction volume (total money moved + platform revenue)
      // debit = client payments, credit = worker earnings (net share of service price)
      // platform revenue = debit total - credit total (buyer commission + seller commission - taxes remitted)
      pool.query(`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0)  AS total_transacted,
          COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS total_paid_out,
          COALESCE(SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0) AS total_revenue
        FROM transactions
      `),

      // 14. Listings by location (top locations)
      pool.query(`
        SELECT location, COUNT(*) AS listing_count
        FROM services
        WHERE location IS NOT NULL AND location != ''
        GROUP BY location
        ORDER BY listing_count DESC
        LIMIT 20
      `),

      // 15. Bookings by location of service
      pool.query(`
        SELECT s.location, COUNT(*) AS booking_count
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE s.location IS NOT NULL AND s.location != ''
        GROUP BY s.location
        ORDER BY booking_count DESC
        LIMIT 20
      `),
    ]);

    res.json({
      users: {
        total: parseInt(users.rows[0].total),
        by_type: usersByType.rows,
      },
      listings: {
        total: parseInt(listings.rows[0].total),
        by_type: listingsByType.rows,
        by_category: listingsByCategory.rows,
        by_location: listingsByLocation.rows,
      },
      bookings: {
        total: parseInt(bookings.rows[0].total),
        by_status: bookingsByStatus.rows,
        by_listing_type: bookingsByListingType.rows,
        completed_by_listing_type: completedByListingType.rows,
        cancelled_by_listing_type: cancelledByListingType.rows,
      },
      disputes: {
        total: parseInt(disputes.rows[0].total),
        by_status: disputesByStatus.rows,
      },
      financials: transactionVolume.rows[0],
      locations: {
        listings: listingsByLocation.rows,
        bookings: bookingsByLocation.rows,
      },
    });
  } catch (err) {
    console.error("Metrics error:", err);
    res.status(500).json({ message: "Server error fetching metrics" });
  }
};
