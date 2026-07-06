# Geometry Analysis Service

Independent STL geometry analysis service built with Python + trimesh.

## Responsibilities

- Validate STL payloads
- Extract geometry metrics
- Return clean JSON only
- Stay fully independent from pricing

## Output fields

- Bounding box
- Width
- Height
- Depth
- Mesh volume
- Surface area
- Triangle count
- Face count
- Watertight status
- Non-manifold detection
- Estimated complexity
- Aspect ratio
- Center of mass

## Run locally

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn app.main:app --reload --port 8001
```
