"""Write a small blue Web Studio icon. Uses only the Python standard library."""

from __future__ import annotations

import struct
from pathlib import Path


def _pixel(x: int, y: int, size: int) -> tuple[int, int, int, int]:
    """Blue page with a folded corner. Values are BGRA, which is what an icon stores."""
    margin = size // 8
    left, top = margin, margin
    right, bottom = size - margin - 1, size - margin - 1
    fold = max(3, size // 5)
    if not (left <= x <= right and top <= y <= bottom):
        return (0, 0, 0, 0)
    if x >= right - fold and y <= top + fold:
        if (right - x) + (y - top) < fold:
            return (0, 0, 0, 0)
        return (236, 214, 186, 255)
    return (181, 111, 26, 255)


def _image(size: int) -> tuple[bytes, bytes]:
    pixels = bytearray()
    mask = bytearray()
    row_bytes = ((size + 31) // 32) * 4
    for y in range(size - 1, -1, -1):
        row = 0
        for x in range(size):
            blue, green, red, alpha = _pixel(x, y, size)
            pixels += bytes((blue, green, red, alpha))
            if alpha < 128:
                row |= 1 << (7 - (x % 8))
            if x % 8 == 7:
                mask.append(row)
                row = 0
        if size % 8:
            mask.append(row)
        mask += bytes(row_bytes - ((size + 7) // 8))
    header = struct.pack(
        "<IIIHHIIIIII",
        40,
        size,
        size * 2,
        1,
        32,
        0,
        len(pixels),
        0,
        0,
        0,
        0,
    )
    return header + bytes(pixels), bytes(mask)


def write_icon(path: Path) -> None:
    sizes = (16, 32, 48)
    images = []
    for size in sizes:
        xor, mask = _image(size)
        images.append(xor + mask)
    header = struct.pack("<HHH", 0, 1, len(images))
    offset = 6 + 16 * len(images)
    entries = b""
    payload = b""
    for size, image in zip(sizes, images):
        entries += struct.pack(
            "<BBBBHHII",
            size,
            size,
            0,
            0,
            1,
            32,
            len(image),
            offset,
        )
        offset += len(image)
        payload += image
    path.write_bytes(header + entries + payload)


if __name__ == "__main__":
    write_icon(Path(__file__).with_name("webstudio.ico"))
