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
  Card,
  CardContent,
  InputAdornment,
  Fade,
} from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
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
    <Box>
      {/* Header Card */}
      <Fade in timeout={500}>
        <Card
          elevation={0}
          sx={{
            mb: 4,
            borderRadius: 3,
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 3,
              }}
            >
              Eduskunnan kokoonpano
            </Typography>
            <TextField
              label="Valitse päivämäärä"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayIcon sx={{ color: "#667eea" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: 250,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  background: "rgba(255,255,255,0.7)",
                  "&:hover": {
                    background: "rgba(255,255,255,0.9)",
                  },
                  "&.Mui-focused": {
                    background: "rgba(255,255,255,1)",
                  },
                },
              }}
            />
          </CardContent>
        </Card>
      </Fade>

      {/* Main Table */}
      <Fade in timeout={700}>
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            mb: 4,
            borderRadius: 3,
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}
        >
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
              <TableRow
                sx={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              >
                <TableCell sx={{ color: "white", fontWeight: 600 }}>
                  Nimi
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>
                  Sukupuoli
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>
                  Syntymäaika
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>
                  Syntymäpaikka
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>
                  Ammatti
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((m, index) => (
                <TableRow
                  key={m.person_id}
                  hover
                  sx={{
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      background: "rgba(102, 126, 234, 0.08)",
                      transform: "scale(1.005)",
                    },
                    animation: `fadeIn 0.5s ease-in-out ${index * 0.05}s both`,
                    "@keyframes fadeIn": {
                      from: {
                        opacity: 0,
                        transform: "translateY(10px)",
                      },
                      to: {
                        opacity: 1,
                        transform: "translateY(0)",
                      },
                    },
                  }}
                  onClick={() => handleRowClick(m)}
                >
                  <TableCell sx={{ fontWeight: 500 }}>
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
      </Fade>

      {/* Dialog */}
      <RepresentativeDetails
        open={dialogOpen}
        onClose={handleCloseDialog}
        selectedRepresentative={selectedRepresentative}
      />

      {/* Footer */}
      <Fade in timeout={900}>
        <Box
          sx={{
            mt: 4,
            p: 3,
            textAlign: "center",
            borderRadius: 3,
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontWeight: 500 }}
          >
            Tietolähde: Eduskunnan avoin data
          </Typography>
        </Box>
      </Fade>
    </Box>
  );
}
