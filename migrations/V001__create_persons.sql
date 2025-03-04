CREATE TABLE Representative (
    person_id INT PRIMARY KEY,
    last_name VARCHAR(100),
    first_name VARCHAR(100),
    sort_name VARCHAR(100),
    marticle_name VARCHAR(100),
    party VARCHAR(100),
    minister BOOLEAN,
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
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    name VARCHAR(255),
    institution VARCHAR(255),
    year INT
);

CREATE TABLE WorkHistory (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    position VARCHAR(255),
    period VARCHAR(50)
);

CREATE TABLE Committee (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE CommitteeMembership (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    committee_code VARCHAR(50) REFERENCES Committee(code),
    role VARCHAR(255),
    start_date DATE,
    end_date DATE
);

CREATE TABLE TrustPosition (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    position_type VARCHAR(50),
    name VARCHAR(255),
    period VARCHAR(50)
);

CREATE TABLE GovernmentMembership (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    name VARCHAR(255),
    ministry VARCHAR(255),
    government VARCHAR(255),
    start_date DATE,
    end_date DATE
);

CREATE TABLE Publications (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    title VARCHAR(255),
    year INT,
    authors TEXT
);

CREATE TABLE ParliamentaryGroup (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE ParliamentaryGroupMembership (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    group_code VARCHAR(50) REFERENCES ParliamentaryGroup(code),
    start_date DATE,
    end_date DATE
);

CREATE TABLE ParliamentaryGroupAssignment (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    group_code VARCHAR(50) REFERENCES ParliamentaryGroup(code),
    role VARCHAR(255),
    time_period VARCHAR(255),
    start_date DATE,
    end_date DATE
);

CREATE TABLE District (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255)
);

CREATE TABLE RepresentativeDistrict (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    district_code VARCHAR(50) REFERENCES District(code),
    start_date DATE,
    end_date DATE
);

CREATE TABLE Term (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    start_date DATE,
    end_date DATE
);

CREATE TABLE Interruption (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    description TEXT,
    replacement_person VARCHAR(50),
    start_date DATE,
    end_date DATE
);
