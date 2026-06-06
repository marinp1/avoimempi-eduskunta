import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import LinkIcon from "@mui/icons-material/Link";
import PrintIcon from "@mui/icons-material/Print";
import { Button, Snackbar, Stack } from "@mui/material";
import React from "react";

const COMPARE_STORAGE_KEY = "avoimempi:compare-shortlist";

const readShortlist = (): number[] => {
  try {
    const raw = window.localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => Number.isFinite(n)) : [];
  } catch {
    return [];
  }
};

const writeShortlist = (ids: number[]) => {
  try {
    window.localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota errors */
  }
};

interface ActionsClusterProps {
  personId: number;
}

/**
 * Voter actions: print, share, queue for comparison.
 * The compare view itself ships in a follow-up; this just persists the
 * shortlist in localStorage so the entry point exists today.
 */
export const ActionsCluster: React.FC<ActionsClusterProps> = ({ personId }) => {
  const [snack, setSnack] = React.useState<string | null>(null);

  const handlePrint = () => window.print();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSnack("Linkki kopioitu leikepöydälle.");
    } catch {
      setSnack("Linkin kopiointi ei onnistunut.");
    }
  };

  const handleAddToCompare = () => {
    const current = readShortlist();
    if (current.includes(personId)) {
      setSnack("Edustaja on jo vertailujonossa.");
      return;
    }
    writeShortlist([...current, personId]);
    setSnack("Lisätty vertailujonoon.");
  };

  return (
    <>
      <Stack spacing={0.5}>
        <Button
          size="small"
          startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
          onClick={handlePrint}
          sx={{ justifyContent: "flex-start", fontSize: "0.75rem" }}
        >
          Tulosta profiili
        </Button>
        <Button
          size="small"
          startIcon={<LinkIcon sx={{ fontSize: 16 }} />}
          onClick={handleCopyLink}
          sx={{ justifyContent: "flex-start", fontSize: "0.75rem" }}
        >
          Kopioi linkki
        </Button>
        <Button
          size="small"
          startIcon={<CompareArrowsIcon sx={{ fontSize: 16 }} />}
          onClick={handleAddToCompare}
          sx={{ justifyContent: "flex-start", fontSize: "0.75rem" }}
        >
          Lisää vertailuun
        </Button>
      </Stack>
      <Snackbar
        open={snack !== null}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        message={snack ?? ""}
      />
    </>
  );
};
