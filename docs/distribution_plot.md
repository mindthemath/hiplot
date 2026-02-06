# Distribution Plot: How It Works (and Why It Can Look Wrong)

This document summarizes how the Distribution plot is built in the frontend, where the data comes from, and why it may sometimes appear inaccurate — especially for categorical variables.

## Key Files

- `src/distribution/plugin.tsx` — wires the distribution plot into the plugin system, manages state and data sources.
- `src/distribution/plot.tsx` — renders the histogram(s) and axes with D3.
- `src/infertypes.ts` + `src/lib/d3_scales.ts` — scale creation, especially for categorical axes.

## What Gets Plotted

The Distribution plot renders **two histograms** for the chosen axis:

- **Selected** rows (`rows_selected`) — drawn as **purple rectangles**.
- **Filtered (on-screen)** rows (`rows_filtered`) — drawn as **black line segments**.

Important: `rows_filtered` is _already filtered by active brushes/filters_ and represents the set of samples still on screen (i.e., not excluded). So the black “baseline” is **not the original dataset**, it is the **filtered-on-screen** dataset.

This is currently set in `HiPlotDistributionPlugin`:

```ts
histData: { selected: [], all: props.rows_filtered }
```

So requirement (b) “black matches purple when no filtering/brushes are applied” is only true **if** `rows_selected` equals `rows_filtered` (e.g., nothing selected, or selection includes everything). If filters are active, black lines represent the filtered distribution; purple represents the selected subset within that filtered set.

## High‑Level Flow

1. **DistributionPlugin** tracks:
   - current axis (`axis`)
   - `histData.all` (filtered rows)
   - `histData.selected` (selected rows)
2. **DistributionPlot** builds a histogram with D3:
   - converts data into a [0,1] range
   - sets bin thresholds
3. **Two render passes**:
   - rectangles (selected/purple)
   - lines (all/black)

## Bin Construction (Core Logic)

`DistributionPlot.createHistogram()`:

- Creates a copy of the data scale, remapped to `[0,1]`.
- For **numeric axes**:
  - `thresholds = [1/nbins, 2/nbins, ..., (nbins-1)/nbins]`
  - bins are equal width in normalized space.
- For **categorical axes**:
  - Uses a **scalePoint** with `distinct_values` as domain.
  - Converts each category to a number in `[0,1]`.
  - Thresholds are set to the **midpoints between category positions**.

### Why categorical bins are not equal width

`d3_scale_categorical` uses `d3.scalePoint()` with default padding. With `scalePoint`, spacing is **not linear unless padding=0**. After remapping to `[0,1]`, the first/last points are inset, so their bins are **wider**.

That violates requirement (a): “bins are equal size.”

## Axis Orientation and Ordering

The plot can be horizontal or vertical:

- **Vertical** when the axis is **not categorical**, or when categorical has **fewer than 3** distinct values.
- **Horizontal** when the axis is **categorical** and has **3 or more** distinct values.

This logic is in `DistributionPlot.isVertical()`:

```ts
return param_def.type != ParamType.CATEGORICAL || param_def.distinct_values.length < 3;
```

In **horizontal categorical mode**, the bins are **reordered** based on the selected distribution:

```ts
ordered1 = bins sorted by selected density
binsOrdering[value] = idx
```

The axis labels are also reordered to match the selected ordering.

### Why this can be unstable on refresh

If selected distribution has **ties** (equal bin counts), `Array.sort` is **not stable** across engines. That means bins can re‑order nondeterministically on reload — causing the black lines (all) to appear “in the wrong place” relative to purple bars.

This explains the inconsistent behavior you saw “sometimes correct, sometimes wrong.”

## Black vs Purple Mismatch: Likely Causes

1. **Baseline uses filtered rows**, not full dataset.
   - If any filters/brushes are active, black ≠ original distribution.
   - This breaks requirement (c) unless you define “all” as “filtered all.”

2. **Categorical bin sizes are unequal** (scalePoint padding).
   - The first/last bins are larger; mid bins are smaller.
   - This violates requirement (a).

3. **Unstable bin ordering when counts are equal**.
   - When `selected` bins have equal lengths, `sort` order is unstable.
   - Leads to inconsistent bin placement / line positions.

4. **Horizontal categorical logic mixes ordering + positioning**.
   - Axis labels are reordered based on selection.
   - Bins are also reordered using the same map.
   - If selection changes quickly or is empty, order can “jump.”

## Why Black Lines Can Be “Wrong Place”

In horizontal categorical mode:

- `binsOrdering` is computed from **selected** bins.
- The **all** histogram (black) uses the _same_ ordering.
- If selection is empty or has ties, ordering becomes arbitrary → black shifts unpredictably.

## Requirements vs Current Behavior

**(a) Equal bin sizes**

- Numeric: yes (in normalized space)
- Categorical: **no**, because `scalePoint` padding yields uneven bins.

**(b) Black matches purple when no filters**

- Only true when `rows_filtered == rows_all_unfiltered`.
- Current code uses `rows_filtered` as “all.”

**(c) Black reflects original, purple reflects filtered**

- Current code does **not** do this; it uses filtered for black and selected for purple.

## Hypotheses for Inaccuracy

1. **Categorical thresholding uses scalePoint positions**
   - Unequal bins due to padding and midpoint math.
2. **Unstable sorting on equal counts**
   - Reordering causes bins to shift unpredictably on refresh.
3. **Baseline data is filtered already**
   - Makes black lines appear “wrong” when filters are applied.
4. **Distinct values order changes**
   - If distinct values are recomputed or re‑sorted, bins shift.

## Suggested Fix Directions (Not implemented)

1. **Make categorical bins equal width**
   - Use a simple index scale: `idx / n` for bin boundaries.
   - Avoid `scalePoint` for bin sizing; use it only for labels.

2. **Stable ordering**
   - Use a stable sort or tie‑break on original index.
   - Or skip reordering when selected distribution is uniform.

3. **Use true baseline dataset**
   - Feed `rows_all_unfiltered` into `histData.all`.

4. **Explicit axis mode**
   - Lock ordering so refreshes do not re‑order bins if selection unchanged.

---

If you want, I can implement the fixes above in a follow‑up PR.
