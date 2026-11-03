#!/usr/bin/env python3
"""Trace mouse-shape PNGs into vector contours -> site/data/shapes.json.

Pure stdlib (zlib/struct) — no PIL/numpy needed.
For every mouse PNG:
  · decode RGBA, build alpha mask
  · outer contour = mask minus 4-neighbour erosion, ordered by walking
  · Ramer-Douglas-Peucker simplify
  · split closed ring at topmost & bottommost points -> left / right chains
Output: { "<mouse name>": { w, h, left: [[x,y],...], right: [[x,y],...] } }
"""
import json
import os
import struct
import sys
import zlib

ROOT = os.path.join(os.path.dirname(__file__), "..", "site")
SHAPES_DIR = os.path.join(ROOT, "img", "mouse-shapes")
MICE_JSON = os.path.join(ROOT, "data", "mice.json")
OUT_JSON = os.path.join(ROOT, "data", "shapes.json")


# ---------------------------------------------------------------- PNG decode
def decode_png(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a png"
    pos = 8
    ihdr = None
    idat = b""
    while pos < len(data):
        length = struct.unpack(">I", data[pos:pos + 4])[0]
        ctype = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + length]
        if ctype == b"IHDR":
            ihdr = struct.unpack(">IIBBBBB", chunk)
        elif ctype == b"IDAT":
            idat += chunk
        pos += 12 + length
        if ctype == b"IEND":
            break
    w, h, bitd, color, _comp, _filt, interlace = ihdr
    assert bitd == 8 and interlace == 0, f"unsupported png {bitd=} {interlace=}"
    nch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color]
    raw = zlib.decompress(idat)
    stride = w * nch
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p + stride]); p += stride
        if f == 1:      # Sub
            for i in range(nch, stride):
                line[i] = (line[i] + line[i - nch]) & 255
        elif f == 2:    # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif f == 3:    # Average
            for i in range(stride):
                a = line[i - nch] if i >= nch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:    # Paeth
            for i in range(stride):
                a = line[i - nch] if i >= nch else 0
                b = prev[i]
                c = prev[i - nch] if i >= nch else 0
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y * stride:(y + 1) * stride] = line
        prev = line
    return w, h, nch, bytes(out)


def alpha_mask(path, thr=40):
    w, h, nch, px = decode_png(path)
    pts = set()
    if nch == 4:
        for y in range(h):
            row = y * w * 4
            for x in range(w):
                if px[row + x * 4 + 3] > thr:
                    pts.add((x, y))
    elif nch == 3:
        for y in range(h):
            row = y * w * 3
            for x in range(w):
                if px[row + x * 3] > 40:
                    pts.add((x, y))
    else:  # gray+alpha
        for y in range(h):
            row = y * w * 2
            for x in range(w):
                if px[row + x * 2 + 1] > thr:
                    pts.add((x, y))
    return w, h, pts


# ---------------------------------------------------------------- contour
def boundary(pts):
    """mask minus 4-neighbour erosion -> set of ring pixels."""
    ring = set()
    for (x, y) in pts:
        if (x - 1, y) not in pts or (x + 1, y) not in pts or \
           (x, y - 1) not in pts or (x, y + 1) not in pts:
            ring.add((x, y))
    return ring


NB = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1)]


def largest_component(ring):
    """connected components of the ring; return the biggest (outer contour)."""
    seen = set()
    best = []
    for start in ring:
        if start in seen:
            continue
        comp = [start]
        seen.add(start)
        stack = [start]
        while stack:
            x, y = stack.pop()
            for dx, dy in NB:
                n = (x + dx, y + dy)
                if n in ring and n not in seen:
                    seen.add(n)
                    comp.append(n)
                    stack.append(n)
        if len(comp) > len(best):
            best = comp
    return best


def order_ring(comp):
    """greedy walk over the ring, preferring direction continuity."""
    remaining = set(comp)
    # start at the leftmost-topmost pixel for determinism
    start = min(comp, key=lambda p: (p[0], p[1]))
    path = [start]
    remaining.discard(start)
    cur = start
    # initial direction: towards the right
    d = (1, 0)
    while remaining:
        x, y = cur
        # score neighbours: prefer small angle change
        cand = []
        for dx, dy in NB:
            n = (x + dx, y + dy)
            if n in remaining:
                # angle between d and (dx,dy)
                dot = d[0] * dx + d[1] * dy
                cand.append((-dot, n, (dx, dy)))   # max dot first
        if not cand:
            # jump to nearest remaining (rare, split ring)
            n = min(remaining, key=lambda p: (p[0] - x) ** 2 + (p[1] - y) ** 2)
            path.append(n)
            remaining.discard(n)
            cur = n
            continue
        cand.sort(key=lambda c: c[0])
        _, n, nd = cand[0]
        path.append(n)
        remaining.discard(n)
        cur = n
        d = nd
    return path


# ---------------------------------------------------------------- simplify
def rdp(points, eps):
    if len(points) < 3:
        return points[:]
    def perp(p, a, b):
        ax, ay = a; bx, by = b; px, py = p
        dx, dy = bx - ax, by - ay
        L = (dx * dx + dy * dy) ** .5
        if L == 0:
            return ((px - ax) ** 2 + (py - ay) ** 2) ** .5
        return abs(dx * (ay - py) - dy * (ax - px)) / L
    a, b = points[0], points[-1]
    idx, dmax = -1, 0.0
    for i in range(1, len(points) - 1):
        d = perp(points[i], a, b)
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        left = rdp(points[:idx + 1], eps)
        right = rdp(points[idx:], eps)
        return left[:-1] + right
    return [a, b]


def trace(path_png, eps=1.3):
    w, h, pts = alpha_mask(path_png)
    if len(pts) < 40:
        return None
    ring = boundary(pts)
    comp = largest_component(ring)
    if len(comp) < 40:
        return None
    ordered = order_ring(comp)
    # closed: append first point at the end
    ordered = ordered + [ordered[0]]
    simple = rdp(ordered, eps)
    if len(simple) < 8:
        return None
    # normalise to content bbox
    xs = [p[0] for p in simple]; ys = [p[1] for p in simple]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    bw, bh = max(1, x1 - x0), max(1, y1 - y0)
    simple = [(p[0] - x0, p[1] - y0) for p in simple]
    # split at topmost & bottommost indices
    i_top = max(range(len(simple)), key=lambda i: -simple[i][1])
    i_bot = max(range(len(simple)), key=lambda i: simple[i][1])
    if i_top > i_bot:
        i_top, i_bot = i_bot, i_top
    chain_a = simple[i_top:i_bot + 1]           # top -> bottom (one side)
    chain_b = simple[i_bot:] + simple[:i_top + 1]  # bottom -> top (other side)
    chain_b = chain_b[::-1]                     # top -> bottom
    def clean(ch):
        ch = rdp(ch, eps)
        return [[round(x, 1), round(y, 1)] for x, y in ch]
    return {"w": bw, "h": bh, "left": clean(chain_a), "right": clean(chain_b)}


def main():
    mice = json.load(open(MICE_JSON, encoding="utf-8"))
    out = {}
    skipped = []
    for it in mice.get("items", []):
        name = it.get("name")
        img = (it.get("shape_image") or "").strip()
        if not name or not img:
            continue
        p = os.path.join(ROOT, img.lstrip("/"))
        if not os.path.isfile(p):
            skipped.append(name)
            continue
        try:
            r = trace(p)
        except Exception as e:
            print("ERR", name, e, file=sys.stderr)
            r = None
        if r:
            out[name] = r
        else:
            skipped.append(name)
    json.dump(out, open(OUT_JSON, "w", encoding="utf-8"), separators=(",", ":"))
    size = os.path.getsize(OUT_JSON)
    print(f"traced {len(out)} / {len(mice.get('items', []))}; skipped {len(skipped)}")
    print(f"shapes.json: {size/1024:.0f} KB")
    if skipped:
        print("skipped:", ", ".join(skipped[:12]), "..." if len(skipped) > 12 else "")


if __name__ == "__main__":
    main()
