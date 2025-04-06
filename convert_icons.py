import cairosvg
import os

def convert_svg_to_png(svg_path, png_path, width, height):
    try:
        cairosvg.svg2png(
            url=svg_path,
            write_to=png_path,
            output_width=width,
            output_height=height
        )
        print(f"Successfully converted {svg_path} to {png_path}")
    except Exception as e:
        print(f"Error converting {svg_path}: {str(e)}")

# Convert both icons
convert_svg_to_png(
    'assets/icon-192x192.svg',
    'assets/icon-192x192.png',
    192,
    192
)

convert_svg_to_png(
    'assets/icon-512x512.svg',
    'assets/icon-512x512.png',
    512,
    512
) 