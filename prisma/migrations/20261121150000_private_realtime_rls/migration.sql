-- Private Realtime topics can only be joined by short-lived app-issued JWTs
-- whose custom claims are checked against the tenant/table topic.
DROP POLICY IF EXISTS "inforyse_restaurant_realtime_select" ON realtime.messages;
DROP POLICY IF EXISTS "inforyse_table_realtime_select" ON realtime.messages;

CREATE POLICY "inforyse_restaurant_realtime_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND split_part((SELECT realtime.topic()), ':', 1) = 'restaurant'
  AND split_part((SELECT realtime.topic()), ':', 2) = (SELECT auth.jwt() ->> 'restaurant_id')
);

CREATE POLICY "inforyse_table_realtime_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND split_part((SELECT realtime.topic()), ':', 1) = 'table'
  AND split_part((SELECT realtime.topic()), ':', 2) = (SELECT auth.jwt() ->> 'restaurant_id')
  AND split_part((SELECT realtime.topic()), ':', 3) = (SELECT auth.jwt() ->> 'table_id')
);
