ALTER TABLE ParliamentaryGroupMembership
ADD COLUMN group_name VARCHAR(255);

ALTER TABLE ParliamentaryGroupAssignment
ADD COLUMN group_name VARCHAR(255);

ALTER TABLE ParliamentaryGroup
DROP COLUMN name;