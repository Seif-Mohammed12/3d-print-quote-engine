from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Any

import numpy as np
import trimesh
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

app = FastAPI(title="Geometry Analysis Service", version="1.0.0")


class GeometryAnalysisResponse(BaseModel):
    success: bool = True
    file_name: str
    file_size: int
    geometry: dict[str, Any]
    mesh: dict[str, Any]
    quality: dict[str, Any]


@dataclass(frozen=True)
class GeometryMetrics:
    bounding_box: dict[str, float]
    width: float
    height: float
    depth: float
    mesh_volume: float
    surface_area: float
    triangle_count: int
    face_count: int
    watertight: bool
    non_manifold: bool
    estimated_complexity: str
    aspect_ratio: float
    center_of_mass: dict[str, float]


def analyze_mesh(mesh: trimesh.Trimesh) -> GeometryMetrics:
    if mesh.is_empty:
        raise ValueError("Mesh is empty")

    if mesh.vertices is None or len(mesh.vertices) == 0:
        raise ValueError("Mesh has no vertices")

    if mesh.faces is None or len(mesh.faces) == 0:
        raise ValueError("Mesh has no faces")

    bounds = mesh.bounds
    min_corner = bounds[0]
    max_corner = bounds[1]
    extents = mesh.extents

    width = float(extents[0])
    height = float(extents[1])
    depth = float(extents[2])

    max_extent = float(np.max(extents)) if np.max(extents) > 0 else 0.0
    min_extent = float(np.min(extents[np.nonzero(extents)])) if np.any(extents > 0) else 0.0
    aspect_ratio = float(max_extent / min_extent) if min_extent > 0 else 0.0

    triangle_count = int(len(mesh.faces))
    face_count = int(mesh.faces.shape[0])

    mesh_volume = float(abs(mesh.volume)) if mesh.is_watertight else 0.0
    surface_area = float(mesh.area)
    watertight = bool(mesh.is_watertight)
    non_manifold = bool(
        not mesh.is_watertight
        or not mesh.is_winding_consistent
        or not mesh.is_volume
    )
    center = mesh.center_mass if np.all(np.isfinite(mesh.center_mass)) else mesh.centroid

    if triangle_count < 2_000:
      complexity = "low"
    elif triangle_count < 20_000:
      complexity = "medium"
    else:
      complexity = "high"

    return GeometryMetrics(
        bounding_box={
            "min": {"x": float(min_corner[0]), "y": float(min_corner[1]), "z": float(min_corner[2])},
            "max": {"x": float(max_corner[0]), "y": float(max_corner[1]), "z": float(max_corner[2])},
        },
        width=width,
        height=height,
        depth=depth,
        mesh_volume=mesh_volume,
        surface_area=surface_area,
        triangle_count=triangle_count,
        face_count=face_count,
        watertight=watertight,
        non_manifold=non_manifold,
        estimated_complexity=complexity,
        aspect_ratio=aspect_ratio,
        center_of_mass={"x": float(center[0]), "y": float(center[1]), "z": float(center[2])},
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=GeometryAnalysisResponse)
async def analyze(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file name")

    if not file.filename.lower().endswith(".stl"):
        raise HTTPException(status_code=400, detail="Only .stl files are supported")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty STL file")

    try:
        mesh = trimesh.load_mesh(file_obj=BytesIO(payload), file_type="stl")
    except Exception as exc:  # pragma: no cover - defensive conversion
        raise HTTPException(status_code=400, detail=f"Invalid STL file: {exc}") from exc

    if isinstance(mesh, trimesh.Scene):
        geometry = mesh.dump(concatenate=True)
        if geometry is None:
            raise HTTPException(status_code=400, detail="Unable to decode STL scene")
        mesh = geometry

    if not isinstance(mesh, trimesh.Trimesh):
        raise HTTPException(status_code=400, detail="Unsupported mesh format")

    try:
        metrics = analyze_mesh(mesh)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return GeometryAnalysisResponse(
        file_name=file.filename,
        file_size=len(payload),
        geometry={
            "boundingBox": metrics.bounding_box,
            "width": metrics.width,
            "height": metrics.height,
            "depth": metrics.depth,
            "aspectRatio": metrics.aspect_ratio,
            "centerOfMass": metrics.center_of_mass,
        },
        mesh={
            "volume": metrics.mesh_volume,
            "surfaceArea": metrics.surface_area,
            "triangleCount": metrics.triangle_count,
            "faceCount": metrics.face_count,
        },
        quality={
            "watertight": metrics.watertight,
            "nonManifold": metrics.non_manifold,
            "estimatedComplexity": metrics.estimated_complexity,
        },
    )
