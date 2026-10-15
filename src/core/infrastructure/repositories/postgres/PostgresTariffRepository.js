const { withTransaction } = require('../../../../infrastructure/db');

class PostgresTariffRepository {
  async findCurrentByHome({ userId, homeId, date }) {
    const result = await withTransaction(userId, (client) => client.query(
      `SELECT COALESCE(hr.rate_id, rr.reference_rate_id) AS rate_id,
              h.home_id,
              h.usage_type,
              h.tier,
              h.altitude_meters,
              COALESCE(hr.m3_value, rr.basic_m3_value) AS m3_value,
              COALESCE(hr.basic_m3_value, rr.basic_m3_value) AS basic_m3_value,
              COALESCE(hr.excess_m3_value, rr.excess_m3_value) AS excess_m3_value,
              COALESCE(hr.reference_consumption_m3, rr.reference_consumption_m3) AS reference_consumption_m3,
              COALESCE(hr.fixed_charge, 0) AS fixed_charge,
              COALESCE(hr.unit_sensor, rr.unit_sensor) AS unit_sensor,
              COALESCE(hr.unit_billing, rr.unit_billing) AS unit_billing,
              COALESCE(hr.rate_source, 'NATIONAL_FALLBACK') AS rate_source,
              COALESCE(hr.valid_from, rr.valid_from) AS valid_from,
              COALESCE(hr.valid_until, rr.valid_until) AS valid_until,
              CASE
                WHEN h.altitude_meters IS NULL OR h.altitude_meters < 1000 THEN 16.00
                WHEN h.altitude_meters <= 2000 THEN 13.00
                ELSE 11.00
              END AS basic_limit_m3
         FROM home.home h
         LEFT JOIN LATERAL (
             SELECT r.*
               FROM alert_rate.home_rate r
              WHERE r.home_id = h.home_id
                AND r.valid_from <= $2::date
                AND (r.valid_until IS NULL OR r.valid_until >= $2::date)
              ORDER BY r.valid_from DESC
              LIMIT 1
         ) hr ON TRUE
         LEFT JOIN LATERAL (
             SELECT r.*
               FROM alert_rate.reference_rate r
              WHERE r.usage_type = h.usage_type
                AND r.tier IS NOT DISTINCT FROM h.tier
                AND r.active = TRUE
                AND r.valid_from <= $2::date
                AND (r.valid_until IS NULL OR r.valid_until >= $2::date)
              ORDER BY r.valid_from DESC
              LIMIT 1
         ) rr ON TRUE
        WHERE h.home_id = $1::uuid
          AND (hr.rate_id IS NOT NULL OR rr.reference_rate_id IS NOT NULL)
        LIMIT 1`,
      [homeId, date]
    ));
    const row = result.rows[0];
    if (!row) return null;
    return {
      rateId: row.rate_id,
      homeId: row.home_id,
      usageType: row.usage_type,
      tier: row.tier === null ? null : Number(row.tier),
      m3Value: Number(row.m3_value),
      basicM3Value: Number(row.basic_m3_value),
      excessM3Value: Number(row.excess_m3_value),
      referenceConsumptionM3: Number(row.reference_consumption_m3),
      basicLimitM3: Number(row.basic_limit_m3),
      fixedCharge: Number(row.fixed_charge),
      rateSource: row.rate_source,
      unitSensor: row.unit_sensor,
      unitBilling: row.unit_billing,
      validFrom: row.valid_from,
      validUntil: row.valid_until
    };
  }
}

module.exports = { PostgresTariffRepository };
