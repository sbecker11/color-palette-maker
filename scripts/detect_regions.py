#!/usr/bin/env python3
"""
Detect large regions in an image using OpenCV contour analysis.
Outputs JSON with region polygons for overlay and K-means masking.

Usage: python detect_regions.py <image_path>

Output (stdout): JSON object with { "regions": [ [[x,y], [x,y], ...], ... ], "width": N, "height": N }
"""

import sys
import json
import argparse

try:
    import cv2
    import numpy as np
except ImportError as e:
    print(json.dumps({"error": "Missing dependencies. Run: pip install opencv-python numpy"}), file=sys.stderr)
    sys.exit(1)


def _contours_to_regions(contours, min_area, max_regions):
    """Convert contours to region polygons, filtered by area."""
    regions = []
    for c in contours:
        area = cv2.contourArea(c)
        if area < min_area:
            continue
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) < 3:
            continue
        poly = [[int(p[0][0]), int(p[0][1])] for p in approx]
        regions.append(poly)

    def poly_area(p):
        return abs(
            sum(
                (p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1])
                for i in range(len(p))
            )
            / 2
        )

    regions.sort(key=poly_area, reverse=True)
    return regions[:max_regions]


def _fallback_center_regions(w, h, max_regions=5):
    """Fallback: return center-weighted regions (e.g. subject often in center)."""
    regions = []
    # Single large center region (60% of image, centered)
    cx, cy = w // 2, h // 2
    pad_w, pad_h = int(w * 0.2), int(h * 0.2)
    x1, y1 = pad_w, pad_h
    x2, y2 = w - pad_w, h - pad_h
    regions.append([[x1, y1], [x2, y1], [x2, y2], [x1, y2]])
    return regions[:max_regions]


def _color_segmentation_regions(img, min_area, max_regions, n_clusters=12):
    """
    Segment by color using K-means in LAB space.
    Good for color wheels, palettes, and images with distinct color blocks.
    """
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    pixels = lab.reshape(-1, 3).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    _, labels, centers = cv2.kmeans(
        pixels, n_clusters, None, criteria, 3, cv2.KMEANS_PP_CENTERS
    )
    labels = labels.reshape(img.shape[:2])
    regions = []
    for i in range(n_clusters):
        mask = np.uint8(labels == i)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            area = cv2.contourArea(c)
            if area < min_area:
                continue
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) < 3:
                continue
            poly = [[int(p[0][0]), int(p[0][1])] for p in approx]
            regions.append(poly)
    # Sort by area, take largest
    def poly_area(p):
        return abs(
            sum(
                (p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1])
                for i in range(len(p))
            )
            / 2
        )
    regions.sort(key=poly_area, reverse=True)
    return regions[:max_regions]


def detect_regions(image_path, min_area_ratio=0.005, max_regions=20):
    """
    Detect large contiguous regions using OpenCV.
    Tries multiple strategies; falls back to center region if none find contours.
    Returns list of polygons (each polygon is list of [x,y] points).
    """
    img = cv2.imread(image_path)
    if img is None:
        return None, None, None, "Could not read image"

    h, w = img.shape[:2]
    total_area = h * w
    min_area = int(total_area * min_area_ratio)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    def try_threshold(thresh):
        kernel = np.ones((3, 3), np.uint8)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        return _contours_to_regions(contours, min_area, max_regions)

    # Strategy 1: Adaptive threshold
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
    )
    regions = try_threshold(thresh)

    # Strategy 2: Otsu (global threshold) if adaptive found nothing
    if not regions:
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        regions = try_threshold(thresh)

    # Strategy 3: Canny edges + contours
    if not regions:
        edges = cv2.Canny(blurred, 50, 150)
        kernel = np.ones((5, 5), np.uint8)
        edges = cv2.dilate(edges, kernel)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        regions = _contours_to_regions(contours, min_area, max_regions)

    # Strategy 4: Color-based segmentation (for color wheels, palettes, distinct hue regions)
    # Use when we found 1–2 regions (e.g. whole image as one blob)
    if len(regions) <= 2:
        color_regions = _color_segmentation_regions(img, min_area, max_regions)
        if len(color_regions) > len(regions):
            regions = color_regions

    # Strategy 5: Fallback to center region (subject often centered)
    if not regions:
        regions = _fallback_center_regions(w, h, max_regions)

    return regions, w, h, None


def main():
    parser = argparse.ArgumentParser(description="Detect large regions in an image")
    parser.add_argument("image_path", help="Path to input image")
    parser.add_argument(
        "--min-area",
        type=float,
        default=0.005,
        help="Min region area as fraction of image (default 0.005)",
    )
    parser.add_argument(
        "--max-regions",
        type=int,
        default=20,
        help="Max number of regions to return (default 20)",
    )
    args = parser.parse_args()

    regions, width, height, err = detect_regions(
        args.image_path, min_area_ratio=args.min_area, max_regions=args.max_regions
    )
    if err:
        print(json.dumps({"error": err}), file=sys.stderr)
        sys.exit(1)

    out = {"regions": regions, "width": width, "height": height}
    print(json.dumps(out))


if __name__ == "__main__":
    main()
