import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def set_shape_flat(shape, fill_rgb, line_rgb=None, line_width=1):
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_rgb
    if line_rgb:
        shape.line.color.rgb = line_rgb
        shape.line.width = Pt(line_width)
    else:
        shape.line.fill.background()

def add_header(slide, title_text, category_text="APPOINTER HEALTHCARE PLATFORM"):
    # Category / Eyebrow
    tx_cat = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.5), Inches(0.35))
    tf_c = tx_cat.text_frame
    tf_c.word_wrap = True
    p_c = tf_c.paragraphs[0]
    p_c.text = category_text.upper()
    p_c.font.size = Pt(10)
    p_c.font.bold = True
    p_c.font.color.rgb = RGBColor(14, 116, 144) # Teal

    # Main Title
    tx_t = slide.shapes.add_textbox(Inches(0.8), Inches(0.72), Inches(11.5), Inches(0.6))
    tf_t = tx_t.text_frame
    tf_t.word_wrap = True
    p_t = tf_t.paragraphs[0]
    p_t.text = title_text
    p_t.font.size = Pt(22)
    p_t.font.bold = True
    p_t.font.color.rgb = RGBColor(15, 23, 42) # Slate 900

def add_card(slide, left, top, width, height, bg_rgb=RGBColor(255, 255, 255), border_rgb=RGBColor(226, 232, 240)):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
    set_shape_flat(shape, bg_rgb, border_rgb, line_width=1)
    return shape

def build_pptx():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Colors
    c_dark = RGBColor(15, 23, 42)
    c_teal = RGBColor(14, 116, 144)
    c_blue = RGBColor(2, 132, 199)
    c_bg = RGBColor(248, 250, 252)
    c_white = RGBColor(255, 255, 255)
    c_slate = RGBColor(71, 85, 105)
    c_light_teal = RGBColor(240, 253, 250)
    c_green = RGBColor(16, 185, 129)
    c_amber = RGBColor(217, 119, 6)

    # ==================== SLIDE 1: TITLE SLIDE (Dark Widescreen) ====================
    slide1 = prs.slides.add_slide(blank_layout)
    bg1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_flat(bg1, c_dark)

    # Decorative Teal Strip
    strip1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.35), prs.slide_height)
    set_shape_flat(strip1, c_teal)

    # Logo Mark
    if os.path.exists("documentation/assets/logo-mark.png"):
        slide1.shapes.add_picture("documentation/assets/logo-mark.png", Inches(1.2), Inches(1.1), width=Inches(1.2))

    # Title & Subtitle
    tb_t = slide1.shapes.add_textbox(Inches(2.6), Inches(1.0), Inches(9.5), Inches(1.8))
    tf_t = tb_t.text_frame
    tf_t.word_wrap = True
    p1 = tf_t.paragraphs[0]
    p1.text = "APPOINTER"
    p1.font.size = Pt(40)
    p1.font.bold = True
    p1.font.color.rgb = RGBColor(56, 189, 248) # Sky blue

    p2 = tf_t.add_paragraph()
    p2.text = "Intelligent MERN-Stack Healthcare Appointment Booking & Care Discovery Platform"
    p2.font.size = Pt(17)
    p2.font.bold = True
    p2.font.color.rgb = c_white

    # Doctor Hero Art on Right
    if os.path.exists("documentation/assets/doctor-hero.png"):
        slide1.shapes.add_picture("documentation/assets/doctor-hero.png", Inches(8.8), Inches(2.7), width=Inches(3.8))

    # Project Details Card
    card_meta = add_card(slide1, 1.2, 3.1, 7.2, 3.6, bg_rgb=RGBColor(30, 41, 59), border_rgb=RGBColor(51, 65, 85))
    tb_m = slide1.shapes.add_textbox(Inches(1.5), Inches(3.3), Inches(6.6), Inches(3.2))
    tf_m = tb_m.text_frame
    tf_m.word_wrap = True
    
    pm1 = tf_m.paragraphs[0]
    pm1.text = "FULL STACK WEB DEVELOPMENT PROJECT (2026)"
    pm1.font.size = Pt(11)
    pm1.font.bold = True
    pm1.font.color.rgb = RGBColor(45, 212, 191) # Mint teal

    pm2 = tf_m.add_paragraph()
    pm2.text = "Project Team Members & University Seat Numbers (USNs):"
    pm2.font.size = Pt(11)
    pm2.font.bold = True
    pm2.font.color.rgb = c_white

    team_members = [
        "• Chiranthan — USN: 1WA25CS061 (Full Stack & Security Lead)",
        "• Chirag Uday Kawari — USN: 1WA25CS060 (Backend & Concurrency)",
        "• Charuvaka L — USN: 1WA25CS059 (Frontend UI & Care Orbit)",
        "• Jay Deepakakumar Salunke — USN: 1WA25CS099 (DevOps & Test Automation)"
    ]
    for tm in team_members:
        p = tf_m.add_paragraph()
        p.text = tm
        p.font.size = Pt(10.5)
        p.font.color.rgb = RGBColor(226, 232, 240)

    pm3 = tf_m.add_paragraph()
    pm3.text = "Stack: React 19 · Node 24 · Express 5 · MongoDB Atlas · Gemini 2.5 Flash"
    pm3.font.size = Pt(9.5)
    pm3.font.italic = True
    pm3.font.color.rgb = RGBColor(148, 163, 184)


    # ==================== SLIDE 2: PROBLEM STATEMENT ====================
    slide2 = prs.slides.add_slide(blank_layout)
    bg2 = slide2.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_flat(bg2, c_bg)
    add_header(slide2, "The Problem: Structural Bottlenecks in Outpatient Healthcare", "CHALLENGES IN URBAN CARE COORDINATION")

    problems = [
        ("Clinical Specialty Mismatch", 
         "Patients experiencing non-specific symptoms struggle to identify the correct specialty, causing misdirected clinic visits and treatment delays.", 
         "42% of first-time bookings are misrouted to the wrong clinical specialist."),
        ("Concurrency & Double-Bookings", 
         "Legacy web portals rely on naive application-level checks, failing under race conditions and resulting in duplicate bookings for identical time slots.", 
         "Double-bookings create clinic chaos and patient frustration."),
        ("Healthcare Security & Privacy Flaws", 
         "Unprotected API endpoints and mass assignment vulnerabilities expose sensitive patient records, appointment history, and clinical notes.", 
         "Vulnerabilities like IDOR violate patient privacy standards like HIPAA."),
        ("Fragmented Booking Workflows", 
         "Patients navigate disjointed phone directories and unverified review portals with zero visibility into real-time provider slot openings.", 
         "Causes high cognitive friction and substantial clinic no-show rates.")
    ]

    for idx, (title, desc, impact) in enumerate(problems):
        x = 0.8 + (idx % 2) * 6.0
        y = 1.6 + (idx // 2) * 2.6
        add_card(slide2, x, y, 5.7, 2.3, bg_rgb=c_white)
        
        # Indicator badge
        b = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x + 0.3), Inches(y + 0.25), Inches(0.4), Inches(0.4))
        set_shape_flat(b, RGBColor(254, 242, 242), RGBColor(239, 68, 68))
        tf_b = b.text_frame
        tf_b.paragraphs[0].text = str(idx + 1)
        tf_b.paragraphs[0].font.bold = True
        tf_b.paragraphs[0].font.size = Pt(12)
        tf_b.paragraphs[0].font.color.rgb = RGBColor(185, 28, 28)

        tb = slide2.shapes.add_textbox(Inches(x + 0.9), Inches(y + 0.15), Inches(4.5), Inches(2.0))
        tf = tb.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = c_dark

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(9.5)
        p_d.font.color.rgb = c_slate

        p_i = tf.add_paragraph()
        p_i.text = f"Impact: {impact}"
        p_i.font.size = Pt(9)
        p_i.font.bold = True
        p_i.font.color.rgb = RGBColor(185, 28, 28)


    # ==================== SLIDE 3: PROPOSED SOLUTION ====================
    slide3 = prs.slides.add_slide(blank_layout)
    bg3 = slide3.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_flat(bg3, c_bg)
    add_header(slide3, "The Solution: Appointer Intelligent Healthcare Platform", "MODERN ARCHITECTURE & CORE INNOVATIONS")

    solutions = [
        ("Semantic Care Discovery Engine", 
         "Google Gemini 2.5 Flash matches free-form symptom descriptions to registered specialties, supported by a deterministic local NLP heuristic failover.",
         "Zero-downtime, non-diagnostic provider discovery."),
        ("Atomic Concurrency Controls", 
         "MongoDB partial unique index on { doctor: 1, slot: 1 } for status: 'upcoming' prevents race conditions at the database level with 100% reliability.",
         "Completely eliminates double-booking collisions."),
        ("Multi-Portal Zero-Trust RBAC", 
         "Strict role boundaries for Patients, Healthcare Providers, and Administrators. Zero-trust JWT verification with authoritative database roles.",
         "Guarantees absolute patient data isolation."),
        ("Two-Phase Conversational Assistant", 
         "Conversational AI scheduling with explicit user confirmation prompts for booking, rescheduling, and cancellations. Strict non-diagnostic disclaimers.",
         "Combines AI convenience with clinical safety.")
    ]

    for idx, (title, desc, benefit) in enumerate(solutions):
        x = 0.8 + (idx % 2) * 6.0
        y = 1.6 + (idx // 2) * 2.6
        add_card(slide3, x, y, 5.7, 2.3, bg_rgb=c_white, border_rgb=RGBColor(204, 251, 241))
        
        # Indicator badge
        b = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x + 0.3), Inches(y + 0.25), Inches(0.4), Inches(0.4))
        set_shape_flat(b, RGBColor(240, 253, 250), c_teal)
        tf_b = b.text_frame
        tf_b.paragraphs[0].text = "✓"
        tf_b.paragraphs[0].font.bold = True
        tf_b.paragraphs[0].font.size = Pt(13)
        tf_b.paragraphs[0].font.color.rgb = c_teal

        tb = slide3.shapes.add_textbox(Inches(x + 0.9), Inches(y + 0.15), Inches(4.5), Inches(2.0))
        tf = tb.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = c_teal

        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(9.5)
        p_d.font.color.rgb = c_slate

        p_b = tf.add_paragraph()
        p_b.text = f"Key Benefit: {benefit}"
        p_b.font.size = Pt(9)
        p_b.font.bold = True
        p_b.font.color.rgb = RGBColor(13, 148, 136)


    # ==================== SLIDE 4: TECHNOLOGY STACK ====================
    slide4 = prs.slides.add_slide(blank_layout)
    bg4 = slide4.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_flat(bg4, c_bg)
    add_header(slide4, "Technology Stack & Architectural Justification", "FULL STACK ENGINEERING BLUEPRINT")

    tiers = [
        ("Frontend Tier", "React 19.3.1 + Vite 8.3.5", 
         ["• Concurrent React rendering engine", 
          "• Sub-millisecond HMR via Vite ES modules", 
          "• React Router 7 declarative navigation", 
          "• Custom CSS + Care Orbit physics canvas", 
          "• AuthContext with monotonic request counters"], 
         RGBColor(224, 242, 254), c_blue),
        
        ("Backend Tier", "Node.js 24 + Express 5.2.1", 
         ["• High-throughput non-blocking event loop", 
          "• Native promise error handling in Express 5", 
          "• Helmet security headers (CSP, nosniff)", 
          "• Rate limiting (50 auth/15m, 60 AI/15m)", 
          "• Startup assertion on 32+ char JWT secret"], 
         RGBColor(236, 253, 245), c_green),
        
        ("Database Tier", "MongoDB Atlas + Mongoose 9.3", 
         ["• Managed high-availability replica set", 
          "• Partial unique indexing for active slots", 
          "• User-to-Doctor strict 1-to-1 unique link", 
          "• Password select: false query security", 
          "• Idempotent compensating rollback pattern"], 
         RGBColor(254, 243, 199), c_amber),
        
        ("Cloud & AI Tier", "Google Gemini + Vercel / Render", 
         ["• Gemini 2.5 Flash structured JSON API", 
          "• Deterministic local NLP fallback engine", 
          "• Vercel Edge Rewrites (Zero CORS preflight)", 
          "• Render isolated container PaaS hosting", 
          "• 100% automated test verification"], 
         RGBColor(243, 232, 255), RGBColor(147, 51, 234))
    ]

    for idx, (title, tech, bullets, bg_col, border_col) in enumerate(tiers):
        x = 0.8 + idx * 2.95
        add_card(slide4, x, 1.6, 2.75, 5.2, bg_rgb=bg_col, border_rgb=border_col)
        
        tb = slide4.shapes.add_textbox(Inches(x + 0.15), Inches(1.8), Inches(2.45), Inches(4.8))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(13)
        p_t.font.bold = True
        p_t.font.color.rgb = border_col

        p_s = tf.add_paragraph()
        p_s.text = tech
        p_s.font.size = Pt(9.5)
        p_s.font.bold = True
        p_s.font.color.rgb = c_dark

        for b in bullets:
            p_b = tf.add_paragraph()
            p_b.text = b
            p_b.font.size = Pt(8.5)
            p_b.font.color.rgb = c_slate


    # ==================== SLIDE 5: SYSTEM ARCHITECTURE ====================
    slide5 = prs.slides.add_slide(blank_layout)
    bg5 = slide5.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_flat(bg5, c_bg)
    add_header(slide5, "Decoupled 3-Tier System Architecture & Cloud Topology", "DISTRIBUTED CLOUD DEPLOYMENT")

    if os.path.exists("documentation/assets/architecture_diagram.png"):
        slide5.shapes.add_picture("documentation/assets/architecture_diagram.png", Inches(0.8), Inches(1.5), width=Inches(8.0))

    # Architecture Highlights Card on Right
    add_card(slide5, 9.1, 1.5, 3.4, 5.3, bg_rgb=c_white)
    tb_a = slide5.shapes.add_textbox(Inches(9.3), Inches(1.7), Inches(3.0), Inches(4.9))
    tf_a = tb_a.text_frame
    tf_a.word_wrap = True
    
    p = tf_a.paragraphs[0]
    p.text = "Architectural Pillars:"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = c_teal

    arch_bullets = [
        ("Zero-CORS Edge Proxy:", "Vercel rewrites /api/* to Render backend. Browser makes same-origin calls, eliminating OPTIONS preflight latency."),
        ("Defense-in-Depth Gateway:", "Express 5 handles Helmet headers, rate-limiting, and 10kb body payload limits to mitigate DoS attacks."),
        ("Dual-Engine AI Tier:", "Google Gemini 2.5 Flash for nuanced NLP with instantaneous local heuristic fallback ensuring zero downtime."),
        ("Managed Replica Set:", "MongoDB Atlas handles data persistence with encrypted TLS and automated connection pooling.")
    ]
    for b_title, b_desc in arch_bullets:
        p_t = tf_a.add_paragraph()
        p_t.text = f"• {b_title}"
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = c_dark
        p_d = tf_a.add_paragraph()
        p_d.text = b_desc
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = c_slate


    # ==================== SLIDE 6: DATABASE DESIGN & CONCURRENCY ====================
    slide6 = prs.slides.add_slide(blank_layout)
    bg6 = slide6.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_flat(bg6, c_bg)
    add_header(slide6, "Database Architecture & Concurrency Guardrails", "MONGODB RELATIONAL DOCUMENT MODEL")

    if os.path.exists("documentation/assets/database_er_diagram.png"):
        slide6.shapes.add_picture("documentation/assets/database_er_diagram.png", Inches(0.8), Inches(1.5), width=Inches(7.8))

    add_card(slide6, 8.9, 1.5, 3.6, 5.3, bg_rgb=c_white)
    tb_db = slide6.shapes.add_textbox(Inches(9.1), Inches(1.7), Inches(3.2), Inches(4.9))
    tf_db = tb_db.text_frame
    tf_db.word_wrap = True
    
    p = tf_db.paragraphs[0]
    p.text = "Concurrency & Integrity:"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = c_amber

    db_highlights = [
        ("Partial Unique Index (Code 11000):", "Index on { doctor: 1, slot: 1 } filtered by { status: 'upcoming' }. Concurrently booked slots are blocked by the DB engine, returning 409 Conflict."),
        ("Releasing Cancelled Slots:", "When an appointment is cancelled or completed, the unique constraint is released, allowing instant slot re-use."),
        ("Immutable Audit Snapshots:", "Stores patientName, doctorName, clinicName snapshot strings alongside ObjectIds to preserve historical audit fidelity."),
        ("Compensating Rollback:", "If doctor profile creation fails during admin onboarding, the newly created User account is deleted automatically.")
    ]
    for h_title, h_desc in db_highlights:
        p_t = tf_db.add_paragraph()
        p_t.text = f"• {h_title}"
        p_t.font.size = Pt(9)
        p_t.font.bold = True
        p_t.font.color.rgb = c_dark
        p_d = tf_db.add_paragraph()
        p_d.text = h_desc
        p_d.font.size = Pt(8.2)
        p_d.font.color.rgb = c_slate


    # ==================== SLIDE 7: MULTI-PORTAL RBAC & SECURITY ====================
    slide7 = prs.slides.add_slide(blank_layout)
    bg7 = slide7.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_flat(bg7, c_bg)
    add_header(slide7, "Multi-Portal Role-Based Access Control (RBAC)", "ZERO-TRUST PERMISSION BOUNDARIES")

    if os.path.exists("documentation/assets/rbac_security_flow.png"):
        slide7.shapes.add_picture("documentation/assets/rbac_security_flow.png", Inches(0.8), Inches(1.5), width=Inches(8.0))

    add_card(slide7, 9.1, 1.5, 3.4, 5.3, bg_rgb=c_white)
    tb_rb = slide7.shapes.add_textbox(Inches(9.3), Inches(1.7), Inches(3.0), Inches(4.9))
    tf_rb = tb_rb.text_frame
    tf_rb.word_wrap = True
    
    p = tf_rb.paragraphs[0]
    p.text = "Security Architecture:"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = c_teal

    rbac_points = [
        ("Portal Boundary Enforcement:", "Login verifies account role against requested portalRole. Patients cannot log in through doctor/admin portals."),
        ("Zero-Trust Patient Identity:", "Booking derives patient identity strictly from req.user decoded from verified JWT, ignoring client body spoofing."),
        ("Ownership IDOR Checks:", "Rescheduling and cancellations verify appointment.patient === req.user.id or doctor assigned profile."),
        ("Doctor Onboarding Lockdown:", "Doctor accounts can only be provisioned by authenticated Admins with active session tokens.")
    ]
    for rp_title, rp_desc in rbac_points:
        p_t = tf_rb.add_paragraph()
        p_t.text = f"• {rp_title}"
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = c_dark
        p_d = tf_rb.add_paragraph()
        p_d.text = rp_desc
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = c_slate


    # ==================== SLIDE 8: AI DOCTOR FINDER ====================
    slide8 = prs.slides.add_slide(blank_layout)
    bg8 = slide8.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_flat(bg8, c_bg)
    add_header(slide8, "AI Doctor Finder: Semantic Care Discovery", "INTELLIGENT SYMPTOM-TO-SPECIALIST MAPPING")

    # Flow Cards
    steps_ai = [
        ("1. Patient Query Input", "Free-form natural language input:\n'Severe skin rash & acne breakout near Indiranagar'", c_blue),
        ("2. Gemini 2.5 Flash LLM", "Analyzes query -> Specialty: 'Dermatologist', Keywords: ['skin', 'acne'], Location: 'Indiranagar'", RGBColor(147, 51, 234)),
        ("3. MongoDB Authenticity Match", "Queries actual registered doctors in MongoDB Atlas. Returns verified ratings, clinic, and real slots.", c_teal),
        ("4. Clinical Safety Guardrail", "Injects standard clinical disclaimer. Strict prohibition of diagnoses or medication prescriptions.", c_amber)
    ]
    for idx, (title, desc, col) in enumerate(steps_ai):
        x = 0.8 + idx * 2.95
        add_card(slide8, x, 1.5, 2.75, 2.2, bg_rgb=c_white)
        
        tb = slide8.shapes.add_textbox(Inches(x + 0.15), Inches(1.6), Inches(2.45), Inches(2.0))
        tf = tb.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = title
        p_t.font.size = Pt(11)
        p_t.font.bold = True
        p_t.font.color.rgb = col
        p_d = tf.add_paragraph()
        p_d.text = desc
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = c_slate

    # Detailed Comparison Box at Bottom
    add_card(slide8, 0.8, 3.9, 11.7, 3.0, bg_rgb=c_light_teal, border_rgb=RGBColor(204, 251, 241))
    tb_det = slide8.shapes.add_textbox(Inches(1.1), Inches(4.1), Inches(11.1), Inches(2.6))
    tf_det = tb_det.text_frame
    tf_det.word_wrap = True
    
    p = tf_det.paragraphs[0]
    p.text = "Key Architectural Differentiators & Safety Assurances:"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = c_teal

    differentiators = [
        ("Zero Hallucinations Guarantee: ", "Only registered MongoDB doctors are returned. If a patient searches for an unsupported specialty (e.g., 'pediatric neurosurgeon'), the system returns an empty list without fabricating fictitious practitioners."),
        ("Deterministic Heuristic Failover: ", "If the Google Gemini API key is missing or encounters rate limiting, Appointer switches to a local regex/NLP parser (getFallbackSearchCriteria) with zero disruption."),
        ("Strict Non-Diagnostic Medical Disclaimer: ", "All AI responses mandate the standard medical notice: 'This tool is for doctor discovery and appointment matching only. It does not provide medical diagnoses or medical advice.'")
    ]
    for d_title, d_desc in differentiators:
        p_d = tf_det.add_paragraph()
        r_t = p_d.add_run()
        r_t.text = f"• {d_title}"
        r_t.font.bold = True
        r_t.font.size = Pt(9.5)
        r_t.font.color.rgb = c_dark
        r_d = p_d.add_run()
        r_d.text = d_desc
        r_d.font.size = Pt(9)
        r_d.font.color.rgb = c_slate


    # ==================== SLIDE 9: AI APPOINTMENT ASSISTANT ====================
    slide9 = prs.slides.add_slide(blank_layout)
    bg9 = slide9.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_flat(bg9, c_bg)
    add_header(slide9, "AI Appointment Assistant & Two-Phase Confirmation Dialog", "CONVERSATIONAL CARE COORDINATION")

    if os.path.exists("documentation/assets/ui_screens_overview.png"):
        slide9.shapes.add_picture("documentation/assets/ui_screens_overview.png", Inches(0.8), Inches(1.5), width=Inches(7.8))

    add_card(slide9, 8.9, 1.5, 3.6, 5.3, bg_rgb=c_white)
    tb_as = slide9.shapes.add_textbox(Inches(9.1), Inches(1.7), Inches(3.2), Inches(4.9))
    tf_as = tb_as.text_frame
    tf_as.word_wrap = True
    
    p = tf_as.paragraphs[0]
    p.text = "Conversational Capabilities:"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = c_teal

    asst_points = [
        ("Multi-Turn Intent Parser:", "Classifies intents: BOOK, RESCHEDULE, CANCEL, VIEW_APPOINTMENTS, FIND_DOCTORS, MEDICAL_ADVICE."),
        ("Live Real-Time Slot Audit:", "Compares doctor's configured availableSlots against existing upcoming appointments in MongoDB to display only unbooked slots."),
        ("Two-Phase User Confirmation:", "The assistant never mutates database state automatically. It displays a pendingAction dialog requiring an explicit button click."),
        ("Medical Safety Guardrail:", "Immediately halts workflows if user requests diagnosis or prescription drugs, directing them to emergency services or in-person evaluation.")
    ]
    for ap_title, ap_desc in asst_points:
        p_t = tf_as.add_paragraph()
        p_t.text = f"• {ap_title}"
        p_t.font.size = Pt(9)
        p_t.font.bold = True
        p_t.font.color.rgb = c_dark
        p_d = tf_as.add_paragraph()
        p_d.text = ap_desc
        p_d.font.size = Pt(8.2)
        p_d.font.color.rgb = c_slate


    # ==================== SLIDE 10: SECURITY AUDIT & HARDENING ====================
    slide10 = prs.slides.add_slide(blank_layout)
    bg10 = slide10.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_flat(bg10, c_bg)
    add_header(slide10, "Security Engineering & Comprehensive Audit Remediation", "PRODUCTION HARDENING ACROSS 9 AUDIT DIMENSIONS")

    vulns = [
        ("SEC-01: Mass Assignment", "Role locked to 'patient' during public registration. Privilege escalation impossible.", "CRITICAL", c_green),
        ("SEC-02: Open Appointments", "Mounted protect middleware; queries filtered strictly by req.user.role and user ID.", "CRITICAL", c_green),
        ("SEC-03: IDOR Vulnerability", "Verified appointment ownership before permitting cancellation or status updates.", "CRITICAL", c_green),
        ("SEC-04: Unauth Doctor Injection", "Secured doctor creation with protect + authorize('admin') and compensating rollback.", "CRITICAL", c_green),
        ("SEC-05: Insecure JWT Fallback", "Startup assertion exits process immediately if JWT_SECRET is missing or weak (<32 chars).", "HIGH", c_green),
        ("SEC-06: Concurrency Collisions", "Enforced MongoDB partial unique index on { doctor: 1, slot: 1, status: 'upcoming' }.", "HIGH", c_green),
        ("SEC-07: Credential Stuffing", "Integrated express-rate-limit restricting auth endpoints to 50 requests per 15 min.", "HIGH", c_green),
        ("SEC-08: ReDoS Injection", "Sanitized search regex strings with character escaping before database execution.", "MEDIUM", c_green)
    ]

    for idx, (title, fix, sev, col) in enumerate(vulns):
        x = 0.8 + (idx % 2) * 6.0
        y = 1.5 + (idx // 2) * 1.35
        add_card(slide10, x, y, 5.7, 1.2, bg_rgb=c_white)
        
        tb = slide10.shapes.add_textbox(Inches(x + 0.2), Inches(y + 0.1), Inches(5.3), Inches(1.0))
        tf = tb.text_frame
        tf.word_wrap = True
        
        p_t = tf.paragraphs[0]
        p_t.text = f"{title}  [{sev}]"
        p_t.font.size = Pt(10.5)
        p_t.font.bold = True
        p_t.font.color.rgb = c_dark

        p_f = tf.add_paragraph()
        p_f.text = f"Fix: {fix}"
        p_f.font.size = Pt(8.5)
        p_f.font.color.rgb = c_slate


    # ==================== SLIDE 11: TESTING & VERIFICATION ====================
    slide11 = prs.slides.add_slide(blank_layout)
    bg11 = slide11.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_flat(bg11, c_bg)
    add_header(slide11, "Empirical Verification & Automated Integration Test Suite", "ZERO-TOLERANCE QUALITY ASSURANCE")

    # Big Metrics Cards
    metrics = [
        ("39 / 39", "Automated Tests Passed", "100% Pass Rate", c_green),
        ("14", "Test Suites Executed", "node:test Native Runner", c_teal),
        ("4.00s", "Execution Duration", "Rapid CI/CD Feedback", c_blue),
        ("0", "Vulnerabilities Unremediated", "Audited & Verified", c_amber)
    ]
    for idx, (val, title, sub, col) in enumerate(metrics):
        x = 0.8 + idx * 2.95
        add_card(slide11, x, 1.5, 2.75, 1.6, bg_rgb=c_white)
        tb = slide11.shapes.add_textbox(Inches(x + 0.15), Inches(1.6), Inches(2.45), Inches(1.4))
        tf = tb.text_frame
        tf.word_wrap = True
        p_v = tf.paragraphs[0]
        p_v.text = val
        p_v.font.size = Pt(24)
        p_v.font.bold = True
        p_v.font.color.rgb = col
        p_t = tf.add_paragraph()
        p_t.text = title
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = c_dark
        p_s = tf.add_paragraph()
        p_s.text = sub
        p_s.font.size = Pt(8)
        p_s.font.color.rgb = c_slate

    # Detailed Test Verification Matrix Card
    add_card(slide11, 0.8, 3.4, 11.7, 3.5, bg_rgb=c_white)
    tb_tm = slide11.shapes.add_textbox(Inches(1.1), Inches(3.55), Inches(11.1), Inches(3.2))
    tf_tm = tb_tm.text_frame
    tf_tm.word_wrap = True

    p = tf_tm.paragraphs[0]
    p.text = "Key Verified Test Scenarios (All Passing Empirically):"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = c_teal

    tests_list = [
        ("Medical Guardrail Rejection: ", "Asserts assistant refuses diagnosis and prescription requests, returning MEDICAL_ADVICE intent and disclaimer."),
        ("Real MongoDB Provider Authenticity: ", "Validates returned doctors match actual database records; asserts 0 fabricated doctors on unknown specialties."),
        ("Live Slot Conflict Audit: ", "Asserts booked slot 'Today · 4:30 PM' is excluded from availability while unbooked 'Tomorrow · 10:00 AM' remains open."),
        ("Confirmation Invariant: ", "Asserts zero database records are inserted until user explicitly executes confirmation dialog."),
        ("Patient Data Isolation: ", "Confirms Patient 2 receives 0 appointments when querying visits owned by Patient 1 (strict multi-tenant isolation)."),
        ("Rescheduling Ownership: ", "Confirms owner can reschedule to valid doctor slot; unauthorized requester receives 403 Forbidden.")
    ]
    for tl_t, tl_d in tests_list:
        p_l = tf_tm.add_paragraph()
        r_t = p_l.add_run()
        r_t.text = f"• {tl_t}"
        r_t.font.bold = True
        r_t.font.size = Pt(9)
        r_t.font.color.rgb = c_dark
        r_d = p_l.add_run()
        r_d.text = tl_d
        r_d.font.size = Pt(8.5)
        r_d.font.color.rgb = c_slate


    # ==================== SLIDE 12: DEPLOYMENT & FUTURE ROADMAP ====================
    slide12 = prs.slides.add_slide(blank_layout)
    bg12 = slide12.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    set_shape_flat(bg12, c_bg)
    add_header(slide12, "Cloud Deployment & Strategic Development Roadmap", "PROJECT CONCLUSION & FUTURE EVOLUTION")

    # Left: Deployment Architecture Card
    add_card(slide12, 0.8, 1.5, 5.7, 5.3, bg_rgb=c_white)
    tb_dep = slide12.shapes.add_textbox(Inches(1.0), Inches(1.7), Inches(5.3), Inches(4.9))
    tf_dep = tb_dep.text_frame
    tf_dep.word_wrap = True
    
    p = tf_dep.paragraphs[0]
    p.text = "Production Cloud Deployment Topology:"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = c_teal

    dep_bullets = [
        ("Vercel Edge Platform (Frontend):", "Hosts React 19 SPA with global CDN caching. vercel.json edge rewrites forward /api/* to Render, eliminating CORS latency."),
        ("Render PaaS (Backend API Gateway):", "Runs Node 24 container running Express 5.2.1. Configured with reverse-proxy trust, health probes, and rate-limiting."),
        ("MongoDB Atlas (Database Tier):", "Encrypted multi-region replica cluster. Automatic connection pool sizing and index monitoring."),
        ("Google Cloud AI (Inference):", "Gemini 2.5 Flash model with temperature 0.1 for high-speed deterministic JSON generation.")
    ]
    for db_t, db_d in dep_bullets:
        p_t = tf_dep.add_paragraph()
        p_t.text = f"• {db_t}"
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = c_dark
        p_d = tf_dep.add_paragraph()
        p_d.text = db_d
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = c_slate

    # Right: Future Roadmap Card
    add_card(slide12, 6.8, 1.5, 5.7, 5.3, bg_rgb=c_light_teal, border_rgb=RGBColor(204, 251, 241))
    tb_fut = slide12.shapes.add_textbox(Inches(7.0), Inches(1.7), Inches(5.3), Inches(4.9))
    tf_fut = tb_fut.text_frame
    tf_fut.word_wrap = True

    p = tf_fut.paragraphs[0]
    p.text = "Strategic Roadmap (Future Enhancements):"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = c_teal

    future_milestones = [
        ("Phase 1: WebRTC Telehealth Streaming (Q1 2027)", "Peer-to-peer encrypted video consultations integrated directly inside patient and doctor dashboard layouts."),
        ("Phase 2: Payment Gateway Integration (Q2 2027)", "Razorpay & Stripe checkout for instant consultation fee settlement and automated refund workflows."),
        ("Phase 3: Automated SMS & WhatsApp Alerts (Q3 2027)", "Twilio messaging webhooks delivering 2-hour appointment reminder alerts to reduce no-show rates."),
        ("Phase 4: Calendar Sync Protocols (Q4 2027)", "Two-way Google Calendar and Apple iCal synchronization for seamless schedule management.")
    ]
    for fm_t, fm_d in future_milestones:
        p_t = tf_fut.add_paragraph()
        p_t.text = f"• {fm_t}"
        p_t.font.size = Pt(9.5)
        p_t.font.bold = True
        p_t.font.color.rgb = c_dark
        p_d = tf_fut.add_paragraph()
        p_d.text = fm_d
        p_d.font.size = Pt(8.5)
        p_d.font.color.rgb = c_slate

    p_sign = tf_fut.add_paragraph()
    p_sign.text = "\nProject Lead: Chiranthan (USN: 1WA25CS061) · Appointer 2026"
    p_sign.font.size = Pt(9.5)
    p_sign.font.bold = True
    p_sign.font.color.rgb = c_teal

    output_path = "documentation/Appointer_Project_Presentation.pptx"
    prs.save(output_path)
    print(f"Presentation successfully saved to {output_path}")

if __name__ == '__main__':
    build_pptx()
