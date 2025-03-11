import React from "react";

export const RepresentativeAvatar: React.FC<
  DatabaseFunctions.GetParliamentComposition
> = (person) => {
  const initials =
    `${person.first_name[0]}${person.last_name[0]}`.toUpperCase();
  const fullName = `${person.first_name} ${person.last_name}`;
  return (
    <div className="representative-circle" title={fullName}>
      {initials}
    </div>
  );
};
