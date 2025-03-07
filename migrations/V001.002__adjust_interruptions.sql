CREATE TABLE PeopleLeavingParliament (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    description TEXT,
    replacement_person VARCHAR(50),
    end_date DATE
);

CREATE TABLE PeopleJoiningParliament (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    description TEXT,
    replacement_person VARCHAR(50),
    start_date DATE
);

CREATE TABLE TemporaryAbsence (
    id SERIAL PRIMARY KEY,
    person_id INT REFERENCES Representative(person_id),
    description TEXT,
    replacement_person VARCHAR(50),
    start_date DATE,
    end_date DATE
);

-- Insert data into PeopleLeavingParliament
INSERT INTO PeopleLeavingParliament (person_id, description, replacement_person, end_date)
SELECT person_id, description, replacement_person, end_date
FROM Interruption
WHERE replacement_person LIKE 'Seuraaja %';

-- Insert data into PeopleJoiningParliament
INSERT INTO PeopleJoiningParliament (person_id, description, replacement_person, start_date)
SELECT person_id, description, replacement_person, end_date
FROM Interruption
WHERE replacement_person LIKE 'Edeltäjä %';

-- Insert data into TemporaryAbsence
INSERT INTO TemporaryAbsence (person_id, description, replacement_person, start_date, end_date)
SELECT person_id, description, replacement_person, start_date, end_date
FROM Interruption
WHERE replacement_person NOT LIKE 'Seuraaja %' AND replacement_person NOT LIKE 'Edeltäjä %';

DROP TABLE Interruption;