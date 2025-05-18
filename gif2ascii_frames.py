from PIL import Image, ImageSequence
import json

# === SETTINGS ===
GIF_PATH = "images/Sw0Uk0LI.gif"    # Change to your GIF file name
OUTPUT_PATH = "ascii_frames.json"
NEW_WIDTH = 160           # Increase for more detail (try 120, 160, 200, etc.)

# More detailed ASCII gradient (from dark to light)
ASCII_CHARS = [
    ' ', '.', '`', '^', '"', ',', ':', ';', 'I', 'l', '!', 'i', '>', '<', '~', '+',
    '_', '-', '?', ']', '[', '}', '{', '1', ')', '(', '|', '\\', '/', 't', 'f', 'j',
    'r', 'x', 'n', 'u', 'v', 'c', 'z', 'X', 'Y', 'U', 'J', 'C', 'L', 'Q', '0', 'O',
    'Z', 'm', 'w', 'q', 'p', 'd', 'b', 'k', 'h', 'a', 'o', '*', '#', 'M', 'W', '&',
    '8', '%', 'B', '@', '$'
]

def scale_image(image, new_width=NEW_WIDTH):
    original_width, original_height = image.size
    aspect_ratio = original_height / float(original_width)
    new_height = int(aspect_ratio * new_width * 0.33)  # 0.55 corrects for char height
    return image.resize((new_width, new_height))

def map_pixels_to_ascii_chars(image):
    pixels = image.getdata()
    ascii_str = ""
    for pixel_value in pixels:
        # Scale pixel (0-255) to ASCII_CHARS length
        index = int(pixel_value / 255 * (len(ASCII_CHARS)-1))
        ascii_str += ASCII_CHARS[index]
    return ascii_str

def convert_frame_to_ascii(image):
    image = image.convert('L')
    image = scale_image(image)
    ascii_str = map_pixels_to_ascii_chars(image)
    img_width = image.width
    ascii_img = "\n".join(
        [ascii_str[index:(index + img_width)] for index in range(0, len(ascii_str), img_width)]
    )
    return ascii_img

gif = Image.open(GIF_PATH)
frames = []

for frame in ImageSequence.Iterator(gif):
    ascii_img = convert_frame_to_ascii(frame)
    frames.append(ascii_img)

with open(OUTPUT_PATH, "w") as f:
    json.dump(frames, f)

print(f"Done! Saved {len(frames)} frames to {OUTPUT_PATH}")
