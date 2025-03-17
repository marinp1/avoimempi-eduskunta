import React from "react";
import styles from "./RepresentativeAvatar.module.css";

export const RepresentativeAvatar: React.FC<
  {
    person: DatabaseFunctions.GetParliamentComposition;
    transform: {
      y: number;
    };
    selectRepresentative: (
      person: DatabaseFunctions.GetParliamentComposition
    ) => void;
  } & {}
> = ({ person, transform, selectRepresentative }) => {
  const initials =
    `${person.first_name[0]}${person.last_name[0]}`.toUpperCase();
  const fullName = `${person.first_name} ${person.last_name}`;

  return (
    <div
      onClick={() => selectRepresentative(person)}
      className={styles.circle}
      title={fullName}
      style={{
        transform: `translate(0%, ${transform.y}%)`,
      }}
    >
      {initials}
    </div>
  );
};
