---
name: Component patterns and limitations
description: Known limitations and usage patterns for custom theme components and shared components
type: project
---

# Component Patterns and Limitations

## DataCard
- Location: `packages/client/theme/components.tsx`
- Props: `children`, `sx`, `className` only — does NOT forward `onClick`
- To make a DataCard clickable, wrap it in a `Box` with `onClick` and `cursor: "pointer"` sx

```tsx
<Box
  onClick={() => handleClick()}
  sx={{ cursor: "pointer", borderRadius: 2 }}
>
  <DataCard sx={{ p: 2 }}>...</DataCard>
</Box>
```

## RepresentativeDetails dialog
- Location: `packages/client/pages/Composition/Details.tsx`
- Props: `open: boolean`, `onClose: () => void`, `selectedRepresentative: RepresentativeSelection | null`, `selectedDate: string`
- `RepresentativeSelection` type: `{ personId: number; summary?: { firstName?: string; ... } }`
- Import: `import { RepresentativeDetails } from "#client/pages/Composition/Details"`

Usage pattern:
```tsx
const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

// In JSX:
{selectedPersonId !== null && (
  <RepresentativeDetails
    open={true}
    onClose={() => setSelectedPersonId(null)}
    selectedRepresentative={{ personId: selectedPersonId }}
    selectedDate={selectedDate}
  />
)}
```

## SessionSectionRow
- Location: `packages/client/pages/Sessions/components/SessionSectionRow.tsx`
- Props: `sectionKey: string`, `isActive: boolean`, `isFocused?: boolean`, `onSelect: () => void`, `children: ReactNode`, `sx?: SxProps`
- Click-only row component (no accordion) — replaces SessionSectionPanel when drawer pattern is used
