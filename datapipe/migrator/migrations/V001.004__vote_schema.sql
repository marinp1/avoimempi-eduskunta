CREATE TABLE Vote (
  id INTEGER PRIMARY KEY,
  voting_id INTEGER,
  person_id INTEGER,
  vote TEXT,
  group_abbrviation TEXT,
  FOREIGN KEY (voting_id) REFERENCES Voting(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

