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
  raw_page_count: number;
  parsed_page_count: number;
  has_raw_data: boolean;
  has_parsed_data: boolean;
  raw_last_updated: string | null;
  parsed_last_updated: string | null;
  raw_estimated_rows: number;
  parsed_estimated_rows: number;
  total_rows_in_api?: number;
  scrape_progress_percent?: number;
};

type ScrapingOverview = {
  total_tables: number;
  tables_with_data: number;
  tables_completed: number;
  total_api_rows: number;
  total_scraped_rows: number;
  overall_progress_percent: number;
};

export default function AdminPage() {
  const [status, setStatus] = useState<TableStatus[]>([]);
  const [overview, setOverview] = useState<ScrapingOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch both status and overview
        const [statusRes, overviewRes] = await Promise.all([
          fetch("/api/admin/status"),
          fetch("/api/admin/overview"),
        ]);

        if (!statusRes.ok || !overviewRes.ok) {
          throw new Error(`HTTP error`);
        }

        const statusData: TableStatus[] = await statusRes.json();
        const overviewData: ScrapingOverview = await overviewRes.json();

        setStatus(statusData);
        setOverview(overviewData);
      } catch (err) {
        console.error(err);
        setError("Failed to load admin data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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

      {overview && (
        <Fade in timeout={500}>
          <Box sx={{ mb: 3, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 2 }}>
            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid rgba(0,0,0,0.1)",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h3" fontWeight="700" sx={{ mb: 1 }}>
                  {overview.overall_progress_percent.toFixed(1)}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Overall Progress
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, mt: 1, display: "block" }}>
                  {overview.total_scraped_rows.toLocaleString()} / {overview.total_api_rows.toLocaleString()} rows
                </Typography>
              </CardContent>
            </Card>

            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h3" fontWeight="700" sx={{ mb: 1, color: "#667eea" }}>
                  {overview.tables_with_data}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tables with Data
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  out of {overview.total_tables} total
                </Typography>
              </CardContent>
            </Card>

            <Card
              elevation={0}
              sx={{
                borderRadius: 3,
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h3" fontWeight="700" sx={{ mb: 1, color: "#4caf50" }}>
                  {overview.tables_completed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fully Scraped
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                  100% complete
                </Typography>
              </CardContent>
            </Card>
          </Box>
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
                      Raw Pages
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Raw Est. Rows
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
                      Parsed Pages
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" fontWeight="700">
                      Parsed Est. Rows
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
                        {getStatusIcon(row.has_raw_data, row.raw_page_count)}
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{
                            color: row.has_raw_data ? "#1a1a1a" : "#999",
                            fontWeight: 600,
                          }}
                        >
                          {row.has_raw_data ? row.raw_page_count.toLocaleString() : "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{
                            color: row.has_raw_data ? "#1a1a1a" : "#999",
                            fontWeight: 500,
                          }}
                        >
                          {row.has_raw_data ? `~${row.raw_estimated_rows.toLocaleString()}` : "N/A"}
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
                        {getStatusIcon(row.has_parsed_data, row.parsed_page_count)}
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{
                            color: row.has_parsed_data ? "#1a1a1a" : "#999",
                            fontWeight: 600,
                          }}
                        >
                          {row.has_parsed_data ? row.parsed_page_count.toLocaleString() : "N/A"}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{
                            color: row.has_parsed_data ? "#1a1a1a" : "#999",
                            fontWeight: 500,
                          }}
                        >
                          {row.has_parsed_data ? `~${row.parsed_estimated_rows.toLocaleString()}` : "N/A"}
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
