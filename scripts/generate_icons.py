import os
import math
from PIL import Image, ImageDraw, ImageFont

os.makedirs('public', exist_ok=True)

def draw_penny_on_path(size=512, is_maskable=False):
    # Base canvas
    img = Image.new('RGBA', (size, size), (15, 65, 74, 255)) # #0F414A ink background
    draw = ImageDraw.Draw(img)
    
    scale = size / 512.0

    # Path coordinates (cubic bezier points)
    # The path curves from bottom-left (100, 440) through (180, 340) and (260, 280) to (390, 130)
    # We sample points along the bezier curve
    def bezier_point(p0, p1, p2, p3, t):
        x = (1-t)**3 * p0[0] + 3*(1-t)**2*t * p1[0] + 3*(1-t)*t**2 * p2[0] + t**3 * p3[0]
        y = (1-t)**3 * p0[1] + 3*(1-t)**2*t * p1[1] + 3*(1-t)*t**2 * p2[1] + t**3 * p3[1]
        return (x * scale, y * scale)

    # Control points for the path
    p0 = (90, 440)
    p1 = (160, 360)
    p2 = (340, 320)
    p3 = (390, 110)

    # Draw the winding path ribbon with width ~54px
    ribbon_width = int(52 * scale)
    t_steps = 150
    curve_points = [bezier_point(p0, p1, p2, p3, i / t_steps) for i in range(t_steps + 1)]

    # Draw shadow / outer border for path
    for i in range(len(curve_points) - 1):
        pt1 = curve_points[i]
        pt2 = curve_points[i+1]
        draw.line([pt1, pt2], fill=(10, 45, 51, 255), width=ribbon_width + int(8 * scale))

    # Draw main road ribbon in paper color #EFE8DF
    for i in range(len(curve_points) - 1):
        pt1 = curve_points[i]
        pt2 = curve_points[i+1]
        draw.line([pt1, pt2], fill=(239, 232, 223, 255), width=ribbon_width)

    # Draw path dashed centerline in #D8BA98
    dash_width = int(4 * scale)
    for i in range(0, len(curve_points) - 1, 6):
        if i + 3 < len(curve_points):
            draw.line([curve_points[i], curve_points[i+3]], fill=(216, 186, 152, 255), width=dash_width)

    # Penny Coin: Center on the path at t=0.55
    coin_center = bezier_point(p0, p1, p2, p3, 0.52)
    cx, cy = coin_center
    coin_radius = 64 * scale

    # Coin drop shadow
    draw.ellipse(
        [cx - coin_radius - 2*scale, cy - coin_radius + 6*scale, 
         cx + coin_radius + 6*scale, cy + coin_radius + 12*scale],
        fill=(8, 35, 40, 180)
    )

    # Coin outer rim in warm bronze #9E7B54
    draw.ellipse(
        [cx - coin_radius, cy - coin_radius, cx + coin_radius, cy + coin_radius],
        fill=(158, 123, 84, 255)
    )

    # Coin inner face in golden sand #D8BA98
    inner_radius = coin_radius - (5 * scale)
    draw.ellipse(
        [cx - inner_radius, cy - inner_radius, cx + inner_radius, cy + inner_radius],
        fill=(216, 186, 152, 255)
    )

    # Subtle inner bevel highlight
    highlight_radius = inner_radius - (4 * scale)
    draw.ellipse(
        [cx - highlight_radius, cy - highlight_radius - 1*scale, cx + highlight_radius, cy + highlight_radius - 1*scale],
        outline=(240, 220, 190, 255),
        width=int(2 * scale)
    )

    # Draw ₹ symbol or coin emblem in ink #0F414A
    # Draw geometric ₹ mark for sharpness
    rx = cx
    ry = cy - (2 * scale)
    rw = 26 * scale
    rh = 34 * scale
    line_w = max(2, int(4.5 * scale))

    # Upper horizontal bar
    draw.line([(rx - rw/2, ry - rh/2), (rx + rw/2, ry - rh/2)], fill=(15, 65, 74, 255), width=line_w)
    # Middle horizontal bar
    draw.line([(rx - rw/2, ry - rh/6), (rx + rw/3, ry - rh/6)], fill=(15, 65, 74, 255), width=line_w)
    # Upper curve (arc) of R
    arc_box = [rx - rw/3, ry - rh/2, rx + rw/2, ry + rh/8]
    draw.arc(arc_box, start=270, end=90, fill=(15, 65, 74, 255), width=line_w)
    # Stem
    draw.line([(rx - rw/4, ry - rh/2), (rx - rw/4, ry + rh/8)], fill=(15, 65, 74, 255), width=line_w)
    # Slanted leg
    draw.line([(rx - rw/8, ry + rh/14), (rx + rw/2, ry + rh/2)], fill=(15, 65, 74, 255), width=line_w)

    # Decorative dots on coin border (milled edge simulation)
    num_dots = 20
    dot_dist = coin_radius - (2.5 * scale)
    for i in range(num_dots):
        angle = (2 * math.pi * i) / num_dots
        dot_x = cx + dot_dist * math.cos(angle)
        dot_y = cy + dot_dist * math.sin(angle)
        dot_r = max(1, 1.2 * scale)
        draw.ellipse([dot_x - dot_r, dot_y - dot_r, dot_x + dot_r, dot_y + dot_r], fill=(240, 220, 190, 200))

    return img

# Generate all icons
img_512 = draw_penny_on_path(512, False)
img_512.save('public/pwa-512x512.png')

img_192 = draw_penny_on_path(192, False)
img_192.save('public/pwa-192x192.png')

img_mask_512 = draw_penny_on_path(512, True)
img_mask_512.save('public/pwa-maskable-512x512.png')

img_mask_192 = draw_penny_on_path(192, True)
img_mask_192.save('public/pwa-maskable-192x192.png')

img_apple = draw_penny_on_path(180, False)
img_apple.save('public/apple-touch-icon.png')

# Favicon 64x64 and 32x32
img_64 = draw_penny_on_path(64, False)
img_64.save('public/favicon.ico', format='ICO')
print("Successfully generated all PWA icons in /public")
