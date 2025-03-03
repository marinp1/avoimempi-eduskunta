CREATE TABLE representatives (
    person_id SERIAL PRIMARY KEY,
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
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES representatives(person_id),
    group_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL
);

CREATE TABLE committee_memberships (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES representatives(person_id),
    committee_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL
);

CREATE TABLE declarations (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES representatives(person_id),
    declaration_type VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE incomes (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES representatives(person_id),
    source VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2),
    income_year INT
);

CREATE TABLE gifts (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES representatives(person_id),
    giver VARCHAR(255),
    description TEXT,
    value DECIMAL(10,2),
    received_date DATE
);
