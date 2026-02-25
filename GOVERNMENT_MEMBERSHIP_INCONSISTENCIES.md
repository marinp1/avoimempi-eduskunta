# GovernmentMembership Inconsistencies

Generated: 2026-02-25

This document lists person-level anomalies found in `GovernmentMembership` and related inferred `Government` periods.

## 1) Outlier Rows That Distort Inferred Government Periods

These rows extend a government's inferred range far beyond the rest of that same government's memberships.

| Person | Person ID | Government | Time Period | Notes |
|---|---:|---|---|---|
| Axel Palmgren | 911204 | Ingman | 1924-05-31 .. 1925-03-31 | Single row extends `Ingman` end date from the expected 1919 period to 1925. |
| Uuno Takki | 911587 | Paasikivi III | 1945-04-17 .. 1948-07-29 | Overlaps heavily with `Pekkala` rows for same person. |
| Juho Sunila | 911554 | Kallio II | 1925-12-31 .. 1928-12-13 | Overlaps heavily with `Sunila` row for same person. |

## 2) Strict Overlapping Memberships (Different Governments, Same Person)

These are true overlaps (more than a boundary day), where a person has memberships in two different governments during the same date range.

| Person | Person ID | Government A | Period A | Government B | Period B | Overlap Days |
|---|---:|---|---|---|---|---:|
| Uuno Takki | 911587 | Paasikivi III | 1945-04-17 .. 1948-07-29 | Pekkala | 1946-03-26 .. 1948-07-29 | 857 |
| Uuno Takki | 911587 | Paasikivi III | 1945-04-17 .. 1948-07-29 | Pekkala | 1946-03-27 .. 1948-07-29 | 856 |
| Juho Sunila | 911554 | Sunila | 1927-12-17 .. 1928-12-22 | Kallio II | 1925-12-31 .. 1928-12-13 | 363 |
| Ralf Törngren | 911668 | Kekkonen IV | 1952-07-09 .. 1953-11-16 | Kekkonen III | 1952-11-26 .. 1953-07-08 | 225 |
| Ralf Törngren | 911668 | Kekkonen III | 1951-09-20 .. 1952-11-25 | Kekkonen IV | 1952-07-09 .. 1953-11-16 | 140 |

## 3) Additional Suspicious Rows in Kekkonen III / Kekkonen IV Transition

These rows are labeled `Kekkonen III` even though they start after `Kekkonen IV` has already started.

| Person | Person ID | Government | Time Period | Role |
|---|---:|---|---|---|
| Emil Huunonen | 910539 | Kekkonen III | 1952-11-29 .. 1952-12-02 | kulkulaitosten ja yleisten töiden ministeri |
| Emil Huunonen | 910539 | Kekkonen III | 1952-12-03 .. 1953-07-08 | ministeri kulkulaitosten ja yleisten töiden ministeriössä |
| Eetu Karjalainen | 910688 | Kekkonen III | 1952-12-03 .. 1953-07-08 | kulkulaitosten ja yleisten töiden ministeri |
| Urho Kekkonen | 910708 | Kekkonen III | 1952-11-26 .. 1953-07-08 | ulkoasiainministeri |
| Väinö Leskinen | 910958 | Kekkonen III | 1952-11-26 .. 1953-07-08 | sosiaaliministeri |
| Ralf Törngren | 911668 | Kekkonen III | 1952-11-26 .. 1953-07-08 | ministeri ulkoasiainministeriössä |

## 4) Confirmed In Source Data (Not Introduced by SQL Layer)

The following cases are present already in parsed/raw input for MemberOfParliament source data:

- `911204` (Axel Palmgren): `Hallitus = Ingman`, period `31.05.1924 .. 31.03.1925`
- `911554` (Juho Sunila): overlapping `Hallitus = Sunila` and `Hallitus = Kallio II`
- `911587` (Uuno Takki): overlapping `Hallitus = Paasikivi III` and `Hallitus = Pekkala`
- `911668` (Ralf Törngren): overlapping `Hallitus = Kekkonen III` and `Hallitus = Kekkonen IV`
