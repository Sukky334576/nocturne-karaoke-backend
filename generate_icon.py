import math
from PIL import Image, ImageDraw, ImageFilter

def create_nocturne_icon(size=1024):
    # Master image at 1024x1024
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    # Scale factor
    s = size / 1024.0

    def pt(x, y):
        return (x * s, y * s)

    # 1. Background Squircle
    # Rounded rectangle from (56, 56) to (968, 968) with radius 210
    squircle_box = [56 * s, 56 * s, 968 * s, 968 * s]
    radius = 210 * s

    # Draw shadow
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle([60 * s, 68 * s, 964 * s, 976 * s], radius=radius, fill=(0, 0, 0, 180))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=28 * s))
    im.paste(shadow, (0, 0), shadow)

    # Obsidian Background fill
    # Radial dark obsidian fill
    bg_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(bg_img)
    bg_draw.rounded_rectangle(squircle_box, radius=radius, fill=(10, 12, 18, 255))
    
    # Add subtle radial lighting inside squircle
    radial = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rdraw = ImageDraw.Draw(radial)
    center_x, center_y = 512 * s, 420 * s
    for r in range(int(460 * s), 0, -6):
        pct = 1.0 - (r / (460.0 * s))
        # Warm gold/amber ambient studio glow
        alpha = int(45 * (pct ** 1.8))
        rdraw.ellipse([center_x - r, center_y - r, center_x + r, center_y + r], fill=(216, 177, 93, alpha))
    
    # Mask radial glow to squircle
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(squircle_box, radius=radius, fill=255)
    bg_img.paste(radial, (0, 0), mask)
    im.paste(bg_img, (0, 0), bg_img)

    # Re-draw on master image
    draw = ImageDraw.Draw(im)

    # Background fine acoustic mesh lines (subtle concentric circles)
    for r in [260, 310, 360, 410]:
        r_px = r * s
        draw.ellipse(
            [center_x - r_px, center_y - r_px, center_x + r_px, center_y + r_px],
            outline=(216, 177, 93, 20),
            width=int(1.5 * s)
        )

    # Squircle Gold Borders
    # Outer champagne gold rim
    draw.rounded_rectangle(squircle_box, radius=radius, outline=(216, 177, 93, 255), width=int(14 * s))
    # Inner gold accent line
    inner_box = [76 * s, 76 * s, 948 * s, 948 * s]
    draw.rounded_rectangle(inner_box, radius=radius - 16 * s, outline=(244, 230, 195, 75), width=int(2 * s))

    # 2. Acoustic Sound Waves (Left & Right lateral waves)
    wave_radii = [(230 * s, 11 * s, 255), (280 * s, 9 * s, 210), (330 * s, 7 * s, 160)]
    for wr, ww, wa in wave_radii:
        # Left wave arcs (angle around 155 to 205 deg)
        draw.arc([center_x - wr, center_y - wr, center_x + wr, center_y + wr],
                 start=148, end=212, fill=(244, 230, 195, wa), width=int(ww))
        # Right wave arcs (angle around -32 to 32 deg)
        draw.arc([center_x - wr, center_y - wr, center_x + wr, center_y + wr],
                 start=-32, end=32, fill=(244, 230, 195, wa), width=int(ww))

    # 3. Studio Shockmount Outer Ring
    sm_radius = 175 * s
    draw.ellipse([center_x - sm_radius, center_y - sm_radius, center_x + sm_radius, center_y + sm_radius],
                 outline=(216, 177, 93, 220), width=int(8 * s))
    # Shockmount connector pins / knurled nodes (left, right, top-left, top-right, bottom-left, bottom-right)
    for angle in [0, 45, 135, 180, 225, 315]:
        rad = math.radians(angle)
        px = center_x + sm_radius * math.cos(rad)
        py = center_y + sm_radius * math.sin(rad)
        draw.ellipse([px - 7 * s, py - 7 * s, px + 7 * s, py + 7 * s], fill=(244, 230, 195, 255))

    # Shockmount elastic band suspensions
    # Diagonal lines from shockmount to mic chassis
    draw.line([center_x - sm_radius * 0.7, center_y - sm_radius * 0.7, center_x - 70 * s, center_y - 20 * s],
              fill=(150, 117, 36, 180), width=int(3 * s))
    draw.line([center_x + sm_radius * 0.7, center_y - sm_radius * 0.7, center_x + 70 * s, center_y - 20 * s],
              fill=(150, 117, 36, 180), width=int(3 * s))
    draw.line([center_x - sm_radius * 0.7, center_y + sm_radius * 0.7, center_x - 70 * s, center_y + 120 * s],
              fill=(150, 117, 36, 180), width=int(3 * s))
    draw.line([center_x + sm_radius * 0.7, center_y + sm_radius * 0.7, center_x + 70 * s, center_y + 120 * s],
              fill=(150, 117, 36, 180), width=int(3 * s))

    # 4. Condenser Microphone Lower Body (Cylinder with Obsidian & Gold Chamfers)
    body_w = 144 * s
    body_left = center_x - body_w / 2
    body_right = center_x + body_w / 2
    body_top = center_y + 20 * s
    body_bottom = center_y + 240 * s

    # Mic Body shadow & base
    draw.rectangle([body_left, body_top, body_right, body_bottom], fill=(16, 19, 28, 255))
    # Beveled body side highlights
    draw.rectangle([body_left, body_top, body_left + 8 * s, body_bottom], fill=(216, 177, 93, 140))
    draw.rectangle([body_right - 8 * s, body_top, body_right, body_bottom], fill=(150, 117, 36, 140))
    # Gold border for body
    draw.rectangle([body_left, body_top, body_right, body_bottom], outline=(216, 177, 93, 240), width=int(5 * s))

    # Monogram Crest 'N' on Microphone Body
    # Draw an elegant bespoke Serif Monogram 'N'
    n_top = body_top + 40 * s
    n_bottom = body_bottom - 40 * s
    n_left = body_left + 30 * s
    n_right = body_right - 30 * s

    # Left vertical stem of N
    stem_w = 12 * s
    draw.rectangle([n_left, n_top, n_left + stem_w, n_bottom], fill=(244, 230, 195, 255))
    # Serif caps left
    draw.rectangle([n_left - 8 * s, n_top, n_left + stem_w + 6 * s, n_top + 6 * s], fill=(244, 230, 195, 255))
    draw.rectangle([n_left - 8 * s, n_bottom - 6 * s, n_left + stem_w + 6 * s, n_bottom], fill=(244, 230, 195, 255))

    # Right vertical stem of N
    draw.rectangle([n_right - stem_w, n_top, n_right, n_bottom], fill=(244, 230, 195, 255))
    # Serif caps right
    draw.rectangle([n_right - stem_w - 6 * s, n_top, n_right + 8 * s, n_top + 6 * s], fill=(244, 230, 195, 255))
    draw.rectangle([n_right - stem_w - 6 * s, n_bottom - 6 * s, n_right + 8 * s, n_bottom], fill=(244, 230, 195, 255))

    # Diagonal stroke of N (polygon)
    diag_poly = [
        (n_left, n_top),
        (n_left + stem_w + 6 * s, n_top),
        (n_right, n_bottom),
        (n_right - stem_w - 6 * s, n_bottom)
    ]
    draw.polygon(diag_poly, fill=(216, 177, 93, 255))

    # 5. Microphone Central Separation Collar (Gold Band)
    collar_h = 24 * s
    collar_w = 158 * s
    collar_left = center_x - collar_w / 2
    collar_right = center_x + collar_w / 2
    collar_top = body_top - collar_h + 2 * s
    collar_bottom = body_top + 2 * s

    draw.rounded_rectangle([collar_left, collar_top, collar_right, collar_bottom],
                           radius=4 * s, fill=(244, 230, 195, 255), outline=(150, 117, 36, 255), width=int(3 * s))
    # Center knurl highlight
    draw.line([collar_left + 10 * s, collar_top + collar_h / 2, collar_right - 10 * s, collar_top + collar_h / 2],
              fill=(255, 255, 255, 180), width=int(2 * s))

    # 6. Condenser Microphone Capsule (Grille Mesh & Gold Frame)
    capsule_w = 144 * s
    capsule_left = center_x - capsule_w / 2
    capsule_right = center_x + capsule_w / 2
    capsule_bottom = collar_top
    capsule_h = 190 * s
    capsule_top = capsule_bottom - capsule_h
    capsule_radius = capsule_w / 2  # Dome

    # Capsule dark mesh backing
    draw.rounded_rectangle([capsule_left, capsule_top, capsule_right, capsule_bottom],
                           radius=capsule_radius, fill=(12, 14, 22, 255))

    # Horizontal Grille Wires
    num_wires = 11
    step_y = capsule_h / (num_wires + 1)
    for i in range(1, num_wires + 1):
        gy = capsule_top + i * step_y
        # Compute width at this y
        dy = gy - (capsule_top + capsule_radius)
        if dy < 0:
            # Inside the upper dome
            dx = math.sqrt(max(0, capsule_radius ** 2 - dy ** 2))
            gw_left = center_x - dx + 4 * s
            gw_right = center_x + dx - 4 * s
        else:
            gw_left = capsule_left + 4 * s
            gw_right = capsule_right - 4 * s
        
        if gw_right > gw_left:
            draw.line([gw_left, gy, gw_right, gy], fill=(216, 177, 93, 170), width=int(2.5 * s))

    # Vertical Grille Center Spine
    draw.line([center_x, capsule_top + 10 * s, center_x, capsule_bottom],
              fill=(244, 230, 195, 240), width=int(4 * s))

    # Capsule Outer Gold Perimeter
    draw.rounded_rectangle([capsule_left, capsule_top, capsule_right, capsule_bottom],
                           radius=capsule_radius, outline=(216, 177, 93, 255), width=int(6 * s))

    # 7. Microphone XLR Base and Swivel Mount
    xlr_w = 56 * s
    xlr_h = 44 * s
    xlr_left = center_x - xlr_w / 2
    xlr_right = center_x + xlr_w / 2
    xlr_top = body_bottom
    xlr_bottom = xlr_top + xlr_h
    draw.rectangle([xlr_left, xlr_top, xlr_right, xlr_bottom], fill=(216, 177, 93, 240))
    draw.line([xlr_left + 6 * s, xlr_top + xlr_h / 2, xlr_right - 6 * s, xlr_top + xlr_h / 2],
              fill=(255, 255, 255, 200), width=int(2 * s))

    # Swivel knuckle
    swivel_radius = 20 * s
    draw.circle((center_x, xlr_bottom + swivel_radius), swivel_radius, fill=(150, 117, 36, 255), outline=(244, 230, 195, 255), width=int(3 * s))
    # Stand pole
    pole_w = 18 * s
    draw.rectangle([center_x - pole_w / 2, xlr_bottom + swivel_radius * 2, center_x + pole_w / 2, 850 * s], fill=(216, 177, 93, 220))

    # 8. Studio Crest Star / Diamond at the Top
    star_y = 125 * s
    star_size = 22 * s
    star_poly = [
        (center_x, star_y - star_size),
        (center_x + star_size * 0.35, star_y - star_size * 0.35),
        (center_x + star_size, star_y),
        (center_x + star_size * 0.35, star_y + star_size * 0.35),
        (center_x, star_y + star_size),
        (center_x - star_size * 0.35, star_y + star_size * 0.35),
        (center_x - star_size, star_y),
        (center_x - star_size * 0.35, star_y - star_size * 0.35),
    ]
    draw.polygon(star_poly, fill=(255, 246, 214, 255))

    # Flanking small diamond pips
    for offset in [-48 * s, 48 * s]:
        pip_poly = [
            (center_x + offset, star_y - 6 * s),
            (center_x + offset + 6 * s, star_y),
            (center_x + offset, star_y + 6 * s),
            (center_x + offset - 6 * s, star_y),
        ]
        draw.polygon(pip_poly, fill=(216, 177, 93, 200))

    return im

if __name__ == "__main__":
    master = create_nocturne_icon(1024)
    master.save("resources/icon_1024.png", "PNG")
    
    # Save standard PNG
    icon_256 = master.resize((256, 256), Image.Resampling.LANCZOS)
    icon_256.save("resources/icon.png", "PNG")

    # Generate multi-resolution ICO (256, 128, 64, 48, 32, 16)
    sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    master.save("resources/icon.ico", format="ICO", sizes=sizes)
    print("Successfully generated bespoke multi-resolution resources/icon.ico and icon.png!")
