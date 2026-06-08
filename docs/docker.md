# Docker Usage

Build the analyzer image:

```powershell
docker build -t circuitshield:local .
```

Run a scan against the mounted workspace:

```powershell
docker run --rm -v ${PWD}:/workspace -w /workspace circuitshield:local scan examples --config examples/circuitshield.yml
```

Run the local API through Compose:

```powershell
docker compose up circuitshield-api
```

Run the scan service:

```powershell
docker compose run --rm circuitshield-scan
```

This image contains the Node-based scanner. Circom compiler and Circomspect are still optional external tools unless the image is extended with those binaries.
