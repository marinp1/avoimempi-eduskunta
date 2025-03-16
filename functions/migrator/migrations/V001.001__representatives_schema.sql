CREATE TABLE Representative (
    person_id INTEGER PRIMARY KEY,
    last_name VARCHAR(100),
    first_name VARCHAR(100),
    sort_name VARCHAR(100),
    marticle_name VARCHAR(100),
    party VARCHAR(100),
    minister INTEGER,
    phone VARCHAR(50) NULL,
    email VARCHAR(100) NULL,
    current_municipality VARCHAR(100) NULL,
    profession VARCHAR(100),
    website TEXT,
    additional_info TEXT,
    birth_date DATE,
    birth_place VARCHAR(100),
    death_date DATE,
    death_place VARCHAR(100),
    gender VARCHAR(16),
    term_end_date DATE
);

CREATE TABLE Education (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    name VARCHAR(255),
    institution VARCHAR(255),
    year INTEGER,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE WorkHistory (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    position VARCHAR(255),
    period VARCHAR(50),
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE Committee (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE CommitteeMembership (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    committee_code VARCHAR(50),
    role VARCHAR(255),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id),
    FOREIGN KEY (committee_code) REFERENCES Committee(code)
);

CREATE TABLE TrustPosition (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    position_type VARCHAR(50),
    name VARCHAR(255),
    period VARCHAR(50),
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE GovernmentMembership (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    name VARCHAR(255),
    ministry VARCHAR(255),
    government VARCHAR(255),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE Publications (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    title VARCHAR(255),
    year INTEGER,
    authors TEXT,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE ParliamentaryGroup (
    code VARCHAR(50) PRIMARY KEY
);

CREATE TABLE ParliamentaryGroupMembership (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    group_code VARCHAR(50),
    group_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id),
    FOREIGN KEY (group_code) REFERENCES ParliamentaryGroup(code)
);

CREATE TABLE ParliamentaryGroupAssignment (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    group_code VARCHAR(50),
    group_name VARCHAR(255),
    role VARCHAR(255),
    time_period VARCHAR(255),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id),
    FOREIGN KEY (group_code) REFERENCES ParliamentaryGroup(code)
);

CREATE TABLE District (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255)
);

CREATE TABLE RepresentativeDistrict (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    district_code VARCHAR(50),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id),
    FOREIGN KEY (district_code) REFERENCES District(code)
);

CREATE TABLE Term (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE PeopleLeavingParliament (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    description TEXT,
    replacement_person VARCHAR(50),
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE PeopleJoiningParliament (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    description TEXT,
    replacement_person VARCHAR(50),
    start_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE TemporaryAbsence (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    description TEXT,
    replacement_person VARCHAR(50),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);
