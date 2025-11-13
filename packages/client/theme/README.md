# Theme System Documentation

This directory contains the centralized theme configuration and reusable styled components for the Avoimempi Eduskunta application.

## Files Overview

- **`index.ts`** - Main theme configuration with colors, gradients, spacing, and common styles
- **`components.tsx`** - Reusable styled React components
- **`vote-styles.ts`** - Vote-specific styling utilities

## Usage Examples

### 1. Using the Theme

Import the theme configuration in your app root:

```tsx
import { theme } from "./theme";
import { ThemeProvider } from "@mui/material";

<ThemeProvider theme={theme}>
  <App />
</ThemeProvider>
```

### 2. Using Colors

```tsx
import { colors } from "../theme";

<Box sx={{ color: colors.primary }}>
  Primary colored text
</Box>

<SearchIcon sx={{ color: colors.primary }} />
```

### 3. Using Gradients

```tsx
import { gradients } from "../theme";

<Box sx={{ background: gradients.primary }}>
  Gradient background
</Box>
```

### 4. Using Spacing

```tsx
import { spacing } from "../theme";

<Box sx={{ 
  mb: spacing.lg,    // marginBottom: 32px
  p: spacing.md,     // padding: 24px
  gap: spacing.sm    // gap: 16px
}}>
  Consistent spacing
</Box>
```

### 5. Using Common Styles

```tsx
import { commonStyles } from "../theme";

// Glass-morphism card
<Card sx={commonStyles.glassCard}>
  Content
</Card>

// Gradient text
<Typography sx={commonStyles.gradientText}>
  Gradient Text
</Typography>

// Interactive hover effect
<TableRow sx={commonStyles.interactiveHover}>
  Row content
</TableRow>

// Styled text field
<TextField sx={commonStyles.styledTextField} />

// Flex layout with gap
<Box sx={commonStyles.flexWithGap(2)}>
  <Icon />
  <Text />
</Box>

// Responsive grid
<Box sx={commonStyles.responsiveGrid(250)}>
  {items.map(item => <Card>{item}</Card>)}
</Box>
```

### 6. Using Reusable Components

```tsx
import { GlassCard, GradientButton, GradientText, StatCard } from "../theme/components";

// Glass-morphism card
<GlassCard>
  Card content
</GlassCard>

// Gradient button
<GradientButton onClick={handleClick} startIcon={<PlayIcon />}>
  Start Process
</GradientButton>

// Gradient text
<GradientText component={Typography}>
  Beautiful Gradient Text
</GradientText>

// Stat card with icon
<StatCard 
  title="Total Votes" 
  value="1,234" 
  icon={<VoteIcon />}
  gradient={gradients.success}
/>
```

### 7. Using Vote Styles

```tsx
import { voteColors, getVoteBoxStyle } from "../theme/vote-styles";

// Vote colors
<ThumbUpIcon sx={{ color: voteColors.yes }} />
<ThumbDownIcon sx={{ color: voteColors.no }} />
<RemoveIcon sx={{ color: voteColors.abstain }} />
<PersonOffIcon sx={{ color: voteColors.absent }} />

// Vote box styles
<Box sx={getVoteBoxStyle("yes")}>
  Yes votes
</Box>
```

## Available Values

### Colors
- **Brand**: `primary`, `primaryDark`, `secondary`, `secondaryDark`
- **Semantic**: `success`, `error`, `warning`, `info`, `neutral` (+ Light variants)
- **Background**: `backgroundDefault`, `backgroundPaper`
- **Glass**: `glassBackground`, `glassBorder`

### Gradients
- `primary` - Main brand gradient (blue to purple)
- `primaryHover` - Darker variant for hover states
- `success` - Green gradient
- `accent` - Pink gradient
- `background` - Page background gradient

### Spacing (based on 8px)
- `xs: 1` (8px)
- `sm: 2` (16px)
- `md: 3` (24px)
- `lg: 4` (32px)
- `xl: 6` (48px)

### Border Radius
- `sm: 2` (8px)
- `md: 3` (12px) - default
- `lg: 4` (16px)

### Shadows
- `card` - Standard card shadow
- `cardHover` - Elevated hover shadow
- `subtle` - Light shadow
- `none` - No shadow

## Migration Guide

### Before (hardcoded colors):
```tsx
<Box sx={{ 
  color: "#667eea",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  mb: 4,
  p: 3,
  borderRadius: 3
}}>
```

### After (using theme):
```tsx
import { colors, gradients, spacing, borderRadius } from "../theme";

<Box sx={{ 
  color: colors.primary,
  background: gradients.primary,
  mb: spacing.lg,
  p: spacing.md,
  borderRadius: borderRadius.md
}}>
```

### Before (repetitive styles):
```tsx
<Card sx={{
  borderRadius: 3,
  background: "rgba(255,255,255,0.9)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.6)",
  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
}}>
```

### After (using common styles):
```tsx
import { commonStyles } from "../theme";

<Card sx={commonStyles.glassCard}>
```

## Best Practices

1. **Always use theme constants** instead of hardcoded values
2. **Use reusable components** when available (GlassCard, GradientButton, etc.)
3. **Use common styles** for repeated patterns (glassCard, gradientText, etc.)
4. **Extend common styles** with spread operator when needed:
   ```tsx
   sx={{ ...commonStyles.glassCard, additional: "styles" }}
   ```
5. **Use spacing constants** for consistent layout
6. **Use color constants** from the theme for consistency

## Contributing

When adding new common styles:
1. Add to `commonStyles` in `index.ts`
2. Document the style in this README
3. Use TypeScript's `satisfies SxProps<Theme>` for type safety
4. Consider creating a reusable component in `components.tsx` if the pattern is complex

## Theme Customization

To modify the theme, edit the values in `packages/client/theme/index.ts`:
- Colors: Update the `colors` object
- Gradients: Update the `gradients` object
- Spacing: Update the `spacing` object
- Component defaults: Update the `theme.components` section
