# Distribution Plot

This page explains how HiPlot's Distribution plot is computed and rendered.

## Key files

- `src/distribution/plugin.tsx`: plugin wiring, axis selection, and data sources.
- `src/distribution/plot.tsx`: histogram binning, axis layout, and SVG rendering.

## Data sources

For the selected axis, the plot renders two distributions:

- **Selected** rows (`rows_selected`): purple filled bars.
- **Filtered** rows (`rows_filtered`): black line segments.

In other words, the black series is the current filtered-on-screen population, not necessarily the original unfiltered dataset.

## Orientation

`DistributionPlot.isVertical()` chooses layout:

- **Vertical** for numeric axes, and for categorical axes with fewer than 3 values.
- **Horizontal** for categorical axes with 3 or more values.

## Binning strategy

`DistributionPlot.createHistogram()` builds normalized bins in `[0, 1]`.

Numeric axes:

- Value mapping uses the axis scale remapped to `[0, 1]`.
- Thresholds are `1/nbins, 2/nbins, ..., (nbins-1)/nbins`.

Categorical axes:

- Categories are mapped by domain index.
- Category `idx` maps to center `(idx + 0.5) / domainCount`.
- Thresholds are `i / domainCount` for `i = 1..domainCount-1`.
- This produces equal-width categorical bins.

## Density scaling

Each series is plotted as relative density within that series:

- `density = bin_count / total_count_for_that_series`

The y-axis (or x-axis in horizontal mode) uses the maximum density across both series for a shared visual scale.

## Categorical ordering in horizontal mode

When horizontal categorical mode is active:

- Categories are reordered by selected-bin count (ascending).
- Ties are resolved by original category index for deterministic ordering.
- The same ordering is applied to both selected and filtered series, and to axis labels.

## Behavior notes

- The black series is filtered population, not full raw population.
- Because densities are normalized per series, bar/line heights are proportionate within each series rather than absolute counts across series.
- Categories absent from the current axis domain are ignored during histogram binning.
