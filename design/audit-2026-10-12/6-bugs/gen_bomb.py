# A zip whose one member unpacks to 1.2 GB of spaces while its headers say 1000 bytes. python3 -I gen_bomb.py
import zlib, struct, os
W = os.path.dirname(os.path.abspath(__file__))
total = 1_200_000_000
chunk = b' ' * 10_000_000
co = zlib.compressobj(9, zlib.DEFLATED, -15)
raw = bytearray(); crc = 0
for k in range(total // len(chunk)):
    raw += co.compress(chunk); crc = zlib.crc32(chunk, crc)
raw += co.flush()
name = b'big.cif'
lh = struct.pack('<IHHHHHIIIHH', 0x04034b50, 20, 0, 8, 0, 0, crc & 0xffffffff, len(raw), 1000, len(name), 0) + name
cd = struct.pack('<IHHHHHHIIIHHHHHII', 0x02014b50, 20, 20, 0, 8, 0, 0, crc & 0xffffffff, len(raw), 1000, len(name), 0, 0, 0, 0, 0, 0) + name
end = struct.pack('<IHHHHIIH', 0x06054b50, 0, 0, 1, 1, len(cd), len(lh) + len(raw), 0)
open(os.path.join(W, 'files', 'zip_bomb_1200MB_lying.zip'), 'wb').write(lh + bytes(raw) + cd + end)
print(len(raw))
