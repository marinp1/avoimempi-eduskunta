import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Chip,
  Alert,
  Fade,
} from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningIcon from "@mui/icons-material/Warning";

type TableStatus = {
  table_name: string;
  raw_count: number;
  parsed_count: number;
  has_raw_data: boolean;
  has_parsed_data: boolean;
  raw_last_updated: string | null;
  parsed_last_updated: string | null;
};

export default function AdminPage() {
  const [status, setStatus] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/status");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TableStatus[] = await res.json();
        setStatus(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load admin status.");
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const getStatusIcon = (hasData: boolean, count: number) => {
    if (!hasData) {
      return <ErrorIcon sx={{ color: "#f44336", fontSize: 20 }} />;
    }
    if (count === 0) {
      return <WarningIcon sx={{ color: "#ff9800", fontSize: 20 }} />;
    }
    return <CheckCircleIcon sx={{ color: "#4caf50", fontSize: 20 }} />;
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("fi-FI", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <Box>
      <Fade in timeout={400}>
        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 3,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <StorageIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" fontWeight="700" letterSpacing="-0.5px">
                  Admin Dashboard
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Database scraping and parsing status
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Fade>

      {error && (
        <Fade in timeout={500}>
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        </Fade>
      )}

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <Fade in timeout={600}>
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}
          >
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="700">
                      Table Name
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Raw Data
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Raw Count
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Raw Last Updated
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Parsed Data
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Parsed Count
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Parsed Last Updated
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Status
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {status.map((row, index) => (
                  <Fade in timeout={700 + index * 50} key={row.table_name}>
                    <TableRow
                      sx={{
                        "&:hover": {
                          bgcolor: "rgba(102, 126, 234, 0.04)",
                        },
                        transition: "background-color 0.2s",
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {row.table_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {getStatusIcon(row.has_raw_data, row.raw_count)}
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{
                            color: row.has_raw_data ? "#1a1a1a" : "#999",
                            fontWeight: 600,
                          }}
                        >
                          {row.has_raw_data ? row.raw_count.toLocaleString() : "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="caption"
                          sx={{
                            color: row.raw_last_updated ? "#555" : "#999",
                            fontFamily: "monospace",
                          }}
                        >
                          {formatTimestamp(row.raw_last_updated)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {getStatusIcon(row.has_parsed_data, row.parsed_count)}
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{
                            color: row.has_parsed_data ? "#1a1a1a" : "#999",
                            fontWeight: 600,
                          }}
                        >
                          {row.has_parsed_data ? row.parsed_count.toLocaleString() : "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="caption"
                          sx={{
                            color: row.parsed_last_updated ? "#555" : "#999",
                            fontFamily: "monospace",
                          }}
                        >
                          {formatTimestamp(row.parsed_last_updated)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {row.has_raw_data && row.has_parsed_data ? (
                          <Chip label="Complete" size="small" color="success" />
                        ) : row.has_raw_data ? (
                          <Chip label="Needs Parsing" size="small" color="warning" />
                        ) : (
                          <Chip label="Needs Scraping" size="small" color="error" />
                        )}
                      </TableCell>
                    </TableRow>
                  </Fade>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Fade>
      )}
    </Box>
  );
}
