from app.main import analyze_mesh

import trimesh


def test_analyze_mesh_returns_expected_fields():
    mesh = trimesh.creation.box(extents=(10.0, 20.0, 30.0))
    metrics = analyze_mesh(mesh)

    assert metrics.width == 10.0
    assert metrics.height == 20.0
    assert metrics.depth == 30.0
    assert metrics.triangle_count > 0
    assert metrics.face_count > 0
    assert isinstance(metrics.watertight, bool)
    assert isinstance(metrics.non_manifold, bool)
    assert metrics.estimated_complexity in {"low", "medium", "high"}
