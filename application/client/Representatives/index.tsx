import React, { useState, useEffect } from "react";
// import styles from "./styles.module.css";
import { RepresentativeAvatar } from "./RepresentativeAvatar";
import { RepresentativeDetails } from "./RepresentativeDetails";

const SeatingCounts = [1, 16, 22, 26, 32, 30, 29, 26, 18];

const RepresentativesPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [representatives, setRepresentatives] = useState<
    DatabaseQueries.GetParliamentComposition[]
  >([]);

  const [selectedRepresentative, selectRepresentative] =
    useState<DatabaseQueries.GetParliamentComposition | null>(null);

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(event.target.value));
  };

  const handlePreviousDate = () => {
    const previousDate = new Date(selectedDate);
    previousDate.setDate(previousDate.getDate() - 1);
    setSelectedDate(previousDate);
  };

  const handleNextDate = () => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setSelectedDate(nextDate);
  };

  useEffect(() => {
    const fetchRepresentatives = async () => {
      try {
        const sp = new URLSearchParams();
        sp.set("date", selectedDate.toISOString().slice(0, 10));
        const response = await fetch(
          `/api/composition/${selectedDate.toISOString().slice(0, 10)}`
        );
        const data: DatabaseQueries.GetParliamentComposition[] =
          await response.json();
        setRepresentatives(data);
      } catch (error) {
        console.error("Error fetching representatives:", error);
      }
    };

    fetchRepresentatives();
  }, [selectedDate]);

  useEffect(() => {
    selectRepresentative(null);
  }, [representatives]);

  const totalCount = 32;
  const radius = totalCount / Math.PI / 3;
  return (
    <div className="container">
      <div className="flex place-items-center justify-center">
        <button onClick={handlePreviousDate}>&lt;</button>
        <input
          type="date"
          value={selectedDate.toISOString().split("T")[0]}
          onChange={handleDateChange}
        />
        <button onClick={handleNextDate}>&gt;</button>
      </div>
      <RepresentativeDetails selectedRepresentative={selectedRepresentative} />
      <div className="grid grid-cols-4 gap-4">
        {representatives.map((representative, index) => {
          return (
            <RepresentativeAvatar
              rowIndex={index}
              columnIndex={index}
              key={index}
              person={representative}
              selectRepresentative={selectRepresentative}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RepresentativesPage;
