# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## API notes (admin)

- `GET /v1/attendance` includes `peakHours` (24 hourly buckets) and `busiestHour`.
- `GET /v1/dashboard` includes `busiestHour` from weekly check-ins.
- `GET /v1/payments/export?from=&to=&method=` returns a UTF-8 CSV attachment (admin only).
