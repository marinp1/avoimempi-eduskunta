import React from "react";
// import styles from "./RepresentativeAvatar.module.css";

export const RepresentativeAvatar: React.FC<
  {
    columnIndex: number;
    rowIndex: number;
    person: DatabaseQueries.GetParliamentComposition;
    selectRepresentative: (
      person: DatabaseQueries.GetParliamentComposition
    ) => void;
  } & {}
> = ({ person, selectRepresentative, columnIndex, rowIndex }) => {
  const initials =
    `${person.first_name[0]}${person.last_name[0]}`.toUpperCase();
  const fullName = `${person.first_name} ${person.last_name}`;

  return (
    <div
      className="justify-self-center aspect-square size-full"
      onClick={() => selectRepresentative(person)}
      title={`${fullName} (r${rowIndex}-c${columnIndex})`}
    >
      <span className="relative flex place-items-center justify-center size-full before:content-[''] before:size-full before:bg-blue-600 before:absolute before:rounded-full before:-z-1">
        {initials}
      </span>
    </div>
  );
};
