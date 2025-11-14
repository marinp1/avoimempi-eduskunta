# Temporal Statistics Exploration Report

## Overview
This report documents the current state of the codebase regarding insights/statistics displays and the available data structure for implementing temporal statistics (gender division and age over time).

---

## 1. Current Insights & Statistics Display

### Location
- **Frontend**: `/packages/client/Insights/` directory
- **Backend API**: `/packages/server/index.ts` with insights endpoints

### Current Implementation

#### Insights Dashboard (`/insights` route)
**File**: `packages/client/Insights/index.tsx`

The main insights page displays:
- Header card with "Eduskunnan analytiikka" (Parliament Analytics)
- Four feature cards:
  1. **Äänestystrendit** (Voting Trends) - Placeholder, coming soon
  2. **Puolueiden suorituskyky** (Party Performance) - Placeholder, coming soon
  3. **Istuntotilastot** (Session Statistics) - Placeholder, coming soon
  4. **Äänestysosallistuminen** (Voting Participation) - **ACTIVE** ✓

#### Active Feature: Voting Participation (`Osallistumisaktiivisuus`)
**Location**: `packages/client/Insights/Osallistumisaktiivisuus/`

**Components**:
- `index.tsx` - Main panel with date filters (startDate, endDate)
- `ParticipationTable.tsx` - Sortable table showing:
  - Representative name
  - Votes cast
  - Total votings
  - Participation rate (percentage)
  - Ranking by participation
- `HistoricalComparison.tsx` - Details view showing:
  - Participation rates by government period
  - Government role (Minister/Coalition/Opposition)
  - Trend indicators (up/down/flat)
  - Filtering by date range

**Key Features**:
- Interactive drawer that opens from right side
- Statistics cards showing:
  - Total representatives
  - Average participation
  - Highest/lowest participation
- Real-time sorting by: participation_rate, votes_cast, sort_name
- Date range filtering

---

## 2. Backend API Endpoints

### Insights Endpoints

#### 1. `/api/insights/participation` (GET)
**Query Parameters**: `startDate?`, `endDate?`

**Response Structure**:
```typescript
interface ParticipationData {
  person_id: number;
  first_name: string;
  last_name: string;
  sort_name: string;
  votes_cast: number;
  total_votings: number;
  participation_rate: number;
}
```

**Query Source**: `queries.votingParticipation` SQL

#### 2. `/api/insights/participation/:personId/by-government` (GET)
**Query Parameters**: `startDate?`, `endDate?`

**Response Structure**:
```typescript
interface ParticipationByGovernmentData {
  person_id: number;
  first_name: string;
  last_name: string;
  sort_name: string;
  government: string;
  government_start: string;
  government_end: string | null;
  votes_cast: number;
  total_votings: number;
  participation_rate: number;
  was_in_government: 0 | 1;
  was_in_coalition: 0 | 1;
}
```

**Query Source**: `queries.votingParticipationByGovernment` SQL

---

## 3. Database Schema - Temporal Fields Available

### Representative Table
**File**: `packages/datapipe/migrator/migrations/V001.001__representatives_schema.sql`

```sql
CREATE TABLE Representative (
    person_id INTEGER PRIMARY KEY,
    last_name VARCHAR(100),
    first_name VARCHAR(100),
    sort_name VARCHAR(100),
    gender VARCHAR(16),              -- ✓ GENDER FIELD
    birth_date DATE,                 -- ✓ BIRTH DATE (age calculation)
    birth_place VARCHAR(100),
    death_date DATE,                 -- ✓ DEATH DATE
    death_place VARCHAR(100),
    term_end_date DATE,              -- ✓ TERM END DATE
    -- ... other fields
);
```

**Temporal Fields Available**:
1. `gender` - For gender division statistics
2. `birth_date` - For calculating age/age groups over time
3. `death_date` - For filtering living vs. deceased members
4. `term_end_date` - For identifying current vs. historical members

### Term Table
Tracks parliamentary terms with temporal boundaries:
```sql
CREATE TABLE Term (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    start_date DATE,                 -- ✓ TERM START
    end_date DATE,                   -- ✓ TERM END
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);
```

### ParliamentaryGroupMembership Table
Tracks party/group membership over time:
```sql
CREATE TABLE ParliamentaryGroupMembership (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    group_code VARCHAR(50),
    group_name VARCHAR(255),
    start_date DATE,                 -- ✓ MEMBERSHIP START
    end_date DATE,                   -- ✓ MEMBERSHIP END
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);
```

### GovernmentMembership Table
Tracks government positions with temporal info:
```sql
CREATE TABLE GovernmentMembership (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    name VARCHAR(255),
    ministry VARCHAR(255),
    government VARCHAR(255),        -- ✓ GOVERNMENT PERIOD
    start_date DATE,                -- ✓ POSITION START
    end_date DATE,                  -- ✓ POSITION END
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);
```

### Session Table
Voting sessions with temporal data:
```sql
CREATE TABLE Session (
    id INTEGER PRIMARY KEY,
    date TEXT,                       -- ✓ SESSION DATE
    year INTEGER,                    -- ✓ SESSION YEAR
    start_time_actual TEXT,
    start_time_reported TEXT,
    -- ... other fields
);
```

### Vote Table
Individual votes with timing:
```sql
CREATE TABLE Vote (
    id INTEGER PRIMARY KEY,
    voting_id INTEGER,
    person_id INTEGER,
    vote VARCHAR(20),
    -- ... other fields
    FOREIGN KEY (voting_id) REFERENCES Voting(id),
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);
```

### Voting Table
Voting sessions with temporal info:
```sql
CREATE TABLE Voting (
    id INTEGER PRIMARY KEY,
    start_time DATETIME,             -- ✓ VOTING TIME
    -- ... other fields
);
```

---

## 4. Related Tables for Temporal Analysis

### RepresentativeDistrict Table
```sql
CREATE TABLE RepresentativeDistrict (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    district_code VARCHAR(50),
    start_date DATE,                 -- ✓ DISTRICT ASSIGNMENT START
    end_date DATE,                   -- ✓ DISTRICT ASSIGNMENT END
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);
```

### CommitteeMembership Table
```sql
CREATE TABLE CommitteeMembership (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    committee_code VARCHAR(50),
    start_date DATE,                 -- ✓ COMMITTEE MEMBERSHIP START
    end_date DATE,                   -- ✓ COMMITTEE MEMBERSHIP END
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);
```

### TemporaryAbsence Table
```sql
CREATE TABLE TemporaryAbsence (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    start_date DATE,                 -- ✓ ABSENCE START
    end_date DATE,                   -- ✓ ABSENCE END
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);
```

---

## 5. Charting Libraries

### Current Status
**NO charting library is currently in use** in the project.

**Confirmed via package.json inspection**:
- No `recharts`, `victory`, `plotly`, `d3`, `chart.js`, or similar packages
- Only visualization: MUI Tables, Chips, and basic Emotion styling

**Dependencies Found** (relevant to UI):
```json
{
  "@emotion/react": "11.14.0",
  "@emotion/styled": "11.14.1",
  "@mui/icons-material": "7.3.4",
  "@mui/material": "7.3.4",
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```

**Implications**:
- Charts will need to be implemented with a new charting library
- Popular options: Recharts (React-based, easy), D3.js (powerful but complex), Chart.js
- OR: Custom SVG/Canvas visualizations using React

---

## 6. Data Access Pattern

### Query Execution Flow
1. **Frontend**: Component calls `/api/insights/...`
2. **Backend Route Handler** (`packages/server/index.ts`):
   - Parses query parameters
   - Calls `DatabaseConnection` method
3. **Database Connection** (`packages/server/database/db.ts`):
   - Prepares parameterized SQL query
   - Executes with Bun SQLite
   - Returns typed results
4. **Response**: JSON data back to frontend

### Example Data Fetching Pattern
```typescript
// Frontend - Osallistumisaktiivisuus/index.tsx
const response = await fetch(`/api/insights/participation?${params.toString()}`);
const result = await response.json(); // Returns ParticipationData[]

// Backend - index.ts
"/api/insights/participation": {
  GET: async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const participation = await db.fetchVotingParticipation({
      startDate,
      endDate,
    });
    return new Response(JSON.stringify(participation), { ... });
  },
},

// Database - db.ts
public async fetchVotingParticipation(params?: {
  startDate?: string;
  endDate?: string;
}) {
  const stmt = this.db.prepare<...>(queries.votingParticipation);
  const data = stmt.all({
    $startDate: params?.startDate || "",
    $endDate: params?.endDate || "",
  });
  return data;
}
```

---

## 7. Temporal Statistics Implementation Requirements

### Gender Division Over Time

**Data Available**:
- `Representative.gender` - Gender code
- `ParliamentaryGroupMembership.start_date/end_date` - Party membership periods
- `Term.start_date/end_date` - Parliamentary terms
- `Session.date` - Session dates for time-based filtering

**SQL Strategy**:
```sql
-- Example: Gender composition by date
SELECT
    DATE(vt.start_time) as period,
    r.gender,
    COUNT(DISTINCT r.person_id) as count
FROM Vote v
JOIN Representative r ON v.person_id = r.person_id
JOIN Voting vt ON v.voting_id = vt.id
WHERE r.gender IS NOT NULL
  AND (CAST($startDate AS TEXT) = '' OR DATE(vt.start_time) >= $startDate)
  AND (CAST($endDate AS TEXT) = '' OR DATE(vt.start_time) <= $endDate)
GROUP BY DATE(vt.start_time), r.gender
ORDER BY period DESC, r.gender;
```

**Alternative: By Parliamentary Term**:
```sql
SELECT
    r.gender,
    t.start_date,
    t.end_date,
    COUNT(DISTINCT r.person_id) as count
FROM Representative r
JOIN Term t ON r.person_id = t.person_id
WHERE r.gender IS NOT NULL
GROUP BY t.id, r.gender
ORDER BY t.start_date DESC;
```

### Age Distribution Over Time

**Data Available**:
- `Representative.birth_date` - For calculating current age
- `Representative.death_date` - For excluding deceased members
- `Term.start_date/end_date` - Terms to analyze
- `ParliamentaryGroupMembership.start_date/end_date` - Group membership

**SQL Strategy**:
```sql
-- Example: Age groups by date
SELECT
    DATE(vt.start_time) as period,
    CASE
        WHEN CAST((julianday(DATE(vt.start_time)) - julianday(r.birth_date))/365.25 AS INTEGER) < 30 THEN '20-29'
        WHEN CAST((julianday(DATE(vt.start_time)) - julianday(r.birth_date))/365.25 AS INTEGER) < 40 THEN '30-39'
        WHEN CAST((julianday(DATE(vt.start_time)) - julianday(r.birth_date))/365.25 AS INTEGER) < 50 THEN '40-49'
        WHEN CAST((julianday(DATE(vt.start_time)) - julianday(r.birth_date))/365.25 AS INTEGER) < 60 THEN '50-59'
        ELSE '60+'
    END as age_group,
    COUNT(DISTINCT r.person_id) as count
FROM Vote v
JOIN Representative r ON v.person_id = r.person_id
JOIN Voting vt ON v.voting_id = vt.id
WHERE r.birth_date IS NOT NULL
  AND (r.death_date IS NULL OR DATE(vt.start_time) <= r.death_date)
GROUP BY DATE(vt.start_time), age_group
ORDER BY period DESC, age_group;
```

---

## 8. Component Architecture for Temporal Statistics

### Proposed Structure

```
packages/client/Insights/
├── index.tsx                          (Main hub)
├── Osallistumisaktiivisuus/          (Existing - Voting Participation)
├── GenderDivision/                   (NEW - Gender Statistics)
│   ├── index.tsx                     (Main panel)
│   ├── GenderChart.tsx               (Chart visualization)
│   ├── GenderTable.tsx               (Table view)
│   └── types.ts
├── AgeDistribution/                  (NEW - Age Statistics)
│   ├── index.tsx                     (Main panel)
│   ├── AgeChart.tsx                  (Chart visualization)
│   ├── AgeTable.tsx                  (Table view)
│   └── types.ts
└── common/
    ├── DateRangeFilter.tsx           (Shared date filter)
    └── types.ts                      (Shared types)
```

### API Endpoints to Create

```typescript
// New backend endpoints needed:
"/api/insights/gender-division": {
  GET: async (req: Request) => {
    // Returns gender composition data by date/term
  }
}

"/api/insights/age-distribution": {
  GET: async (req: Request) => {
    // Returns age group distribution by date/term
  }
}

"/api/insights/composition-trend": {
  GET: async (req: Request) => {
    // Returns historical parliament composition trends
  }
}
```

---

## 9. Implementation Considerations

### Database Queries
- Existing `queries.ts` has good examples of complex temporal queries
- `votingParticipationByGovernment` shows how to handle date ranges and aggregation
- Use similar patterns with date parameter handling: `CAST($date AS TEXT) = '' OR DATE(...) >= $date`

### Frontend Patterns
- Use Material-UI Grid for layout (consistent with existing code)
- Implement date filters similar to `Osallistumisaktiivisuus`
- Use Chips for gender/age group display
- Consider adding a charting library (Recharts is lightweight and React-friendly)

### Performance Notes
- Complex temporal queries on Vote/Voting tables may be slow with large datasets
- Consider adding SQLite indexes on `birth_date`, `gender`, `start_date`, `end_date`
- Implement pagination or aggregation by time periods (weekly/monthly/yearly)

### Type Safety
- Define TypeScript interfaces for new endpoints
- Use discriminated unions for multi-series chart data
- Example:
```typescript
interface GenderDivisionData {
  period: string;
  gender: 'M' | 'F' | 'N';
  count: number;
  percentage: number;
}

interface AgeDistributionData {
  period: string;
  ageGroup: '20-29' | '30-39' | '40-49' | '50-59' | '60+';
  count: number;
  percentage: number;
  averageAge?: number;
}
```

---

## 10. Related Existing Code References

### SQL Query Pattern (from queries.ts)
```typescript
export const votingParticipationByGovernment = sql`
  WITH GovernmentPeriods AS (
    SELECT DISTINCT
      government,
      MIN(start_date) AS government_start,
      MAX(CASE WHEN end_date = '' THEN NULL ELSE end_date END) AS government_end
    FROM GovernmentMembership
    GROUP BY government
  ),
  -- Complex multi-stage query with CTEs
  ...
`;
```

### Frontend Pattern (from Osallistumisaktiivisuus/index.tsx)
```typescript
// Date filtering
const [startDate, setStartDate] = useState<string>("");
const [endDate, setEndDate] = useState<string>("");

// Data fetching
useEffect(() => {
  const fetchData = async () => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const response = await fetch(`/api/insights/...?${params.toString()}`);
    const result = await response.json();
    setData(result);
  };
  fetchData();
}, [startDate, endDate]);
```

### Component Pattern (from HistoricalComparison.tsx)
```typescript
// Card-based layout
<GlassCard>
  <Box sx={{ p: spacing.md }}>
    <Typography variant="h6" fontWeight={600}>
      {title}
    </Typography>
    {/* Content */}
  </Box>
</GlassCard>

// Color coding
const getColor = (rate: number): string => {
  if (rate >= 90) return colors.success;
  if (rate >= 70) return colors.warning;
  return colors.error;
};
```

---

## 11. Summary

### Data Availability ✓
- **Gender field**: Available in Representative table
- **Age field**: Birth dates available, ages calculable
- **Temporal boundaries**: Terms, memberships, positions, votes all have dates
- **Voting data**: Complete voting records linked to representatives

### Frontend Framework ✓
- Material-UI and Emotion styling in place
- Consistent design patterns established
- Drawer/modal component architecture proven

### Backend Infrastructure ✓
- Database connection layer established
- Parameterized query patterns proven
- API endpoint routing in place

### Missing Components
- **Charting library**: Need to add (recommend Recharts)
- **SQL queries**: Need to write for gender/age statistics
- **API endpoints**: Need to create for new statistics
- **React components**: Need to build visualization components

### Recommended Next Steps
1. Add Recharts to package.json
2. Create SQL queries for gender and age statistics
3. Add API endpoints to `/packages/server/index.ts`
4. Add database methods to `DatabaseConnection` class
5. Build React components for visualizations
6. Integrate into insights dashboard
