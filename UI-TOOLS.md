# Orbit Points UI Tools

Start the application before capturing:

```powershell
npm.cmd run dev
```

## Screenshots

Capture the visible browser viewport:

```powershell
npm.cmd run ui:shot
```

Capture the complete page:

```powershell
npm.cmd run ui:full
```

Use a custom URL, name, or viewport:

```powershell
npm.cmd run ui:shot -- --url http://localhost:3000 --name dashboard --width 1440 --height 900
```

## UI comparison

Create the approved baseline:

```powershell
npm.cmd run ui:baseline
npm.cmd run ui:baseline:full
```

Compare the current page with the baseline:

```powershell
npm.cmd run ui:compare
npm.cmd run ui:compare:full
```

Outputs are written to:

- `ui-artifacts/screenshots`
- `ui-artifacts/baselines`
- `ui-artifacts/current`
- `ui-artifacts/diffs`

The comparison command prints the changed pixel count and difference
percentage. Use the same URL, viewport, name, and page state for both baseline
and comparison captures.
