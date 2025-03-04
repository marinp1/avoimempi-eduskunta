# Avoimempi Eduskunta (More Open Parliament)

Aggregate data from multiple open sources for analysis.

## Requirements

- **bun** v1.2.2
- **podman** or **docker**

## Project structure

```txt
# migration files
migrations/
└── *.sql
modules/
│ # common constants and utils
├── common/
│   ├── constants/
│   └── typings/
│ # code to fetch raw data
├── scraper/
│   ├── data/
│   │   └── <TableName>/
│   │       └── page-*.json
│   ├── fn/
│   │   └── <TableName>.mts
│   └── scrape-table.mts
│ # code to import parsed data
├── migrator/
│   ├── <TableName>/
│   │   ├── migrator.mts
│   │   ├── DataModel.mts
│   │   ├── SQLModel.mts
│   │   └── schema.json
│   └── import-data.mts
│ # code to parse fetched raw data
├── parser/
│   ├── data/
│   │   └── <TableName>/
│   │       └── *.json
│   ├── fn/
│   │   └── <TableName>.mts
│   └── parse-data.mts
│ # other random scripts and transformation files
└── scripts/
```

## Data import status

Status of data import.

| source | name                    | description                             | status    | info            |
| ------ | ----------------------- | --------------------------------------- | --------- | --------------- |
| API    | Attachment              | TBD                                     | unstarted |
| API    | AttachmentGroup         | TBD                                     | unstarted |
| API    | HetekaData              | TBD                                     | unstarted |
| API    | MemberOfParliament      | Representatives and their related data. | imported  | partial support |
| API    | PrimaryKeys             | TBD                                     | unstarted |
| API    | SaliDBAanestys          | Voting sessions in parliament.          | parsed    |
| API    | SaliDBAanestysAsiakirja | TBD                                     | unstarted |
| API    | SaliDBAanestysEdustaja  | Votes by representatives.               | parsed    |
| API    | SaliDBAanestysJakauma   | TBD                                     | unstarted |
| API    | SaliDBAanestysKieli     | TBD                                     | unstarted |
| API    | SaliDBIstunto           | TBD                                     | unstarted |
| API    | SaliDBKohta             | TBD                                     | unstarted |
| API    | SaliDBKohtaAanestys     | TBD                                     | unstarted |
| API    | SaliDBKohtaAsiakirja    | TBD                                     | unstarted |
| API    | SaliDBMessageLog        | TBD                                     | unstarted |
| API    | SaliDBPuheenvuoro       | TBD                                     | unstarted |
| API    | SaliDBTiedote           | TBD                                     | unstarted |
| API    | SeatingOfParliament     | TBD                                     | unstarted |
| API    | VaskiData               | TBD                                     | unstarted |

## Database ER diagram

The imported data is transformed into the the following tables.

```mermaid
erDiagram
    Representative {
        INT person_id PK
        VARCHAR(100) last_name
        VARCHAR(100) first_name
        VARCHAR(100) sort_name
        VARCHAR(100) marticle_name
        VARCHAR(100) party
        BOOLEAN minister
        VARCHAR(50) phone
        VARCHAR(100) email
        VARCHAR(100) current_municipality
        VARCHAR(100) profession
        TEXT website
        TEXT additional_info
        DATE birth_date
        VARCHAR(100) birth_place
        DATE death_date
        VARCHAR(100) death_place
        VARCHAR(16) gender
        DATE term_end_date
    }

    Education {
        INT id PK
        INT person_id FK
        VARCHAR(255) name
        VARCHAR(255) institution
        INT year
    }

    WorkHistory {
        INT id PK
        INT person_id FK
        VARCHAR(255) position
        VARCHAR(50) period
    }

    Committee {
        VARCHAR(50) code PK
        VARCHAR(255) name
    }

    CommitteeMembership {
        INT id PK
        INT person_id FK
        VARCHAR(50) committee_code FK
        VARCHAR(255) role
        DATE start_date
        DATE end_date
    }

    TrustPosition {
        INT id PK
        INT person_id FK
        VARCHAR(50) position_type
        VARCHAR(255) name
        VARCHAR(50) period
    }

    GovernmentMembership {
        INT id PK
        INT person_id FK
        VARCHAR(255) name
        VARCHAR(255) ministry
        VARCHAR(255) government
        DATE start_date
        DATE end_date
    }

    Publications {
        INT id PK
        INT person_id FK
        VARCHAR(255) title
        INT year
        TEXT authors
    }

    ParliamentaryGroup {
        VARCHAR(50) code PK
        VARCHAR(255) name
    }

    ParliamentaryGroupMembership {
        INT id PK
        INT person_id FK
        VARCHAR(50) group_code FK
        DATE start_date
        DATE end_date
    }

    ParliamentaryGroupAssignment {
        INT id PK
        INT person_id FK
        VARCHAR(50) group_code FK
        VARCHAR(255) role
        VARCHAR(255) time_period
        DATE start_date
        DATE end_date
    }

    District {
        INT id PK
        VARCHAR(50) code
        VARCHAR(255) name
    }

    RepresentativeDistrict {
        INT id PK
        INT person_id FK
        VARCHAR(50) district_code FK
        DATE start_date
        DATE end_date
    }

    Term {
        INT id PK
        INT person_id FK
        DATE start_date
        DATE end_date
    }

    Interruption {
        INT id PK
        INT person_id FK
        TEXT description
        VARCHAR(50) replacement_person
        DATE start_date
        DATE end_date
    }

    Representative ||--o{ Education : has
    Representative ||--o{ WorkHistory : has
    Representative ||--o{ CommitteeMembership : has
    Committee ||--o{ CommitteeMembership : has
    Representative ||--o{ TrustPosition : has
    Representative ||--o{ GovernmentMembership : has
    Representative ||--o{ Publications : has
    Representative ||--o{ ParliamentaryGroupMembership : has
    ParliamentaryGroup ||--o{ ParliamentaryGroupMembership : has
    Representative ||--o{ ParliamentaryGroupAssignment : has
    ParliamentaryGroup ||--o{ ParliamentaryGroupAssignment : has
    Representative ||--o{ RepresentativeDistrict : has
    District ||--o{ RepresentativeDistrict : has
    Representative ||--o{ Term : has
    Representative ||--o{ Interruption : has
```
