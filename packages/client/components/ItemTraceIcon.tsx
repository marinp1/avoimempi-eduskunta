import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import { IconButton, Tooltip } from "@mui/material";
import {
  TraceRegistration,
  type TraceItem,
  useTrace,
} from "#client/context/TraceContext";

type Props = Omit<TraceItem, never> & {
  sx?: object;
};

export const ItemTraceIcon = ({ table, pkName, pkValue, label, sx }: Props) => {
  const { setTraceItem, openDrawer } = useTrace();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTraceItem({ table, pkName, pkValue, label });
    openDrawer();
  };

  return (
    <>
      <TraceRegistration
        table={table}
        pkName={pkName}
        pkValue={pkValue}
        label={label}
      />
      <Tooltip title="Näytä tietolähde">
        <IconButton
          size="small"
          onClick={handleClick}
          sx={{
            opacity: 0,
            transition: "opacity 0.15s",
            ".trace-hover-parent:hover &, &:focus-visible": { opacity: 1 },
            p: 0.25,
            ...sx,
          }}
        >
          <TravelExploreIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
    </>
  );
};
