import React, { useState, useEffect } from "react";
import "./RepresentativesPage.css";
import { RepresentativeAvatar } from "./RepresentativeAvatar";

const SeatingCounts = [1, 16, 22, 26, 32, 30, 29, 26, 18];

const RepresentativesPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [representatives, setRepresentatives] = useState<
    DatabaseFunctions.GetParliamentComposition[]
  >([]);

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
        const data: DatabaseFunctions.GetParliamentComposition[] =
          await response.json();
        setRepresentatives(data);
      } catch (error) {
        console.error("Error fetching representatives:", error);
      }
    };

    fetchRepresentatives();
  }, [selectedDate]);

  const groupedRepresentatives = SeatingCounts.reduce((acc, count, ind) => {
    const start = ind === 0 ? 0 : acc[ind - 1].end;
    const end = start + count;
    return [
      ...acc,
      {
        start,
        end,
      },
    ];
  }, [] as { start: number; end: number }[]).map(({ start, end }) => ({
    count: end - start,
    representatives: representatives.slice(start, end),
  }));

  console.log(
    representatives,
    groupedRepresentatives,
    groupedRepresentatives
      .map((s) => s.representatives.length)
      .reduce((a, b) => a + b, 0)
  );

  return (
    <div className="representatives-page">
      <div className="date-selector">
        <button onClick={handlePreviousDate}>&lt;</button>
        <input
          type="date"
          value={selectedDate.toISOString().split("T")[0]}
          onChange={handleDateChange}
        />
        <button onClick={handleNextDate}>&gt;</button>
      </div>
      <div className="representatives-layout">
        {groupedRepresentatives.map(({ count, representatives }, index) => (
          <div
            key={`row-${count}-${index}`}
            className="representative-row"
            data-row={index}
          >
            {representatives.map((representative, index) => (
              <RepresentativeAvatar key={index} {...representative} />
            ))}
          </div>
        ))}
      </div>
      <div className="representatives-content">
        {/* Content for the selected date goes here */}
      </div>
    </div>
  );
};

export default RepresentativesPage;
