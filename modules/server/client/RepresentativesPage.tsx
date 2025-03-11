import React, { useState, useEffect } from "react";
import "./RepresentativesPage.css";
import { RepresentativeAvatar } from "./RepresentativeAvatar";

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
      <div className="selected-date">
        Selected Date: {selectedDate.toDateString()}
      </div>
      <div className="representatives-grid">
        {representatives.map((representative, index) => (
          <RepresentativeAvatar key={index} {...representative} />
        ))}
      </div>
      <div className="representatives-content">
        {/* Content for the selected date goes here */}
      </div>
    </div>
  );
};

export default RepresentativesPage;
