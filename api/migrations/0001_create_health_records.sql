-- Migration number: 0001 	 2026-07-10T04:24:44.970Z

CREATE TABLE health_records (
  date TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  PRIMARY KEY (date, metric)
);
