"""WCAG contrast of white text on the six measurement-plane colours (A5-10)."""
def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
for col in ['#0077b6', '#d95f00', '#1a9a5a', '#7a3fb5', '#c2185b', '#8a6d00']:
    print(col, round(1.05 / (lum(col) + 0.05), 2))
