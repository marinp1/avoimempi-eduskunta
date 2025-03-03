CREATE TABLE representatives (
    person_id INT PRIMARY KEY,
    firstname VARCHAR(255) NOT NULL,
    lastname VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    birth_year INT,
    birth_place VARCHAR(255),
    gender VARCHAR(50),
    home_municipality VARCHAR(255),
    profession VARCHAR(255),
    party VARCHAR(255),
    minister BOOLEAN DEFAULT FALSE
);

CREATE TABLE electoral_districts (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES representatives(person_id),
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL
);

CREATE TABLE representative_terms (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES representatives(person_id),
    start_date DATE NOT NULL,
    end_date DATE NULL
);

CREATE TABLE parliamentary_groups (
    identifier VARCHAR(255) PRIMARY KEY,
    group_name VARCHAR(255) NOT NULL
);

CREATE TABLE parliamentary_group_memberships (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES representatives(person_id),
    group_identifier VARCHAR(255) REFERENCES parliamentary_groups(identifier),
    start_date DATE NOT NULL,
    end_date DATE NULL
);

CREATE TABLE committees (
    identifier VARCHAR(255) PRIMARY KEY,
    committee_name VARCHAR(255) NOT NULL
);

CREATE TABLE committee_memberships (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES representatives(person_id),
    committee_identifier VARCHAR(255) REFERENCES committees(identifier),
    role VARCHAR(255) NULL,
    start_date DATE NULL,
    end_date DATE NULL
);

CREATE TABLE educations (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES representatives(person_id),
    name VARCHAR(255) NULL,
    establishement VARCHAR(255) NULL,
    year INT NULL
);

/*
CREATE TABLE declarations (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES representatives(person_id),
    declaration_type VARCHAR(255) NOT NULL,
    description TEXT
);
*/