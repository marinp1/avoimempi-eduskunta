import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  CircularProgress,
  Box,
  Alert,
} from "@mui/material";
import { RepresentativeDetails } from "./Details";

export default function App() {
  const [members, setMembers] = useState<
    DatabaseQueries.GetParliamentComposition[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [error, setError] = useState<string | null>(null);

  // New state for dialog
  const [selectedRepresentative, setSelectedRepresentative] =
    useState<DatabaseQueries.GetParliamentComposition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/composition/${date}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DatabaseQueries.GetParliamentComposition[] =
          await res.json();
        setMembers(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load members.");
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [date]);

  const handleRowClick = (member: DatabaseQueries.GetParliamentComposition) => {
    setSelectedRepresentative(member);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRepresentative(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Parliament Composition
        </Typography>
        <TextField
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {/* Main Table */}
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ py: 2, textAlign: "center" }}>
            {error}
          </Alert>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "grey.100" }}>
                <TableCell>Name</TableCell>
                <TableCell>Gender</TableCell>
                <TableCell>Birth Date</TableCell>
                <TableCell>Birth Place</TableCell>
                <TableCell>Profession</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((m) => (
                <TableRow
                  key={m.person_id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleRowClick(m)}
                >
                  <TableCell>
                    {m.first_name} {m.last_name}
                  </TableCell>
                  <TableCell>{m.gender}</TableCell>
                  <TableCell>{m.birth_date}</TableCell>
                  <TableCell>{m.birth_place}</TableCell>
                  <TableCell>{m.profession}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Dialog */}
      <RepresentativeDetails
        open={dialogOpen}
        onClose={handleCloseDialog}
        selectedRepresentative={selectedRepresentative}
      />

      {/* Footer */}
      <Typography variant="body2" color="text.secondary" align="center">
        Data source: Open Parliament API
      </Typography>
    </Container>
  );
}
