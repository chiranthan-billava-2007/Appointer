import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

os.makedirs('documentation/assets', exist_ok=True)

plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['axes.edgecolor'] = '#cbd5e1'

def create_system_architecture():
    fig, ax = plt.subplots(figsize=(11, 6), dpi=300)
    ax.set_facecolor('#f8fafc')
    fig.patch.set_facecolor('#ffffff')

    # Title
    ax.text(0.5, 0.94, 'Appointer 3-Tier System Architecture & Cloud Topology', 
            ha='center', va='center', fontsize=15, fontweight='bold', color='#0f172a')
    ax.text(0.5, 0.89, 'Production Deployment: React 19 Frontend (Vercel) + Express 5 Backend (Render) + MongoDB Atlas & Gemini AI', 
            ha='center', va='center', fontsize=9.5, color='#475569')

    # Tier 1: Client Layer
    box_client = patches.FancyBboxPatch((0.05, 0.12), 0.25, 0.70, boxstyle="round,pad=0.03", 
                                       facecolor='#e0f2fe', edgecolor='#0284c7', linewidth=2)
    ax.add_patch(box_client)
    ax.text(0.175, 0.77, 'CLIENT TIER\n(Vercel Edge)', ha='center', va='center', fontsize=11, fontweight='bold', color='#0369a1')
    
    components_client = [
        ('React 19 SPA', '#ffffff'),
        ('React Router 7', '#ffffff'),
        ('AuthContext Core\n(JWT in LocalStorage)', '#ffffff'),
        ('Care Orbit UI\n(Responsive Layout)', '#ffffff'),
        ('Vercel Edge Rewrites\n(/api/* -> Render)', '#bae6fd')
    ]
    y_pos = 0.65
    for text, bg in components_client:
        p = patches.FancyBboxPatch((0.07, y_pos - 0.04), 0.21, 0.08, boxstyle="round,pad=0.015", 
                                   facecolor=bg, edgecolor='#38bdf8', linewidth=1)
        ax.add_patch(p)
        ax.text(0.175, y_pos, text, ha='center', va='center', fontsize=8.5, color='#0f172a', fontweight='medium')
        y_pos -= 0.11

    # Tier 2: Application / API Layer
    box_api = patches.FancyBboxPatch((0.375, 0.12), 0.28, 0.70, boxstyle="round,pad=0.03", 
                                    facecolor='#ecfdf5', edgecolor='#059669', linewidth=2)
    ax.add_patch(box_api)
    ax.text(0.515, 0.77, 'APPLICATION TIER\n(Render PaaS / Port 5000)', ha='center', va='center', fontsize=11, fontweight='bold', color='#047857')

    components_api = [
        ('Express 5.2.1 Gateway\n(Helmet, RateLimit, CORS)', '#ffffff'),
        ('Auth & RBAC Middleware\n(Zero-Trust Token Verifier)', '#ffffff'),
        ('Controllers & Routes\n(Auth, Doctors, Appts)', '#ffffff'),
        ('Dual AI Engine\n(Gemini 2.5 + Local NLP)', '#ffffff'),
        ('Mongoose 9.3 ODM\n(Schema Validation & Indexing)', '#d1fae5')
    ]
    y_pos = 0.65
    for text, bg in components_api:
        p = patches.FancyBboxPatch((0.395, y_pos - 0.04), 0.24, 0.08, boxstyle="round,pad=0.015", 
                                   facecolor=bg, edgecolor='#34d399', linewidth=1)
        ax.add_patch(p)
        ax.text(0.515, y_pos, text, ha='center', va='center', fontsize=8.5, color='#0f172a', fontweight='medium')
        y_pos -= 0.11

    # Tier 3: External Services & Data Layer
    box_data = patches.FancyBboxPatch((0.73, 0.12), 0.23, 0.70, boxstyle="round,pad=0.03", 
                                     facecolor='#fef3c7', edgecolor='#d97706', linewidth=2)
    ax.add_patch(box_data)
    ax.text(0.845, 0.77, 'DATA & AI SERVICES\n(Managed Cloud)', ha='center', va='center', fontsize=11, fontweight='bold', color='#b45309')

    components_data = [
        ('MongoDB Atlas Cloud\n(users, doctors, appts)', '#ffffff'),
        ('Partial Unique Index\n(doctor + slot + upcoming)', '#fef9c3'),
        ('Google Gemini 2.5 Flash\n(@google/genai SDK)', '#ffffff'),
        ('Deterministic NLP Fallback\n(Heuristic Zero-Downtime)', '#ffffff')
    ]
    y_pos = 0.63
    for text, bg in components_data:
        p = patches.FancyBboxPatch((0.745, y_pos - 0.04), 0.20, 0.09, boxstyle="round,pad=0.015", 
                                   facecolor=bg, edgecolor='#fcd34d', linewidth=1)
        ax.add_patch(p)
        ax.text(0.845, y_pos, text, ha='center', va='center', fontsize=8.5, color='#0f172a', fontweight='medium')
        y_pos -= 0.13

    # Connecting Arrows
    ax.annotate('', xy=(0.375, 0.48), xytext=(0.30, 0.48),
                arrowprops=dict(facecolor='#0284c7', edgecolor='#0284c7', width=2, headwidth=8))
    ax.text(0.3375, 0.51, 'HTTPS / REST\nBearer JWT', ha='center', va='bottom', fontsize=7.5, color='#0369a1', fontweight='bold')

    ax.annotate('', xy=(0.73, 0.55), xytext=(0.655, 0.55),
                arrowprops=dict(facecolor='#059669', edgecolor='#059669', width=2, headwidth=8))
    ax.text(0.6925, 0.58, 'Mongoose / TLS\nAtlas Pool', ha='center', va='bottom', fontsize=7.5, color='#047857', fontweight='bold')

    ax.annotate('', xy=(0.73, 0.35), xytext=(0.655, 0.35),
                arrowprops=dict(facecolor='#d97706', edgecolor='#d97706', width=2, headwidth=8))
    ax.text(0.6925, 0.38, 'HTTPS / JSON\nGemini API', ha='center', va='bottom', fontsize=7.5, color='#b45309', fontweight='bold')

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    plt.tight_layout()
    plt.savefig('documentation/assets/architecture_diagram.png', dpi=300, bbox_inches='tight')
    plt.close()

def create_data_flow_diagram():
    fig, ax = plt.subplots(figsize=(11, 5.8), dpi=300)
    ax.set_facecolor('#f8fafc')
    fig.patch.set_facecolor('#ffffff')

    ax.text(0.5, 0.94, 'Appointer AI Appointment Assistant & Booking Workflow', 
            ha='center', va='center', fontsize=14, fontweight='bold', color='#0f172a')
    ax.text(0.5, 0.89, 'End-to-End Patient Flow with Guardrails & Two-Phase Confirmation Dialog', 
            ha='center', va='center', fontsize=9.5, color='#475569')

    steps = [
        ('1. Patient Query', 'Natural Language input:\n"Book dermatologist\nwith Dr. Sharma"', 0.08, 0.55, '#e0f2fe', '#0284c7'),
        ('2. Intent Classifier', 'Gemini 2.5 Flash LLM\n+ Fallback NLP Heuristic\n(Detects BOOK intent)', 0.28, 0.55, '#ede9fe', '#7c3aed'),
        ('3. Clinical Guardrail', 'Safety Check:\nNo diagnosis or rx;\nEnforce disclaimer', 0.48, 0.72, '#fef3c7', '#d97706'),
        ('4. MongoDB Slot Audit', 'Query Doctor schedule\n& exclude upcoming\nbooked slots', 0.48, 0.38, '#ecfdf5', '#059669'),
        ('5. Confirmation Dialog', 'Interactive Prompt:\nUser must click\n"Confirm Booking"', 0.68, 0.55, '#fef2f2', '#dc2626'),
        ('6. Atomic Persistence', 'Appointment.create()\nPartial unique index\nguards concurrency', 0.88, 0.55, '#dbeafe', '#2563eb'),
    ]

    for title, desc, x, y, bg, border in steps:
        p = patches.FancyBboxPatch((x - 0.08, y - 0.12), 0.16, 0.24, boxstyle="round,pad=0.02",
                                   facecolor=bg, edgecolor=border, linewidth=1.8)
        ax.add_patch(p)
        ax.text(x, y + 0.07, title, ha='center', va='center', fontsize=8.5, fontweight='bold', color=border)
        ax.text(x, y - 0.02, desc, ha='center', va='center', fontsize=7.2, color='#1e293b', linespacing=1.2)

    # Connections
    ax.annotate('', xy=(0.20, 0.55), xytext=(0.16, 0.55),
                arrowprops=dict(facecolor='#64748b', edgecolor='#64748b', width=1.5, headwidth=6))
    
    # Split to guardrail and slot audit
    ax.annotate('', xy=(0.40, 0.68), xytext=(0.36, 0.58),
                arrowprops=dict(facecolor='#7c3aed', edgecolor='#7c3aed', width=1.5, headwidth=6))
    ax.annotate('', xy=(0.40, 0.42), xytext=(0.36, 0.52),
                arrowprops=dict(facecolor='#7c3aed', edgecolor='#7c3aed', width=1.5, headwidth=6))

    # Join to confirmation
    ax.annotate('', xy=(0.60, 0.58), xytext=(0.56, 0.68),
                arrowprops=dict(facecolor='#d97706', edgecolor='#d97706', width=1.5, headwidth=6))
    ax.annotate('', xy=(0.60, 0.52), xytext=(0.56, 0.42),
                arrowprops=dict(facecolor='#059669', edgecolor='#059669', width=1.5, headwidth=6))

    # Final to atomic persistence
    ax.annotate('', xy=(0.80, 0.55), xytext=(0.76, 0.55),
                arrowprops=dict(facecolor='#dc2626', edgecolor='#dc2626', width=1.5, headwidth=6))

    # Safety note at bottom
    ax.text(0.5, 0.12, 'Policy Enforcement: Unconfirmed actions are never written to database. Zero tolerance for medical diagnosis.',
            ha='center', va='center', fontsize=8.5, fontstyle='italic', color='#475569',
            bbox=dict(boxstyle="round,pad=0.4", facecolor="#f1f5f9", edgecolor="#cbd5e1"))

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    plt.tight_layout()
    plt.savefig('documentation/assets/data_flow_diagram.png', dpi=300, bbox_inches='tight')
    plt.close()

def create_database_er_diagram():
    fig, ax = plt.subplots(figsize=(10.5, 6.2), dpi=300)
    ax.set_facecolor('#f8fafc')
    fig.patch.set_facecolor('#ffffff')

    ax.text(0.5, 0.94, 'Appointer Entity-Relationship & Relational Integrity Schema', 
            ha='center', va='center', fontsize=14, fontweight='bold', color='#0f172a')
    ax.text(0.5, 0.89, 'MongoDB Document Model with Mongoose References and Partial Unique Indexes', 
            ha='center', va='center', fontsize=9.5, color='#475569')

    # Entity: User
    box_user = patches.FancyBboxPatch((0.06, 0.35), 0.25, 0.48, boxstyle="round,pad=0.02",
                                      facecolor='#ffffff', edgecolor='#0284c7', linewidth=2)
    ax.add_patch(box_user)
    # Header
    p_uh = patches.Rectangle((0.06, 0.77), 0.25, 0.06, facecolor='#0284c7')
    ax.add_patch(p_uh)
    ax.text(0.185, 0.80, 'USER SCHEMA', ha='center', va='center', fontsize=10, fontweight='bold', color='#ffffff')
    
    user_fields = [
        ('_id', 'ObjectId [PK]'),
        ('name', 'String (required)'),
        ('email', 'String (unique, lowercase)'),
        ('password', 'String (hash, select: false)'),
        ('role', 'Enum: patient|doctor|admin'),
        ('phone', 'String (optional)'),
        ('createdAt', 'Date (timestamp)'),
        ('updatedAt', 'Date (timestamp)')
    ]
    y_pos = 0.73
    for f_name, f_type in user_fields:
        ax.text(0.08, y_pos, f_name, ha='left', va='center', fontsize=7.8, fontweight='bold', color='#0f172a')
        ax.text(0.29, y_pos, f_type, ha='right', va='center', fontsize=7.2, color='#64748b')
        y_pos -= 0.045

    # Entity: Doctor
    box_doc = patches.FancyBboxPatch((0.69, 0.35), 0.25, 0.48, boxstyle="round,pad=0.02",
                                     facecolor='#ffffff', edgecolor='#059669', linewidth=2)
    ax.add_patch(box_doc)
    p_dh = patches.Rectangle((0.69, 0.77), 0.25, 0.06, facecolor='#059669')
    ax.add_patch(p_dh)
    ax.text(0.815, 0.80, 'DOCTOR SCHEMA', ha='center', va='center', fontsize=10, fontweight='bold', color='#ffffff')

    doc_fields = [
        ('_id', 'ObjectId [PK]'),
        ('user', 'ObjectId [FK -> User.unique]'),
        ('name', 'String (required)'),
        ('specialty', 'String (indexed)'),
        ('experienceYears', 'Number (default: 5)'),
        ('rating', 'Number (default: 4.8)'),
        ('clinicName', 'String'),
        ('location', 'String (Bengaluru)'),
        ('areasOfCare', '[String]'),
        ('availableSlots', '[String]')
    ]
    y_pos = 0.73
    for f_name, f_type in doc_fields:
        ax.text(0.71, y_pos, f_name, ha='left', va='center', fontsize=7.5, fontweight='bold', color='#0f172a')
        ax.text(0.92, y_pos, f_type, ha='right', va='center', fontsize=6.8, color='#64748b')
        y_pos -= 0.038

    # Entity: Appointment
    box_apt = patches.FancyBboxPatch((0.33, 0.05), 0.34, 0.65, boxstyle="round,pad=0.02",
                                     facecolor='#ffffff', edgecolor='#d97706', linewidth=2)
    ax.add_patch(box_apt)
    p_ah = patches.Rectangle((0.33, 0.64), 0.34, 0.06, facecolor='#d97706')
    ax.add_patch(p_ah)
    ax.text(0.50, 0.67, 'APPOINTMENT SCHEMA', ha='center', va='center', fontsize=10, fontweight='bold', color='#ffffff')

    apt_fields = [
        ('_id', 'ObjectId [PK]'),
        ('patient', 'ObjectId [FK -> User._id]'),
        ('patientName', 'String (snapshot)'),
        ('patientEmail', 'String (snapshot)'),
        ('doctor', 'ObjectId [FK -> Doctor._id]'),
        ('doctorName', 'String (snapshot)'),
        ('specialty', 'String (snapshot)'),
        ('clinicName', 'String'),
        ('location', 'String'),
        ('slot', 'String (normalized, e.g. "Today · 4:30 PM")'),
        ('status', 'Enum: upcoming | completed | cancelled'),
        ('notes', 'String (optional notes)'),
        ('isLegacy', 'Boolean (migration flag)'),
        ('INDEX:', '{ doctor: 1, slot: 1 } partial unique')
    ]
    y_pos = 0.60
    for f_name, f_type in apt_fields:
        is_idx = 'INDEX' in f_name
        ax.text(0.35, y_pos, f_name, ha='left', va='center', fontsize=7.5, 
                fontweight='bold', color='#b45309' if is_idx else '#0f172a')
        ax.text(0.65, y_pos, f_type, ha='right', va='center', fontsize=6.8, 
                fontweight='bold' if is_idx else 'normal', color='#b45309' if is_idx else '#64748b')
        y_pos -= 0.04

    # Connective Relationships (Lines)
    # User to Doctor: 1 to 1
    ax.annotate('', xy=(0.69, 0.60), xytext=(0.31, 0.60),
                arrowprops=dict(arrowstyle='<->', color='#0284c7', linewidth=1.5, ls='--'))
    ax.text(0.50, 0.72, '1-to-1 User Link (Role: doctor)', ha='center', va='bottom', fontsize=7.5, color='#0284c7', fontweight='bold')

    # User to Appointment: 1 to Many
    ax.annotate('', xy=(0.33, 0.35), xytext=(0.20, 0.35),
                arrowprops=dict(arrowstyle='->', color='#0284c7', linewidth=1.5))
    ax.text(0.24, 0.32, '1:N Patient\nBookings', ha='center', va='top', fontsize=7.2, color='#0284c7', fontweight='bold')

    # Doctor to Appointment: 1 to Many
    ax.annotate('', xy=(0.67, 0.35), xytext=(0.80, 0.35),
                arrowprops=dict(arrowstyle='->', color='#059669', linewidth=1.5))
    ax.text(0.74, 0.32, '1:N Doctor\nVisits', ha='center', va='top', fontsize=7.2, color='#059669', fontweight='bold')

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    plt.tight_layout()
    plt.savefig('documentation/assets/database_er_diagram.png', dpi=300, bbox_inches='tight')
    plt.close()

def create_rbac_security_matrix():
    fig, ax = plt.subplots(figsize=(10.5, 5.2), dpi=300)
    ax.set_facecolor('#f8fafc')
    fig.patch.set_facecolor('#ffffff')

    ax.text(0.5, 0.94, 'Appointer Role-Based Access Control (RBAC) & Endpoint Matrix', 
            ha='center', va='center', fontsize=14, fontweight='bold', color='#0f172a')
    ax.text(0.5, 0.89, 'Multi-Portal Security Boundaries & Permissions Verification', 
            ha='center', va='center', fontsize=9.5, color='#475569')

    # Table layout
    headers = ['Endpoint / Capability', 'Public Guest', 'Patient', 'Doctor', 'Administrator', 'Enforcement Mechanism']
    rows = [
        ['GET /api/doctors (Search Directory)', 'Allowed', 'Allowed', 'Allowed', 'Allowed', 'Public API / Regex Sanitize'],
        ['POST /api/doctors/ai-find', 'Allowed', 'Allowed', 'Allowed', 'Allowed', 'Rate Limit: 60/15m + Safe LLM'],
        ['POST /api/auth/register', 'Patient Only', 'Restricted', 'Restricted', 'Restricted', 'Strict Role Enforcement'],
        ['POST /api/doctors (Onboard Doctor)', '401 Unauth', '403 Forbid', '403 Forbid', 'Allowed', 'protect + authorize("admin")'],
        ['GET /api/appointments', '401 Unauth', 'Own Visits', 'Assigned Only', 'All Visits', 'protect + req.user.role filter'],
        ['POST /api/appointments (Book)', '401 Unauth', 'Allowed', '403 Forbid', 'Allowed', 'authorize("patient", "admin")'],
        ['PATCH /api/appointments/:id/resched', '401 Unauth', 'Own Visits', '403 Forbid', 'Allowed', 'Ownership + Slot availability'],
        ['PATCH /api/appointments/:id/status', '401 Unauth', '403 Forbid', 'Assigned Only', 'Allowed', 'authorize("doctor", "admin")'],
        ['DELETE /api/appointments/:id', '401 Unauth', 'Own Visits', 'Assigned Only', 'Allowed', 'Status update to "cancelled"'],
    ]

    col_widths = [0.28, 0.12, 0.12, 0.12, 0.12, 0.24]
    x_starts = [0.03]
    for w in col_widths[:-1]:
        x_starts.append(x_starts[-1] + w)

    # Header Row
    y = 0.80
    for i, (h, x, w) in enumerate(zip(headers, x_starts, col_widths)):
        p = patches.Rectangle((x, y - 0.02), w - 0.01, 0.055, facecolor='#0f172a')
        ax.add_patch(p)
        ax.text(x + (w - 0.01)/2, y + 0.008, h, ha='center', va='center', fontsize=8, fontweight='bold', color='#ffffff')

    y -= 0.065
    for r_idx, row in enumerate(rows):
        bg_color = '#ffffff' if r_idx % 2 == 0 else '#f1f5f9'
        for i, (val, x, w) in enumerate(zip(row, x_starts, col_widths)):
            p = patches.Rectangle((x, y - 0.02), w - 0.01, 0.05, facecolor=bg_color, edgecolor='#e2e8f0', linewidth=0.5)
            ax.add_patch(p)
            text_color = '#047857' if val in ['Allowed', 'Patient Only', 'Own Visits', 'Assigned Only', 'All Visits'] else '#b91c1c' if ('401' in val or '403' in val or 'Restricted' in val) else '#0f172a'
            weight = 'bold' if (i == 0 or val == 'Allowed' or '401' in val or '403' in val) else 'normal'
            align = 'left' if (i == 0 or i == 5) else 'center'
            tx = x + 0.01 if align == 'left' else x + (w - 0.01)/2
            ax.text(tx, y + 0.005, val, ha=align, va='center', fontsize=7.2, fontweight=weight, color=text_color)
        y -= 0.055

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')
    plt.tight_layout()
    plt.savefig('documentation/assets/rbac_security_flow.png', dpi=300, bbox_inches='tight')
    plt.close()

if __name__ == '__main__':
    create_system_architecture()
    create_data_flow_diagram()
    create_database_er_diagram()
    create_rbac_security_matrix()
    print("All 4 architecture diagrams generated successfully in documentation/assets/")


def create_ui_overview():
    fig, axes = plt.subplots(1, 2, figsize=(12, 6.2), dpi=300)
    fig.patch.set_facecolor('#ffffff')

    # Panel 1: AI Doctor Finder UI Schematic
    ax1 = axes[0]
    ax1.set_facecolor('#f8fafc')
    ax1.set_xlim(0, 1)
    ax1.set_ylim(0, 1)
    ax1.axis('off')

    ax1.text(0.5, 0.95, 'AI Doctor Finder — Symptom Discovery', ha='center', va='center', fontsize=12, fontweight='bold', color='#0f172a')
    ax1.text(0.5, 0.91, 'Route: /ai-doctor-finder', ha='center', va='center', fontsize=8.5, color='#64748b')

    # Query Input Box
    p_inp = patches.FancyBboxPatch((0.08, 0.81), 0.84, 0.07, boxstyle="round,pad=0.015", facecolor='#ffffff', edgecolor='#cbd5e1')
    ax1.add_patch(p_inp)
    ax1.text(0.12, 0.845, 'Query: "Skin rash and severe acne breakout in Indiranagar"', ha='left', va='center', fontsize=7.8, color='#0f172a', fontstyle='italic')
    p_btn = patches.Rectangle((0.76, 0.815), 0.15, 0.06, facecolor='#1683a0')
    ax1.add_patch(p_btn)
    ax1.text(0.835, 0.845, 'Search ->', ha='center', va='center', fontsize=7.5, fontweight='bold', color='#ffffff')

    # Extracted Criteria Box
    p_crit = patches.FancyBboxPatch((0.08, 0.65), 0.84, 0.13, boxstyle="round,pad=0.015", facecolor='#f0fdfa', edgecolor='#14b8a6')
    ax1.add_patch(p_crit)
    ax1.text(0.11, 0.74, 'AI Care Matching Insight (Gemini 2.5 Flash)', ha='left', va='center', fontsize=8.2, fontweight='bold', color='#0f766e')
    ax1.text(0.11, 0.70, 'Specialty: Dermatologist  |  Location: Indiranagar, Bengaluru', ha='left', va='center', fontsize=7.5, color='#134e4a')
    ax1.text(0.11, 0.665, 'Reasoning: Recommended for specialized skin and acne clinical assessment.', ha='left', va='center', fontsize=7, color='#475569')

    # Doctor Result Card
    p_card = patches.FancyBboxPatch((0.08, 0.28), 0.84, 0.33, boxstyle="round,pad=0.02", facecolor='#ffffff', edgecolor='#e2e8f0', linewidth=1.5)
    ax1.add_patch(p_card)
    p_av = patches.Circle((0.17, 0.52), 0.05, facecolor='#e0f2fe', edgecolor='#0284c7')
    ax1.add_patch(p_av)
    ax1.text(0.17, 0.52, 'AS', ha='center', va='center', fontsize=9, fontweight='bold', color='#0284c7')

    ax1.text(0.25, 0.54, 'Dr. Ananya Sharma', ha='left', va='center', fontsize=9.5, fontweight='bold', color='#0f172a')
    ax1.text(0.25, 0.50, 'Dermatologist  *  12 years experience', ha='left', va='center', fontsize=8, color='#1683a0', fontweight='bold')
    ax1.text(0.25, 0.465, 'ClearSkin Clinic * Indiranagar * 4.9/5 (248 reviews)', ha='left', va='center', fontsize=7.5, color='#64748b')

    # Slots
    ax1.text(0.11, 0.41, 'Live Verified Open Slots:', ha='left', va='center', fontsize=7.5, fontweight='bold', color='#0f172a')
    slots = ['Today * 4:30 PM', 'Tomorrow * 10:00 AM', 'Friday * 2:15 PM']
    for idx, s in enumerate(slots):
        p_slot = patches.FancyBboxPatch((0.11 + idx * 0.27, 0.33), 0.25, 0.055, boxstyle="round,pad=0.01", facecolor='#e6fffa', edgecolor='#5eead4')
        ax1.add_patch(p_slot)
        ax1.text(0.235 + idx * 0.27, 0.358, s, ha='center', va='center', fontsize=6.8, color='#0f766e', fontweight='bold')

    # Disclaimer Box
    p_disc = patches.FancyBboxPatch((0.08, 0.08), 0.84, 0.16, boxstyle="round,pad=0.015", facecolor='#fffbeb', edgecolor='#fde68a')
    ax1.add_patch(p_disc)
    ax1.text(0.11, 0.19, 'Healthcare Discovery & Safety Notice', ha='left', va='center', fontsize=8, fontweight='bold', color='#b45309')
    disc_text = 'This tool is for doctor discovery and appointment matching only.\nIt does NOT provide medical diagnoses, treatment plans, or prescription\nmedications. Consult emergency services in urgent situations.'
    ax1.text(0.11, 0.13, disc_text, ha='left', va='center', fontsize=6.8, color='#78350f', linespacing=1.2)


    # Panel 2: AI Appointment Assistant UI Schematic
    ax2 = axes[1]
    ax2.set_facecolor('#f8fafc')
    ax2.set_xlim(0, 1)
    ax2.set_ylim(0, 1)
    ax2.axis('off')

    ax2.text(0.5, 0.95, 'AI Appointment Assistant — Conversational Booking', ha='center', va='center', fontsize=12, fontweight='bold', color='#0f172a')
    ax2.text(0.5, 0.91, 'Route: /ai-assistant', ha='center', va='center', fontsize=8.5, color='#64748b')

    # Chat Bubble 1: Assistant Greeting
    p_cb1 = patches.FancyBboxPatch((0.08, 0.77), 0.75, 0.10, boxstyle="round,pad=0.015", facecolor='#f1f5f9', edgecolor='#e2e8f0')
    ax2.add_patch(p_cb1)
    ax2.text(0.11, 0.82, 'Appointer Assistant:\nHello! I can help you find verified doctors, check live slots,\nand schedule, reschedule, or cancel your appointments.', ha='left', va='center', fontsize=7.2, color='#1e293b')

    # Chat Bubble 2: User Request
    p_cb2 = patches.FancyBboxPatch((0.25, 0.65), 0.67, 0.08, boxstyle="round,pad=0.015", facecolor='#0284c7', edgecolor='#0284c7')
    ax2.add_patch(p_cb2)
    ax2.text(0.28, 0.69, 'User: Book an appointment with Dr. Ananya Sharma\nfor Tomorrow * 10:00 AM', ha='left', va='center', fontsize=7.2, color='#ffffff')

    # Chat Bubble 3: Assistant Two-Phase Confirmation Dialog
    p_cb3 = patches.FancyBboxPatch((0.08, 0.24), 0.84, 0.37, boxstyle="round,pad=0.02", facecolor='#f0fdf4', edgecolor='#16a34a', linewidth=1.8)
    ax2.add_patch(p_cb3)
    ax2.text(0.11, 0.56, 'Appointment Confirmation Required (Requirement 6)', ha='left', va='center', fontsize=8.2, fontweight='bold', color='#15803d')
    
    confirm_details = [
        'Provider: Dr. Ananya Sharma (Dermatologist)',
        'Clinic: ClearSkin Dermatology Clinic, Indiranagar',
        'Requested Slot: Tomorrow * 10:00 AM (Verified Open in MongoDB)',
        'Patient: Authenticated Session (Chiranthan / JWT Verified)'
    ]
    y_c = 0.51
    for cd in confirm_details:
        ax2.text(0.11, y_c, cd, ha='left', va='center', fontsize=7.2, color='#1e293b')
        y_c -= 0.038

    # Confirmation Buttons
    p_cbtn1 = patches.Rectangle((0.11, 0.27), 0.35, 0.065, facecolor='#16a34a')
    ax2.add_patch(p_cbtn1)
    ax2.text(0.285, 0.302, 'Confirm Booking', ha='center', va='center', fontsize=7.8, fontweight='bold', color='#ffffff')

    p_cbtn2 = patches.Rectangle((0.49, 0.27), 0.22, 0.065, facecolor='#ffffff', edgecolor='#cbd5e1')
    ax2.add_patch(p_cbtn2)
    ax2.text(0.60, 0.302, 'Cancel', ha='center', va='center', fontsize=7.8, color='#64748b')

    # Input Box
    p_cinp = patches.FancyBboxPatch((0.08, 0.08), 0.84, 0.07, boxstyle="round,pad=0.015", facecolor='#ffffff', edgecolor='#cbd5e1')
    ax2.add_patch(p_cinp)
    ax2.text(0.12, 0.115, 'Ask to book, reschedule, cancel, or search doctors...', ha='left', va='center', fontsize=7.5, color='#94a3b8')

    plt.tight_layout()
    plt.savefig('documentation/assets/ui_screens_overview.png', dpi=300, bbox_inches='tight')
    plt.close()

if __name__ == '__main__':
    create_ui_overview()
    print("UI screens overview generated successfully in documentation/assets/ui_screens_overview.png")
